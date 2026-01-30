import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { AIService } from '../ai/ai.service.js';
import { EmbeddingService, SearchResult } from '../ai/embedding.service.js';
import { IntentClassifierService, IntentClassification } from './intent-classifier.service.js';
import { QualityScorerService, QualityScore } from './quality-scorer.service.js';

export interface GeneratedResponse {
  response: string;
  confidence: number;
  source: 'TEMPLATE' | 'KNOWLEDGE_BASE' | 'LEARNED_PATTERN' | 'GENERATED' | 'HYBRID';
  templateId?: string;
  documentIds?: string[];
  patternId?: string;
  qualityScore?: number;
  metadata: {
    intent?: string;
    category?: string;
    processingTimeMs?: number;
  };
}

export interface ResponseGeneratorConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  minConfidenceThreshold?: number;
  maxCandidates?: number;
  enableQualityScoring?: boolean;
}

export interface GenerateOptions {
  ticketId?: string;
  category?: string;
  intent?: string;
  useTemplates?: boolean;
  useLearnedPatterns?: boolean;
  useKnowledgeBase?: boolean;
  maxCandidates?: number;
  contactName?: string;
  previousMessages?: Array<{ content: string; isFromMe: boolean }>;
}

/**
 * Service responsável por gerar respostas usando conhecimento aprendido
 * Combina templates, padrões de ML e knowledge base para gerar respostas de alta qualidade
 */
export class MLResponseGeneratorService {
  private aiService: AIService | null = null;
  private embeddingService: EmbeddingService | null = null;
  private intentClassifier: IntentClassifierService | null = null;
  private qualityScorer: QualityScorerService | null = null;
  private config: ResponseGeneratorConfig;

  constructor(
    config: ResponseGeneratorConfig,
    embeddingService?: EmbeddingService,
    intentClassifier?: IntentClassifierService,
    qualityScorer?: QualityScorerService
  ) {
    this.config = {
      minConfidenceThreshold: 0.6,
      maxCandidates: 3,
      enableQualityScoring: true,
      ...config,
    };

    this.embeddingService = embeddingService || null;
    this.intentClassifier = intentClassifier || null;
    this.qualityScorer = qualityScorer || null;

    if (config.apiKey) {
      this.aiService = new AIService(config.provider, config.apiKey);
    }
  }

  /**
   * Gera respostas candidatas para uma mensagem do cliente
   */
  async generateResponses(
    customerMessage: string,
    companyId: string,
    options: GenerateOptions = {}
  ): Promise<GeneratedResponse[]> {
    const startTime = Date.now();
    const candidates: GeneratedResponse[] = [];

    const useTemplates = options.useTemplates !== false;
    const usePatterns = options.useLearnedPatterns !== false;
    const useKnowledge = options.useKnowledgeBase !== false;
    const maxCandidates = options.maxCandidates || this.config.maxCandidates || 3;

    try {
      // 1. Classificar intenção da mensagem
      let classification: IntentClassification | null = null;
      if (this.intentClassifier) {
        classification = await this.intentClassifier.classify(
          customerMessage,
          companyId,
          { previousMessages: options.previousMessages }
        );
      }

      const intent = options.intent || classification?.intent;
      const category = options.category || classification?.category;

      // 2. Buscar em paralelo: templates, padrões e knowledge base
      const [templateCandidates, patternCandidates, knowledgeCandidates] = await Promise.all([
        useTemplates ? this.getTemplateResponses(customerMessage, companyId, intent, category) : [],
        usePatterns ? this.getPatternResponses(customerMessage, companyId, intent) : [],
        useKnowledge && this.embeddingService
          ? this.getKnowledgeBaseResponses(customerMessage, companyId, category)
          : [],
      ]);

      // 3. Adicionar candidatos na ordem de prioridade
      candidates.push(...templateCandidates);
      candidates.push(...patternCandidates);
      candidates.push(...knowledgeCandidates);

      // 4. Se poucos candidatos, gerar com LLM
      if (candidates.length < maxCandidates && this.aiService) {
        const generatedCandidate = await this.generateWithLLM(
          customerMessage,
          companyId,
          {
            intent,
            category,
            contactName: options.contactName,
            previousMessages: options.previousMessages,
            existingCandidates: candidates,
          }
        );

        if (generatedCandidate) {
          candidates.push(generatedCandidate);
        }
      }

      // 5. Aplicar variáveis (nome do cliente, etc)
      const processedCandidates = candidates.map(c => ({
        ...c,
        response: this.applyVariables(c.response, {
          nome: options.contactName,
          cliente: options.contactName,
        }),
      }));

      // 6. Avaliar qualidade e ordenar
      const rankedCandidates = await this.rankCandidates(
        customerMessage,
        processedCandidates,
        companyId
      );

      // 7. Adicionar metadata
      const finalCandidates = rankedCandidates
        .slice(0, maxCandidates)
        .map(c => ({
          ...c,
          metadata: {
            ...c.metadata,
            intent,
            category,
            processingTimeMs: Date.now() - startTime,
          },
        }));

      logger.debug('Responses generated', {
        companyId,
        candidatesFound: finalCandidates.length,
        intent,
        category,
        processingTime: Date.now() - startTime,
      });

      return finalCandidates;
    } catch (error: any) {
      logger.error('Failed to generate responses', {
        error: error.message,
        companyId,
      });
      return [];
    }
  }

  /**
   * Gera a melhor resposta (single response)
   */
  async generateBestResponse(
    customerMessage: string,
    companyId: string,
    options: GenerateOptions = {}
  ): Promise<GeneratedResponse | null> {
    const candidates = await this.generateResponses(customerMessage, companyId, {
      ...options,
      maxCandidates: 1,
    });

    if (candidates.length === 0) {
      return null;
    }

    const best = candidates[0];

    // Verificar se atinge threshold mínimo
    if (best.confidence < (this.config.minConfidenceThreshold || 0.6)) {
      logger.debug('Best response below confidence threshold', {
        confidence: best.confidence,
        threshold: this.config.minConfidenceThreshold,
      });
      return null;
    }

    return best;
  }

  /**
   * Busca respostas de templates aprendidos
   */
  private async getTemplateResponses(
    message: string,
    companyId: string,
    intent?: string,
    category?: string
  ): Promise<GeneratedResponse[]> {
    try {
      const whereClause: any = {
        companyId,
        isActive: true,
        isApproved: true,
      };

      if (intent) {
        whereClause.intent = intent;
      } else if (category) {
        whereClause.category = category;
      }

      const templates = await prisma.mLResponseTemplate.findMany({
        where: whereClause,
        orderBy: [
          { usageCount: 'desc' },
          { avgRating: 'desc' },
        ],
        take: 3,
      });

      // Se não encontrou com filtros específicos, buscar por similaridade
      if (templates.length === 0 && this.embeddingService) {
        return this.getTemplatesByEmbedding(message, companyId);
      }

      return templates.map(t => ({
        response: t.template,
        confidence: 0.8 + (t.avgRating ? (t.avgRating - 3) * 0.1 : 0),
        source: 'TEMPLATE' as const,
        templateId: t.id,
        metadata: {},
      }));
    } catch (error) {
      logger.warn('Failed to get template responses', { error });
      return [];
    }
  }

  /**
   * Busca templates por similaridade de embedding
   */
  private async getTemplatesByEmbedding(
    message: string,
    companyId: string
  ): Promise<GeneratedResponse[]> {
    if (!this.embeddingService) return [];

    try {
      const messageEmbedding = await this.embeddingService.generateEmbedding(message);

      const templates = await prisma.mLResponseTemplate.findMany({
        where: {
          companyId,
          isActive: true,
          templateEmbedding: { isEmpty: false },
        },
        take: 20,
      });

      // Calcular similaridade
      const scored = templates
        .map(t => ({
          template: t,
          similarity: this.cosineSimilarity(messageEmbedding.embedding, t.templateEmbedding),
        }))
        .filter(s => s.similarity > 0.6)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      return scored.map(s => ({
        response: s.template.template,
        confidence: s.similarity,
        source: 'TEMPLATE' as const,
        templateId: s.template.id,
        metadata: {},
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Busca respostas de padrões aprendidos
   */
  private async getPatternResponses(
    message: string,
    companyId: string,
    intent?: string
  ): Promise<GeneratedResponse[]> {
    try {
      const whereClause: any = {
        companyId,
        isActive: true,
        suggestedResponseTemplate: { not: null },
      };

      if (intent) {
        whereClause.intent = intent;
      }

      const patterns = await prisma.mLIntentPattern.findMany({
        where: whereClause,
        orderBy: [
          { successRate: 'desc' },
          { occurrenceCount: 'desc' },
        ],
        take: 3,
      });

      return patterns
        .filter(p => p.suggestedResponseTemplate)
        .map(p => ({
          response: p.suggestedResponseTemplate!,
          confidence: p.successRate || 0.7,
          source: 'LEARNED_PATTERN' as const,
          patternId: p.id,
          metadata: {},
        }));
    } catch (error) {
      logger.warn('Failed to get pattern responses', { error });
      return [];
    }
  }

  /**
   * Busca respostas da knowledge base
   */
  private async getKnowledgeBaseResponses(
    message: string,
    companyId: string,
    category?: string
  ): Promise<GeneratedResponse[]> {
    if (!this.embeddingService) return [];

    try {
      const searchResults = await this.embeddingService.semanticSearch(
        message,
        companyId,
        {
          limit: 3,
          threshold: 0.6,
          categories: category ? [category] : undefined,
        }
      );

      if (searchResults.length === 0) return [];

      // Usar o conteúdo dos documentos como base para resposta
      return searchResults.map(doc => ({
        response: this.formatKnowledgeResponse(doc),
        confidence: doc.score,
        source: 'KNOWLEDGE_BASE' as const,
        documentIds: [doc.documentId],
        metadata: {},
      }));
    } catch (error) {
      logger.warn('Failed to get knowledge base responses', { error });
      return [];
    }
  }

  /**
   * Gera resposta usando LLM
   */
  private async generateWithLLM(
    message: string,
    companyId: string,
    context: {
      intent?: string;
      category?: string;
      contactName?: string;
      previousMessages?: Array<{ content: string; isFromMe: boolean }>;
      existingCandidates?: GeneratedResponse[];
    }
  ): Promise<GeneratedResponse | null> {
    if (!this.aiService) return null;

    try {
      // Buscar configurações da empresa
      const settings = await prisma.companySettings.findUnique({
        where: { companyId },
      });

      // Buscar AI agent config se houver
      let agentConfig = null;
      if (context.category) {
        agentConfig = await prisma.aIAgentConfig.findFirst({
          where: {
            companyId,
            category: context.category,
            isActive: true,
          },
        });
      }

      // Construir system prompt
      const systemPrompt = agentConfig?.systemPrompt ||
        settings?.aiSystemPrompt ||
        'Você é um assistente de atendimento ao cliente. Seja educado, prestativo e direto.';

      // Construir contexto da conversa
      let conversationContext = '';
      if (context.previousMessages?.length) {
        conversationContext = '\n\nConversa anterior:\n' +
          context.previousMessages
            .slice(-5)
            .map(m => `${m.isFromMe ? 'Atendente' : 'Cliente'}: ${m.content}`)
            .join('\n');
      }

      // Adicionar candidatos existentes como referência
      let candidatesContext = '';
      if (context.existingCandidates?.length) {
        candidatesContext = '\n\nRespostas de referência (use como inspiração):\n' +
          context.existingCandidates
            .slice(0, 2)
            .map((c, i) => `${i + 1}. ${c.response}`)
            .join('\n');
      }

      const userPrompt = `Responda à seguinte mensagem do cliente de forma profissional e útil.

${context.contactName ? `Nome do cliente: ${context.contactName}` : ''}
${context.intent ? `Intenção detectada: ${context.intent}` : ''}
${context.category ? `Categoria: ${context.category}` : ''}
${conversationContext}
${candidatesContext}

Mensagem do cliente: "${message}"

Resposta:`;

      const result = await this.aiService.generateResponse(
        systemPrompt,
        userPrompt,
        {},
        {
          temperature: agentConfig?.temperature || 0.7,
          maxTokens: agentConfig?.maxTokens || 500,
        }
      );

      return {
        response: result,
        confidence: 0.75, // Confiança base para respostas geradas
        source: 'GENERATED',
        metadata: {},
      };
    } catch (error) {
      logger.warn('LLM generation failed', { error });
      return null;
    }
  }

  /**
   * Ordena candidatos por qualidade e confiança
   */
  private async rankCandidates(
    customerMessage: string,
    candidates: GeneratedResponse[],
    companyId: string
  ): Promise<GeneratedResponse[]> {
    if (candidates.length <= 1) return candidates;

    // Se quality scorer disponível, usar para avaliar
    if (this.config.enableQualityScoring && this.qualityScorer) {
      const scoredCandidates = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const score = await this.qualityScorer!.scoreResponse(
              customerMessage,
              candidate.response,
              companyId
            );
            return {
              ...candidate,
              qualityScore: score.overallScore,
              // Ajustar confiança baseado na qualidade
              confidence: (candidate.confidence * 0.6) + (score.overallScore / 100 * 0.4),
            };
          } catch (error) {
            return candidate;
          }
        })
      );

      return scoredCandidates.sort((a, b) => b.confidence - a.confidence);
    }

    // Ordenar por confiança original
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Aplica variáveis no template
   */
  private applyVariables(
    template: string,
    variables: Record<string, string | undefined>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      if (value) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        result = result.replace(regex, value);
      }
    }

    // Remover variáveis não substituídas ou substituir por valor padrão
    result = result.replace(/\{\{\s*nome\s*\}\}/gi, 'cliente');
    result = result.replace(/\{\{\s*cliente\s*\}\}/gi, 'cliente');
    result = result.replace(/\{\{\s*\w+\s*\}\}/g, ''); // Remover outras variáveis não usadas

    return result.trim();
  }

  /**
   * Formata resposta da knowledge base
   */
  private formatKnowledgeResponse(doc: SearchResult): string {
    // Se o documento tem um excerpt relevante, usar
    if (doc.excerpt && doc.excerpt.length > 50) {
      return doc.excerpt;
    }

    // Caso contrário, usar início do conteúdo
    if (doc.content) {
      const firstParagraph = doc.content.split('\n\n')[0];
      if (firstParagraph.length > 500) {
        return firstParagraph.substring(0, 500) + '...';
      }
      return firstParagraph;
    }

    return doc.title;
  }

  /**
   * Calcula similaridade de cosseno
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;

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
   * Registra uso de uma resposta (para métricas e aprendizado)
   */
  async recordResponseUsage(
    responseData: {
      companyId: string;
      ticketId: string;
      messageId: string;
      source: GeneratedResponse['source'];
      templateId?: string;
      patternId?: string;
      wasUsed: boolean;
      wasEdited: boolean;
    }
  ): Promise<void> {
    try {
      // Atualizar contagem de uso do template
      if (responseData.templateId && responseData.wasUsed) {
        await prisma.mLResponseTemplate.update({
          where: { id: responseData.templateId },
          data: {
            usageCount: { increment: 1 },
            successCount: responseData.wasEdited ? undefined : { increment: 1 },
          },
        });
      }

      // Atualizar estatísticas do padrão
      if (responseData.patternId && responseData.wasUsed) {
        await prisma.mLIntentPattern.update({
          where: { id: responseData.patternId },
          data: {
            occurrenceCount: { increment: 1 },
          },
        });
      }

      logger.debug('Response usage recorded', {
        source: responseData.source,
        wasUsed: responseData.wasUsed,
        wasEdited: responseData.wasEdited,
      });
    } catch (error) {
      logger.warn('Failed to record response usage', { error });
    }
  }
}
