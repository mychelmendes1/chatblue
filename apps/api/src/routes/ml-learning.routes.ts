import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../middlewares/tenant.middleware.js';
import { TrainingPairCollectorService } from '../services/ml/training-pair-collector.service.js';
import { QualityScorerService } from '../services/ml/quality-scorer.service.js';
import { IntentClassifierService } from '../services/ml/intent-classifier.service.js';
import { PatternDetectorService } from '../services/ml/pattern-detector.service.js';
import { MLResponseGeneratorService } from '../services/ml/ml-response-generator.service.js';
import { EmbeddingService } from '../services/ai/embedding.service.js';
import {
  addMLTrainingCollectorJob,
  addMLQualityScorerJob,
  addMLPatternDetectorJob,
  addMLMetricsJob,
} from '../jobs/index.js';

const router = Router();

// Aplicar middlewares de autenticação e tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * Criar instâncias dos services baseado nas configurações da empresa
 */
async function getMLServices(companyId: string) {
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
  });

  if (!settings?.aiApiKey || !settings?.aiProvider) {
    throw new Error('AI not configured for this company');
  }

  const embeddingService = new EmbeddingService(
    settings.aiProvider,
    settings.aiApiKey
  );

  const config = {
    provider: settings.aiProvider as 'openai' | 'anthropic',
    apiKey: settings.aiApiKey,
    model: settings.aiDefaultModel || undefined,
  };

  return {
    embeddingService,
    trainingPairCollector: new TrainingPairCollectorService(embeddingService),
    qualityScorer: new QualityScorerService(config, embeddingService),
    intentClassifier: new IntentClassifierService(config, embeddingService),
    patternDetector: new PatternDetectorService(config, embeddingService),
    responseGenerator: new MLResponseGeneratorService(
      config,
      embeddingService,
      new IntentClassifierService(config, embeddingService),
      new QualityScorerService(config, embeddingService)
    ),
  };
}

// ===============================
// Dashboard & Metrics
// ===============================

/**
 * GET /api/ml-learning/dashboard
 * Retorna métricas e estatísticas do sistema de ML
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;

  try {
    // Buscar métricas dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      metrics,
      trainingPairsStats,
      patternsCount,
      templatesCount,
      recentMetrics,
    ] = await Promise.all([
      // Métricas agregadas
      prisma.mLLearningMetric.aggregate({
        where: {
          companyId,
          date: { gte: thirtyDaysAgo },
        },
        _avg: {
          aiResolutionRate: true,
          aiAvgRating: true,
          aiNpsScore: true,
        },
        _sum: {
          totalTickets: true,
          aiHandledTickets: true,
          humanHandledTickets: true,
          aiToHumanTransfers: true,
          newTrainingPairs: true,
          newPatternsLearned: true,
        },
      }),
      // Estatísticas de training pairs
      prisma.mLTrainingPair.groupBy({
        by: ['isValidated', 'usedInTraining'],
        where: { companyId },
        _count: true,
      }),
      // Total de padrões
      prisma.mLIntentPattern.count({
        where: { companyId, isActive: true },
      }),
      // Total de templates
      prisma.mLResponseTemplate.count({
        where: { companyId, isActive: true },
      }),
      // Métricas dos últimos 7 dias para gráfico
      prisma.mLLearningMetric.findMany({
        where: {
          companyId,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Calcular totais de training pairs
    const trainingPairsTotals = {
      total: trainingPairsStats.reduce((acc, s) => acc + s._count, 0),
      validated: trainingPairsStats
        .filter(s => s.isValidated)
        .reduce((acc, s) => acc + s._count, 0),
      usedInTraining: trainingPairsStats
        .filter(s => s.usedInTraining)
        .reduce((acc, s) => acc + s._count, 0),
    };

    res.json({
      overview: {
        avgAIResolutionRate: metrics._avg.aiResolutionRate || 0,
        avgAIRating: metrics._avg.aiAvgRating || 0,
        avgAINps: metrics._avg.aiNpsScore || 0,
        totalTickets: metrics._sum.totalTickets || 0,
        aiHandledTickets: metrics._sum.aiHandledTickets || 0,
        humanHandledTickets: metrics._sum.humanHandledTickets || 0,
        aiToHumanTransfers: metrics._sum.aiToHumanTransfers || 0,
      },
      learning: {
        trainingPairs: trainingPairsTotals,
        patternsCount,
        templatesCount,
        newPatternsLearned: metrics._sum.newPatternsLearned || 0,
        newTrainingPairs: metrics._sum.newTrainingPairs || 0,
      },
      recentMetrics,
    });
  } catch (error: any) {
    logger.error('Failed to get ML dashboard', { error: error.message, companyId });
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// ===============================
// Training Pairs
// ===============================

/**
 * GET /api/ml-learning/training-pairs
 * Lista pares de treinamento
 */
router.get('/training-pairs', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const {
    page = '1',
    limit = '20',
    isValidated,
    usedInTraining,
    category,
    minQualityScore,
  } = req.query;

  try {
    const where: any = { companyId };

    if (isValidated !== undefined) {
      where.isValidated = isValidated === 'true';
    }
    if (usedInTraining !== undefined) {
      where.usedInTraining = usedInTraining === 'true';
    }
    if (category) {
      where.category = category;
    }
    if (minQualityScore) {
      where.qualityScore = { gte: parseFloat(minQualityScore as string) };
    }

    const [pairs, total] = await Promise.all([
      prisma.mLTrainingPair.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.mLTrainingPair.count({ where }),
    ]);

    res.json({
      data: pairs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    logger.error('Failed to list training pairs', { error: error.message });
    res.status(500).json({ error: 'Failed to list training pairs' });
  }
});

/**
 * POST /api/ml-learning/training-pairs/:id/validate
 * Valida um par de treinamento
 */
router.post('/training-pairs/:id/validate', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const userId = (req as any).userId;
  const { id } = req.params;
  const { approved, category, intent } = req.body;

  try {
    const pair = await prisma.mLTrainingPair.findFirst({
      where: { id, companyId },
    });

    if (!pair) {
      return res.status(404).json({ error: 'Training pair not found' });
    }

    const updated = await prisma.mLTrainingPair.update({
      where: { id },
      data: {
        isValidated: approved,
        validatedBy: userId,
        validatedAt: new Date(),
        category: category || pair.category,
        intent: intent || pair.intent,
      },
    });

    res.json(updated);
  } catch (error: any) {
    logger.error('Failed to validate training pair', { error: error.message });
    res.status(500).json({ error: 'Failed to validate training pair' });
  }
});

/**
 * POST /api/ml-learning/training-pairs/collect
 * Dispara coleta manual de training pairs
 */
router.post('/training-pairs/collect', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { hoursBack = 24, type = 'collect-recent' } = req.body;

  try {
    const job = await addMLTrainingCollectorJob({
      type: type as 'collect-recent' | 'collect-transfers',
      companyId,
      hoursBack,
    });

    res.json({
      message: 'Training pair collection job queued',
      jobId: job.id,
    });
  } catch (error: any) {
    logger.error('Failed to queue training collection', { error: error.message });
    res.status(500).json({ error: 'Failed to queue collection job' });
  }
});

// ===============================
// Intent Patterns
// ===============================

/**
 * GET /api/ml-learning/patterns
 * Lista padrões de intenção
 */
router.get('/patterns', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { category, isApproved, isActive } = req.query;

  try {
    const where: any = { companyId };

    if (category) where.category = category;
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const patterns = await prisma.mLIntentPattern.findMany({
      where,
      orderBy: [{ occurrenceCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        responseTemplates: {
          where: { isActive: true },
          take: 3,
        },
      },
    });

    res.json(patterns);
  } catch (error: any) {
    logger.error('Failed to list patterns', { error: error.message });
    res.status(500).json({ error: 'Failed to list patterns' });
  }
});

/**
 * POST /api/ml-learning/patterns/:id/approve
 * Aprova um padrão detectado
 */
router.post('/patterns/:id/approve', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const userId = (req as any).userId;
  const { id } = req.params;

  try {
    const pattern = await prisma.mLIntentPattern.findFirst({
      where: { id, companyId },
    });

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    const updated = await prisma.mLIntentPattern.update({
      where: { id },
      data: {
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error: any) {
    logger.error('Failed to approve pattern', { error: error.message });
    res.status(500).json({ error: 'Failed to approve pattern' });
  }
});

/**
 * PUT /api/ml-learning/patterns/:id
 * Atualiza um padrão
 */
router.put('/patterns/:id', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { id } = req.params;
  const { name, keywords, examplePhrases, suggestedResponseTemplate, isActive } = req.body;

  try {
    const pattern = await prisma.mLIntentPattern.findFirst({
      where: { id, companyId },
    });

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    const updated = await prisma.mLIntentPattern.update({
      where: { id },
      data: {
        name: name !== undefined ? name : pattern.name,
        keywords: keywords !== undefined ? keywords : pattern.keywords,
        examplePhrases: examplePhrases !== undefined ? examplePhrases : pattern.examplePhrases,
        suggestedResponseTemplate: suggestedResponseTemplate !== undefined
          ? suggestedResponseTemplate
          : pattern.suggestedResponseTemplate,
        isActive: isActive !== undefined ? isActive : pattern.isActive,
      },
    });

    res.json(updated);
  } catch (error: any) {
    logger.error('Failed to update pattern', { error: error.message });
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

/**
 * POST /api/ml-learning/patterns/detect
 * Dispara detecção de padrões
 */
router.post('/patterns/detect', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { minOccurrences = 3, minQualityScore = 60 } = req.body;

  try {
    const job = await addMLPatternDetectorJob({
      type: 'detect-patterns',
      companyId,
      minOccurrences,
      minQualityScore,
    });

    res.json({
      message: 'Pattern detection job queued',
      jobId: job.id,
    });
  } catch (error: any) {
    logger.error('Failed to queue pattern detection', { error: error.message });
    res.status(500).json({ error: 'Failed to queue detection job' });
  }
});

// ===============================
// Response Templates
// ===============================

/**
 * GET /api/ml-learning/templates
 * Lista templates de resposta
 */
router.get('/templates', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { category, intent, isApproved, isActive } = req.query;

  try {
    const where: any = { companyId };

    if (category) where.category = category;
    if (intent) where.intent = intent;
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const templates = await prisma.mLResponseTemplate.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(templates);
  } catch (error: any) {
    logger.error('Failed to list templates', { error: error.message });
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/**
 * POST /api/ml-learning/templates
 * Cria um novo template manualmente
 */
router.post('/templates', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { name, category, intent, template, variables } = req.body;

  try {
    if (!name || !category || !template) {
      return res.status(400).json({ error: 'Name, category and template are required' });
    }

    const newTemplate = await prisma.mLResponseTemplate.create({
      data: {
        companyId,
        name,
        category,
        intent,
        template,
        variables: variables || {},
        templateEmbedding: [],
        sourceType: 'MANUAL',
        isApproved: true, // Manuais são automaticamente aprovados
      },
    });

    res.status(201).json(newTemplate);
  } catch (error: any) {
    logger.error('Failed to create template', { error: error.message });
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * PUT /api/ml-learning/templates/:id
 * Atualiza um template
 */
router.put('/templates/:id', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { id } = req.params;
  const { name, template, variables, isActive, isApproved } = req.body;

  try {
    const existing = await prisma.mLResponseTemplate.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updated = await prisma.mLResponseTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        template: template !== undefined ? template : existing.template,
        variables: variables !== undefined ? variables : existing.variables,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        isApproved: isApproved !== undefined ? isApproved : existing.isApproved,
      },
    });

    res.json(updated);
  } catch (error: any) {
    logger.error('Failed to update template', { error: error.message });
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/ml-learning/templates/:id
 * Remove um template
 */
router.delete('/templates/:id', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { id } = req.params;

  try {
    const template = await prisma.mLResponseTemplate.findFirst({
      where: { id, companyId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await prisma.mLResponseTemplate.delete({ where: { id } });

    res.json({ message: 'Template deleted' });
  } catch (error: any) {
    logger.error('Failed to delete template', { error: error.message });
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ===============================
// Response Generation
// ===============================

/**
 * POST /api/ml-learning/generate-response
 * Gera respostas usando o sistema de ML
 */
router.post('/generate-response', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const {
    message,
    ticketId,
    category,
    intent,
    contactName,
    previousMessages,
    maxCandidates = 3,
  } = req.body;

  try {
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const services = await getMLServices(companyId);

    const responses = await services.responseGenerator.generateResponses(
      message,
      companyId,
      {
        ticketId,
        category,
        intent,
        contactName,
        previousMessages,
        maxCandidates,
        useTemplates: true,
        useLearnedPatterns: true,
        useKnowledgeBase: true,
      }
    );

    res.json({
      responses,
      count: responses.length,
    });
  } catch (error: any) {
    logger.error('Failed to generate responses', { error: error.message });
    res.status(500).json({ error: 'Failed to generate responses' });
  }
});

/**
 * POST /api/ml-learning/classify-intent
 * Classifica a intenção de uma mensagem
 */
router.post('/classify-intent', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { message, previousMessages } = req.body;

  try {
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const services = await getMLServices(companyId);

    const classification = await services.intentClassifier.classify(
      message,
      companyId,
      { previousMessages }
    );

    res.json(classification);
  } catch (error: any) {
    logger.error('Failed to classify intent', { error: error.message });
    res.status(500).json({ error: 'Failed to classify intent' });
  }
});

// ===============================
// Training Jobs
// ===============================

/**
 * POST /api/ml-learning/train
 * Dispara treinamento completo
 */
router.post('/train', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { minOccurrences = 5, minQualityScore = 70, autoApprove = false } = req.body;

  try {
    const job = await addMLPatternDetectorJob({
      type: 'full-training',
      companyId,
      minOccurrences,
      minQualityScore,
      autoApprove,
    });

    res.json({
      message: 'Training job queued',
      jobId: job.id,
    });
  } catch (error: any) {
    logger.error('Failed to queue training', { error: error.message });
    res.status(500).json({ error: 'Failed to queue training job' });
  }
});

/**
 * POST /api/ml-learning/score-pairs
 * Dispara avaliação de qualidade dos pares
 */
router.post('/score-pairs', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { limit = 50 } = req.body;

  try {
    const job = await addMLQualityScorerJob({
      type: 'score-pending',
      companyId,
      limit,
    });

    res.json({
      message: 'Quality scoring job queued',
      jobId: job.id,
    });
  } catch (error: any) {
    logger.error('Failed to queue scoring', { error: error.message });
    res.status(500).json({ error: 'Failed to queue scoring job' });
  }
});

/**
 * POST /api/ml-learning/calculate-metrics
 * Dispara cálculo de métricas
 */
router.post('/calculate-metrics', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { date } = req.body;

  try {
    const job = await addMLMetricsJob({
      type: 'calculate-daily',
      companyId,
      date,
    });

    res.json({
      message: 'Metrics calculation job queued',
      jobId: job.id,
    });
  } catch (error: any) {
    logger.error('Failed to queue metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to queue metrics job' });
  }
});

// ===============================
// Model Versions
// ===============================

/**
 * GET /api/ml-learning/model-versions
 * Lista versões de modelos
 */
router.get('/model-versions', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;
  const { modelType, isActive } = req.query;

  try {
    const where: any = { companyId };

    if (modelType) where.modelType = modelType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const versions = await prisma.mLModelVersion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(versions);
  } catch (error: any) {
    logger.error('Failed to list model versions', { error: error.message });
    res.status(500).json({ error: 'Failed to list model versions' });
  }
});

/**
 * GET /api/ml-learning/training-batches
 * Lista batches de treinamento
 */
router.get('/training-batches', async (req: Request, res: Response) => {
  const companyId = (req as any).companyId;

  try {
    const batches = await prisma.mLTrainingBatch.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(batches);
  } catch (error: any) {
    logger.error('Failed to list training batches', { error: error.message });
    res.status(500).json({ error: 'Failed to list training batches' });
  }
});

export default router;
