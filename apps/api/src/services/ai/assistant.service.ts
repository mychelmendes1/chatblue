import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { OrchestratorService, OrchestratorContext, OrchestratorResult } from './orchestrator.service.js';
import { EmbeddingService } from './embedding.service.js';

export interface AIAssistantQueryRequest {
  query: string;
  ticketId: string;
  userId: string;
  companyId: string;
  selectedCategory?: string; // If user manually selects a category
  includeContext?: boolean;  // Include recent messages as context
}

export interface AIAssistantQueryResponse {
  queryId: string;
  response: string;
  category: string;
  confidence: number;
  sources: Array<{
    id: string;
    title: string;
    excerpt: string;
    score: number;
    sourceType: string;
    sourceName: string;
    url?: string;
  }>;
  processingTime: number;
  hasKnowledgeGap: boolean;
  gapDescription?: string;
}

export interface AIFeedbackRequest {
  queryId: string;
  wasUsed: boolean;
  wasEdited: boolean;
  editedResponse?: string;
  rating?: number; // 1-5
  ratingComment?: string;
}

export interface AIAutoSuggestionRequest {
  message: string;
  ticketId: string;
  userId: string;
  companyId: string;
}

export class AIAssistantService {
  private orchestrators: Map<string, OrchestratorService> = new Map();

  /**
   * Get or create orchestrator for a company
   */
  private async getOrchestrator(companyId: string): Promise<OrchestratorService> {
    // Check cache
    if (this.orchestrators.has(companyId)) {
      return this.orchestrators.get(companyId)!;
    }

    // Get company settings
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!settings?.aiEnabled || !settings.aiApiKey || !settings.aiProvider) {
      throw new Error('AI not configured for this company');
    }

    // Create orchestrator
    const orchestrator = new OrchestratorService(settings.aiProvider, settings.aiApiKey);
    this.orchestrators.set(companyId, orchestrator);

    return orchestrator;
  }

  /**
   * Process a @ia query from an agent
   */
  async processQuery(request: AIAssistantQueryRequest): Promise<AIAssistantQueryResponse> {
    const startTime = Date.now();

    try {
      // Get the orchestrator
      const orchestrator = await this.getOrchestrator(request.companyId);

      // Build context
      const context: OrchestratorContext = {
        ticketId: request.ticketId,
        companyId: request.companyId,
        userId: request.userId,
      };

      // Get ticket info for context
      const ticket = await prisma.ticket.findUnique({
        where: { id: request.ticketId },
        include: {
          contact: { select: { name: true } },
          department: { select: { id: true, name: true } },
          messages: {
            where: { type: 'TEXT' },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { isFromMe: true, content: true },
          },
        },
      });

      if (ticket) {
        context.contactName = ticket.contact?.name || undefined;
        context.departmentId = ticket.departmentId || undefined;

        if (request.includeContext !== false) {
          context.recentMessages = ticket.messages
            .reverse()
            .filter(m => m.content)
            .map(m => ({
              role: m.isFromMe ? 'assistant' : 'user',
              content: m.content!,
            }));
        }
      }

      // Process the query
      const result = await orchestrator.processQuery(
        request.query,
        context,
        request.selectedCategory
      );

      // Detect knowledge gap
      const gapDetection = orchestrator.detectKnowledgeGap(
        result.suggestedResponse,
        result.relevantDocuments
      );

      // Create query record in database
      const queryRecord = await prisma.aIAssistantQuery.create({
        data: {
          query: request.query,
          context: context.recentMessages ? JSON.stringify(context.recentMessages) : null,
          response: result.suggestedResponse,
          detectedCategory: result.category,
          categoryConfidence: result.confidence,
          status: 'COMPLETED',
          processingTime: result.processingMetrics.totalTime,
          embeddingTime: result.processingMetrics.searchTime,
          searchTime: result.processingMetrics.searchTime,
          hasKnowledgeGap: gapDetection.hasGap,
          gapDescription: gapDetection.description,
          ticketId: request.ticketId,
          userId: request.userId,
          agentConfigId: result.agentConfig?.id,
          companyId: request.companyId,
        },
      });

      // Save sources used
      if (result.relevantDocuments.length > 0) {
        const sourcesToCreate = result.relevantDocuments
          .filter(doc => doc.documentId && !doc.documentId.startsWith('faq') && !doc.documentId.startsWith('knowledge'))
          .map(doc => ({
            queryId: queryRecord.id,
            documentId: doc.documentId,
            relevanceScore: doc.score,
            usedExcerpt: doc.excerpt,
          }));

        if (sourcesToCreate.length > 0) {
          await prisma.aIQuerySource.createMany({
            data: sourcesToCreate,
            skipDuplicates: true,
          });
        }
      }

      // If knowledge gap detected, record it
      if (gapDetection.hasGap) {
        await this.recordKnowledgeGap(
          request.companyId,
          request.query,
          gapDetection.description || 'Gap detectado'
        );
      }

      // Log activity
      await prisma.activity.create({
        data: {
          type: 'AI_ASSISTANT_QUERY',
          description: `Consulta @ia: "${request.query.substring(0, 50)}..."`,
          metadata: {
            queryId: queryRecord.id,
            category: result.category,
            confidence: result.confidence,
            processingTime: result.processingMetrics.totalTime,
          },
          ticketId: request.ticketId,
          userId: request.userId,
        },
      });

      return {
        queryId: queryRecord.id,
        response: result.suggestedResponse,
        category: result.category,
        confidence: result.confidence,
        sources: result.relevantDocuments.map(doc => ({
          id: doc.documentId,
          title: doc.title,
          excerpt: doc.excerpt,
          score: doc.score,
          sourceType: doc.source.type,
          sourceName: doc.source.name,
          url: doc.externalUrl,
        })),
        processingTime: Date.now() - startTime,
        hasKnowledgeGap: gapDetection.hasGap,
        gapDescription: gapDetection.description,
      };
    } catch (error: any) {
      logger.error('AI Assistant query failed', {
        query: request.query.substring(0, 50),
        error: error.message,
      });

      // Record failed query
      await prisma.aIAssistantQuery.create({
        data: {
          query: request.query,
          response: '',
          status: 'FAILED',
          processingTime: Date.now() - startTime,
          ticketId: request.ticketId,
          userId: request.userId,
          companyId: request.companyId,
        },
      });

      throw error;
    }
  }

  /**
   * Submit feedback for a query
   */
  async submitFeedback(request: AIFeedbackRequest): Promise<void> {
    const query = await prisma.aIAssistantQuery.findUnique({
      where: { id: request.queryId },
    });

    if (!query) {
      throw new Error('Query not found');
    }

    await prisma.aIAssistantQuery.update({
      where: { id: request.queryId },
      data: {
        wasUsed: request.wasUsed,
        wasEdited: request.wasEdited,
        editedResponse: request.editedResponse,
        usedAt: request.wasUsed ? new Date() : undefined,
        rating: request.rating,
        ratingComment: request.ratingComment,
        ratedAt: request.rating ? new Date() : undefined,
      },
    });

    // Log activity
    const activityType = request.wasUsed
      ? request.wasEdited
        ? 'AI_SUGGESTION_EDITED'
        : 'AI_SUGGESTION_USED'
      : 'AI_SUGGESTION_DISCARDED';

    await prisma.activity.create({
      data: {
        type: activityType,
        description: `Sugestão da IA ${request.wasUsed ? (request.wasEdited ? 'editada e usada' : 'usada') : 'descartada'}`,
        metadata: {
          queryId: request.queryId,
          rating: request.rating,
          wasEdited: request.wasEdited,
        },
        ticketId: query.ticketId,
        userId: query.userId,
      },
    });

    // If rating is low, this might indicate a knowledge gap
    if (request.rating && request.rating <= 2 && !query.hasKnowledgeGap) {
      await this.recordKnowledgeGap(
        query.companyId,
        query.query,
        `Resposta com baixa avaliação (${request.rating}/5): ${request.ratingComment || 'Sem comentário'}`
      );
    }
  }

  /**
   * Get query status
   */
  async getQueryStatus(queryId: string): Promise<any> {
    const query = await prisma.aIAssistantQuery.findUnique({
      where: { id: queryId },
      include: {
        sourcesUsed: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                externalUrl: true,
                dataSource: {
                  select: { name: true, type: true },
                },
              },
            },
          },
        },
        agentConfig: {
          select: { name: true, category: true, icon: true, color: true },
        },
      },
    });

    return query;
  }

  /**
   * Get available AI categories for a company
   */
  async getAvailableCategories(companyId: string): Promise<Array<{
    category: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }>> {
    const orchestrator = await this.getOrchestrator(companyId);
    return orchestrator.getAvailableCategories(companyId);
  }

  /**
   * Generate auto-suggestion for incoming message
   */
  async generateAutoSuggestion(request: AIAutoSuggestionRequest): Promise<{
    suggestionId: string;
    suggestion: string;
    category: string;
    confidence: number;
  } | null> {
    try {
      const orchestrator = await this.getOrchestrator(request.companyId);

      // Analyze the message
      const analysis = await orchestrator.analyzeMessage(request.message);

      // Only generate suggestion if it's a question or support request
      if (!['question', 'support', 'complaint'].includes(analysis.intent)) {
        return null;
      }

      // Get ticket context
      const ticket = await prisma.ticket.findUnique({
        where: { id: request.ticketId },
        include: {
          contact: { select: { name: true } },
          department: { select: { id: true } },
        },
      });

      if (!ticket) return null;

      // Process like a normal query but for auto-suggestion
      const context: OrchestratorContext = {
        ticketId: request.ticketId,
        companyId: request.companyId,
        userId: request.userId,
        contactName: ticket.contact?.name || undefined,
        departmentId: ticket.departmentId || undefined,
      };

      const result = await orchestrator.processQuery(request.message, context);

      // Save auto-suggestion
      const suggestion = await prisma.aIAutoSuggestion.create({
        data: {
          triggerMessage: request.message,
          suggestion: result.suggestedResponse,
          category: result.category,
          confidence: result.confidence,
          ticketId: request.ticketId,
          userId: request.userId,
          companyId: request.companyId,
        },
      });

      return {
        suggestionId: suggestion.id,
        suggestion: result.suggestedResponse,
        category: result.category,
        confidence: result.confidence,
      };
    } catch (error: any) {
      logger.error('Auto-suggestion generation failed', { error: error.message });
      return null;
    }
  }

  /**
   * Accept or reject auto-suggestion
   */
  async handleAutoSuggestion(
    suggestionId: string,
    accepted: boolean,
    edited: boolean = false
  ): Promise<void> {
    await prisma.aIAutoSuggestion.update({
      where: { id: suggestionId },
      data: {
        wasAccepted: accepted,
        wasEdited: edited,
        acceptedAt: accepted ? new Date() : undefined,
      },
    });
  }

  /**
   * Record a knowledge gap
   */
  private async recordKnowledgeGap(
    companyId: string,
    query: string,
    description: string
  ): Promise<void> {
    // Extract topic from query
    const words = query.toLowerCase().split(/\s+/);
    const topic = words.slice(0, 5).join(' ');

    // Check if similar gap already exists
    const existingGap = await prisma.aIKnowledgeGap.findFirst({
      where: {
        companyId,
        topic: { contains: topic.substring(0, 20), mode: 'insensitive' },
        status: { in: ['pending', 'in_progress'] },
      },
    });

    if (existingGap) {
      // Increment frequency and add sample query
      await prisma.aIKnowledgeGap.update({
        where: { id: existingGap.id },
        data: {
          frequency: { increment: 1 },
          sampleQueries: {
            push: query.substring(0, 200),
          },
        },
      });
    } else {
      // Create new gap
      await prisma.aIKnowledgeGap.create({
        data: {
          topic,
          description,
          frequency: 1,
          sampleQueries: [query.substring(0, 200)],
          companyId,
        },
      });
    }
  }

  /**
   * Get knowledge gaps for a company
   */
  async getKnowledgeGaps(
    companyId: string,
    status?: string,
    limit: number = 20
  ): Promise<any[]> {
    const gaps = await prisma.aIKnowledgeGap.findMany({
      where: {
        companyId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ frequency: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return gaps;
  }

  /**
   * Update knowledge gap status
   */
  async updateKnowledgeGapStatus(
    gapId: string,
    status: string,
    resolvedBy?: string
  ): Promise<void> {
    await prisma.aIKnowledgeGap.update({
      where: { id: gapId },
      data: {
        status,
        resolvedAt: status === 'resolved' ? new Date() : undefined,
        resolvedBy,
      },
    });
  }

  /**
   * Get query history for a ticket
   */
  async getTicketQueryHistory(ticketId: string): Promise<any[]> {
    return prisma.aIAssistantQuery.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        agentConfig: {
          select: { name: true, category: true },
        },
      },
    });
  }

  /**
   * Get analytics for AI assistant usage
   */
  async getAnalytics(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalQueries: number;
    usedQueries: number;
    editedQueries: number;
    averageRating: number;
    averageProcessingTime: number;
    topCategories: Array<{ category: string; count: number }>;
    gapsDetected: number;
  }> {
    const queries = await prisma.aIAssistantQuery.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      select: {
        wasUsed: true,
        wasEdited: true,
        rating: true,
        processingTime: true,
        detectedCategory: true,
        hasKnowledgeGap: true,
      },
    });

    const totalQueries = queries.length;
    const usedQueries = queries.filter(q => q.wasUsed).length;
    const editedQueries = queries.filter(q => q.wasEdited).length;
    const ratedQueries = queries.filter(q => q.rating !== null);
    const averageRating = ratedQueries.length > 0
      ? ratedQueries.reduce((sum, q) => sum + (q.rating || 0), 0) / ratedQueries.length
      : 0;
    const averageProcessingTime = totalQueries > 0
      ? queries.reduce((sum, q) => sum + (q.processingTime || 0), 0) / totalQueries
      : 0;
    const gapsDetected = queries.filter(q => q.hasKnowledgeGap).length;

    // Count by category
    const categoryCount = new Map<string, number>();
    for (const query of queries) {
      const cat = query.detectedCategory || 'geral';
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
    }
    const topCategories = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalQueries,
      usedQueries,
      editedQueries,
      averageRating,
      averageProcessingTime,
      topCategories,
      gapsDetected,
    };
  }

  /**
   * Clear orchestrator cache for a company (useful when settings change)
   */
  clearCache(companyId: string): void {
    this.orchestrators.delete(companyId);
  }

  /**
   * Analyze message sentiment
   */
  async analyzeSentiment(
    message: string,
    ticketId: string,
    messageId: string,
    companyId: string
  ): Promise<any> {
    try {
      const orchestrator = await this.getOrchestrator(companyId);
      const analysis = await orchestrator.analyzeMessage(message);

      // Save sentiment analysis
      const sentimentRecord = await prisma.aISentimentAnalysis.create({
        data: {
          sentiment: analysis.sentiment,
          score: analysis.score,
          urgency: analysis.urgency,
          urgencyScore: analysis.urgency === 'critical' ? 1.0 :
                        analysis.urgency === 'high' ? 0.75 :
                        analysis.urgency === 'medium' ? 0.5 : 0.25,
          intent: analysis.intent,
          keywords: analysis.keywords,
          messageId,
          ticketId,
          companyId,
        },
      });

      return sentimentRecord;
    } catch (error: any) {
      logger.error('Sentiment analysis failed', { error: error.message });
      return null;
    }
  }
}

// Export singleton instance
export const aiAssistantService = new AIAssistantService();
