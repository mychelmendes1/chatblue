import OpenAI from 'openai';
import { logger } from '../../config/logger.js';

interface AIContext {
  contactName?: string;
  contactPhone?: string;
  isClient?: boolean;
  isExClient?: boolean;
  history?: { role: string; content: string }[];
}

interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIService {
  private provider: string;
  private client: any;

  constructor(provider: string, apiKey: string) {
    this.provider = provider;

    if (provider === 'openai') {
      this.client = new OpenAI({ apiKey });
    } else if (provider === 'anthropic') {
      // Anthropic client would be initialized here
      // Using OpenAI-compatible interface for now
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.anthropic.com/v1',
      });
    }
  }

  async generateResponse(
    systemPrompt: string,
    userMessage: string,
    context: AIContext,
    options: AIOptions = {}
  ): Promise<string> {
    try {
      const { model = 'gpt-4-turbo-preview', temperature = 0.7, maxTokens = 500 } = options;

      // Build context-aware system prompt
      const enrichedPrompt = this.buildSystemPrompt(systemPrompt, context);

      // Build messages array
      const messages: any[] = [
        { role: 'system', content: enrichedPrompt },
      ];

      // Add conversation history
      if (context.history && context.history.length > 0) {
        messages.push(...context.history);
      }

      // Add current message
      messages.push({ role: 'user', content: userMessage });

      if (this.provider === 'openai') {
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });

        return response.choices[0]?.message?.content || '';
      }

      // For other providers, implement accordingly
      return '';
    } catch (error) {
      logger.error('AI generation error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(basePrompt: string, context: AIContext): string {
    let prompt = basePrompt;

    // Add context information
    const contextInfo: string[] = [];

    if (context.contactName) {
      contextInfo.push(`Nome do cliente: ${context.contactName}`);
    }

    if (context.isClient) {
      contextInfo.push('Status: Cliente ativo');
    } else if (context.isExClient) {
      contextInfo.push('Status: Ex-cliente');
    } else {
      contextInfo.push('Status: Novo contato');
    }

    if (contextInfo.length > 0) {
      prompt += `\n\nInformações do contexto:\n${contextInfo.join('\n')}`;
    }

    return prompt;
  }

  async analyzeIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, string>;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Você é um analisador de intenção. Analise a mensagem e retorne um JSON com:
- intent: a intenção principal (saudacao, duvida, reclamacao, compra, suporte, outros)
- confidence: confiança de 0 a 1
- entities: entidades extraídas (produto, data, valor, etc)

Responda APENAS com o JSON, sem markdown.`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      logger.error('Intent analysis error:', error);
      return { intent: 'outros', confidence: 0, entities: {} };
    }
  }

  async analyzeSentiment(message: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Analise o sentimento da mensagem. Retorne um JSON com:
- sentiment: "positive", "negative" ou "neutral"
- score: intensidade de -1 (muito negativo) a 1 (muito positivo)

Responda APENAS com o JSON, sem markdown.`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      logger.error('Sentiment analysis error:', error);
      return { sentiment: 'neutral', score: 0 };
    }
  }
}
