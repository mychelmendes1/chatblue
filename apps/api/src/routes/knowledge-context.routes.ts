import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';
import { logger } from '../config/logger.js';
import { KnowledgeIngestionService } from '../services/knowledge/ingestion.service.js';
import { NotionService } from '../services/notion/notion.service.js';
import { EmbeddingService } from '../services/knowledge/embedding.service.js';

const router = Router();

// Validation schemas
const createContextSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  slug: z.string().min(1, 'Slug is required'),
  systemPrompt: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  aiAgentIds: z.array(z.string()).optional(),
  priority: z.number().optional(),
});

const updateContextSchema = createContextSchema.partial();

const createSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['TEXT', 'PDF', 'NOTION', 'URL', 'DOCX', 'CSV', 'JSON']),
  sourceUrl: z.string().url().optional(),
  filePath: z.string().optional(),
  content: z.string().optional(),
});

// Get all knowledge contexts
router.get('/contexts', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const contexts = await prisma.knowledgeContext.findMany({
      where: {
        companyId: req.user!.companyId,
      },
      include: {
        sources: {
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: { sources: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });

    res.json(contexts);
  } catch (error) {
    next(error);
  }
});

// Get single knowledge context
router.get('/contexts/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const context = await prisma.knowledgeContext.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: {
        sources: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!context) {
      throw new NotFoundError('Knowledge context not found');
    }

    res.json(context);
  } catch (error) {
    next(error);
  }
});

// Create knowledge context
router.post('/contexts', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createContextSchema.parse(req.body);

    // Check if slug already exists for this company
    const existing = await prisma.knowledgeContext.findFirst({
      where: {
        companyId: req.user!.companyId,
        slug: data.slug,
      },
    });

    if (existing) {
      throw new ValidationError('Slug already exists for this company');
    }

    const context = await prisma.knowledgeContext.create({
      data: {
        ...data,
        company: { connect: { id: req.user!.companyId } },
      } as any,
    });

    logger.info(`Knowledge context created: ${context.id}`);
    res.status(201).json(context);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

// Update knowledge context
router.put('/contexts/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = updateContextSchema.parse(req.body);

    // Check if context exists and belongs to company
    const existing = await prisma.knowledgeContext.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Knowledge context not found');
    }

    // Check if slug conflicts
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.knowledgeContext.findFirst({
        where: {
          companyId: req.user!.companyId,
          slug: data.slug,
          id: { not: req.params.id },
        },
      });

      if (slugExists) {
        throw new ValidationError('Slug already exists for this company');
      }
    }

    const context = await prisma.knowledgeContext.update({
      where: { id: req.params.id },
      data,
    });

    logger.info(`Knowledge context updated: ${context.id}`);
    res.json(context);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

// Delete knowledge context
router.delete('/contexts/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const existing = await prisma.knowledgeContext.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Knowledge context not found');
    }

    await prisma.knowledgeContext.delete({
      where: { id: req.params.id },
    });

    logger.info(`Knowledge context deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Add source to context
router.post('/contexts/:contextId/sources', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const { contextId } = req.params;
    const data = createSourceSchema.parse(req.body);

    // Verify context belongs to company
    const context = await prisma.knowledgeContext.findFirst({
      where: {
        id: contextId,
        companyId: req.user!.companyId,
      },
    });

    if (!context) {
      throw new NotFoundError('Context not found');
    }

    // Validate source data based on type
    if (data.type === 'NOTION' && !data.sourceUrl) {
      throw new ValidationError('NOTION sources require sourceUrl');
    }

    if ((data.type === 'PDF' || data.type === 'DOCX' || data.type === 'CSV') && !data.filePath) {
      throw new ValidationError(`${data.type} sources require filePath`);
    }

    if (data.type === 'TEXT' && !data.content && !data.filePath) {
      throw new ValidationError('TEXT sources require content or filePath');
    }

    // Create source
    const source = await prisma.knowledgeSource.create({
      data: {
        ...data,
        context: { connect: { id: contextId } },
        company: { connect: { id: req.user!.companyId } },
        status: 'PENDING',
      } as any,
    });

    // Process source in background
    processSourceInBackground(source.id, data, req.user!.companyId).catch((err) => {
      logger.error('Error processing source in background:', err);
    });

    logger.info(`Knowledge source created: ${source.id}`);
    res.status(201).json(source);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError(error.errors[0]?.message || 'Validation failed'));
    } else {
      next(error);
    }
  }
});

// Process source in background
async function processSourceInBackground(
  sourceId: string,
  data: any,
  companyId: string
) {
  try {
    // Get source with context and company settings
    const source = await prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
      include: {
        context: {
          include: {
            company: {
              include: {
                settings: true,
              },
            },
          },
        },
      },
    });

    if (!source) {
      logger.error(`Source ${sourceId} not found for processing`);
      return;
    }

    // Update status to PROCESSING
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { status: 'PROCESSING' },
    });

    const settings = source.context.company.settings;
    const notionService = settings?.notionApiKey
      ? new NotionService(settings.notionApiKey)
      : undefined;

    const ingestionService = new KnowledgeIngestionService();
    const { content, metadata } = await ingestionService.processSource(
      source,
      notionService
    );

    // Save processed content
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        content,
        metadata,
        status: 'COMPLETED',
      },
    });

    // Create chunks and generate embeddings
    const chunks = await ingestionService.chunkContent(content);
    
    // Generate embeddings if AI is enabled and API key is available
    let embeddings: number[][] = [];
    if (settings?.aiEnabled && settings?.aiApiKey) {
      try {
        const embeddingService = new EmbeddingService(
          (settings.aiProvider as any) || 'openai',
          settings.aiApiKey
        );
        embeddings = await embeddingService.generateEmbeddings(chunks);
        logger.info(`Generated ${embeddings.length} embeddings for source ${sourceId}`);
      } catch (embeddingError: any) {
        logger.warn(`Failed to generate embeddings for source ${sourceId}:`, {
          error: embeddingError?.message,
        });
        // Continue without embeddings - search will fallback to keyword search
      }
    }

    // Create chunks with embeddings
    await prisma.knowledgeChunk.createMany({
      data: chunks.map((chunk, index) => ({
        sourceId,
        content: chunk,
        embedding: embeddings[index] ? JSON.stringify(embeddings[index]) : null,
        metadata: {
          chunkIndex: index,
          startChar: index * 1000,
          endChar: (index + 1) * 1000,
        },
      })),
    });

    logger.info(`Source ${sourceId} processed successfully with ${chunks.length} chunks${embeddings.length > 0 ? ` and ${embeddings.length} embeddings` : ''}`);
  } catch (error: any) {
    logger.error(`Error processing source ${sourceId}:`, error);
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        status: 'FAILED',
        error: error?.message || 'Unknown error',
      },
    });
  }
}

// Get source
router.get('/sources/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const source = await prisma.knowledgeSource.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: {
        context: true,
      },
    });

    if (!source) {
      throw new NotFoundError('Knowledge source not found');
    }

    res.json(source);
  } catch (error) {
    next(error);
  }
});

// Delete source
router.delete('/sources/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const existing = await prisma.knowledgeSource.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Knowledge source not found');
    }

    await prisma.knowledgeSource.delete({
      where: { id: req.params.id },
    });

    logger.info(`Knowledge source deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Reprocess source
router.post('/sources/:id/reprocess', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const source = await prisma.knowledgeSource.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!source) {
      throw new NotFoundError('Knowledge source not found');
    }

    // Process in background
    processSourceInBackground(source.id, source, req.user!.companyId).catch((err) => {
      logger.error('Error reprocessing source:', err);
    });

    res.json({ message: 'Source reprocessing started' });
  } catch (error) {
    next(error);
  }
});

export { router as knowledgeContextRouter };

