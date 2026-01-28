import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { EmbeddingService } from '../ai/embedding.service.js';
import { AIService } from '../ai/ai.service.js';

export interface DetectedPattern {
  intent: string;
  category: string;
  examplePhrases: string[];
  suggestedKeywords: string[];
  suggestedTemplate: string | null;
  occurrenceCount: number;
  avgQualityScore: number;
  confidence: number;
}

export interface TemplateExtractionResult {
  template: string;
  variables: Record<string, string>;
  confidence: number;
}

export interface PatternDetectorConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

/**
 * Service responsável por detectar padrões em training pairs
 * e extrair templates de resposta
 */
export class PatternDetectorService {
  private aiService: AIService | null = null;
  private embeddingService: EmbeddingService | null = null;
  private config: PatternDetectorConfig;

  constructor(config: PatternDetectorConfig, embeddingService?: EmbeddingService) {
    this.config = config;
    this.embeddingService = embeddingService || null;

    if (config.apiKey) {
      this.aiService = new AIService(config.provider, config.apiKey, config.model);
    }
  }

  /**
   * Detecta padrões em training pairs e sugere templates
   */
  async detectPatterns(
    companyId: string,
    options: {
      minOccurrences?: number;
      minQualityScore?: number;
      onlyUnprocessed?: boolean;
    } = {}
  ): Promise<DetectedPattern[]> {
    const minOccurrences = options.minOccurrences || 3;
    const minQualityScore = options.minQualityScore || 60;

    try {
      // Buscar training pairs de qualidade
      const whereClause: any = {
        companyId,
        qualityScore: { gte: minQualityScore },
      };

      if (options.onlyUnprocessed) {
        whereClause.usedInTraining = false;
      }

      const pairs = await prisma.mLTrainingPair.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      if (pairs.length < minOccurrences) {
        logger.info('Not enough training pairs for pattern detection', {
          companyId,
          pairsFound: pairs.length,
          minRequired: minOccurrences,
        });
        return [];
      }

      // Agrupar por intent/categoria
      const groups = new Map<string, typeof pairs>();

      for (const pair of pairs) {
        const key = `${pair.category || 'unknown'}:${pair.intent || 'unknown'}`;

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(pair);
      }

      const detectedPatterns: DetectedPattern[] = [];

      // Processar cada grupo
      for (const [key, groupPairs] of groups) {
        if (groupPairs.length < minOccurrences) continue;

        const [category, intent] = key.split(':');

        // Calcular estatísticas do grupo
        const avgQuality = groupPairs.reduce((acc, p) => acc + (p.qualityScore || 0), 0) / groupPairs.length;

        // Extrair exemplos e keywords
        const examplePhrases = groupPairs
          .slice(0, 10)
          .map(p => p.customerQuery);

        const suggestedKeywords = this.extractKeywords(examplePhrases);

        // Tentar extrair template das respostas
        let suggestedTemplate: string | null = null;
        if (this.aiService && groupPairs.length >= 5) {
          const responses = groupPairs.slice(0, 5).map(p => p.agentResponse);
          const templateResult = await this.extractTemplate(responses, examplePhrases[0]);
          if (templateResult && templateResult.confidence > 0.6) {
            suggestedTemplate = templateResult.template;
          }
        }

        detectedPatterns.push({
          intent: intent !== 'unknown' ? intent : this.suggestIntent(examplePhrases),
          category: category !== 'unknown' ? category : 'geral',
          examplePhrases,
          suggestedKeywords,
          suggestedTemplate,
          occurrenceCount: groupPairs.length,
          avgQualityScore: avgQuality,
          confidence: Math.min(1, groupPairs.length / 20 + avgQuality / 100),
        });
      }

      // Detectar padrões adicionais por clustering de embeddings
      const embeddingPatterns = await this.detectPatternsByEmbedding(companyId, pairs, minOccurrences);

      // Mesclar padrões (evitar duplicatas)
      for (const pattern of embeddingPatterns) {
        const exists = detectedPatterns.some(
          p => p.intent === pattern.intent ||
               this.calculateOverlap(p.examplePhrases, pattern.examplePhrases) > 0.5
        );

        if (!exists) {
          detectedPatterns.push(pattern);
        }
      }

      logger.info('Patterns detected', {
        companyId,
        patternsFound: detectedPatterns.length,
        totalPairsAnalyzed: pairs.length,
      });

      return detectedPatterns;
    } catch (error: any) {
      logger.error('Failed to detect patterns', {
        companyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Detecta padrões usando similaridade de embeddings
   */
  private async detectPatternsByEmbedding(
    companyId: string,
    pairs: Array<{
      id: string;
      customerQuery: string;
      agentResponse: string;
      customerEmbedding: number[];
      qualityScore: number | null;
    }>,
    minClusterSize: number
  ): Promise<DetectedPattern[]> {
    // Filtrar pares com embeddings válidos e sem intent definido
    const pairsWithEmbeddings = pairs.filter(
      p => p.customerEmbedding && p.customerEmbedding.length > 0
    );

    if (pairsWithEmbeddings.length < minClusterSize) {
      return [];
    }

    // Clustering simples baseado em similaridade
    const clusters: Array<{
      pairs: typeof pairsWithEmbeddings;
      centroid: number[];
    }> = [];

    const similarityThreshold = 0.75;

    for (const pair of pairsWithEmbeddings) {
      let assignedCluster = -1;
      let bestSimilarity = 0;

      // Encontrar cluster mais similar
      for (let i = 0; i < clusters.length; i++) {
        const similarity = this.cosineSimilarity(pair.customerEmbedding, clusters[i].centroid);

        if (similarity > bestSimilarity && similarity >= similarityThreshold) {
          assignedCluster = i;
          bestSimilarity = similarity;
        }
      }

      if (assignedCluster >= 0) {
        // Adicionar ao cluster existente
        clusters[assignedCluster].pairs.push(pair);
        // Recalcular centroide
        clusters[assignedCluster].centroid = this.calculateCentroid(
          clusters[assignedCluster].pairs.map(p => p.customerEmbedding)
        );
      } else {
        // Criar novo cluster
        clusters.push({
          pairs: [pair],
          centroid: pair.customerEmbedding,
        });
      }
    }

    // Converter clusters significativos em padrões
    const patterns: DetectedPattern[] = [];

    for (const cluster of clusters) {
      if (cluster.pairs.length < minClusterSize) continue;

      const examplePhrases = cluster.pairs.slice(0, 10).map(p => p.customerQuery);
      const avgQuality = cluster.pairs.reduce((acc, p) => acc + (p.qualityScore || 50), 0) / cluster.pairs.length;

      // Sugerir intent baseado nas frases
      const suggestedIntent = this.suggestIntent(examplePhrases);

      patterns.push({
        intent: suggestedIntent,
        category: 'geral', // Será refinado posteriormente
        examplePhrases,
        suggestedKeywords: this.extractKeywords(examplePhrases),
        suggestedTemplate: null,
        occurrenceCount: cluster.pairs.length,
        avgQualityScore: avgQuality,
        confidence: 0.6 + (cluster.pairs.length / 50),
      });
    }

    return patterns;
  }

  /**
   * Extrai um template generalizado de múltiplas respostas similares
   */
  async extractTemplate(
    responses: string[],
    sampleQuestion: string
  ): Promise<TemplateExtractionResult | null> {
    if (!this.aiService || responses.length < 2) {
      return null;
    }

    try {
      const prompt = `Analise estas respostas de atendimento e extraia um template generalizado.

Pergunta exemplo: "${sampleQuestion}"

Respostas:
${responses.map((r, i) => `${i + 1}. "${r}"`).join('\n')}

Crie um template que:
1. Capture a estrutura comum das respostas
2. Use {{variavel}} para partes que variam (ex: {{nome}}, {{produto}}, {{valor}})
3. Mantenha o tom e estilo das respostas originais

Responda APENAS com JSON:
{
  "template": "Olá {{nome}}! O preço do {{produto}} é {{valor}}.",
  "variables": {
    "nome": "Nome do cliente",
    "produto": "Nome do produto",
    "valor": "Valor do produto"
  },
  "confidence": 0.85
}`;

      const result = await this.aiService.generateResponse(
        'Você é um especialista em extração de templates de texto.',
        prompt,
        { temperature: 0.3, maxTokens: 500 }
      );

      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          template: parsed.template,
          variables: parsed.variables || {},
          confidence: parsed.confidence || 0.7,
        };
      }
    } catch (error) {
      logger.warn('Template extraction failed', { error });
    }

    return null;
  }

  /**
   * Salva padrões detectados no banco de dados
   */
  async savePatterns(
    companyId: string,
    patterns: DetectedPattern[],
    options: {
      autoApprove?: boolean;
      minConfidence?: number;
    } = {}
  ): Promise<{ created: number; updated: number }> {
    const minConfidence = options.minConfidence || 0.5;

    let created = 0;
    let updated = 0;

    for (const pattern of patterns) {
      if (pattern.confidence < minConfidence) continue;

      try {
        // Verificar se padrão já existe
        const existing = await prisma.mLIntentPattern.findFirst({
          where: {
            companyId,
            intent: pattern.intent,
          },
        });

        if (existing) {
          // Atualizar padrão existente
          await prisma.mLIntentPattern.update({
            where: { id: existing.id },
            data: {
              examplePhrases: [...new Set([...existing.examplePhrases, ...pattern.examplePhrases])].slice(0, 20),
              keywords: [...new Set([...existing.keywords, ...pattern.suggestedKeywords])],
              occurrenceCount: existing.occurrenceCount + pattern.occurrenceCount,
              confidence: Math.max(existing.confidence, pattern.confidence),
              suggestedResponseTemplate: pattern.suggestedTemplate || existing.suggestedResponseTemplate,
              updatedAt: new Date(),
            },
          });
          updated++;
        } else {
          // Criar novo padrão
          await prisma.mLIntentPattern.create({
            data: {
              companyId,
              intent: pattern.intent,
              category: pattern.category,
              name: this.formatIntentName(pattern.intent),
              examplePhrases: pattern.examplePhrases,
              keywords: pattern.suggestedKeywords,
              centroidEmbedding: [],
              suggestedResponseTemplate: pattern.suggestedTemplate,
              occurrenceCount: pattern.occurrenceCount,
              confidence: pattern.confidence,
              isApproved: options.autoApprove || false,
            },
          });
          created++;
        }

        // Se tiver template, salvar também
        if (pattern.suggestedTemplate) {
          await this.saveTemplate(companyId, pattern);
        }
      } catch (error) {
        logger.warn('Failed to save pattern', {
          intent: pattern.intent,
          error,
        });
      }
    }

    logger.info('Patterns saved', {
      companyId,
      created,
      updated,
    });

    return { created, updated };
  }

  /**
   * Salva um template de resposta
   */
  private async saveTemplate(
    companyId: string,
    pattern: DetectedPattern
  ): Promise<void> {
    if (!pattern.suggestedTemplate) return;

    try {
      // Verificar se já existe template similar
      const existing = await prisma.mLResponseTemplate.findFirst({
        where: {
          companyId,
          intent: pattern.intent,
          template: pattern.suggestedTemplate,
        },
      });

      if (existing) {
        // Atualizar estatísticas
        await prisma.mLResponseTemplate.update({
          where: { id: existing.id },
          data: {
            usageCount: existing.usageCount + pattern.occurrenceCount,
            updatedAt: new Date(),
          },
        });
      } else {
        // Criar novo template
        await prisma.mLResponseTemplate.create({
          data: {
            companyId,
            name: `Template: ${this.formatIntentName(pattern.intent)}`,
            category: pattern.category,
            intent: pattern.intent,
            template: pattern.suggestedTemplate,
            variables: {},
            templateEmbedding: [],
            sourceType: 'LEARNED',
          },
        });
      }
    } catch (error) {
      logger.warn('Failed to save template', { error });
    }
  }

  /**
   * Extrai keywords de uma lista de frases
   */
  private extractKeywords(phrases: string[]): string[] {
    const stopWords = new Set([
      'a', 'o', 'e', 'é', 'de', 'da', 'do', 'em', 'um', 'uma', 'para', 'com',
      'não', 'por', 'mais', 'como', 'mas', 'foi', 'ou', 'ser', 'quando',
      'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo',
      'quero', 'preciso', 'gostaria', 'posso', 'pode', 'vocês', 'aqui',
      'oi', 'olá', 'bom', 'boa', 'dia', 'tarde', 'noite',
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

    // Retornar palavras frequentes
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= Math.max(2, phrases.length * 0.2))
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 10);
  }

  /**
   * Sugere um nome de intent baseado nas frases
   */
  private suggestIntent(phrases: string[]): string {
    const keywords = this.extractKeywords(phrases);

    if (keywords.length === 0) {
      return 'UNKNOWN_INTENT';
    }

    // Mapear keywords comuns para intents
    const keywordIntentMap: Record<string, string> = {
      preço: 'PRICE_INQUIRY',
      valor: 'PRICE_INQUIRY',
      quanto: 'PRICE_INQUIRY',
      custa: 'PRICE_INQUIRY',
      erro: 'TECHNICAL_ISSUE',
      problema: 'TECHNICAL_ISSUE',
      funciona: 'HOW_TO',
      como: 'HOW_TO',
      pagamento: 'PAYMENT_ISSUE',
      boleto: 'PAYMENT_ISSUE',
      cancelar: 'CANCELLATION',
      reembolso: 'REFUND_REQUEST',
      status: 'STATUS_CHECK',
      pedido: 'ORDER_STATUS',
      entrega: 'DELIVERY_STATUS',
      reclamação: 'COMPLAINT',
      insatisfeito: 'COMPLAINT',
    };

    for (const keyword of keywords) {
      if (keywordIntentMap[keyword]) {
        return keywordIntentMap[keyword];
      }
    }

    // Gerar intent a partir das keywords
    return keywords
      .slice(0, 2)
      .join('_')
      .toUpperCase()
      .replace(/[^A-Z_]/g, '');
  }

  /**
   * Formata nome do intent para exibição
   */
  private formatIntentName(intent: string): string {
    return intent
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Calcula overlap entre duas listas de frases
   */
  private calculateOverlap(phrases1: string[], phrases2: string[]): number {
    const set1 = new Set(phrases1.map(p => p.toLowerCase().trim()));
    const set2 = new Set(phrases2.map(p => p.toLowerCase().trim()));

    let overlap = 0;
    for (const phrase of set1) {
      if (set2.has(phrase)) {
        overlap++;
      }
    }

    const total = Math.max(set1.size, set2.size);
    return total > 0 ? overlap / total : 0;
  }

  /**
   * Calcula centroide de embeddings
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
   * Calcula similaridade de cosseno
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
}
