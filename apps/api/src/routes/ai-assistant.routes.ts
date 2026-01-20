import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { aiAssistantService } from '../services/ai/assistant.service.js';
import { createDataSourceSyncService } from '../services/ai/data-source-sync.service.js';
import { EmbeddingService } from '../services/ai/embedding.service.js';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(ensureTenant);

// Schemas de validação
const querySchema = z.object({
  query: z.string().min(1).max(2000),
  ticketId: z.string(),
  selectedCategory: z.string().optional(),
  includeContext: z.boolean().optional().default(true),
});

const feedbackSchema = z.object({
  wasUsed: z.boolean(),
  wasEdited: z.boolean().optional().default(false),
  editedResponse: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  ratingComment: z.string().max(500).optional(),
});

const dataSourceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['INTERNAL', 'NOTION', 'GOOGLE_DRIVE', 'CONFLUENCE', 'SHAREPOINT', 'EXTERNAL_API', 'WEBSITE']),
  description: z.string().max(500).optional(),
  config: z.record(z.any()).optional().default({}),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  priority: z.number().optional().default(0),
  icon: z.string().optional(),
  color: z.string().optional(),
  syncEnabled: z.boolean().optional().default(true),
  syncInterval: z.number().optional().default(60),
});

const agentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1).max(10000),
  provider: z.enum(['openai', 'anthropic']),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(100).max(4000).optional().default(1500),
  tone: z.enum(['friendly', 'formal', 'technical', 'empathetic']).optional(),
  style: z.enum(['concise', 'detailed', 'conversational']).optional(),
  rules: z.record(z.any()).optional().default({}),
  triggerKeywords: z.array(z.string()).optional().default([]),
  priority: z.number().optional().default(0),
  icon: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  dataSourceIds: z.array(z.string()).optional().default([]),
});

const documentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  dataSourceId: z.string(),
  departmentId: z.string().optional(),
});

// ========================================
// AI ASSISTANT QUERIES
// ========================================

/**
 * POST /api/ai-assistant/query
 * Process a @ia query
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const companyId = user.companyId;

    const data = querySchema.parse(req.body);

    const result = await aiAssistantService.processQuery({
      query: data.query,
      ticketId: data.ticketId,
      userId: user.userId,
      companyId,
      selectedCategory: data.selectedCategory,
      includeContext: data.includeContext,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('AI query error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    res.status(500).json({ error: error.message || 'Failed to process query' });
  }
});

/**
 * GET /api/ai-assistant/query/:queryId
 * Get query status and details
 */
router.get('/query/:queryId', async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;
    const companyId = (req as any).user.companyId;

    const query = await aiAssistantService.getQueryStatus(queryId);

    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    if (query.companyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(query);
  } catch (error: any) {
    logger.error('Get query error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-assistant/query/:queryId/feedback
 * Submit feedback for a query
 */
router.post('/query/:queryId/feedback', async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;
    const data = feedbackSchema.parse(req.body);

    await aiAssistantService.submitFeedback({
      queryId,
      ...data,
      wasUsed: data.wasUsed ?? false,
      wasEdited: data.wasEdited ?? false,
    } as any);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Feedback error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid feedback data', details: error.errors });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-assistant/categories
 * Get available AI categories for the company
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const categories = await aiAssistantService.getAvailableCategories(companyId);
    res.json(categories);
  } catch (error: any) {
    logger.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-assistant/ticket/:ticketId/history
 * Get AI query history for a ticket
 */
router.get('/ticket/:ticketId/history', async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const history = await aiAssistantService.getTicketQueryHistory(ticketId);
    res.json(history);
  } catch (error: any) {
    logger.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-assistant/analytics
 * Get AI assistant analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const analytics = await aiAssistantService.getAnalytics(companyId, start, end);
    res.json(analytics);
  } catch (error: any) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// KNOWLEDGE GAPS
// ========================================

/**
 * GET /api/ai-assistant/gaps
 * Get knowledge gaps
 */
router.get('/gaps', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const { status, limit } = req.query;

    const gaps = await aiAssistantService.getKnowledgeGaps(
      companyId,
      status as string | undefined,
      limit ? parseInt(limit as string) : 20
    );

    res.json(gaps);
  } catch (error: any) {
    logger.error('Get gaps error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/ai-assistant/gaps/:gapId
 * Update knowledge gap status
 */
router.put('/gaps/:gapId', async (req: Request, res: Response) => {
  try {
    const { gapId } = req.params;
    const { status } = req.body;
    const user = (req as any).user;

    await aiAssistantService.updateKnowledgeGapStatus(gapId, status, user.userId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Update gap error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// DATA SOURCES
// ========================================

/**
 * GET /api/ai-assistant/data-sources
 * List all data sources for the company
 */
router.get('/data-sources', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;

    const dataSources = await prisma.aIDataSource.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            documents: { where: { isActive: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });

    res.json(dataSources);
  } catch (error: any) {
    logger.error('Get data sources error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-assistant/data-sources
 * Create a new data source
 */
router.post('/data-sources', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const data = dataSourceSchema.parse(req.body);

    const dataSource = await prisma.aIDataSource.create({
      data: {
        ...data,
        company: { connect: { id: companyId } },
      } as any,
    });

    res.status(201).json(dataSource);
  } catch (error: any) {
    logger.error('Create data source error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-assistant/data-sources/:id
 * Get a specific data source
 */
router.get('/data-sources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    const dataSource = await prisma.aIDataSource.findFirst({
      where: { id, companyId },
      include: {
        documents: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        },
        agentConfigs: {
          include: {
            agentConfig: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    res.json(dataSource);
  } catch (error: any) {
    logger.error('Get data source error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/ai-assistant/data-sources/:id
 * Update a data source
 */
router.put('/data-sources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;
    const data = dataSourceSchema.partial().parse(req.body);

    const dataSource = await prisma.aIDataSource.updateMany({
      where: { id, companyId },
      data,
    });

    if (dataSource.count === 0) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    const updated = await prisma.aIDataSource.findUnique({ where: { id } });
    res.json(updated);
  } catch (error: any) {
    logger.error('Update data source error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai-assistant/data-sources/:id
 * Delete a data source
 */
router.delete('/data-sources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    await prisma.aIDataSource.deleteMany({
      where: { id, companyId },
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete data source error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-assistant/data-sources/:id/sync
 * Manually trigger sync for a data source
 */
router.post('/data-sources/:id/sync', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    const dataSource = await prisma.aIDataSource.findFirst({
      where: { id, companyId },
      include: {
        company: {
          include: { settings: true },
        },
      },
    });

    if (!dataSource) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    const settings = dataSource.company.settings;
    const syncService = createDataSourceSyncService(
      settings?.aiProvider || 'openai',
      settings?.aiApiKey || ''
    );

    const result = await syncService.syncDataSource(id);

    res.json(result);
  } catch (error: any) {
    logger.error('Sync data source error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// DOCUMENTS
// ========================================

/**
 * GET /api/ai-assistant/documents
 * List documents with filters
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const { dataSourceId, category, status, search, page = '1', limit = '20' } = req.query;

    const where: any = {
      companyId,
      isActive: true,
    };

    if (dataSourceId) where.dataSourceId = dataSourceId;
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.aIDocument.findMany({
        where,
        include: {
          dataSource: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.aIDocument.count({ where }),
    ]);

    res.json({
      documents,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    logger.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-assistant/documents
 * Create a new document
 */
router.post('/documents', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const data = documentSchema.parse(req.body);

    // Verify data source belongs to company
    const dataSource = await prisma.aIDataSource.findFirst({
      where: { id: data.dataSourceId, companyId },
    });

    if (!dataSource) {
      return res.status(400).json({ error: 'Invalid data source' });
    }

    const document = await prisma.aIDocument.create({
      data: {
        ...data,
        company: { connect: { id: companyId } },
        status: 'PENDING',
      } as any,
    });

    // Trigger indexing
    try {
      const settings = await prisma.companySettings.findUnique({ where: { companyId } });
      if (settings?.aiApiKey) {
        const embeddingService = new EmbeddingService(
          settings.aiProvider || 'openai',
          settings.aiApiKey
        );
        await embeddingService.indexDocument(document.id);
      }
    } catch (indexError: any) {
      logger.warn('Document created but indexing failed:', indexError.message);
    }

    res.status(201).json(document);
  } catch (error: any) {
    logger.error('Create document error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/ai-assistant/documents/:id
 * Update a document
 */
router.put('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;
    const data = documentSchema.partial().parse(req.body);

    const document = await prisma.aIDocument.updateMany({
      where: { id, companyId },
      data: {
        ...data,
        status: 'PENDING', // Re-index needed after update
      },
    });

    if (document.count === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Trigger re-indexing
    try {
      const settings = await prisma.companySettings.findUnique({ where: { companyId } });
      if (settings?.aiApiKey) {
        const embeddingService = new EmbeddingService(
          settings.aiProvider || 'openai',
          settings.aiApiKey
        );
        await embeddingService.indexDocument(id);
      }
    } catch (indexError: any) {
      logger.warn('Document updated but re-indexing failed:', indexError.message);
    }

    const updated = await prisma.aIDocument.findUnique({ where: { id } });
    res.json(updated);
  } catch (error: any) {
    logger.error('Update document error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai-assistant/documents/:id
 * Delete a document
 */
router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    await prisma.aIDocument.updateMany({
      where: { id, companyId },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete document error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-assistant/documents/:id/reindex
 * Reindex a specific document
 */
router.post('/documents/:id/reindex', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    const document = await prisma.aIDocument.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    if (!settings?.aiApiKey) {
      return res.status(400).json({ error: 'AI not configured' });
    }

    const embeddingService = new EmbeddingService(
      settings.aiProvider || 'openai',
      settings.aiApiKey
    );

    await embeddingService.indexDocument(id);

    const updated = await prisma.aIDocument.findUnique({ where: { id } });
    res.json(updated);
  } catch (error: any) {
    logger.error('Reindex document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// AGENT CONFIGS
// ========================================

/**
 * GET /api/ai-assistant/agent-configs
 * List all AI agent configurations
 */
router.get('/agent-configs', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;

    const configs = await prisma.aIAgentConfig.findMany({
      where: { companyId },
      include: {
        dataSources: {
          include: {
            dataSource: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        _count: {
          select: { queries: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { priority: 'desc' }, { name: 'asc' }],
    });

    res.json(configs);
  } catch (error: any) {
    logger.error('Get agent configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-assistant/agent-configs
 * Create a new AI agent configuration
 */
router.post('/agent-configs', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId;
    const data = agentConfigSchema.parse(req.body);

    const { dataSourceIds, ...configData } = data;

    // If this is set as default, remove default from others
    if (data.isDefault) {
      await prisma.aIAgentConfig.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await prisma.aIAgentConfig.create({
      data: {
        ...configData,
        company: { connect: { id: companyId } },
        dataSources: {
          create: dataSourceIds.map((dsId, index) => ({
            dataSourceId: dsId,
            weight: dataSourceIds.length - index, // Higher weight for first items
          })),
        },
      } as any,
      include: {
        dataSources: {
          include: {
            dataSource: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });

    // Clear orchestrator cache
    aiAssistantService.clearCache(companyId);

    res.status(201).json(config);
  } catch (error: any) {
    logger.error('Create agent config error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category already exists' });
    }

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-assistant/agent-configs/:id
 * Get a specific AI agent configuration
 */
router.get('/agent-configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    const config = await prisma.aIAgentConfig.findFirst({
      where: { id, companyId },
      include: {
        dataSources: {
          include: {
            dataSource: true,
          },
        },
      },
    });

    if (!config) {
      return res.status(404).json({ error: 'Agent config not found' });
    }

    res.json(config);
  } catch (error: any) {
    logger.error('Get agent config error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/ai-assistant/agent-configs/:id
 * Update an AI agent configuration
 */
router.put('/agent-configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;
    const data = agentConfigSchema.partial().parse(req.body);

    const { dataSourceIds, ...configData } = data;

    // If this is set as default, remove default from others
    if (data.isDefault) {
      await prisma.aIAgentConfig.updateMany({
        where: { companyId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Update config
    const config = await prisma.aIAgentConfig.update({
      where: { id },
      data: configData,
    });

    // Update data source associations if provided
    if (dataSourceIds !== undefined) {
      // Remove existing associations
      await prisma.aIAgentDataSource.deleteMany({
        where: { agentConfigId: id },
      });

      // Create new associations
      if (dataSourceIds.length > 0) {
        await prisma.aIAgentDataSource.createMany({
          data: dataSourceIds.map((dsId, index) => ({
            agentConfigId: id,
            dataSourceId: dsId,
            weight: dataSourceIds.length - index,
          })),
        });
      }
    }

    // Clear orchestrator cache
    aiAssistantService.clearCache(companyId);

    const updated = await prisma.aIAgentConfig.findUnique({
      where: { id },
      include: {
        dataSources: {
          include: {
            dataSource: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });

    res.json(updated);
  } catch (error: any) {
    logger.error('Update agent config error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category already exists' });
    }

    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai-assistant/agent-configs/:id
 * Delete an AI agent configuration
 */
router.delete('/agent-configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;

    await prisma.aIAgentConfig.deleteMany({
      where: { id, companyId },
    });

    // Clear orchestrator cache
    aiAssistantService.clearCache(companyId);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete agent config error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-assistant/agent-configs/:id/test
 * Test an AI agent with a sample query
 */
router.post('/agent-configs/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user.companyId;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const config = await prisma.aIAgentConfig.findFirst({
      where: { id, companyId },
    });

    if (!config) {
      return res.status(404).json({ error: 'Agent config not found' });
    }

    // Get company settings
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!settings?.aiApiKey) {
      return res.status(400).json({ error: 'AI not configured' });
    }

    // Simple test - use the AI to generate a response
    const { OrchestratorService } = await import('../services/ai/orchestrator.service.js');
    const orchestrator = new OrchestratorService(settings.aiProvider || 'openai', settings.aiApiKey);

    const result = await orchestrator.processQuery(
      query,
      {
        ticketId: 'test',
        companyId,
        userId: 'test',
      },
      config.category
    );

    res.json({
      response: result.suggestedResponse,
      category: result.category,
      confidence: result.confidence,
      documentsFound: result.relevantDocuments.length,
      processingTime: result.processingMetrics.totalTime,
    });
  } catch (error: any) {
    logger.error('Test agent config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// MODELS
// ========================================

/**
 * GET /api/ai-assistant/models
 * Get available AI models
 */
router.get('/models', async (req: Request, res: Response) => {
  const models = {
    openai: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'Modelo mais capaz da OpenAI' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Modelo otimizado multimodal' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Versão mais rápida e econômica' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Modelo rápido e econômico' },
    ],
    anthropic: [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Modelo mais inteligente da Anthropic' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Equilibrio entre capacidade e velocidade' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Excelente equilíbrio' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Modelo mais rápido e econômico' },
    ],
  };

  res.json(models);
});

export default router;
