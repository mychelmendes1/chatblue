import { logger } from '../../config/logger.js';
import { AIService, AIProvider } from '../ai/ai.service.js';
import { BlueContextBuilder } from './blue-context-builder.service.js';
import { ContextRetrievalService } from '../knowledge/context-retrieval.service.js';

export interface PageContext {
  route?: string;
  routeParams?: Record<string, string>;
  searchParams?: Record<string, string>;
  ticketId?: string;
  contactId?: string;
  departmentId?: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class BlueService {
  private aiService: AIService;
  private contextBuilder: BlueContextBuilder;
  private contextRetrieval: ContextRetrievalService;
  private companyId: string;
  private provider: string;

  constructor(provider: string, apiKey: string, companyId: string) {
    this.provider = provider;
    this.aiService = new AIService(provider as AIProvider, apiKey);
    this.contextBuilder = new BlueContextBuilder();
    this.contextRetrieval = new ContextRetrievalService();
    this.companyId = companyId;
  }

  /**
   * Get faster/cheaper model for Blue assistant
   */
  private getFastModel(): string {
    if (this.provider === 'openai') {
      return 'gpt-4o-mini'; // Fast and cheap OpenAI model
    } else if (this.provider === 'anthropic') {
      return 'claude-3-haiku-20240307'; // Fast and cheap Anthropic model
    }
    // Fallback to default (will be handled by AIService)
    return 'gpt-4o-mini';
  }

  /**
   * Get a contextual tip for the current page
   */
  async getContextualTip(context: PageContext): Promise<string> {
    try {
      // Build prompt for contextual tip
      const prompt = await this.contextBuilder.buildTipPrompt(context, this.companyId);

      // Generate tip using AI (use faster/cheaper model)
      const tip = await this.aiService.generateResponse(
        prompt.systemPrompt,
        prompt.userMessage,
        {},
        {
          model: this.getFastModel(),
          temperature: 0.7,
          maxTokens: 150, // Short tip
        }
      );

      return tip;
    } catch (error: any) {
      logger.error('Error generating contextual tip:', error);
      return 'Dica temporariamente indisponível.';
    }
  }

  /**
   * Chat with Blue
   */
  async chatWithBlue(
    message: string,
    context: PageContext,
    history: ChatMessage[]
  ): Promise<string> {
    try {
      // Build prompt for chat
      const prompt = await this.contextBuilder.buildChatPrompt(
        message,
        context,
        history,
        this.companyId
      );

      // Generate response using AI (use faster/cheaper model)
      const response = await this.aiService.generateResponse(
        prompt.systemPrompt,
        prompt.userMessage,
        {},
        {
          model: this.getFastModel(),
          temperature: 0.8,
          maxTokens: 500,
        }
      );

      return response;
    } catch (error: any) {
      logger.error('Error chatting with Blue:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
    }
  }
}

