import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

export interface SearchResult {
  documentId: string;
  title: string;
  content: string;
  excerpt: string;
  score: number;
  source: {
    id: string;
    name: string;
    type: string;
  };
  externalUrl?: string;
}

export interface SemanticSearchOptions {
  limit?: number;
  threshold?: number; // Minimum similarity score (0-1)
  dataSourceIds?: string[];
  categories?: string[];
  departmentId?: string;
  includeContent?: boolean;
}

const DEFAULT_SEARCH_OPTIONS: SemanticSearchOptions = {
  limit: 5,
  threshold: 0.5,
  includeContent: true,
};

export class EmbeddingService {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private provider: 'openai' | 'anthropic';
  private embeddingModel: string;

  constructor(provider: string, apiKey: string) {
    this.provider = provider as 'openai' | 'anthropic';

    if (provider === 'openai') {
      this.openaiClient = new OpenAI({ apiKey });
      this.embeddingModel = 'text-embedding-3-small'; // 1536 dimensions, cheaper
    } else if (provider === 'anthropic') {
      // Anthropic doesn't have native embeddings, so we'll use OpenAI for embeddings
      // but keep Anthropic for text generation
      this.anthropicClient = new Anthropic({ apiKey });
      this.embeddingModel = 'voyage-2'; // Voyage AI is recommended by Anthropic
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();

    try {
      // Truncate text if too long (OpenAI has 8191 token limit)
      const truncatedText = this.truncateText(text, 8000);

      if (this.provider === 'openai' && this.openaiClient) {
        const response = await this.openaiClient.embeddings.create({
          model: this.embeddingModel,
          input: truncatedText,
        });

        logger.debug('Embedding generated', {
          model: this.embeddingModel,
          dimensions: response.data[0].embedding.length,
          tokens: response.usage.total_tokens,
          time: Date.now() - startTime,
        });

        return {
          embedding: response.data[0].embedding,
          model: this.embeddingModel,
          tokensUsed: response.usage.total_tokens,
        };
      }

      // For Anthropic, we need to use a different approach
      // Using keyword extraction as fallback if no embedding API available
      throw new Error('Anthropic embeddings require Voyage AI integration');
    } catch (error: any) {
      logger.error('Failed to generate embedding:', {
        message: error.message,
        provider: this.provider,
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const batchSize = 100; // OpenAI allows up to 2048 inputs

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      if (this.provider === 'openai' && this.openaiClient) {
        const truncatedBatch = batch.map(t => this.truncateText(t, 8000));

        const response = await this.openaiClient.embeddings.create({
          model: this.embeddingModel,
          input: truncatedBatch,
        });

        for (const item of response.data) {
          results.push({
            embedding: item.embedding,
            model: this.embeddingModel,
            tokensUsed: Math.floor(response.usage.total_tokens / batch.length),
          });
        }
      }
    }

    return results;
  }

  /**
   * Semantic search using vector similarity
   */
  async semanticSearch(
    query: string,
    companyId: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Build where clause for documents
      const whereClause: any = {
        companyId,
        isActive: true,
        status: 'INDEXED',
        embedding: { isEmpty: false },
      };

      if (opts.dataSourceIds?.length) {
        whereClause.dataSourceId = { in: opts.dataSourceIds };
      }

      if (opts.categories?.length) {
        whereClause.dataSource = {
          category: { in: opts.categories },
        };
      }

      if (opts.departmentId) {
        whereClause.OR = [
          { departmentId: opts.departmentId },
          { departmentId: null },
        ];
      }

      // Fetch documents with embeddings
      const documents = await prisma.aIDocument.findMany({
        where: whereClause,
        include: {
          dataSource: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      // Calculate cosine similarity for each document
      const scoredDocuments = documents
        .map(doc => {
          const score = this.cosineSimilarity(
            queryEmbedding.embedding,
            doc.embedding
          );
          return { doc, score };
        })
        .filter(({ score }) => score >= (opts.threshold || 0.5))
        .sort((a, b) => b.score - a.score)
        .slice(0, opts.limit);

      logger.info('Semantic search completed', {
        query: query.substring(0, 50),
        totalDocuments: documents.length,
        matchedDocuments: scoredDocuments.length,
        time: Date.now() - startTime,
      });

      return scoredDocuments.map(({ doc, score }) => ({
        documentId: doc.id,
        title: doc.title,
        content: opts.includeContent ? doc.content : '',
        excerpt: this.extractRelevantExcerpt(doc.content, query),
        score,
        source: doc.dataSource,
        externalUrl: doc.externalUrl || undefined,
      }));
    } catch (error: any) {
      logger.error('Semantic search failed:', {
        message: error.message,
        query: query.substring(0, 50),
      });
      throw error;
    }
  }

  /**
   * Hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    query: string,
    companyId: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    // Run semantic and keyword search in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(query, companyId, opts).catch(() => []),
      this.keywordSearch(query, companyId, opts),
    ]);

    // Merge results with weighted scoring
    const mergedResults = this.mergeSearchResults(
      semanticResults,
      keywordResults,
      0.7, // semantic weight
      0.3  // keyword weight
    );

    return mergedResults.slice(0, opts.limit);
  }

  /**
   * Keyword-based search as fallback or complement
   */
  async keywordSearch(
    query: string,
    companyId: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    const keywords = this.extractKeywords(query);

    if (keywords.length === 0) {
      return [];
    }

    const whereClause: any = {
      companyId,
      isActive: true,
      OR: [
        ...keywords.map(kw => ({
          title: { contains: kw, mode: 'insensitive' },
        })),
        ...keywords.map(kw => ({
          content: { contains: kw, mode: 'insensitive' },
        })),
        ...keywords.map(kw => ({
          keywords: { has: kw },
        })),
        ...keywords.map(kw => ({
          tags: { has: kw },
        })),
      ],
    };

    if (opts.dataSourceIds?.length) {
      whereClause.dataSourceId = { in: opts.dataSourceIds };
    }

    if (opts.categories?.length) {
      whereClause.dataSource = {
        category: { in: opts.categories },
      };
    }

    if (opts.departmentId) {
      whereClause.AND = [
        {
          OR: [
            { departmentId: opts.departmentId },
            { departmentId: null },
          ],
        },
      ];
    }

    const documents = await prisma.aIDocument.findMany({
      where: whereClause,
      include: {
        dataSource: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      take: (opts.limit || 5) * 2, // Fetch more for scoring
    });

    // Score documents based on keyword matches
    const scoredDocuments = documents
      .map(doc => {
        const score = this.calculateKeywordScore(doc, keywords);
        return { doc, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit);

    return scoredDocuments.map(({ doc, score }) => ({
      documentId: doc.id,
      title: doc.title,
      content: opts.includeContent ? doc.content : '',
      excerpt: this.extractRelevantExcerpt(doc.content, query),
      score: Math.min(score, 1), // Normalize to 0-1
      source: doc.dataSource,
      externalUrl: doc.externalUrl || undefined,
    }));
  }

  /**
   * Search in existing FAQ and KnowledgeBase
   */
  async searchExistingKnowledge(
    query: string,
    companyId: string,
    departmentId?: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    const keywords = this.extractKeywords(query);
    const results: SearchResult[] = [];

    // Search in FAQ
    const faqWhere: any = {
      companyId,
      isActive: true,
      OR: keywords.flatMap(kw => [
        { question: { contains: kw, mode: 'insensitive' } },
        { answer: { contains: kw, mode: 'insensitive' } },
        { keywords: { has: kw } },
      ]),
    };

    if (departmentId) {
      faqWhere.OR = [
        { departmentId },
        { departmentId: null },
      ];
    }

    const faqs = await prisma.fAQ.findMany({
      where: faqWhere,
      orderBy: [{ useCount: 'desc' }],
      take: limit,
    });

    for (const faq of faqs) {
      const score = this.calculateKeywordScore(
        { title: faq.question, content: faq.answer, keywords: faq.keywords, tags: [] },
        keywords
      );
      results.push({
        documentId: faq.id,
        title: faq.question,
        content: faq.answer,
        excerpt: faq.answer.substring(0, 200),
        score: Math.min(score, 1),
        source: { id: 'faq', name: 'FAQ', type: 'INTERNAL' },
      });
    }

    // Search in Knowledge Base
    const kbWhere: any = {
      companyId,
      isActive: true,
      OR: keywords.flatMap(kw => [
        { title: { contains: kw, mode: 'insensitive' } },
        { content: { contains: kw, mode: 'insensitive' } },
        { tags: { has: kw } },
      ]),
    };

    if (departmentId) {
      kbWhere.OR = [
        { departmentId },
        { departmentId: null },
      ];
    }

    const kbArticles = await prisma.knowledgeBase.findMany({
      where: kbWhere,
      orderBy: [{ order: 'asc' }],
      take: limit,
    });

    for (const article of kbArticles) {
      const score = this.calculateKeywordScore(
        { title: article.title, content: article.content, keywords: [], tags: article.tags },
        keywords
      );
      results.push({
        documentId: article.id,
        title: article.title,
        content: article.content,
        excerpt: article.content.substring(0, 200),
        score: Math.min(score, 1),
        source: { id: 'knowledge-base', name: 'Base de Conhecimento', type: 'INTERNAL' },
      });
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Index a document - generate embedding and save
   */
  async indexDocument(documentId: string): Promise<void> {
    const document = await prisma.aIDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    try {
      // Update status to indexing
      await prisma.aIDocument.update({
        where: { id: documentId },
        data: { status: 'INDEXING' },
      });

      // Combine title and content for embedding
      const textToEmbed = `${document.title}\n\n${document.content}`;

      // Generate embedding
      const embeddingResult = await this.generateEmbedding(textToEmbed);

      // Extract keywords automatically
      const keywords = this.extractKeywords(textToEmbed);

      // Generate summary if content is long
      const summary = document.content.length > 500
        ? document.content.substring(0, 500) + '...'
        : document.content;

      // Calculate checksum
      const checksum = this.calculateChecksum(document.content);

      // Update document with embedding and metadata
      await prisma.aIDocument.update({
        where: { id: documentId },
        data: {
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          keywords,
          summary,
          checksum,
          tokensCount: embeddingResult.tokensUsed,
          status: 'INDEXED',
          indexedAt: new Date(),
          indexError: null,
        },
      });

      logger.info('Document indexed successfully', { documentId });
    } catch (error: any) {
      // Update status to failed
      await prisma.aIDocument.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          indexError: error.message,
        },
      });

      logger.error('Failed to index document', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Reindex all documents for a data source
   */
  async reindexDataSource(dataSourceId: string): Promise<{ success: number; failed: number }> {
    const documents = await prisma.aIDocument.findMany({
      where: { dataSourceId, isActive: true },
      select: { id: true },
    });

    let success = 0;
    let failed = 0;

    for (const doc of documents) {
      try {
        await this.indexDocument(doc.id);
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      logger.warn('Vector dimension mismatch', { aLen: a.length, bLen: b.length });
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'a', 'o', 'e', 'é', 'de', 'da', 'do', 'em', 'um', 'uma', 'para', 'com',
      'não', 'por', 'mais', 'como', 'mas', 'foi', 'ou', 'ser', 'quando',
      'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo',
      'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo',
      'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'estão',
      'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às',
      'minha', 'têm', 'numa', 'pelos', 'elas', 'qual', 'lhe', 'dele', 'dela',
      'the', 'and', 'is', 'in', 'to', 'of', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'be', 'was', 'are', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'this', 'that', 'these', 'those', 'it', 'its', 'an', 'or', 'if',
      'quero', 'preciso', 'gostaria', 'posso', 'pode', 'vocês', 'aqui',
      'oi', 'olá', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite', 'obrigado',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 20); // Limit to 20 keywords
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordScore(
    doc: { title: string; content: string; keywords: string[]; tags: string[] },
    keywords: string[]
  ): number {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();

    for (const keyword of keywords) {
      // Title match (higher weight)
      if (titleLower.includes(keyword)) {
        score += 0.3;
      }
      // Content match
      if (contentLower.includes(keyword)) {
        score += 0.1;
      }
      // Keyword/tag exact match (highest weight)
      if (doc.keywords?.includes(keyword) || doc.tags?.includes(keyword)) {
        score += 0.4;
      }
    }

    return score / keywords.length; // Normalize by keyword count
  }

  /**
   * Extract relevant excerpt from document
   */
  private extractRelevantExcerpt(content: string, query: string, maxLength: number = 300): string {
    const keywords = this.extractKeywords(query);
    const contentLower = content.toLowerCase();

    // Find the first occurrence of any keyword
    let bestIndex = -1;
    for (const keyword of keywords) {
      const index = contentLower.indexOf(keyword);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
      }
    }

    if (bestIndex === -1) {
      // No keyword found, return start of content
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    // Extract context around the keyword
    const start = Math.max(0, bestIndex - 50);
    const end = Math.min(content.length, bestIndex + maxLength - 50);

    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  /**
   * Merge semantic and keyword search results
   */
  private mergeSearchResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[],
    semanticWeight: number,
    keywordWeight: number
  ): SearchResult[] {
    const mergedMap = new Map<string, SearchResult>();

    // Add semantic results
    for (const result of semanticResults) {
      mergedMap.set(result.documentId, {
        ...result,
        score: result.score * semanticWeight,
      });
    }

    // Merge keyword results
    for (const result of keywordResults) {
      const existing = mergedMap.get(result.documentId);
      if (existing) {
        existing.score += result.score * keywordWeight;
      } else {
        mergedMap.set(result.documentId, {
          ...result,
          score: result.score * keywordWeight,
        });
      }
    }

    return Array.from(mergedMap.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Truncate text to approximate token limit
   */
  private truncateText(text: string, maxTokens: number): string {
    // Rough approximation: 1 token ~= 4 characters
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars);
  }

  /**
   * Calculate checksum for content change detection
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if embedding service is properly configured
   */
  isConfigured(): boolean {
    return this.openaiClient !== null;
  }

  /**
   * Get the embedding model being used
   */
  getEmbeddingModel(): string {
    return this.embeddingModel;
  }
}
