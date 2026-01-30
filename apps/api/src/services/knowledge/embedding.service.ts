import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../config/logger.js';

export type EmbeddingProvider = 'openai' | 'anthropic';

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;

  constructor(provider: EmbeddingProvider, apiKey: string) {
    this.provider = provider;

    if (provider === 'openai') {
      this.openaiClient = new OpenAI({ apiKey });
    } else if (provider === 'anthropic') {
      // Anthropic não tem API de embeddings direta
      // Vamos usar OpenAI como fallback ou implementar solução alternativa
      logger.warn('Anthropic does not provide embeddings API. Using OpenAI as fallback.');
      this.openaiClient = new OpenAI({ apiKey });
    }
  }

  /**
   * Gera embedding para um texto
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (this.provider === 'openai' && this.openaiClient) {
        const response = await this.openaiClient.embeddings.create({
          model: 'text-embedding-3-small', // Modelo mais eficiente e barato
          input: text,
        });

        return response.data[0].embedding;
      }

      throw new Error(`Unsupported provider: ${this.provider}`);
    } catch (error: any) {
      logger.error('Error generating embedding:', {
        error: error?.message,
        provider: this.provider,
        textLength: text.length,
      });
      throw error;
    }
  }

  /**
   * Gera embeddings para múltiplos textos
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (this.provider === 'openai' && this.openaiClient) {
        // OpenAI permite até 2048 inputs por request
        const batchSize = 100;
        const embeddings: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);
          const response = await this.openaiClient.embeddings.create({
            model: 'text-embedding-3-small',
            input: batch,
          });

          embeddings.push(...response.data.map((item) => item.embedding));
        }

        return embeddings;
      }

      throw new Error(`Unsupported provider: ${this.provider}`);
    } catch (error: any) {
      logger.error('Error generating embeddings:', {
        error: error?.message,
        provider: this.provider,
        textsCount: texts.length,
      });
      throw error;
    }
  }

  /**
   * Calcula similaridade de cosseno entre dois embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }
}






