import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { ContextRetrievalService } from '../knowledge/context-retrieval.service.js';
import { EmbeddingService } from '../knowledge/embedding.service.js';

/**
 * Service for RAG operations on documentation
 * Uses the KnowledgeContext system with a special "system-docs" context
 */
export class DocRAGService {
  private contextRetrieval: ContextRetrievalService;

  constructor() {
    this.contextRetrieval = new ContextRetrievalService();
  }

  /**
   * Find relevant documentation for a query
   */
  async findRelevantDocs(
    companyId: string,
    query: string,
    aiProvider?: string,
    aiApiKey?: string,
    limit: number = 5
  ): Promise<{
    chunks: any[];
    context: any | null;
  }> {
    try {
      // Find or create the "system-docs" context for this company
      let docContext = await prisma.knowledgeContext.findFirst({
        where: {
          companyId,
          slug: 'system-docs',
        },
        include: {
          sources: {
            where: { status: 'COMPLETED' },
            include: {
              chunks: {
                take: 100, // Get chunks for semantic search
              },
            },
          },
        },
      });

      if (!docContext) {
        logger.info(`No system-docs context found for company ${companyId}`);
        return { chunks: [], context: null };
      }

      // Use semantic search if embeddings are available
      if (aiApiKey && aiProvider && docContext.sources.length > 0) {
        try {
          const embeddingService = new EmbeddingService(
            aiProvider as any,
            aiApiKey
          );
          const queryEmbedding = await embeddingService.generateEmbedding(query);

          // Get all chunks from doc sources
          const allChunks = docContext.sources.flatMap((source) =>
            source.chunks.map((chunk) => ({
              ...chunk,
              sourceName: source.name,
              sourceType: source.type,
            }))
          );

          // Calculate similarity scores
          const scoredChunks = allChunks
            .filter((chunk) => chunk.embedding)
            .map((chunk) => {
              try {
                const chunkEmbedding = JSON.parse(chunk.embedding as string);
                const similarity = embeddingService.cosineSimilarity(
                  queryEmbedding,
                  chunkEmbedding
                );
                return { ...chunk, similarity };
              } catch (error) {
                logger.warn(`Error parsing embedding for chunk ${chunk.id}:`, error);
                return { ...chunk, similarity: 0 };
              }
            })
            .filter((c) => c.similarity > 0)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

          return {
            chunks: scoredChunks,
            context: docContext,
          };
        } catch (error) {
          logger.warn('Error in semantic search for docs, falling back to keyword search:', error);
          // Fallback to keyword search
          return this.keywordSearchDocs(docContext, query, limit);
        }
      }

      // Fallback to keyword search
      return this.keywordSearchDocs(docContext, query, limit);
    } catch (error) {
      logger.error('Error finding relevant docs:', error);
      return { chunks: [], context: null };
    }
  }

  /**
   * Keyword-based search in documentation
   */
  private keywordSearchDocs(
    context: any,
    query: string,
    limit: number
  ): {
    chunks: any[];
    context: any;
  } {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const allChunks = context.sources.flatMap((source: any) =>
      source.chunks.map((chunk: any) => ({
        ...chunk,
        sourceName: source.name,
        sourceType: source.type,
      }))
    );

    const scoredChunks = allChunks.map((chunk: any) => {
      const lowerContent = chunk.content.toLowerCase();
      let score = 0;

      for (const keyword of keywords) {
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
        score += matches;
      }

      return { ...chunk, similarity: score };
    });

    const relevantChunks = scoredChunks
      .filter((c: any) => c.similarity > 0)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit);

    return {
      chunks: relevantChunks,
      context,
    };
  }

  /**
   * Get documentation context as formatted string
   */
  async getDocContext(
    companyId: string,
    query: string,
    aiProvider?: string,
    aiApiKey?: string
  ): Promise<string> {
    const { chunks, context } = await this.findRelevantDocs(
      companyId,
      query,
      aiProvider,
      aiApiKey,
      10
    );

    if (chunks.length === 0 || !context) {
      return '';
    }

    // Group chunks by source
    const chunksBySource = new Map<string, any[]>();
    for (const chunk of chunks) {
      const sourceName = chunk.sourceName || 'Unknown';
      if (!chunksBySource.has(sourceName)) {
        chunksBySource.set(sourceName, []);
      }
      chunksBySource.get(sourceName)!.push(chunk);
    }

    // Format as readable documentation
    const sections: string[] = [];
    for (const [sourceName, sourceChunks] of chunksBySource.entries()) {
      const docBlocks = sourceChunks
        .map((chunk) => chunk.content)
        .join('\n\n');
      sections.push(`[Documentação: ${sourceName}]\n\n${docBlocks}`);
    }

    return sections.join('\n\n\n');
  }
}






