import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../config/logger.js';

export interface AIContext {
  contactName?: string;
  contactPhone?: string;
  isClient?: boolean;
  isExClient?: boolean;
  history?: { role: string; content: string }[];
  companyName?: string;
  departmentName?: string;
  agentName?: string;
}

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export type AIProvider = 'openai' | 'anthropic';

// Available models per provider
export const AI_MODELS = {
  openai: [
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'Modelo mais capaz da OpenAI' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Modelo otimizado multimodal' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Versão mais rápida e econômica' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Modelo rápido e econômico' },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4', description: 'Modelo mais inteligente e capaz da Anthropic' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4', description: 'Modelo equilibrado entre capacidade e velocidade' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Excelente equilíbrio entre capacidade e velocidade' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Modelo muito capaz (geração anterior)' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Modelo mais rápido e econômico' },
  ],
};

export class AIService {
  private provider: AIProvider;
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;

  constructor(provider: string, apiKey: string) {
    this.provider = provider as AIProvider;

    if (provider === 'openai') {
      this.openaiClient = new OpenAI({ apiKey });
    } else if (provider === 'anthropic') {
      this.anthropicClient = new Anthropic({ apiKey });
    }
  }

  async generateResponse(
    systemPrompt: string,
    userMessage: string,
    context: AIContext,
    options: AIOptions = {}
  ): Promise<string> {
    try {
      const { 
        model = this.provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4-turbo-preview', 
        temperature = 0.7, 
        maxTokens = 1000 
      } = options;

      // Build context-aware system prompt
      const enrichedPrompt = this.buildSystemPrompt(systemPrompt, context);

      if (this.provider === 'anthropic' && this.anthropicClient) {
        return await this.generateAnthropicResponse(enrichedPrompt, userMessage, context, {
          model,
          temperature,
          maxTokens,
        });
      } else if (this.provider === 'openai' && this.openaiClient) {
        return await this.generateOpenAIResponse(enrichedPrompt, userMessage, context, {
          model,
          temperature,
          maxTokens,
        });
      }

      throw new Error(`Unsupported AI provider: ${this.provider}`);
    } catch (error: any) {
      logger.error('AI generation error:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type,
        provider: this.provider,
        stack: error?.stack?.slice(0, 500),
      });
      throw error;
    }
  }

  private async generateOpenAIResponse(
    systemPrompt: string,
    userMessage: string,
    context: AIContext,
    options: AIOptions
  ): Promise<string> {
    const { model, temperature, maxTokens } = options;

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (context.history && context.history.length > 0) {
      messages.push(...context.history);
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    const response = await this.openaiClient!.chat.completions.create({
      model: model!,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  private async generateAnthropicResponse(
    systemPrompt: string,
    userMessage: string,
    context: AIContext,
    options: AIOptions
  ): Promise<string> {
    const { model, temperature, maxTokens } = options;

    // Build messages array for Anthropic (no system role in messages)
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    if (context.history && context.history.length > 0) {
      for (const msg of context.history) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    logger.info('Calling Anthropic API with:', {
      model,
      temperature,
      maxTokens,
      messagesCount: messages.length,
      systemPromptLength: systemPrompt?.length,
    });

    try {
      const response = await this.anthropicClient!.messages.create({
        model: model!,
        max_tokens: maxTokens || 1000,
        temperature,
        system: systemPrompt, // Anthropic uses separate system parameter
        messages,
      });
      
      logger.info('Anthropic API response received');
      return this.extractAnthropicText(response);
    } catch (anthropicError: any) {
      logger.error('Anthropic API error details:', {
        message: anthropicError?.message,
        status: anthropicError?.status,
        error: anthropicError?.error,
        type: anthropicError?.type,
        headers: anthropicError?.headers,
      });
      throw anthropicError;
    }
  }

  private extractAnthropicText(response: Anthropic.Message): string {

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text');
    return textContent?.type === 'text' ? textContent.text : '';
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
      prompt += `\n\nInformações do contexto atual:\n${contextInfo.join('\n')}`;
    }

    return prompt;
  }

  async analyzeIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, string>;
  }> {
    try {
      const systemPrompt = `Você é um analisador de intenção. Analise a mensagem e retorne um JSON com:
- intent: a intenção principal (saudacao, duvida, reclamacao, compra, suporte, outros)
- confidence: confiança de 0 a 1
- entities: entidades extraídas (produto, data, valor, etc)

Responda APENAS com o JSON, sem markdown.`;

      if (this.provider === 'anthropic' && this.anthropicClient) {
        const response = await this.anthropicClient.messages.create({
          model: 'claude-3-haiku-20240307', // Use faster model for analysis
          max_tokens: 200,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        });

        const textContent = response.content.find((block) => block.type === 'text');
        const content = textContent?.type === 'text' ? textContent.text : '{}';
        return JSON.parse(content);
      } else if (this.openaiClient) {
        const response = await this.openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo', // Use faster model for analysis
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.3,
          max_tokens: 200,
        });

        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
      }

      return { intent: 'outros', confidence: 0, entities: {} };
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
      const systemPrompt = `Analise o sentimento da mensagem. Retorne um JSON com:
- sentiment: "positive", "negative" ou "neutral"
- score: intensidade de -1 (muito negativo) a 1 (muito positivo)

Responda APENAS com o JSON, sem markdown.`;

      if (this.provider === 'anthropic' && this.anthropicClient) {
        const response = await this.anthropicClient.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 50,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        });

        const textContent = response.content.find((block) => block.type === 'text');
        const content = textContent?.type === 'text' ? textContent.text : '{}';
        return JSON.parse(content);
      } else if (this.openaiClient) {
        const response = await this.openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.3,
          max_tokens: 50,
        });

        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
      }

      return { sentiment: 'neutral', score: 0 };
    } catch (error) {
      logger.error('Sentiment analysis error:', error);
      return { sentiment: 'neutral', score: 0 };
    }
  }

  // Get provider name
  getProvider(): AIProvider {
    return this.provider;
  }

  // Check if service is properly configured
  isConfigured(): boolean {
    return (this.provider === 'openai' && this.openaiClient !== null) ||
           (this.provider === 'anthropic' && this.anthropicClient !== null);
  }
}
