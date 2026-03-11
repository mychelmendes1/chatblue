import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { EmbeddingService, SearchResult } from './embedding.service.js';
import { AIService } from './ai.service.js';

export interface CategoryClassification {
  category: string;
  confidence: number;
  reasoning: string;
  suggestedAgentId?: string;
}

export interface OrchestratorContext {
  ticketId: string;
  companyId: string;
  userId: string;
  contactName?: string;
  departmentId?: string;
  recentMessages?: Array<{ role: string; content: string }>;
}

export interface OrchestratorResult {
  category: string;
  confidence: number;
  agentConfig: any; // AIAgentConfig
  relevantDocuments: SearchResult[];
  suggestedResponse: string;
  processingMetrics: {
    classificationTime: number;
    searchTime: number;
    generationTime: number;
    totalTime: number;
  };
}

export class OrchestratorService {
  private embeddingService: EmbeddingService | null = null;
  private aiService: AIService | null = null;
  private provider: 'openai' | 'anthropic';
  private apiKey: string;

  constructor(provider: string, apiKey: string) {
    this.provider = provider as 'openai' | 'anthropic';
    this.apiKey = apiKey;
    this.embeddingService = new EmbeddingService(provider, apiKey);
    this.aiService = new AIService(provider, apiKey);
  }

  /**
   * Process a @ia query and return the best response
   */
  async processQuery(
    query: string,
    context: OrchestratorContext,
    selectedCategory?: string // If user manually selected a category
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();
    let classificationTime = 0;
    let searchTime = 0;
    let generationTime = 0;

    try {
      // Step 1: Classify the query into a category
      let classification: CategoryClassification;

      if (selectedCategory) {
        // User manually selected a category
        classification = {
          category: selectedCategory,
          confidence: 1.0,
          reasoning: 'Selecionado manualmente pelo usuário',
        };
      } else {
        const classificationStart = Date.now();
        classification = await this.classifyQuery(query, context.companyId);
        classificationTime = Date.now() - classificationStart;
      }

      logger.info('Query classified', {
        query: query.substring(0, 50),
        category: classification.category,
        confidence: classification.confidence,
      });

      // Step 2: Get the appropriate AI agent config
      const agentConfig = await this.getAgentForCategory(
        classification.category,
        context.companyId
      );

      if (!agentConfig) {
        throw new Error(`No AI agent configured for category: ${classification.category}`);
      }

      // Step 3: Search for relevant documents
      const searchStart = Date.now();
      const relevantDocuments = await this.searchRelevantContent(
        query,
        context.companyId,
        agentConfig,
        context.departmentId
      );
      searchTime = Date.now() - searchStart;

      // Step 4: Generate response using the specialized agent
      const generationStart = Date.now();
      const suggestedResponse = await this.generateResponse(
        query,
        agentConfig,
        relevantDocuments,
        context
      );
      generationTime = Date.now() - generationStart;

      const totalTime = Date.now() - startTime;

      return {
        category: classification.category,
        confidence: classification.confidence,
        agentConfig,
        relevantDocuments,
        suggestedResponse,
        processingMetrics: {
          classificationTime,
          searchTime,
          generationTime,
          totalTime,
        },
      };
    } catch (error: any) {
      logger.error('Orchestrator processing failed', {
        query: query.substring(0, 50),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Classify a query into a category
   */
  async classifyQuery(query: string, companyId: string): Promise<CategoryClassification> {
    // Get all active categories for this company
    const agentConfigs = await prisma.aIAgentConfig.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        category: true,
        name: true,
        description: true,
        triggerKeywords: true,
      },
    });

    if (agentConfigs.length === 0) {
      return {
        category: 'geral',
        confidence: 1.0,
        reasoning: 'Nenhuma categoria configurada',
      };
    }

    // First, try keyword matching for quick classification
    const keywordMatch = this.matchByKeywords(query, agentConfigs);
    if (keywordMatch && keywordMatch.confidence >= 0.8) {
      return keywordMatch;
    }

    // If no strong keyword match, use AI classification
    const categoriesDescription = agentConfigs
      .map(c => `- ${c.category}: ${c.description || c.name}`)
      .join('\n');

    const systemPrompt = `Você é um classificador de intenções. Analise a pergunta do atendente e classifique em uma das categorias disponíveis.

Categorias disponíveis:
${categoriesDescription}

Responda APENAS com JSON no formato:
{
  "category": "nome_da_categoria",
  "confidence": 0.0-1.0,
  "reasoning": "breve explicação"
}`;

    try {
      let response: string;

      if (this.provider === 'anthropic') {
        const anthropic = new Anthropic({ apiKey: this.apiKey });
        const result = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: 'user', content: query }],
        });
        const textContent = result.content.find(block => block.type === 'text');
        response = textContent?.type === 'text' ? textContent.text : '{}';
      } else {
        const openai = new OpenAI({ apiKey: this.apiKey });
        const result = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          temperature: 0.3,
          max_tokens: 200,
        });
        response = result.choices[0]?.message?.content || '{}';
      }

      // Parse the response
      const parsed = JSON.parse(response);

      // Validate category exists
      const validCategory = agentConfigs.find(c => c.category === parsed.category);
      if (!validCategory) {
        // Find default or first category
        const defaultAgent = agentConfigs.find(c => c.category === 'geral') || agentConfigs[0];
        return {
          category: defaultAgent.category,
          confidence: 0.5,
          reasoning: 'Categoria não reconhecida, usando padrão',
          suggestedAgentId: defaultAgent.id,
        };
      }

      return {
        category: parsed.category,
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || '',
        suggestedAgentId: validCategory.id,
      };
    } catch (error: any) {
      logger.error('Classification failed, using default', { error: error.message });

      // Fallback to default category
      const defaultAgent = agentConfigs.find(c => c.category === 'geral') || agentConfigs[0];
      return {
        category: defaultAgent.category,
        confidence: 0.3,
        reasoning: 'Erro na classificação, usando categoria padrão',
        suggestedAgentId: defaultAgent.id,
      };
    }
  }

  /**
   * Match query to category using keywords
   */
  private matchByKeywords(
    query: string,
    agentConfigs: Array<{ id: string; category: string; triggerKeywords: string[] }>
  ): CategoryClassification | null {
    const queryLower = query.toLowerCase();
    let bestMatch: { config: typeof agentConfigs[0]; score: number } | null = null;

    for (const config of agentConfigs) {
      if (!config.triggerKeywords?.length) continue;

      let matchScore = 0;
      for (const keyword of config.triggerKeywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          matchScore += 1;
        }
      }

      if (matchScore > 0) {
        const normalizedScore = matchScore / config.triggerKeywords.length;
        if (!bestMatch || normalizedScore > bestMatch.score) {
          bestMatch = { config, score: normalizedScore };
        }
      }
    }

    if (bestMatch && bestMatch.score >= 0.3) {
      return {
        category: bestMatch.config.category,
        confidence: Math.min(bestMatch.score + 0.3, 1.0),
        reasoning: 'Correspondência por palavras-chave',
        suggestedAgentId: bestMatch.config.id,
      };
    }

    return null;
  }

  /**
   * Get the AI agent config for a category
   */
  async getAgentForCategory(category: string, companyId: string): Promise<any> {
    // Try to find exact category match
    let agentConfig = await prisma.aIAgentConfig.findFirst({
      where: {
        companyId,
        category,
        isActive: true,
      },
      include: {
        dataSources: {
          include: {
            dataSource: true,
          },
        },
      },
    });

    // If not found, try default agent
    if (!agentConfig) {
      agentConfig = await prisma.aIAgentConfig.findFirst({
        where: {
          companyId,
          isDefault: true,
          isActive: true,
        },
        include: {
          dataSources: {
            include: {
              dataSource: true,
            },
          },
        },
      });
    }

    // If still not found, get any active agent
    if (!agentConfig) {
      agentConfig = await prisma.aIAgentConfig.findFirst({
        where: {
          companyId,
          isActive: true,
        },
        include: {
          dataSources: {
            include: {
              dataSource: true,
            },
          },
        },
      });
    }

    return agentConfig;
  }

  /**
   * Search for relevant content across all data sources
   */
  async searchRelevantContent(
    query: string,
    companyId: string,
    agentConfig: any,
    departmentId?: string
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Get data source IDs from agent config
    const dataSourceIds = agentConfig.dataSources?.map(
      (ds: any) => ds.dataSource.id
    ) || [];

    // Search in AI Documents using semantic search
    if (this.embeddingService && dataSourceIds.length > 0) {
      try {
        const semanticResults = await this.embeddingService.hybridSearch(
          query,
          companyId,
          {
            limit: 5,
            threshold: 0.4,
            dataSourceIds,
            departmentId,
          }
        );
        results.push(...semanticResults);
      } catch (error: any) {
        logger.warn('Semantic search failed, using keyword only', { error: error.message });
      }
    }

    // Also search in existing FAQ and Knowledge Base
    if (this.embeddingService) {
      try {
        const existingKnowledge = await this.embeddingService.searchExistingKnowledge(
          query,
          companyId,
          departmentId,
          5
        );
        results.push(...existingKnowledge);
      } catch (error: any) {
        logger.warn('Knowledge base search failed', { error: error.message });
      }
    }

    // Sort by score and remove duplicates
    const uniqueResults = this.deduplicateResults(results);
    return uniqueResults.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  /**
   * Generate response using the specialized AI agent
   */
  async generateResponse(
    query: string,
    agentConfig: any,
    relevantDocuments: SearchResult[],
    context: OrchestratorContext
  ): Promise<string> {
    // Build context from relevant documents
    const documentsContext = relevantDocuments
      .filter(doc => doc.score >= 0.4)
      .map(doc => `### ${doc.title}\n${doc.excerpt || doc.content.substring(0, 500)}`)
      .join('\n\n');

    // Build conversation context
    const conversationContext = context.recentMessages
      ?.map(m => `${m.role === 'assistant' ? 'Atendente' : 'Cliente'}: ${m.content}`)
      .join('\n') || '';

    // Build the complete system prompt
    const systemPrompt = this.buildAgentSystemPrompt(
      agentConfig,
      documentsContext,
      context.contactName
    );

    // Build the user message with context
    const userMessage = `${conversationContext ? `Contexto da conversa:\n${conversationContext}\n\n` : ''}Pergunta do atendente: ${query}`;

    try {
      if (this.provider === 'anthropic') {
        const anthropic = new Anthropic({ apiKey: this.apiKey });
        const result = await anthropic.messages.create({
          model: agentConfig.model || 'claude-sonnet-4-6',
          max_tokens: agentConfig.maxTokens || 1500,
          temperature: agentConfig.temperature || 0.7,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });
        const textContent = result.content.find(block => block.type === 'text');
        return textContent?.type === 'text' ? textContent.text : '';
      } else {
        const openai = new OpenAI({ apiKey: this.apiKey });
        const result = await openai.chat.completions.create({
          model: agentConfig.model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: agentConfig.temperature || 0.7,
          max_tokens: agentConfig.maxTokens || 1500,
        });
        return result.choices[0]?.message?.content || '';
      }
    } catch (error: any) {
      logger.error('Response generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Build the complete system prompt for an agent
   */
  private buildAgentSystemPrompt(
    agentConfig: any,
    documentsContext: string,
    contactName?: string
  ): string {
    let prompt = agentConfig.systemPrompt || '';

    // Add personality instructions
    if (agentConfig.tone || agentConfig.style) {
      prompt += `\n\nPERSONALIDADE:`;
      if (agentConfig.tone) {
        const toneMap: Record<string, string> = {
          friendly: 'Seja amigável e acolhedor',
          formal: 'Mantenha um tom formal e profissional',
          technical: 'Use linguagem técnica quando apropriado',
          empathetic: 'Demonstre empatia e compreensão',
        };
        prompt += `\n- Tom: ${toneMap[agentConfig.tone] || agentConfig.tone}`;
      }
      if (agentConfig.style) {
        const styleMap: Record<string, string> = {
          concise: 'Seja direto e objetivo nas respostas',
          detailed: 'Forneça respostas detalhadas e completas',
          conversational: 'Use um estilo conversacional e natural',
        };
        prompt += `\n- Estilo: ${styleMap[agentConfig.style] || agentConfig.style}`;
      }
    }

    // Add rules/restrictions
    const rules = agentConfig.rules as Record<string, any>;
    if (rules && Object.keys(rules).length > 0) {
      prompt += `\n\nREGRAS:`;
      if (rules.maxResponseLength) {
        prompt += `\n- Limite suas respostas a aproximadamente ${rules.maxResponseLength} caracteres`;
      }
      if (rules.forbiddenTopics?.length) {
        prompt += `\n- NÃO fale sobre: ${rules.forbiddenTopics.join(', ')}`;
      }
      if (rules.requiredDisclaimer) {
        prompt += `\n- Sempre inclua: "${rules.requiredDisclaimer}"`;
      }
    }

    // Add documents context
    if (documentsContext) {
      prompt += `\n\nINFORMAÇÕES DA BASE DE CONHECIMENTO:\n${documentsContext}`;
    }

    // Add contact info
    if (contactName) {
      prompt += `\n\nINFORMAÇÕES DO CLIENTE:\n- Nome: ${contactName}`;
    }

    // Add final instructions
    prompt += `\n\nINSTRUÇÕES FINAIS:
- Você está ajudando um atendente a responder um cliente
- Gere uma resposta que o atendente possa enviar diretamente ao cliente
- Use as informações da base de conhecimento quando relevantes
- Se não tiver certeza, indique que o atendente deve verificar a informação
- Não invente informações que não estejam na base de conhecimento`;

    return prompt;
  }

  /**
   * Remove duplicate results based on document ID
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.documentId)) {
        return false;
      }
      seen.add(result.documentId);
      return true;
    });
  }

  /**
   * Get available categories for a company
   */
  async getAvailableCategories(companyId: string): Promise<Array<{
    category: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }>> {
    const agentConfigs = await prisma.aIAgentConfig.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        category: true,
        name: true,
        description: true,
        icon: true,
        color: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { priority: 'desc' },
        { name: 'asc' },
      ],
    });

    return agentConfigs;
  }

  /**
   * Analyze sentiment and urgency of a message
   */
  async analyzeMessage(message: string): Promise<{
    sentiment: string;
    score: number;
    urgency: string;
    intent: string;
    keywords: string[];
  }> {
    const systemPrompt = `Analise a mensagem e retorne um JSON com:
- sentiment: "positive", "negative" ou "neutral"
- score: de -1 (muito negativo) a 1 (muito positivo)
- urgency: "low", "medium", "high" ou "critical"
- intent: "question", "complaint", "purchase", "support", "greeting" ou "other"
- keywords: array com até 5 palavras-chave importantes

Responda APENAS com JSON, sem markdown.`;

    try {
      let response: string;

      if (this.provider === 'anthropic') {
        const anthropic = new Anthropic({ apiKey: this.apiKey });
        const result = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        });
        const textContent = result.content.find(block => block.type === 'text');
        response = textContent?.type === 'text' ? textContent.text : '{}';
      } else {
        const openai = new OpenAI({ apiKey: this.apiKey });
        const result = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.3,
          max_tokens: 200,
        });
        response = result.choices[0]?.message?.content || '{}';
      }

      return JSON.parse(response);
    } catch (error: any) {
      logger.error('Message analysis failed', { error: error.message });
      return {
        sentiment: 'neutral',
        score: 0,
        urgency: 'medium',
        intent: 'other',
        keywords: [],
      };
    }
  }

  /**
   * Detect if the AI couldn't answer (knowledge gap)
   */
  detectKnowledgeGap(response: string, relevantDocuments: SearchResult[]): {
    hasGap: boolean;
    description?: string;
  } {
    // Check if response contains uncertainty indicators
    const uncertaintyPhrases = [
      'não tenho informação',
      'não encontrei',
      'não sei',
      'não possuo dados',
      'verificar com',
      'não consigo responder',
      'informação não disponível',
      'precisa confirmar',
      'não tenho certeza',
    ];

    const responseLower = response.toLowerCase();
    const hasUncertainty = uncertaintyPhrases.some(phrase => responseLower.includes(phrase));

    // Check if no relevant documents were found
    const noRelevantDocs = relevantDocuments.length === 0 ||
      relevantDocuments.every(doc => doc.score < 0.5);

    if (hasUncertainty || noRelevantDocs) {
      return {
        hasGap: true,
        description: hasUncertainty
          ? 'A IA indicou incerteza na resposta'
          : 'Nenhum documento relevante encontrado na base de conhecimento',
      };
    }

    return { hasGap: false };
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.aiService?.isConfigured() || false;
  }
}
