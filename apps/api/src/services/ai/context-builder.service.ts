import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { PersonalityService, PersonalityConfig, DEFAULT_PERSONALITY } from './personality.service.js';
import { GuardrailsService, GuardrailsConfig, DEFAULT_GUARDRAILS } from './guardrails.service.js';
import { AIContext } from './ai.service.js';
import { ContextRetrievalService } from '../knowledge/context-retrieval.service.js';
import { EmbeddingService, SearchResult } from './embedding.service.js';

export interface ContextBuilderConfig {
  maxHistoryMessages: number;
  maxKnowledgeBaseItems: number;
  maxFAQItems: number;
  includeTrainingData: boolean;
  personalityConfig?: Partial<PersonalityConfig>;
  guardrailsConfig?: Partial<GuardrailsConfig>;
}

export const DEFAULT_CONTEXT_CONFIG: ContextBuilderConfig = {
  maxHistoryMessages: 10,
  maxKnowledgeBaseItems: 5,
  maxFAQItems: 5,
  includeTrainingData: true,
};

export interface BuiltContext {
  systemPrompt: string;
  context: AIContext;
  personality: PersonalityService;
  guardrails: GuardrailsService;
}

export class ContextBuilderService {
  private config: ContextBuilderConfig;
  private personalityService: PersonalityService;
  private guardrailsService: GuardrailsService;
  private contextRetrieval: ContextRetrievalService;

  constructor(config: Partial<ContextBuilderConfig> = {}) {
    this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config };
    this.personalityService = new PersonalityService(config.personalityConfig);
    this.guardrailsService = new GuardrailsService(config.guardrailsConfig);
    this.contextRetrieval = new ContextRetrievalService();
  }

  /**
   * Build complete context for AI response generation
   */
  async buildContext(
    ticketId: string,
    userMessage: string,
    aiAgentConfig: any
  ): Promise<BuiltContext> {
    try {
      // Get ticket with related data
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          contact: true,
          department: true,
          company: {
            include: {
              settings: true,
            },
          },
          messages: {
            take: this.config.maxHistoryMessages,
            orderBy: { createdAt: 'desc' },
            where: {
              type: { not: 'SYSTEM' },
            },
          },
        },
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const company = ticket.company;
      const settings = company.settings;
      const department = ticket.department;
      const contact = ticket.contact;

      // Update services with context
      this.guardrailsService.setContext(company.name, department?.name || '');

      // Update personality config from settings if available
      if (settings) {
        this.personalityService.updateConfig({
          tone: (settings.aiPersonalityTone as any) || DEFAULT_PERSONALITY.tone,
          style: (settings.aiPersonalityStyle as any) || DEFAULT_PERSONALITY.style,
          useEmojis: settings.aiUseEmojis ?? DEFAULT_PERSONALITY.useEmojis,
          useClientName: settings.aiUseClientName ?? DEFAULT_PERSONALITY.useClientName,
        });

        this.guardrailsService.updateConfig({
          enabled: settings.aiGuardrailsEnabled ?? DEFAULT_GUARDRAILS.enabled,
        });
      }

      // Build context object
      const context: AIContext = {
        contactName: contact.name || undefined,
        contactPhone: contact.phone,
        isClient: contact.isClient,
        isExClient: contact.isExClient,
        history: this.buildMessageHistory(ticket.messages),
        companyName: company.name,
        departmentName: department?.name,
        agentName: aiAgentConfig?.name || 'Assistente Virtual',
      };

      // Try semantic search first (via AIDocument), fall back to keyword matching
      const aiProvider = settings?.aiProvider;
      const aiApiKey = settings?.aiApiKey;

      let knowledgeBaseContext = '';
      let faqContext = '';

      const semanticResults = await this.trySemanticSearch(
        company.id,
        department?.id,
        userMessage,
        aiProvider,
        aiApiKey
      );

      if (semanticResults) {
        // Semantic search found results - split into KB and FAQ contexts
        const kbResults = semanticResults.filter(r => r.source?.type === 'INTERNAL' && !r.title.includes('?'));
        const faqResults = semanticResults.filter(r => r.source?.type === 'INTERNAL' && r.title.includes('?'));
        const otherResults = semanticResults.filter(r => r.source?.type !== 'INTERNAL');

        if (kbResults.length > 0 || otherResults.length > 0) {
          knowledgeBaseContext = [...kbResults, ...otherResults]
            .map(r => `### ${r.title}\n${r.content}`)
            .join('\n\n');
        }
        if (faqResults.length > 0) {
          faqContext = faqResults
            .map(r => `**P:** ${r.title}\n**R:** ${r.content.replace(/^Pergunta:.*?\n\nResposta:\s*/s, '')}`)
            .join('\n\n');
        }
      }

      // Fall back to keyword matching if semantic search didn't produce results
      if (!knowledgeBaseContext) {
        knowledgeBaseContext = await this.fetchRelevantKnowledge(
          company.id,
          department?.id,
          userMessage
        );
      }

      if (!faqContext) {
        faqContext = await this.fetchRelevantFAQ(
          company.id,
          department?.id,
          userMessage
        );
      }

      // NOVO: Buscar contexto de conhecimento relevante
      const knowledgeContext = await this.contextRetrieval.findRelevantContext(
        company.id,
        userMessage,
        ticket.assignedToId || undefined,
        settings?.aiProvider,
        settings?.aiApiKey
      );

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(
        aiAgentConfig,
        company.name,
        department?.name,
        knowledgeBaseContext,
        faqContext,
        contact.name,
        knowledgeContext
      );

      return {
        systemPrompt,
        context,
        personality: this.personalityService,
        guardrails: this.guardrailsService,
      };
    } catch (error) {
      logger.error('Error building AI context:', error);
      throw error;
    }
  }

  /**
   * Build message history for context
   */
  private buildMessageHistory(messages: any[]): { role: string; content: string }[] {
    // Reverse to get chronological order
    const reversedMessages = [...messages].reverse();
    
    return reversedMessages
      .filter(msg => msg.content && msg.type === 'TEXT')
      .map(msg => ({
        role: msg.isFromMe ? 'assistant' : 'user',
        content: msg.content,
      }));
  }

  /**
   * Try semantic/hybrid search via AIDocument embeddings.
   * Returns null if embedding service is not available or no results found.
   */
  private async trySemanticSearch(
    companyId: string,
    departmentId: string | undefined,
    message: string,
    aiProvider?: string | null,
    aiApiKey?: string | null
  ): Promise<SearchResult[] | null> {
    if (!aiProvider || !aiApiKey) {
      return null;
    }

    try {
      const embeddingService = new EmbeddingService(aiProvider, aiApiKey);
      const results = await embeddingService.hybridSearch(message, companyId, {
        limit: this.config.maxKnowledgeBaseItems + this.config.maxFAQItems,
        threshold: 0.4,
        departmentId,
        includeContent: true,
      });

      if (results.length === 0) {
        return null;
      }

      logger.debug(`Semantic search returned ${results.length} results for context building`);
      return results;
    } catch (error) {
      logger.debug('Semantic search not available, falling back to keyword matching:', error);
      return null;
    }
  }

  /**
   * Fetch relevant knowledge base items based on message
   */
  private async fetchRelevantKnowledge(
    companyId: string,
    departmentId: string | undefined,
    message: string
  ): Promise<string> {
    try {
      const whereClause: any = {
        companyId,
        isActive: true,
      };

      // Include both company-wide and department-specific knowledge
      if (departmentId) {
        whereClause.OR = [
          { departmentId: null },
          { departmentId },
        ];
      } else {
        whereClause.departmentId = null;
      }

      const knowledgeItems = await prisma.knowledgeBase.findMany({
        where: whereClause,
        orderBy: { order: 'asc' },
        take: this.config.maxKnowledgeBaseItems * 2, // Fetch more, then filter
      });

      // Simple keyword matching for relevance
      const keywords = this.extractKeywords(message);
      const scoredItems = knowledgeItems.map(item => {
        const score = this.calculateRelevanceScore(
          keywords,
          `${item.title} ${item.content} ${item.tags?.join(' ') || ''}`
        );
        return { ...item, score };
      });

      // Sort by relevance and take top items
      const relevantItems = scoredItems
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxKnowledgeBaseItems)
        .filter(item => item.score > 0);

      if (relevantItems.length === 0) {
        return '';
      }

      return relevantItems
        .map(item => `### ${item.title}\n${item.content}`)
        .join('\n\n');
    } catch (error) {
      logger.error('Error fetching knowledge base:', error);
      return '';
    }
  }

  /**
   * Fetch relevant FAQ items based on message
   */
  private async fetchRelevantFAQ(
    companyId: string,
    departmentId: string | undefined,
    message: string
  ): Promise<string> {
    try {
      const whereClause: any = {
        companyId,
        isActive: true,
      };

      // Include both company-wide and department-specific FAQs
      if (departmentId) {
        whereClause.OR = [
          { departmentId: null },
          { departmentId },
        ];
      } else {
        whereClause.departmentId = null;
      }

      const faqItems = await prisma.fAQ.findMany({
        where: whereClause,
        orderBy: [{ useCount: 'desc' }, { order: 'asc' }],
        take: this.config.maxFAQItems * 2,
      });

      // Match by keywords
      const keywords = this.extractKeywords(message);
      const scoredItems = faqItems.map(item => {
        const score = this.calculateRelevanceScore(
          keywords,
          `${item.question} ${item.answer} ${item.keywords?.join(' ') || ''}`
        );
        return { ...item, score };
      });

      // Sort by relevance and take top items
      const relevantItems = scoredItems
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxFAQItems)
        .filter(item => item.score > 0);

      if (relevantItems.length === 0) {
        return '';
      }

      return relevantItems
        .map(item => `**P:** ${item.question}\n**R:** ${item.answer}`)
        .join('\n\n');
    } catch (error) {
      logger.error('Error fetching FAQ:', error);
      return '';
    }
  }

  /**
   * Extract keywords from message
   */
  private extractKeywords(message: string): string[] {
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
      'then', 'else', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'quero', 'preciso', 'gostaria', 'posso', 'pode', 'vocês', 'aqui',
      'oi', 'olá', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite', 'obrigado',
      'obrigada', 'por favor', 'favor',
    ]);

    return message
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Calculate relevance score based on keyword matching
   */
  private calculateRelevanceScore(keywords: string[], text: string): number {
    const lowerText = text.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += 1;
        // Bonus for exact word match
        const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (wordRegex.test(text)) {
          score += 0.5;
        }
      }
    }

    return score;
  }

  /**
   * Build the complete system prompt
   */
  private buildSystemPrompt(
    aiAgentConfig: any,
    companyName: string,
    departmentName: string | undefined,
    knowledgeBaseContext: string,
    faqContext: string,
    contactName: string | null,
    knowledgeContext?: { context: any; sources: any[]; content: string } | null
  ): string {
    const agentName = aiAgentConfig?.name || 'Assistente Virtual';
    const baseSystemPrompt = aiAgentConfig?.systemPrompt || '';
    const trainingData = aiAgentConfig?.trainingData || '';

    // Build personality instructions
    const personalityInstructions = this.personalityService.buildPersonalityInstructions(
      agentName,
      companyName
    );

    // Build guardrails instructions
    const guardrailsInstructions = this.guardrailsService.buildGuardrailsInstructions();

    let systemPrompt = `${personalityInstructions}`;

    // Add base system prompt from agent config
    if (baseSystemPrompt) {
      systemPrompt += `\n\nINSTRUÇÕES ESPECÍFICAS DO AGENTE:\n${baseSystemPrompt}`;
    }

    // Add training data
    if (trainingData && this.config.includeTrainingData) {
      systemPrompt += `\n\nCONTEXTO DA EMPRESA:\n${trainingData}`;
    }

    // Add knowledge base context
    if (knowledgeBaseContext) {
      systemPrompt += `\n\nBASE DE CONHECIMENTO RELEVANTE:\n${knowledgeBaseContext}`;
    }

    // Add FAQ context
    if (faqContext) {
      systemPrompt += `\n\nPERGUNTAS FREQUENTES RELACIONADAS:\n${faqContext}`;
    }

    // NOVO: Adicionar contexto de conhecimento especializado
    if (knowledgeContext) {
      systemPrompt += `\n\nCONTEXTO ESPECIALIZADO: ${knowledgeContext.context.name}`;
      if (knowledgeContext.context.description) {
        systemPrompt += `\n${knowledgeContext.context.description}`;
      }
      if (knowledgeContext.context.systemPrompt) {
        systemPrompt += `\n\nINSTRUÇÕES DO CONTEXTO:\n${knowledgeContext.context.systemPrompt}`;
      }
      systemPrompt += `\n\nBASE DE CONHECIMENTO DO CONTEXTO:\n${knowledgeContext.content}`;
    }

    // Add guardrails
    systemPrompt += guardrailsInstructions;

    return systemPrompt;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextBuilderConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.personalityConfig) {
      this.personalityService.updateConfig(config.personalityConfig);
    }
    
    if (config.guardrailsConfig) {
      this.guardrailsService.updateConfig(config.guardrailsConfig);
    }
  }

  /**
   * Get services for external use
   */
  getServices(): { personality: PersonalityService; guardrails: GuardrailsService } {
    return {
      personality: this.personalityService,
      guardrails: this.guardrailsService,
    };
  }
}









