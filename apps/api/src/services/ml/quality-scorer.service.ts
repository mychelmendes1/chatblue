import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { AIService } from '../ai/ai.service.js';
import { EmbeddingService, SearchResult } from '../ai/embedding.service.js';

export interface QualityScore {
  overallScore: number; // 0-100
  relevanceScore: number; // Quão relevante é a resposta para a pergunta
  completenessScore: number; // A resposta é completa?
  clarityScore: number; // A resposta é clara?
  toneScore: number; // O tom é apropriado?
  factualScore: number; // Factualmente correto (vs knowledge base)
  breakdown: {
    [key: string]: {
      score: number;
      reason: string;
    };
  };
}

export interface QualityScorerConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  useFactCheck?: boolean;
}

/**
 * Service responsável por avaliar a qualidade de respostas
 * (tanto da IA quanto de atendentes humanos)
 */
export class QualityScorerService {
  private aiService: AIService | null = null;
  private embeddingService: EmbeddingService | null = null;
  private config: QualityScorerConfig;

  constructor(config: QualityScorerConfig, embeddingService?: EmbeddingService) {
    this.config = config;
    this.embeddingService = embeddingService || null;

    if (config.apiKey) {
      this.aiService = new AIService(config.provider, config.apiKey);
    }
  }

  /**
   * Avalia a qualidade de uma resposta
   */
  async scoreResponse(
    customerMessage: string,
    response: string,
    companyId: string,
    context?: {
      knowledgeBase?: SearchResult[];
      previousMessages?: Array<{ content: string; isFromMe: boolean }>;
      category?: string;
    }
  ): Promise<QualityScore> {
    const startTime = Date.now();

    try {
      // Calcular scores individuais
      const [relevanceScore, completenessScore, clarityScore, toneScore, factualScore] = await Promise.all([
        this.calculateRelevanceScore(customerMessage, response),
        this.calculateCompletenessScore(customerMessage, response),
        this.calculateClarityScore(response),
        this.calculateToneScore(response),
        this.calculateFactualScore(response, companyId, context?.knowledgeBase),
      ]);

      // Calcular score geral (média ponderada)
      const weights = {
        relevance: 0.30,
        completeness: 0.25,
        clarity: 0.15,
        tone: 0.10,
        factual: 0.20,
      };

      const overallScore = Math.round(
        relevanceScore.score * weights.relevance +
        completenessScore.score * weights.completeness +
        clarityScore.score * weights.clarity +
        toneScore.score * weights.tone +
        factualScore.score * weights.factual
      );

      logger.debug('Quality score calculated', {
        overallScore,
        processingTime: Date.now() - startTime,
      });

      return {
        overallScore,
        relevanceScore: relevanceScore.score,
        completenessScore: completenessScore.score,
        clarityScore: clarityScore.score,
        toneScore: toneScore.score,
        factualScore: factualScore.score,
        breakdown: {
          relevance: relevanceScore,
          completeness: completenessScore,
          clarity: clarityScore,
          tone: toneScore,
          factual: factualScore,
        },
      };
    } catch (error: any) {
      logger.error('Failed to calculate quality score', {
        error: error.message,
      });

      // Retornar score padrão em caso de erro
      return this.getDefaultScore();
    }
  }

  /**
   * Avalia a qualidade de múltiplos pares de treinamento
   */
  async scoreBatch(
    companyId: string,
    options: {
      limit?: number;
      onlyUnscored?: boolean;
    } = {}
  ): Promise<{ scored: number; avgScore: number }> {
    const limit = options.limit || 50;

    try {
      const whereClause: any = { companyId };
      if (options.onlyUnscored) {
        whereClause.qualityScore = null;
      }

      const pairs = await prisma.mLTrainingPair.findMany({
        where: whereClause,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      let totalScore = 0;
      let scored = 0;

      for (const pair of pairs) {
        try {
          const score = await this.scoreResponse(
            pair.customerQuery,
            pair.agentResponse,
            companyId
          );

          await prisma.mLTrainingPair.update({
            where: { id: pair.id },
            data: { qualityScore: score.overallScore },
          });

          totalScore += score.overallScore;
          scored++;
        } catch (error) {
          logger.warn('Failed to score training pair', { pairId: pair.id });
        }
      }

      const avgScore = scored > 0 ? totalScore / scored : 0;

      logger.info('Batch quality scoring completed', {
        companyId,
        scored,
        avgScore,
      });

      return { scored, avgScore };
    } catch (error: any) {
      logger.error('Failed to score batch', {
        companyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Compara duas respostas e determina qual é melhor
   */
  async compareResponses(
    customerMessage: string,
    responseA: string,
    responseB: string,
    companyId: string
  ): Promise<{
    winner: 'A' | 'B' | 'TIE';
    scoreA: number;
    scoreB: number;
    reasoning: string;
  }> {
    const [scoreA, scoreB] = await Promise.all([
      this.scoreResponse(customerMessage, responseA, companyId),
      this.scoreResponse(customerMessage, responseB, companyId),
    ]);

    const diff = scoreA.overallScore - scoreB.overallScore;
    let winner: 'A' | 'B' | 'TIE';
    let reasoning: string;

    if (Math.abs(diff) < 5) {
      winner = 'TIE';
      reasoning = 'As duas respostas têm qualidade similar.';
    } else if (diff > 0) {
      winner = 'A';
      reasoning = this.generateComparisonReasoning(scoreA, scoreB);
    } else {
      winner = 'B';
      reasoning = this.generateComparisonReasoning(scoreB, scoreA);
    }

    return {
      winner,
      scoreA: scoreA.overallScore,
      scoreB: scoreB.overallScore,
      reasoning,
    };
  }

  /**
   * Calcula o score de relevância (quão bem a resposta responde à pergunta)
   */
  private async calculateRelevanceScore(
    question: string,
    response: string
  ): Promise<{ score: number; reason: string }> {
    // Se temos AI service, usar LLM para avaliar
    if (this.aiService) {
      try {
        const prompt = `Avalie de 0 a 100 quão relevante é esta resposta para a pergunta do cliente.

Pergunta do cliente: "${question}"

Resposta: "${response}"

Considere:
- A resposta aborda diretamente o que foi perguntado?
- Há informações irrelevantes ou off-topic?
- O assunto principal foi tratado?

Responda APENAS com um JSON no formato: {"score": 85, "reason": "explicação breve"}`;

        const result = await this.aiService.generateResponse(
          'Você é um avaliador de qualidade de atendimento.',
          prompt,
          {},
          { temperature: 0.3, maxTokens: 200 }
        );

        const jsonMatch = result.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
        return {
          score: Math.min(100, Math.max(0, parsed.score)),
          reason: parsed.reason,
        };
      } catch (error) {
        logger.debug('LLM relevance scoring failed, using heuristic');
      }
    }

    // Fallback: análise heurística
    return this.heuristicRelevanceScore(question, response);
  }

  /**
   * Calcula o score de completude (a resposta está completa?)
   */
  private async calculateCompletenessScore(
    question: string,
    response: string
  ): Promise<{ score: number; reason: string }> {
    // Análise heurística de completude
    const questionMarks = (question.match(/\?/g) || []).length;
    const hasMultipleQuestions = questionMarks > 1;

    // Verificar se a resposta é muito curta
    const wordCount = response.split(/\s+/).length;

    if (wordCount < 5) {
      return { score: 30, reason: 'Resposta muito curta' };
    }

    if (wordCount < 15 && hasMultipleQuestions) {
      return { score: 50, reason: 'Resposta curta para múltiplas perguntas' };
    }

    // Verificar se termina de forma abrupta
    if (!response.match(/[.!?]$/)) {
      return { score: 70, reason: 'Resposta pode estar incompleta (não termina com pontuação)' };
    }

    // Verificar estrutura
    const hasStructure = response.includes('\n') || response.includes(':') || response.includes('-');

    if (hasMultipleQuestions && hasStructure) {
      return { score: 95, reason: 'Resposta estruturada para múltiplas perguntas' };
    }

    if (wordCount > 30) {
      return { score: 90, reason: 'Resposta detalhada' };
    }

    return { score: 80, reason: 'Resposta adequada' };
  }

  /**
   * Calcula o score de clareza
   */
  private async calculateClarityScore(response: string): Promise<{ score: number; reason: string }> {
    const wordCount = response.split(/\s+/).length;
    const sentenceCount = (response.match(/[.!?]+/g) || []).length || 1;
    const avgWordsPerSentence = wordCount / sentenceCount;

    // Frases muito longas são menos claras
    if (avgWordsPerSentence > 30) {
      return { score: 60, reason: 'Frases muito longas, difícil de ler' };
    }

    // Verificar uso de termos técnicos sem explicação
    const technicalTerms = response.match(/\b[A-Z]{2,}\b/g) || [];
    if (technicalTerms.length > 3) {
      return { score: 70, reason: 'Muitos termos técnicos/siglas' };
    }

    // Verificar estrutura (parágrafos, listas)
    const hasGoodStructure = response.includes('\n') || response.includes('•') || response.includes('-');

    if (hasGoodStructure && avgWordsPerSentence < 20) {
      return { score: 95, reason: 'Bem estruturada e fácil de ler' };
    }

    if (avgWordsPerSentence < 15) {
      return { score: 90, reason: 'Frases claras e concisas' };
    }

    return { score: 80, reason: 'Clareza adequada' };
  }

  /**
   * Calcula o score de tom (profissional, amigável, apropriado)
   */
  private async calculateToneScore(response: string): Promise<{ score: number; reason: string }> {
    const lowercaseResponse = response.toLowerCase();

    // Verificar saudação
    const hasGreeting = /^(olá|oi|bom dia|boa tarde|boa noite|prezad)/i.test(response);

    // Verificar despedida/fechamento
    const hasClosing = /(obrigad|atenciosamente|qualquer dúvida|à disposição|abraço)/i.test(response);

    // Verificar linguagem negativa
    const negativePatterns = [
      /\bnão posso\b/i,
      /\bnão é possível\b/i,
      /\binfelizmente\b/i,
      /\bdesculp/i,
    ];
    const hasNegative = negativePatterns.some(p => p.test(response));

    // Verificar linguagem muito informal
    const informalPatterns = [
      /\bkkkk/i,
      /\bhaha/i,
      /\brsrs/i,
      /\btá\b/i,
      /\bvc\b/i,
      /\bpq\b/i,
    ];
    const hasInformal = informalPatterns.some(p => p.test(response));

    // Verificar caps lock excessivo
    const capsRatio = (response.match(/[A-Z]/g) || []).length / response.length;
    const hasTooManyCaps = capsRatio > 0.3 && response.length > 20;

    let score = 80;
    let reasons: string[] = [];

    if (hasGreeting) {
      score += 5;
      reasons.push('saudação apropriada');
    }

    if (hasClosing) {
      score += 5;
      reasons.push('fechamento cordial');
    }

    if (hasNegative) {
      score -= 5;
      reasons.push('contém linguagem negativa');
    }

    if (hasInformal) {
      score -= 15;
      reasons.push('linguagem muito informal');
    }

    if (hasTooManyCaps) {
      score -= 10;
      reasons.push('uso excessivo de maiúsculas');
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      reason: reasons.length > 0 ? reasons.join(', ') : 'tom adequado',
    };
  }

  /**
   * Calcula o score de precisão factual (comparando com knowledge base)
   */
  private async calculateFactualScore(
    response: string,
    companyId: string,
    knowledgeBase?: SearchResult[]
  ): Promise<{ score: number; reason: string }> {
    // Se não temos base de conhecimento para comparar, assumir correto
    if (!knowledgeBase || knowledgeBase.length === 0) {
      if (this.embeddingService) {
        // Tentar buscar documentos relevantes
        try {
          const results = await this.embeddingService.semanticSearch(
            response,
            companyId,
            { limit: 3, threshold: 0.6 }
          );

          if (results.length === 0) {
            return { score: 70, reason: 'Sem base de conhecimento para validar' };
          }

          // Verificar se a resposta está alinhada com os documentos
          const avgRelevance = results.reduce((acc, r) => acc + r.score, 0) / results.length;
          const score = Math.round(avgRelevance * 100);

          return {
            score: Math.max(50, score),
            reason: `Alinhamento com base de conhecimento: ${score}%`,
          };
        } catch (error) {
          return { score: 70, reason: 'Erro ao validar com base de conhecimento' };
        }
      }

      return { score: 75, reason: 'Não foi possível validar factualmente' };
    }

    // Calcular similaridade média com documentos da base
    const avgScore = knowledgeBase.reduce((acc, doc) => acc + doc.score, 0) / knowledgeBase.length;

    if (avgScore > 0.8) {
      return { score: 95, reason: 'Altamente alinhado com base de conhecimento' };
    }

    if (avgScore > 0.6) {
      return { score: 85, reason: 'Alinhado com base de conhecimento' };
    }

    if (avgScore > 0.4) {
      return { score: 70, reason: 'Parcialmente alinhado com base de conhecimento' };
    }

    return { score: 50, reason: 'Pouco alinhamento com base de conhecimento' };
  }

  /**
   * Análise heurística de relevância (fallback)
   */
  private heuristicRelevanceScore(
    question: string,
    response: string
  ): { score: number; reason: string } {
    const questionLower = question.toLowerCase();
    const responseLower = response.toLowerCase();

    // Extrair palavras-chave da pergunta
    const questionWords = questionLower
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Contar quantas palavras-chave aparecem na resposta
    let matches = 0;
    for (const word of questionWords) {
      if (responseLower.includes(word)) {
        matches++;
      }
    }

    const matchRatio = questionWords.length > 0 ? matches / questionWords.length : 0.5;

    if (matchRatio > 0.6) {
      return { score: 90, reason: 'Alta correspondência de palavras-chave' };
    }

    if (matchRatio > 0.3) {
      return { score: 75, reason: 'Correspondência moderada de palavras-chave' };
    }

    if (matchRatio > 0.1) {
      return { score: 60, reason: 'Baixa correspondência de palavras-chave' };
    }

    return { score: 40, reason: 'Pouca relevância detectada' };
  }

  /**
   * Gera texto explicando por que uma resposta é melhor que outra
   */
  private generateComparisonReasoning(better: QualityScore, worse: QualityScore): string {
    const reasons: string[] = [];

    if (better.relevanceScore - worse.relevanceScore > 10) {
      reasons.push('mais relevante para a pergunta');
    }

    if (better.completenessScore - worse.completenessScore > 10) {
      reasons.push('mais completa');
    }

    if (better.clarityScore - worse.clarityScore > 10) {
      reasons.push('mais clara');
    }

    if (better.toneScore - worse.toneScore > 10) {
      reasons.push('tom mais apropriado');
    }

    if (better.factualScore - worse.factualScore > 10) {
      reasons.push('mais precisa factualmente');
    }

    if (reasons.length === 0) {
      return 'A resposta vencedora tem melhor qualidade geral.';
    }

    return `A resposta vencedora é ${reasons.join(', ')}.`;
  }

  /**
   * Retorna um score padrão em caso de erro
   */
  private getDefaultScore(): QualityScore {
    return {
      overallScore: 50,
      relevanceScore: 50,
      completenessScore: 50,
      clarityScore: 50,
      toneScore: 50,
      factualScore: 50,
      breakdown: {
        relevance: { score: 50, reason: 'Score padrão' },
        completeness: { score: 50, reason: 'Score padrão' },
        clarity: { score: 50, reason: 'Score padrão' },
        tone: { score: 50, reason: 'Score padrão' },
        factual: { score: 50, reason: 'Score padrão' },
      },
    };
  }
}
