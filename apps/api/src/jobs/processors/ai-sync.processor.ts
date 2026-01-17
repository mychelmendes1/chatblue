import { Job } from 'bullmq';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { createDataSourceSyncService } from '../../services/ai/data-source-sync.service.js';

/**
 * Process AI data source sync jobs
 */
export async function processAISync(job: Job<{ dataSourceId?: string; companyId?: string }>) {
  const { dataSourceId, companyId } = job.data;

  logger.info('Processing AI sync job', { dataSourceId, companyId, jobId: job.id });

  try {
    if (dataSourceId) {
      // Sync specific data source
      await syncDataSource(dataSourceId);
    } else if (companyId) {
      // Sync all data sources for a company
      await syncCompanyDataSources(companyId);
    } else {
      // Sync all data sources that are due
      await syncDueDataSources();
    }

    return { success: true };
  } catch (error: any) {
    logger.error('AI sync job failed', { error: error.message, dataSourceId, companyId });
    throw error;
  }
}

/**
 * Sync a specific data source
 */
async function syncDataSource(dataSourceId: string) {
  const dataSource = await prisma.aIDataSource.findUnique({
    where: { id: dataSourceId },
    include: {
      company: {
        include: { settings: true },
      },
    },
  });

  if (!dataSource || !dataSource.isActive || !dataSource.syncEnabled) {
    logger.info('Data source not eligible for sync', { dataSourceId });
    return;
  }

  const settings = dataSource.company.settings;
  if (!settings?.aiApiKey) {
    logger.warn('AI not configured for company', { companyId: dataSource.companyId });
    return;
  }

  const syncService = createDataSourceSyncService(
    settings.aiProvider || 'openai',
    settings.aiApiKey
  );

  const result = await syncService.syncDataSource(dataSourceId);

  logger.info('Data source synced', {
    dataSourceId,
    added: result.documentsAdded,
    updated: result.documentsUpdated,
    removed: result.documentsRemoved,
    errors: result.errors.length,
  });
}

/**
 * Sync all data sources for a company
 */
async function syncCompanyDataSources(companyId: string) {
  const dataSources = await prisma.aIDataSource.findMany({
    where: {
      companyId,
      isActive: true,
      syncEnabled: true,
    },
    select: { id: true },
  });

  for (const ds of dataSources) {
    try {
      await syncDataSource(ds.id);
    } catch (error: any) {
      logger.error('Failed to sync data source', {
        dataSourceId: ds.id,
        error: error.message,
      });
    }
  }
}

/**
 * Sync all data sources that are due for sync
 */
async function syncDueDataSources() {
  const now = new Date();

  // Find data sources that need to be synced
  const dataSources = await prisma.aIDataSource.findMany({
    where: {
      isActive: true,
      syncEnabled: true,
      OR: [
        { lastSyncAt: null }, // Never synced
        {
          // Last sync + interval < now
          lastSyncAt: {
            lt: new Date(now.getTime() - 60 * 60 * 1000), // At least 1 hour ago
          },
        },
      ],
    },
    include: {
      company: {
        include: { settings: true },
      },
    },
    orderBy: { lastSyncAt: 'asc' },
    take: 10, // Process max 10 at a time
  });

  for (const ds of dataSources) {
    // Check if sync interval has passed
    const intervalMs = (ds.syncInterval || 60) * 60 * 1000; // Convert minutes to ms
    const lastSync = ds.lastSyncAt ? new Date(ds.lastSyncAt).getTime() : 0;

    if (now.getTime() - lastSync < intervalMs) {
      continue; // Not due yet
    }

    try {
      await syncDataSource(ds.id);
    } catch (error: any) {
      logger.error('Failed to sync data source', {
        dataSourceId: ds.id,
        error: error.message,
      });
    }
  }
}

/**
 * Process sentiment analysis for new messages
 */
export async function processSentimentAnalysis(
  job: Job<{ messageId: string; ticketId: string; companyId: string; content: string }>
) {
  const { messageId, ticketId, companyId, content } = job.data;

  try {
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!settings?.aiEnabled || !settings.aiApiKey) {
      return { success: false, reason: 'AI not configured' };
    }

    const { aiAssistantService } = await import('../../services/ai/assistant.service.js');

    await aiAssistantService.analyzeSentiment(content, ticketId, messageId, companyId);

    return { success: true };
  } catch (error: any) {
    logger.error('Sentiment analysis failed', {
      messageId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Process auto-suggestion generation
 */
export async function processAutoSuggestion(
  job: Job<{ message: string; ticketId: string; userId: string; companyId: string }>
) {
  const { message, ticketId, userId, companyId } = job.data;

  try {
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!settings?.aiEnabled || !settings.aiApiKey) {
      return { success: false, reason: 'AI not configured' };
    }

    const { aiAssistantService } = await import('../../services/ai/assistant.service.js');

    const suggestion = await aiAssistantService.generateAutoSuggestion({
      message,
      ticketId,
      userId,
      companyId,
    });

    return { success: true, suggestion };
  } catch (error: any) {
    logger.error('Auto-suggestion generation failed', {
      ticketId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Process document indexing
 */
export async function processDocumentIndexing(job: Job<{ documentId: string }>) {
  const { documentId } = job.data;

  try {
    const document = await prisma.aIDocument.findUnique({
      where: { id: documentId },
      include: {
        dataSource: {
          include: {
            company: {
              include: { settings: true },
            },
          },
        },
      },
    });

    if (!document) {
      return { success: false, reason: 'Document not found' };
    }

    const settings = document.dataSource.company.settings;
    if (!settings?.aiApiKey) {
      return { success: false, reason: 'AI not configured' };
    }

    const { EmbeddingService } = await import('../../services/ai/embedding.service.js');
    const embeddingService = new EmbeddingService(
      settings.aiProvider || 'openai',
      settings.aiApiKey
    );

    await embeddingService.indexDocument(documentId);

    return { success: true };
  } catch (error: any) {
    logger.error('Document indexing failed', {
      documentId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Analyze and detect knowledge gaps
 */
export async function processKnowledgeGapAnalysis(job: Job<{ companyId: string }>) {
  const { companyId } = job.data;

  try {
    // Get queries with low ratings or that weren't used
    const problematicQueries = await prisma.aIAssistantQuery.findMany({
      where: {
        companyId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
        OR: [
          { rating: { lte: 2 } },
          { wasUsed: false, status: 'COMPLETED' },
          { hasKnowledgeGap: true },
        ],
      },
      select: {
        query: true,
        rating: true,
        wasUsed: true,
        hasKnowledgeGap: true,
        gapDescription: true,
      },
    });

    // Group similar queries
    const queryGroups = new Map<string, string[]>();
    for (const q of problematicQueries) {
      const keywords = q.query.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
      const existing = queryGroups.get(keywords) || [];
      existing.push(q.query);
      queryGroups.set(keywords, existing);
    }

    // Create or update gaps for groups with multiple queries
    for (const [topic, queries] of queryGroups) {
      if (queries.length < 2) continue;

      const existing = await prisma.aIKnowledgeGap.findFirst({
        where: {
          companyId,
          topic: { startsWith: topic.substring(0, 20) },
          status: { in: ['pending', 'in_progress'] },
        },
      });

      if (existing) {
        await prisma.aIKnowledgeGap.update({
          where: { id: existing.id },
          data: {
            frequency: { increment: queries.length },
            sampleQueries: {
              push: queries.slice(0, 5),
            },
          },
        });
      } else {
        await prisma.aIKnowledgeGap.create({
          data: {
            topic,
            description: `${queries.length} consultas relacionadas não respondidas adequadamente`,
            frequency: queries.length,
            sampleQueries: queries.slice(0, 5),
            companyId,
          },
        });
      }
    }

    logger.info('Knowledge gap analysis completed', {
      companyId,
      queriesAnalyzed: problematicQueries.length,
      gapsIdentified: queryGroups.size,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('Knowledge gap analysis failed', {
      companyId,
      error: error.message,
    });
    throw error;
  }
}
