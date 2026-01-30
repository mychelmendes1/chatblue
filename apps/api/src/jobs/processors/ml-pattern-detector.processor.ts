import { Job } from 'bullmq';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { PatternDetectorService } from '../../services/ml/pattern-detector.service.js';
import { IntentClassifierService } from '../../services/ml/intent-classifier.service.js';
import { EmbeddingService } from '../../services/ai/embedding.service.js';

interface MLPatternDetectorJobData {
  type: 'detect-patterns' | 'train-intents' | 'full-training';
  companyId?: string;
  minOccurrences?: number;
  minQualityScore?: number;
  autoApprove?: boolean;
}

/**
 * Processor para detecção de padrões e treinamento de intents
 */
export async function mlPatternDetectorProcessor(job: Job<MLPatternDetectorJobData>) {
  const { type, companyId, minOccurrences, minQualityScore, autoApprove } = job.data;

  logger.info('ML pattern detector job started', {
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

    const results = {
      companiesProcessed: 0,
      patternsDetected: 0,
      patternsCreated: 0,
      patternsUpdated: 0,
      intentsCreated: 0,
      intentsUpdated: 0,
    };

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

      const patternDetector = new PatternDetectorService(
        {
          provider: settings.aiProvider as 'openai' | 'anthropic',
          apiKey: settings.aiApiKey,
          model: settings.aiDefaultModel || undefined,
        },
        embeddingService
      );

      const intentClassifier = new IntentClassifierService(
        {
          provider: settings.aiProvider as 'openai' | 'anthropic',
          apiKey: settings.aiApiKey,
          model: settings.aiDefaultModel || undefined,
        },
        embeddingService
      );

      results.companiesProcessed++;

      if (type === 'detect-patterns' || type === 'full-training') {
        // Detectar padrões
        const patterns = await patternDetector.detectPatterns(company.id, {
          minOccurrences: minOccurrences || 3,
          minQualityScore: minQualityScore || 60,
          onlyUnprocessed: true,
        });

        results.patternsDetected += patterns.length;

        // Salvar padrões detectados
        if (patterns.length > 0) {
          const saveResult = await patternDetector.savePatterns(company.id, patterns, {
            autoApprove: autoApprove || false,
            minConfidence: 0.5,
          });

          results.patternsCreated += saveResult.created;
          results.patternsUpdated += saveResult.updated;
        }
      }

      if (type === 'train-intents' || type === 'full-training') {
        // Treinar classificador de intents
        const trainResult = await intentClassifier.trainFromTrainingPairs(company.id, {
          minOccurrences: minOccurrences || 5,
          minQualityScore: minQualityScore || 70,
        });

        results.intentsCreated += trainResult.patternsCreated;
        results.intentsUpdated += trainResult.patternsUpdated;
      }

      // Atualizar métricas diárias
      await updateDailyMetrics(company.id, {
        newPatternsLearned: results.patternsCreated,
        newTemplatesAdded: results.intentsCreated,
      });

      // Marcar training pairs como usados
      if (type === 'full-training') {
        await markPairsAsUsed(company.id, minQualityScore || 60);
      }
    }

    logger.info('ML pattern detector job completed', {
      jobId: job.id,
      type,
      ...results,
    });

    return results;
  } catch (error: any) {
    logger.error('ML pattern detector job failed', {
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
async function updateDailyMetrics(
  companyId: string,
  metrics: {
    newPatternsLearned?: number;
    newTemplatesAdded?: number;
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
        newPatternsLearned: metrics.newPatternsLearned || 0,
        newTemplatesAdded: metrics.newTemplatesAdded || 0,
      },
      update: {
        newPatternsLearned: metrics.newPatternsLearned
          ? { increment: metrics.newPatternsLearned }
          : undefined,
        newTemplatesAdded: metrics.newTemplatesAdded
          ? { increment: metrics.newTemplatesAdded }
          : undefined,
      },
    });
  } catch (error) {
    logger.warn('Failed to update daily metrics', { companyId, error });
  }
}

/**
 * Marca training pairs como usados no treinamento
 */
async function markPairsAsUsed(companyId: string, minQualityScore: number): Promise<void> {
  try {
    // Criar batch de treinamento
    const batch = await prisma.mLTrainingBatch.create({
      data: {
        companyId,
        batchNumber: await getNextBatchNumber(companyId),
        description: `Training batch - ${new Date().toISOString()}`,
        pairsCount: 0,
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    // Atualizar pares
    const result = await prisma.mLTrainingPair.updateMany({
      where: {
        companyId,
        usedInTraining: false,
        qualityScore: { gte: minQualityScore },
        isValidated: true,
      },
      data: {
        usedInTraining: true,
        trainingBatchId: batch.id,
      },
    });

    // Atualizar batch
    await prisma.mLTrainingBatch.update({
      where: { id: batch.id },
      data: {
        pairsCount: result.count,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    logger.info('Marked training pairs as used', {
      companyId,
      batchId: batch.id,
      pairsMarked: result.count,
    });
  } catch (error) {
    logger.warn('Failed to mark pairs as used', { companyId, error });
  }
}

/**
 * Obtém próximo número de batch
 */
async function getNextBatchNumber(companyId: string): Promise<number> {
  const lastBatch = await prisma.mLTrainingBatch.findFirst({
    where: { companyId },
    orderBy: { batchNumber: 'desc' },
    select: { batchNumber: true },
  });

  return (lastBatch?.batchNumber || 0) + 1;
}
