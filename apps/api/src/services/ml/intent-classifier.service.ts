import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { AIService } from '../ai/ai.service.js';
import { EmbeddingService } from '../ai/embedding.service.js';

export interface IntentClassification {
  intent: string; // Ex: "PRICE_INQUIRY", "COMPLAINT", "ORDER_STATUS"
  category: string; // Ex: "vendas", "suporte", "financeiro"
  confidence: number; // 0-1
  subIntents: string[]; // Intenções secundárias detectadas
  keywords: string[]; // Palavras-chave encontradas
}

export interface IntentPattern {
  intent: string;
  category: string;
  keywords: string[];
  examplePhrases: string[];
  centroidEmbedding?: number[];
}

// Padrões de intenção predefinidos (base inicial)
const DEFAULT_INTENT_PATTERNS: Omit<IntentPattern, 'centroidEmbedding'>[] = [
  // Vendas
  {
    intent: 'PRICE_INQUIRY',
    category: 'vendas',
    keywords: ['preço', 'valor', 'quanto', 'custa', 'custo', 'orçamento', 'cotação'],
    examplePhrases: [
      'Qual o preço?',
      'Quanto custa?',
      'Qual o valor do produto?',
      'Podem me passar um orçamento?',
    ],
  },
  {
    intent: 'PRODUCT_INFO',
    category: 'vendas',
    keywords: ['produto', 'serviço', 'funciona', 'características', 'especificações'],
    examplePhrases: [
      'Como funciona o produto?',
      'Quais as características?',
      'O que está incluso?',
      'Quais as especificações?',
    ],
  },
  {
    intent: 'PURCHASE_INTENT',
    category: 'vendas',
    keywords: ['comprar', 'adquirir', 'contratar', 'fechar', 'quero', 'interesse'],
    examplePhrases: [
      'Quero comprar',
      'Tenho interesse',
      'Gostaria de contratar',
      'Como faço para adquirir?',
    ],
  },
  {
    intent: 'AVAILABILITY',
    category: 'vendas',
    keywords: ['disponível', 'estoque', 'prazo', 'entrega', 'quando', 'chega'],
    examplePhrases: [
      'Tem disponível?',
      'Qual o prazo de entrega?',
      'Quando chega?',
      'Está em estoque?',
    ],
  },

  // Suporte
  {
    intent: 'TECHNICAL_ISSUE',
    category: 'suporte',
    keywords: ['erro', 'problema', 'bug', 'não funciona', 'travou', 'lento', 'falha'],
    examplePhrases: [
      'Está dando erro',
      'Não está funcionando',
      'O sistema travou',
      'Encontrei um bug',
    ],
  },
  {
    intent: 'HOW_TO',
    category: 'suporte',
    keywords: ['como', 'faço', 'fazer', 'onde', 'consigo', 'acessar'],
    examplePhrases: [
      'Como faço para...?',
      'Onde encontro...?',
      'Como acesso...?',
      'Como configuro...?',
    ],
  },
  {
    intent: 'ACCOUNT_ISSUE',
    category: 'suporte',
    keywords: ['conta', 'login', 'senha', 'acesso', 'cadastro', 'email'],
    examplePhrases: [
      'Não consigo acessar minha conta',
      'Esqueci minha senha',
      'Preciso alterar meu email',
      'Problema no login',
    ],
  },

  // Financeiro
  {
    intent: 'PAYMENT_ISSUE',
    category: 'financeiro',
    keywords: ['pagamento', 'boleto', 'cartão', 'pix', 'cobrança', 'fatura'],
    examplePhrases: [
      'Preciso da segunda via do boleto',
      'Problema no pagamento',
      'Não consegui pagar',
      'Vocês aceitam pix?',
    ],
  },
  {
    intent: 'REFUND_REQUEST',
    category: 'financeiro',
    keywords: ['reembolso', 'estorno', 'devolução', 'cancelar', 'cancelamento'],
    examplePhrases: [
      'Quero cancelar',
      'Preciso de reembolso',
      'Gostaria do estorno',
      'Como faço para devolver?',
    ],
  },
  {
    intent: 'INVOICE_REQUEST',
    category: 'financeiro',
    keywords: ['nota fiscal', 'nf', 'recibo', 'comprovante'],
    examplePhrases: [
      'Preciso da nota fiscal',
      'Podem enviar o recibo?',
      'Onde encontro a NF?',
    ],
  },

  // Atendimento
  {
    intent: 'COMPLAINT',
    category: 'atendimento',
    keywords: ['reclamação', 'insatisfeito', 'péssimo', 'horrível', 'absurdo', 'desrespeito'],
    examplePhrases: [
      'Quero fazer uma reclamação',
      'Estou muito insatisfeito',
      'Isso é um absurdo',
      'Péssimo atendimento',
    ],
  },
  {
    intent: 'HUMAN_REQUEST',
    category: 'atendimento',
    keywords: ['atendente', 'humano', 'pessoa', 'transferir', 'falar com'],
    examplePhrases: [
      'Quero falar com um atendente',
      'Me transfere para um humano',
      'Preciso de uma pessoa real',
    ],
  },
  {
    intent: 'STATUS_CHECK',
    category: 'atendimento',
    keywords: ['status', 'andamento', 'situação', 'acompanhar', 'pedido', 'protocolo'],
    examplePhrases: [
      'Qual o status do meu pedido?',
      'Como está o andamento?',
      'Quero acompanhar meu protocolo',
    ],
  },

  // Geral
  {
    intent: 'GREETING',
    category: 'geral',
    keywords: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem'],
    examplePhrases: [
      'Olá',
      'Oi, tudo bem?',
      'Bom dia',
      'Boa tarde',
    ],
  },
  {
    intent: 'THANKS',
    category: 'geral',
    keywords: ['obrigado', 'obrigada', 'agradeço', 'valeu', 'thanks'],
    examplePhrases: [
      'Muito obrigado',
      'Agradeço a ajuda',
      'Valeu!',
    ],
  },
  {
    intent: 'CONFIRMATION',
    category: 'geral',
    keywords: ['sim', 'pode', 'ok', 'certo', 'confirmo', 'correto', 'isso'],
    examplePhrases: [
      'Sim, pode fazer',
      'Ok, entendi',
      'Certo, confirmo',
      'Isso mesmo',
    ],
  },
];

export interface IntentClassifierConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  useLLMFallback?: boolean;
  confidenceThreshold?: number;
}

/**
 * Service responsável por classificar a intenção das mensagens dos clientes
 */
export class IntentClassifierService {
  private aiService: AIService | null = null;
  private embeddingService: EmbeddingService | null = null;
  private config: IntentClassifierConfig;
  private defaultPatterns: IntentPattern[] = DEFAULT_INTENT_PATTERNS;

  constructor(config: IntentClassifierConfig, embeddingService?: EmbeddingService) {
    this.config = {
      useLLMFallback: true,
      confidenceThreshold: 0.7,
      ...config,
    };

    this.embeddingService = embeddingService || null;

    if (config.apiKey) {
      this.aiService = new AIService(config.provider, config.apiKey, config.model);
    }
  }

  /**
   * Classifica a intenção de uma mensagem
   */
  async classify(
    message: string,
    companyId: string,
    context?: {
      previousMessages?: Array<{ content: string; isFromMe: boolean }>;
      contactTags?: string[];
    }
  ): Promise<IntentClassification> {
    const startTime = Date.now();

    try {
      // 1. Tentar classificação por keywords primeiro (rápido)
      const keywordResult = await this.classifyByKeywords(message, companyId);

      if (keywordResult.confidence >= (this.config.confidenceThreshold || 0.7)) {
        logger.debug('Intent classified by keywords', {
          intent: keywordResult.intent,
          confidence: keywordResult.confidence,
          time: Date.now() - startTime,
        });
        return keywordResult;
      }

      // 2. Tentar classificação por embedding similarity
      if (this.embeddingService) {
        const embeddingResult = await this.classifyByEmbedding(message, companyId);

        if (embeddingResult.confidence >= (this.config.confidenceThreshold || 0.7)) {
          logger.debug('Intent classified by embedding', {
            intent: embeddingResult.intent,
            confidence: embeddingResult.confidence,
            time: Date.now() - startTime,
          });
          return embeddingResult;
        }

        // Combinar resultados se ambos tiverem alguma confiança
        if (embeddingResult.confidence > keywordResult.confidence) {
          keywordResult.intent = embeddingResult.intent;
          keywordResult.category = embeddingResult.category;
          keywordResult.confidence = embeddingResult.confidence;
        }
      }

      // 3. Usar LLM como fallback para casos ambíguos
      if (this.config.useLLMFallback && this.aiService && keywordResult.confidence < 0.5) {
        const llmResult = await this.classifyByLLM(message, companyId, context);

        logger.debug('Intent classified by LLM', {
          intent: llmResult.intent,
          confidence: llmResult.confidence,
          time: Date.now() - startTime,
        });

        return llmResult;
      }

      return keywordResult;
    } catch (error: any) {
      logger.error('Failed to classify intent', {
        error: error.message,
        message: message.substring(0, 100),
      });

      // Retornar classificação genérica em caso de erro
      return {
        intent: 'UNKNOWN',
        category: 'geral',
        confidence: 0,
        subIntents: [],
        keywords: [],
      };
    }
  }

  /**
   * Classifica usando correspondência de palavras-chave
   */
  private async classifyByKeywords(
    message: string,
    companyId: string
  ): Promise<IntentClassification> {
    const messageLower = message.toLowerCase();
    const foundKeywords: string[] = [];

    // Buscar padrões aprendidos da empresa
    const learnedPatterns = await prisma.mLIntentPattern.findMany({
      where: {
        companyId,
        isActive: true,
      },
    });

    // Combinar padrões padrão com aprendidos
    const allPatterns: IntentPattern[] = [
      ...this.defaultPatterns,
      ...learnedPatterns.map(p => ({
        intent: p.intent,
        category: p.category,
        keywords: p.keywords,
        examplePhrases: p.examplePhrases,
        centroidEmbedding: p.centroidEmbedding,
      })),
    ];

    // Calcular score para cada padrão
    const scores: Array<{ pattern: IntentPattern; score: number; matchedKeywords: string[] }> = [];

    for (const pattern of allPatterns) {
      let score = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of pattern.keywords) {
        if (messageLower.includes(keyword.toLowerCase())) {
          score += 1;
          matchedKeywords.push(keyword);
          foundKeywords.push(keyword);
        }
      }

      // Normalizar score pelo número de keywords
      const normalizedScore = pattern.keywords.length > 0
        ? score / Math.sqrt(pattern.keywords.length) // Raiz quadrada para não penalizar muito padrões com muitas keywords
        : 0;

      if (score > 0) {
        scores.push({ pattern, score: normalizedScore, matchedKeywords });
      }
    }

    // Ordenar por score
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      return {
        intent: 'UNKNOWN',
        category: 'geral',
        confidence: 0,
        subIntents: [],
        keywords: [],
      };
    }

    const best = scores[0];
    const confidence = Math.min(best.score, 1);

    // Pegar sub-intents (outros padrões com score razoável)
    const subIntents = scores
      .slice(1, 4)
      .filter(s => s.score >= confidence * 0.5)
      .map(s => s.pattern.intent);

    return {
      intent: best.pattern.intent,
      category: best.pattern.category,
      confidence,
      subIntents,
      keywords: best.matchedKeywords,
    };
  }

  /**
   * Classifica usando similaridade de embedding
   */
  private async classifyByEmbedding(
    message: string,
    companyId: string
  ): Promise<IntentClassification> {
    if (!this.embeddingService) {
      return {
        intent: 'UNKNOWN',
        category: 'geral',
        confidence: 0,
        subIntents: [],
        keywords: [],
      };
    }

    try {
      // Gerar embedding da mensagem
      const messageEmbedding = await this.embeddingService.generateEmbedding(message);

      // Buscar padrões com embedding
      const patterns = await prisma.mLIntentPattern.findMany({
        where: {
          companyId,
          isActive: true,
          centroidEmbedding: { isEmpty: false },
        },
      });

      if (patterns.length === 0) {
        return {
          intent: 'UNKNOWN',
          category: 'geral',
          confidence: 0,
          subIntents: [],
          keywords: [],
        };
      }

      // Calcular similaridade com cada padrão
      const similarities = patterns.map(pattern => ({
        pattern,
        similarity: this.cosineSimilarity(messageEmbedding.embedding, pattern.centroidEmbedding),
      }));

      // Ordenar por similaridade
      similarities.sort((a, b) => b.similarity - a.similarity);

      const best = similarities[0];

      // Sub-intents
      const subIntents = similarities
        .slice(1, 4)
        .filter(s => s.similarity >= best.similarity * 0.7)
        .map(s => s.pattern.intent);

      return {
        intent: best.pattern.intent,
        category: best.pattern.category,
        confidence: best.similarity,
        subIntents,
        keywords: best.pattern.keywords.slice(0, 5),
      };
    } catch (error) {
      logger.warn('Embedding classification failed', { error });
      return {
        intent: 'UNKNOWN',
        category: 'geral',
        confidence: 0,
        subIntents: [],
        keywords: [],
      };
    }
  }

  /**
   * Classifica usando LLM (mais preciso, mas mais lento e caro)
   */
  private async classifyByLLM(
    message: string,
    companyId: string,
    context?: {
      previousMessages?: Array<{ content: string; isFromMe: boolean }>;
      contactTags?: string[];
    }
  ): Promise<IntentClassification> {
    if (!this.aiService) {
      return {
        intent: 'UNKNOWN',
        category: 'geral',
        confidence: 0,
        subIntents: [],
        keywords: [],
      };
    }

    // Buscar categorias e intents disponíveis
    const availablePatterns = await prisma.mLIntentPattern.findMany({
      where: { companyId, isActive: true },
      select: { intent: true, category: true, name: true },
    });

    const categoriesList = [...new Set([
      ...this.defaultPatterns.map(p => p.category),
      ...availablePatterns.map(p => p.category),
    ])];

    const intentsList = [
      ...this.defaultPatterns.map(p => `${p.intent} (${p.category})`),
      ...availablePatterns.map(p => `${p.intent} (${p.category})`),
    ];

    // Construir contexto
    let contextText = '';
    if (context?.previousMessages?.length) {
      contextText = '\n\nMensagens anteriores da conversa:\n' +
        context.previousMessages
          .slice(-3)
          .map(m => `${m.isFromMe ? 'Atendente' : 'Cliente'}: ${m.content}`)
          .join('\n');
    }

    const prompt = `Classifique a intenção da seguinte mensagem de um cliente.

Mensagem: "${message}"
${contextText}

Categorias disponíveis: ${categoriesList.join(', ')}

Intenções disponíveis:
${intentsList.join('\n')}

Responda APENAS com um JSON no formato:
{
  "intent": "NOME_DO_INTENT",
  "category": "categoria",
  "confidence": 0.85,
  "subIntents": ["OUTRO_INTENT"],
  "keywords": ["palavra1", "palavra2"]
}`;

    try {
      const result = await this.aiService.generateResponse(
        'Você é um classificador de intenções de mensagens de clientes. Seja preciso e consistente.',
        prompt,
        { temperature: 0.2, maxTokens: 300 }
      );

      // Extrair JSON da resposta
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'UNKNOWN',
          category: parsed.category || 'geral',
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
          subIntents: parsed.subIntents || [],
          keywords: parsed.keywords || [],
        };
      }
    } catch (error) {
      logger.warn('LLM classification failed', { error });
    }

    return {
      intent: 'UNKNOWN',
      category: 'geral',
      confidence: 0.3,
      subIntents: [],
      keywords: [],
    };
  }

  /**
   * Treina/atualiza padrões de intenção com novos dados
   */
  async trainFromTrainingPairs(
    companyId: string,
    options: {
      minOccurrences?: number;
      minQualityScore?: number;
    } = {}
  ): Promise<{ patternsCreated: number; patternsUpdated: number }> {
    const minOccurrences = options.minOccurrences || 5;
    const minQualityScore = options.minQualityScore || 70;

    try {
      // Buscar training pairs de alta qualidade agrupados por intent
      const pairs = await prisma.mLTrainingPair.findMany({
        where: {
          companyId,
          intent: { not: null },
          qualityScore: { gte: minQualityScore },
        },
        select: {
          intent: true,
          category: true,
          customerQuery: true,
          customerEmbedding: true,
        },
      });

      // Agrupar por intent
      const intentGroups = new Map<string, typeof pairs>();

      for (const pair of pairs) {
        if (!pair.intent) continue;

        const key = pair.intent;
        if (!intentGroups.has(key)) {
          intentGroups.set(key, []);
        }
        intentGroups.get(key)!.push(pair);
      }

      let patternsCreated = 0;
      let patternsUpdated = 0;

      // Processar cada grupo
      for (const [intent, groupPairs] of intentGroups) {
        if (groupPairs.length < minOccurrences) continue;

        const category = groupPairs[0].category || 'geral';

        // Extrair exemplos e keywords
        const examplePhrases = groupPairs
          .slice(0, 10)
          .map(p => p.customerQuery);

        const keywords = this.extractKeywordsFromPhrases(examplePhrases);

        // Calcular centroide dos embeddings
        const validEmbeddings = groupPairs
          .map(p => p.customerEmbedding)
          .filter(e => e && e.length > 0);

        let centroidEmbedding: number[] = [];
        if (validEmbeddings.length > 0) {
          centroidEmbedding = this.calculateCentroid(validEmbeddings as number[][]);
        }

        // Verificar se padrão já existe
        const existing = await prisma.mLIntentPattern.findUnique({
          where: {
            companyId_intent: {
              companyId,
              intent,
            },
          },
        });

        if (existing) {
          // Atualizar padrão existente
          await prisma.mLIntentPattern.update({
            where: { id: existing.id },
            data: {
              examplePhrases: [...new Set([...existing.examplePhrases, ...examplePhrases])].slice(0, 20),
              keywords: [...new Set([...existing.keywords, ...keywords])],
              centroidEmbedding: centroidEmbedding.length > 0 ? centroidEmbedding : existing.centroidEmbedding,
              occurrenceCount: existing.occurrenceCount + groupPairs.length,
              updatedAt: new Date(),
            },
          });
          patternsUpdated++;
        } else {
          // Criar novo padrão
          await prisma.mLIntentPattern.create({
            data: {
              companyId,
              intent,
              category,
              name: this.generatePatternName(intent),
              examplePhrases,
              keywords,
              centroidEmbedding,
              confidence: 0.7,
              occurrenceCount: groupPairs.length,
            },
          });
          patternsCreated++;
        }
      }

      logger.info('Intent patterns trained', {
        companyId,
        patternsCreated,
        patternsUpdated,
      });

      return { patternsCreated, patternsUpdated };
    } catch (error: any) {
      logger.error('Failed to train intent patterns', {
        companyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Detecta novos padrões de intenção emergentes
   */
  async detectNewPatterns(
    companyId: string,
    options: {
      minClusterSize?: number;
      similarityThreshold?: number;
    } = {}
  ): Promise<Array<{ intent: string; examples: string[]; confidence: number }>> {
    // Esta é uma implementação simplificada
    // Uma implementação completa usaria clustering (k-means, DBSCAN, etc.)

    const minClusterSize = options.minClusterSize || 5;

    try {
      // Buscar training pairs sem intent classificado
      const unclassifiedPairs = await prisma.mLTrainingPair.findMany({
        where: {
          companyId,
          intent: null,
          customerEmbedding: { isEmpty: false },
        },
        take: 500,
      });

      if (unclassifiedPairs.length < minClusterSize) {
        return [];
      }

      // Agrupar por similaridade usando clustering simples
      const clusters: Array<{
        examples: string[];
        embeddings: number[][];
      }> = [];

      for (const pair of unclassifiedPairs) {
        const embedding = pair.customerEmbedding;
        if (!embedding || embedding.length === 0) continue;

        // Encontrar cluster mais similar
        let bestCluster = -1;
        let bestSimilarity = 0;

        for (let i = 0; i < clusters.length; i++) {
          const centroid = this.calculateCentroid(clusters[i].embeddings);
          const similarity = this.cosineSimilarity(embedding, centroid);

          if (similarity > bestSimilarity && similarity > (options.similarityThreshold || 0.7)) {
            bestCluster = i;
            bestSimilarity = similarity;
          }
        }

        if (bestCluster >= 0) {
          clusters[bestCluster].examples.push(pair.customerQuery);
          clusters[bestCluster].embeddings.push(embedding);
        } else {
          // Criar novo cluster
          clusters.push({
            examples: [pair.customerQuery],
            embeddings: [embedding],
          });
        }
      }

      // Filtrar clusters significativos
      const newPatterns = clusters
        .filter(c => c.examples.length >= minClusterSize)
        .map((cluster, index) => ({
          intent: `NEW_PATTERN_${index + 1}`,
          examples: cluster.examples.slice(0, 10),
          confidence: 0.6 + (cluster.examples.length / 100), // Maior cluster = maior confiança
        }));

      return newPatterns;
    } catch (error: any) {
      logger.error('Failed to detect new patterns', {
        companyId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Extrai keywords de uma lista de frases
   */
  private extractKeywordsFromPhrases(phrases: string[]): string[] {
    const stopWords = new Set([
      'a', 'o', 'e', 'é', 'de', 'da', 'do', 'em', 'um', 'uma', 'para', 'com',
      'não', 'por', 'mais', 'como', 'mas', 'foi', 'ou', 'ser', 'quando',
      'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo',
      'quero', 'preciso', 'gostaria', 'posso', 'pode', 'vocês', 'aqui',
      'oi', 'olá', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite', 'obrigado',
    ]);

    const wordCounts = new Map<string, number>();

    for (const phrase of phrases) {
      const words = phrase
        .toLowerCase()
        .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Retornar palavras que aparecem em pelo menos 30% das frases
    const threshold = phrases.length * 0.3;

    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 10);
  }

  /**
   * Calcula centroide de um conjunto de embeddings
   */
  private calculateCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];

    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += embedding[i];
      }
    }

    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= embeddings.length;
    }

    return centroid;
  }

  /**
   * Calcula similaridade de cosseno entre dois vetores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

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
   * Gera nome amigável para um padrão de intenção
   */
  private generatePatternName(intent: string): string {
    const nameMap: Record<string, string> = {
      PRICE_INQUIRY: 'Consulta de Preço',
      PRODUCT_INFO: 'Informações do Produto',
      PURCHASE_INTENT: 'Intenção de Compra',
      AVAILABILITY: 'Disponibilidade',
      TECHNICAL_ISSUE: 'Problema Técnico',
      HOW_TO: 'Como Fazer',
      ACCOUNT_ISSUE: 'Problema na Conta',
      PAYMENT_ISSUE: 'Problema no Pagamento',
      REFUND_REQUEST: 'Solicitação de Reembolso',
      INVOICE_REQUEST: 'Solicitação de Nota Fiscal',
      COMPLAINT: 'Reclamação',
      HUMAN_REQUEST: 'Solicitação de Atendente',
      STATUS_CHECK: 'Consulta de Status',
      GREETING: 'Saudação',
      THANKS: 'Agradecimento',
      CONFIRMATION: 'Confirmação',
    };

    return nameMap[intent] || intent.replace(/_/g, ' ').toLowerCase();
  }
}
