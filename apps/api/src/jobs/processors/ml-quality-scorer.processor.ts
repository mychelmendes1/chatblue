import { Job } from 'bullmq';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { QualityScorerService } from '../../services/ml/quality-scorer.service.js';
import { EmbeddingService } from '../../services/ai/embedding.service.js';

interface MLQualityScorerJobData {
  type: 'score-pending' | 'score-batch';
  companyId?: string;
  limit?: number;
}

/**
 * Processor para avaliação de qualidade de training pairs
 */
export async function mlQualityScorerProcessor(job: Job<MLQualityScorerJobData>) {
  const { type, companyId, limit } = job.data;

  logger.info('ML quality scorer job started', {
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

    let totalScored = 0;
    let totalAvgScore = 0;

    for (const company of companies) {
      // Buscar configurações da empresa
      const settings = await prisma.companySettings.findUnique({
        where: { companyId: company.id },
      });

      if (!settings?.aiApiKey || !settings?.aiProvider) {
        logger.debug('Skipping company without AI config', { companyId: company.id });
        continue;
      }

      // Criar services
      const embeddingService = new EmbeddingService(
        settings.aiProvider,
        settings.aiApiKey
      );

      const qualityScorer = new QualityScorerService(
        {
          provider: settings.aiProvider as 'openai' | 'anthropic',
          apiKey: settings.aiApiKey,
          model: settings.aiDefaultModel || undefined,
          useFactCheck: true,
        },
        embeddingService
      );

      // Processar batch
      const result = await qualityScorer.scoreBatch(company.id, {
        limit: limit || 50,
        onlyUnscored: type === 'score-pending',
      });

      totalScored += result.scored;
      if (result.scored > 0) {
        totalAvgScore += result.avgScore;
      }

      // Atualizar métricas
      if (result.scored > 0) {
        await updateDailyMetrics(company.id, result.avgScore);
      }
    }

    const avgScore = totalScored > 0 ? totalAvgScore / companies.filter((_, i) => i < totalScored).length : 0;

    logger.info('ML quality scorer job completed', {
      jobId: job.id,
      type,
      companiesProcessed: companies.length,
      totalScored,
      avgScore,
    });

    return { scored: totalScored, avgScore };
  } catch (error: any) {
    logger.error('ML quality scorer job failed', {
      jobId: job.id,
      type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Atualiza métricas diárias
 */
async function updateDailyMetrics(companyId: string, avgScore: number): Promise<void> {
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
      },
      update: {},
    });
  } catch (error) {
    logger.warn('Failed to update daily metrics', { companyId, error });
  }
}
