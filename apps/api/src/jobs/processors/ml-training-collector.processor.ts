import { Job } from 'bullmq';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { TrainingPairCollectorService } from '../../services/ml/training-pair-collector.service.js';
import { EmbeddingService } from '../../services/ai/embedding.service.js';

interface MLTrainingCollectorJobData {
  type: 'collect-recent' | 'collect-transfers' | 'collect-single-ticket';
  companyId?: string;
  ticketId?: string;
  hoursBack?: number;
}

/**
 * Processor para coleta de training pairs
 */
export async function mlTrainingCollectorProcessor(job: Job<MLTrainingCollectorJobData>) {
  const { type, companyId, ticketId, hoursBack } = job.data;

  logger.info('ML training collector job started', {
    jobId: job.id,
    type,
    companyId,
  });

  try {
    // Buscar empresas para processar
    const companies = companyId
      ? [{ id: companyId }]
      : await prisma.company.findMany({
          where: {
            isActive: true,
            settings: {
              aiEnabled: true,
            },
          },
          select: { id: true },
        });

    let totalCollected = 0;
    let totalSaved = 0;

    for (const company of companies) {
      // Buscar configurações da empresa
      const settings = await prisma.companySettings.findUnique({
        where: { companyId: company.id },
      });

      if (!settings?.aiApiKey || !settings?.aiProvider) {
        logger.debug('Skipping company without AI config', { companyId: company.id });
        continue;
      }

      // Criar embedding service
      const embeddingService = new EmbeddingService(
        settings.aiProvider,
        settings.aiApiKey
      );

      // Criar collector service
      const collector = new TrainingPairCollectorService(embeddingService);

      if (type === 'collect-recent' || type === 'collect-transfers') {
        // Coletar de tickets recentes
        const recentResult = await collector.collectFromRecentTickets(
          company.id,
          {
            hoursBack: hoursBack || 24,
            maxTickets: 100,
            criteria: {
              minResponseLength: 20,
              maxResponseTime: 1800, // 30 minutos
              excludeTemplateResponses: true,
            },
          }
        );

        totalCollected += recentResult.collected;
        totalSaved += recentResult.saved;

        // Coletar de transferências AI -> Humano
        if (type === 'collect-transfers') {
          const transferResult = await collector.collectFromAITransfers(
            company.id,
            {
              hoursBack: hoursBack || 24,
              maxTransfers: 50,
            }
          );

          totalCollected += transferResult.collected;
          totalSaved += transferResult.saved;
        }

        // Atualizar métricas diárias
        await updateDailyMetrics(company.id, {
          newTrainingPairs: recentResult.saved,
        });
      } else if (type === 'collect-single-ticket' && ticketId) {
        // Coletar de um ticket específico
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: {
            status: true,
            rating: true,
            npsScore: true,
            isFirstContactResolution: true,
            companyId: true,
          },
        });

        if (ticket && ticket.companyId === company.id) {
          const pairs = await collector.collectFromTicket(ticketId, company.id);

          for (const pair of pairs) {
            const saved = await collector.saveTrainingPair(company.id, pair, ticket);
            if (saved) totalSaved++;
          }

          totalCollected += pairs.length;
        }
      }
    }

    logger.info('ML training collector job completed', {
      jobId: job.id,
      type,
      companiesProcessed: companies.length,
      totalCollected,
      totalSaved,
    });

    return { collected: totalCollected, saved: totalSaved };
  } catch (error: any) {
    logger.error('ML training collector job failed', {
      jobId: job.id,
      type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Atualiza métricas diárias de aprendizado
 */
async function updateDailyMetrics(
  companyId: string,
  metrics: {
    newTrainingPairs?: number;
    validatedPairs?: number;
    newPatternsLearned?: number;
    newTemplatesAdded?: number;
    knowledgeGapsFound?: number;
  }
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await prisma.mLLearningMetric.upsert({
      where: {
        companyId_date: {
          companyId,
          date: today,
        },
      },
      create: {
        companyId,
        date: today,
        newTrainingPairs: metrics.newTrainingPairs || 0,
        validatedPairs: metrics.validatedPairs || 0,
        newPatternsLearned: metrics.newPatternsLearned || 0,
        newTemplatesAdded: metrics.newTemplatesAdded || 0,
        knowledgeGapsFound: metrics.knowledgeGapsFound || 0,
      },
      update: {
        newTrainingPairs: metrics.newTrainingPairs
          ? { increment: metrics.newTrainingPairs }
          : undefined,
        validatedPairs: metrics.validatedPairs
          ? { increment: metrics.validatedPairs }
          : undefined,
        newPatternsLearned: metrics.newPatternsLearned
          ? { increment: metrics.newPatternsLearned }
          : undefined,
        newTemplatesAdded: metrics.newTemplatesAdded
          ? { increment: metrics.newTemplatesAdded }
          : undefined,
        knowledgeGapsFound: metrics.knowledgeGapsFound
          ? { increment: metrics.knowledgeGapsFound }
          : undefined,
      },
    });
  } catch (error) {
    logger.warn('Failed to update daily metrics', { companyId, error });
  }
}
