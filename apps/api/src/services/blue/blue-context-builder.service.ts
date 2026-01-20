import { logger } from '../../config/logger.js';
import { prisma } from '../../config/database.js';
import { ContextRetrievalService } from '../knowledge/context-retrieval.service.js';
import { EmbeddingService } from '../knowledge/embedding.service.js';
import { CodeRAGService } from './code-rag.service.js';
import { DocRAGService } from './doc-rag.service.js';
import { PageContext, ChatMessage } from './blue.service.js';

export interface BluePrompt {
  systemPrompt: string;
  userMessage: string;
}

const BLUE_BASE_PROMPT = `Você é o Blue, o assistente inteligente do sistema ChatBlue. Você ajuda atendentes a usar o sistema de forma eficiente.

Seu papel:
- Fornecer dicas contextuais baseadas na página atual
- Responder perguntas sobre como usar o sistema
- Explicar funcionalidades baseado no código-fonte
- Sugerir melhores práticas

Seu tom:
- Amigável e profissional
- Conciso mas completo
- Usa exemplos práticos quando possível

IMPORTANTE: Baseie suas respostas no código-fonte e documentação fornecidos abaixo. Se não tiver certeza, seja honesto sobre isso.`;

export class BlueContextBuilder {
  private contextRetrieval: ContextRetrievalService;
  private codeRAG: CodeRAGService;
  private docRAG: DocRAGService;

  constructor() {
    this.contextRetrieval = new ContextRetrievalService();
    this.codeRAG = new CodeRAGService();
    this.docRAG = new DocRAGService();
  }

  /**
   * Build prompt for contextual tip
   */
  async buildTipPrompt(
    context: PageContext,
    companyId: string
  ): Promise<BluePrompt> {
    // Get company settings for AI provider
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
      select: {
        aiProvider: true,
        aiApiKey: true,
      },
    });

    // Get relevant code and documentation
    const route = context.route || '/';
    const query = this.buildQueryFromContext(context);

    let codeContext = '';
    let docContext = '';

    if (settings?.aiApiKey && settings?.aiProvider) {
      try {
        // Get code context using CodeRAG
        codeContext = await this.codeRAG.getCodeContext(
          companyId,
          query,
          settings.aiProvider,
          settings.aiApiKey
        );

        // Get documentation context using DocRAG
        docContext = await this.docRAG.getDocContext(
          companyId,
          query,
          settings.aiProvider,
          settings.aiApiKey
        );
      } catch (error) {
        logger.warn('Error retrieving code/doc context for tip:', error);
      }
    }

    const systemPrompt = `${BLUE_BASE_PROMPT}

Contexto da página: ${route}

${codeContext ? `\nCódigo relevante:\n${codeContext}\n` : ''}
${docContext ? `\nDocumentação relevante:\n${docContext}\n` : ''}

Forneça uma dica útil e concisa (máximo 2 frases) sobre como usar esta página de forma eficiente.`;

    const userMessage = `Forneça uma dica útil sobre a página ${route}.`;

    return { systemPrompt, userMessage };
  }

  /**
   * Build prompt for chat
   */
  async buildChatPrompt(
    message: string,
    context: PageContext,
    history: ChatMessage[],
    companyId: string
  ): Promise<BluePrompt> {
    // Get company settings for AI provider
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
      select: {
        aiProvider: true,
        aiApiKey: true,
      },
    });

    // Get relevant code and documentation
    const route = context.route || '/';
    const query = message; // Use the user's message as query

    let codeContext = '';
    let docContext = '';

    if (settings?.aiApiKey && settings?.aiProvider) {
      try {
        // Get code context using CodeRAG
        codeContext = await this.codeRAG.getCodeContext(
          companyId,
          query,
          settings.aiProvider,
          settings.aiApiKey
        );

        // Get documentation context using DocRAG
        docContext = await this.docRAG.getDocContext(
          companyId,
          query,
          settings.aiProvider,
          settings.aiApiKey
        );
      } catch (error) {
        logger.warn('Error retrieving code/doc context for chat:', error);
      }
    }

    // Build history context
    const historyContext = history.length > 0
      ? '\n\nHistórico da conversa:\n' +
        history
          .slice(-5) // Last 5 messages
          .map((m) => `${m.role === 'user' ? 'Usuário' : 'Blue'}: ${m.content}`)
          .join('\n')
      : '';

    const systemPrompt = `${BLUE_BASE_PROMPT}

Contexto da página: ${route}
${historyContext}

${codeContext ? `\nCódigo relevante:\n${codeContext}\n` : ''}
${docContext ? `\nDocumentação relevante:\n${docContext}\n` : ''}

Use o código-fonte e documentação acima para responder de forma precisa e útil.`;

    const userMessage = message;

    return { systemPrompt, userMessage };
  }

  /**
   * Build query from context for semantic search
   */
  private buildQueryFromContext(context: PageContext): string {
    const parts: string[] = [];

    if (context.route) {
      parts.push(context.route);
    }

    if (context.metadata) {
      if (context.metadata.ticketStatus) {
        parts.push(`status ${context.metadata.ticketStatus}`);
      }
      if (context.metadata.isAIHandled) {
        parts.push('IA atendimento');
      }
    }

    return parts.join(' ');
  }
}

