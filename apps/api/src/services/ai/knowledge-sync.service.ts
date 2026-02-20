/**
 * Service for auto-syncing KB articles and FAQ items to AIDocument.
 * Called automatically when KB/FAQ items are created, updated, or deleted.
 */
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

/**
 * Find or create the INTERNAL data source for a company.
 * Each company has one INTERNAL data source that stores synced KB + FAQ docs.
 */
async function getOrCreateInternalDataSource(companyId: string): Promise<string> {
  let dataSource = await prisma.aIDataSource.findFirst({
    where: {
      companyId,
      type: 'INTERNAL',
    },
    select: { id: true },
  });

  if (!dataSource) {
    dataSource = await prisma.aIDataSource.create({
      data: {
        name: 'Base Interna (KB + FAQ)',
        type: 'INTERNAL',
        description: 'Sincronização automática de artigos da Base de Conhecimento e FAQ',
        config: {},
        syncEnabled: true,
        isActive: true,
        companyId,
      },
      select: { id: true },
    });
    logger.info(`Created INTERNAL data source for company ${companyId}: ${dataSource.id}`);
  }

  return dataSource.id;
}

/**
 * Sync a single Knowledge Base article to AIDocument
 */
export async function syncKnowledgeBaseItem(
  articleId: string,
  companyId: string,
  departmentId?: string | null
): Promise<void> {
  try {
    const article = await prisma.knowledgeBase.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      logger.warn(`KB article ${articleId} not found for sync`);
      return;
    }

    const dataSourceId = await getOrCreateInternalDataSource(companyId);
    const externalId = `kb-${articleId}`;
    const checksum = crypto.createHash('md5').update(article.content).digest('hex');

    const existing = await prisma.aIDocument.findFirst({
      where: { dataSourceId, externalId },
    });

    if (!article.isActive) {
      // Article deactivated - mark document as inactive
      if (existing) {
        await prisma.aIDocument.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
        logger.debug(`Deactivated AIDocument for KB article ${articleId}`);
      }
      return;
    }

    if (existing) {
      if (existing.checksum !== checksum) {
        await prisma.aIDocument.update({
          where: { id: existing.id },
          data: {
            title: article.title,
            content: article.content,
            checksum,
            tags: article.tags,
            category: article.category || 'knowledge-base',
            departmentId: departmentId ?? article.departmentId,
            isActive: true,
            status: 'PENDING', // Needs re-indexing
          },
        });
        logger.debug(`Updated AIDocument for KB article ${articleId}`);
      }
    } else {
      await prisma.aIDocument.create({
        data: {
          title: article.title,
          content: article.content,
          checksum,
          tags: article.tags,
          category: article.category || 'knowledge-base',
          externalId,
          dataSourceId,
          companyId,
          departmentId: departmentId ?? article.departmentId,
          status: 'PENDING',
        },
      });
      logger.debug(`Created AIDocument for KB article ${articleId}`);
    }

    // Try to index asynchronously (non-blocking)
    tryIndexDocument(dataSourceId, externalId).catch(() => {});
  } catch (error) {
    logger.error(`Failed to sync KB article ${articleId}:`, error);
  }
}

/**
 * Sync a single FAQ item to AIDocument
 */
export async function syncFAQItem(
  faqId: string,
  companyId: string,
  departmentId?: string | null
): Promise<void> {
  try {
    const faq = await prisma.fAQ.findUnique({
      where: { id: faqId },
    });

    if (!faq) {
      logger.warn(`FAQ ${faqId} not found for sync`);
      return;
    }

    const dataSourceId = await getOrCreateInternalDataSource(companyId);
    const externalId = `faq-${faqId}`;
    const content = `Pergunta: ${faq.question}\n\nResposta: ${faq.answer}`;
    const checksum = crypto.createHash('md5').update(content).digest('hex');

    const existing = await prisma.aIDocument.findFirst({
      where: { dataSourceId, externalId },
    });

    if (!faq.isActive) {
      if (existing) {
        await prisma.aIDocument.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
        logger.debug(`Deactivated AIDocument for FAQ ${faqId}`);
      }
      return;
    }

    if (existing) {
      if (existing.checksum !== checksum) {
        await prisma.aIDocument.update({
          where: { id: existing.id },
          data: {
            title: faq.question,
            content,
            checksum,
            tags: faq.keywords,
            category: faq.category || 'faq',
            departmentId: departmentId ?? faq.departmentId,
            isActive: true,
            status: 'PENDING',
          },
        });
        logger.debug(`Updated AIDocument for FAQ ${faqId}`);
      }
    } else {
      await prisma.aIDocument.create({
        data: {
          title: faq.question,
          content,
          checksum,
          tags: faq.keywords,
          category: faq.category || 'faq',
          externalId,
          dataSourceId,
          companyId,
          departmentId: departmentId ?? faq.departmentId,
          status: 'PENDING',
        },
      });
      logger.debug(`Created AIDocument for FAQ ${faqId}`);
    }

    tryIndexDocument(dataSourceId, externalId).catch(() => {});
  } catch (error) {
    logger.error(`Failed to sync FAQ ${faqId}:`, error);
  }
}

/**
 * Remove a KB article from AIDocument
 */
export async function removeKnowledgeBaseItem(
  articleId: string,
  companyId: string
): Promise<void> {
  try {
    const dataSourceId = await getOrCreateInternalDataSource(companyId);
    const externalId = `kb-${articleId}`;

    await prisma.aIDocument.updateMany({
      where: { dataSourceId, externalId },
      data: { isActive: false },
    });
    logger.debug(`Removed AIDocument for KB article ${articleId}`);
  } catch (error) {
    logger.error(`Failed to remove KB article ${articleId} from AIDocument:`, error);
  }
}

/**
 * Remove a FAQ item from AIDocument
 */
export async function removeFAQItem(
  faqId: string,
  companyId: string
): Promise<void> {
  try {
    const dataSourceId = await getOrCreateInternalDataSource(companyId);
    const externalId = `faq-${faqId}`;

    await prisma.aIDocument.updateMany({
      where: { dataSourceId, externalId },
      data: { isActive: false },
    });
    logger.debug(`Removed AIDocument for FAQ ${faqId}`);
  } catch (error) {
    logger.error(`Failed to remove FAQ ${faqId} from AIDocument:`, error);
  }
}

/**
 * Try to index a document by finding the company's embedding config.
 * Non-blocking - logs error but doesn't throw.
 */
async function tryIndexDocument(dataSourceId: string, externalId: string): Promise<void> {
  try {
    const doc = await prisma.aIDocument.findFirst({
      where: { dataSourceId, externalId, status: 'PENDING' },
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

    if (!doc) return;

    const settings = doc.dataSource?.company?.settings;
    if (!settings?.aiApiKey) {
      logger.debug(`No AI API key configured for company, skipping embedding generation`);
      return;
    }

    // Dynamic import to avoid circular dependencies
    const { EmbeddingService } = await import('./embedding.service.js');
    const embeddingService = new EmbeddingService(
      settings.aiProvider || 'openai',
      settings.aiApiKey
    );

    await embeddingService.indexDocument(doc.id);
    logger.debug(`Indexed AIDocument ${doc.id} (${externalId})`);
  } catch (error) {
    logger.debug(`Could not index document ${externalId} (embedding may not be configured):`, error);
  }
}
