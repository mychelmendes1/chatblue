import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { EmbeddingService } from './embedding.service.js';

export class ContextRetrievalService {
  /**
   * Busca o contexto mais relevante para uma mensagem
   */
  async findRelevantContext(
    companyId: string,
    userMessage: string,
    aiAgentId?: string,
    aiProvider?: string,
    aiApiKey?: string
  ): Promise<{
    context: any;
    sources: any[];
    content: string;
  } | null> {
    try {
      // 1. Buscar contextos ativos da empresa
      const contexts = await prisma.knowledgeContext.findMany({
        where: {
          companyId,
          // KnowledgeContext doesn't have isActive or aiAgentIds fields
        },
        include: {
          sources: {
            where: { status: 'COMPLETED' },
            orderBy: { updatedAt: 'desc' },
          },
        },
        orderBy: { priority: 'desc' },
      });

      if (contexts.length === 0) {
        return null;
      }

      // 2. Detectar contexto mais relevante por palavras-chave
      const relevantContext = this.detectRelevantContext(contexts, userMessage);

      if (!relevantContext) {
        return null;
      }

      // 3. Buscar conteúdo das fontes do contexto
      const content = await this.retrieveContextContent(
        relevantContext,
        userMessage,
        aiProvider,
        aiApiKey
      );

      return {
        context: relevantContext,
        sources: relevantContext.sources,
        content,
      };
    } catch (error) {
      logger.error('Error finding relevant context:', error);
      return null;
    }
  }

  /**
   * Detecta o contexto mais relevante baseado em palavras-chave
   */
  private detectRelevantContext(
    contexts: any[],
    message: string
  ): any | null {
    const lowerMessage = message.toLowerCase();
    let bestMatch: any = null;
    let bestScore = 0;

    for (const context of contexts) {
      let score = 0;

      // Verificar palavras-chave do contexto
      if (context.keywords && context.keywords.length > 0) {
        for (const keyword of context.keywords) {
          if (lowerMessage.includes(keyword.toLowerCase())) {
            score += 2; // Palavras-chave têm peso maior
          }
        }
      }

      // Verificar nome e descrição do contexto
      if (context.name && lowerMessage.includes(context.name.toLowerCase())) {
        score += 1;
      }

      if (
        context.description &&
        lowerMessage.includes(context.description.toLowerCase())
      ) {
        score += 0.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = context;
      }
    }

    // Se não encontrou match por palavras-chave, retorna o contexto de maior prioridade
    if (!bestMatch && contexts.length > 0) {
      return contexts[0];
    }

    return bestScore > 0 ? bestMatch : null;
  }

  /**
   * Recupera o conteúdo consolidado de todas as fontes do contexto
   * Usa busca semântica se disponível, caso contrário retorna todo o conteúdo
   */
  private async retrieveContextContent(
    context: any,
    query?: string,
    aiProvider?: string,
    aiApiKey?: string
  ): Promise<string> {
    // Se há query e embeddings disponíveis, usar busca semântica
    if (query && aiApiKey && context.sources.length > 0) {
      try {
        // Buscar chunks mais relevantes usando busca semântica
        const relevantChunks = await this.semanticSearch(
          context.id,
          query,
          10, // Top 10 chunks
          aiProvider,
          aiApiKey
        );

        if (relevantChunks.length > 0) {
          // Agrupar chunks por fonte
          const chunksBySource = new Map<string, string[]>();
          for (const chunk of relevantChunks) {
            const sourceName = chunk.source.name;
            if (!chunksBySource.has(sourceName)) {
              chunksBySource.set(sourceName, []);
            }
            chunksBySource.get(sourceName)!.push(chunk.content);
          }

          // Construir conteúdo relevante
          const contents: string[] = [];
          for (const [sourceName, chunks] of Array.from(chunksBySource.entries())) {
            contents.push(
              `[Fonte: ${sourceName}]\n${chunks.join('\n\n')}`
            );
          }

          logger.info(
            `Retrieved ${relevantChunks.length} relevant chunks using semantic search for context ${context.id}`
          );
          return contents.join('\n\n---\n\n');
        }
      } catch (error) {
        logger.warn(
          `Error in semantic retrieval for context ${context.id}, falling back to full content:`,
          error
        );
      }
    }

    // Fallback: retornar todo o conteúdo de todas as fontes
    const contents: string[] = [];
    for (const source of context.sources) {
      if (source.content) {
        contents.push(`[Fonte: ${source.name}]\n${source.content}`);
      }
    }

    return contents.join('\n\n---\n\n');
  }

  /**
   * Busca semântica usando embeddings
   */
  async semanticSearch(
    contextId: string,
    query: string,
    limit: number = 5,
    aiProvider?: string,
    aiApiKey?: string
  ): Promise<any[]> {
    try {
      // Se não há API key, usar busca por palavras-chave
      if (!aiApiKey) {
        return this.keywordSearch(contextId, query, limit);
      }

      // Buscar chunks do contexto
      const chunks = await prisma.knowledgeChunk.findMany({
        where: {
          source: {
            contextId,
          },
          embedding: { not: null }, // Apenas chunks com embeddings
        },
        include: {
          source: true,
        },
      });

      if (chunks.length === 0) {
        // Fallback para busca por palavras-chave se não há embeddings
        return this.keywordSearch(contextId, query, limit);
      }

      // Gerar embedding da query
      const embeddingService = new EmbeddingService(
        (aiProvider as any) || 'openai',
        aiApiKey
      );
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Calcular similaridade para cada chunk
      const scoredChunks = chunks
        .map((chunk) => {
          if (!chunk.embedding) {
            return { ...chunk, score: 0 };
          }

          try {
            const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
            const score = embeddingService.cosineSimilarity(
              queryEmbedding,
              chunkEmbedding
            );
            return { ...chunk, score };
          } catch (error) {
            logger.warn(`Error parsing embedding for chunk ${chunk.id}:`, error);
            return { ...chunk, score: 0 };
          }
        })
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      logger.info(`Semantic search found ${scoredChunks.length} relevant chunks for query: ${query.substring(0, 50)}`);

      return scoredChunks;
    } catch (error: any) {
      logger.error('Error in semantic search, falling back to keyword search:', {
        error: error?.message,
        contextId,
      });
      // Fallback para busca por palavras-chave em caso de erro
      return this.keywordSearch(contextId, query, limit);
    }
  }

  /**
   * Busca por palavras-chave nos chunks
   */
  private async keywordSearch(
    contextId: string,
    query: string,
    limit: number
  ): Promise<any[]> {
    try {
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

      const chunks = await prisma.knowledgeChunk.findMany({
        where: {
          source: {
            contextId,
          },
        },
        include: {
          source: true,
        },
      });

      // Score por relevância de palavras-chave
      const scoredChunks = chunks.map((chunk) => {
        const lowerContent = chunk.content.toLowerCase();
        let score = 0;

        for (const keyword of keywords) {
          const matches = (lowerContent.match(new RegExp(keyword, 'g')) || [])
            .length;
          score += matches;
        }

        return { ...chunk, score };
      });

      return scoredChunks
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error in keyword search:', error);
      return [];
    }
  }
}

