import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// ============================================================================
// TIPOS - Payload genérico do ChatBlue (formato interno)
// ============================================================================
export interface WebhookPayload {
  event: 'message.received' | 'ticket.assigned' | 'ticket.unassigned';
  timestamp: string;
  ticket: {
    id: string;
    protocol: string;
    status: string;
    departmentId: string | null;
    departmentName: string | null;
  };
  contact: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
  };
  message?: {
    id: string;
    content: string | null;
    type: string;
    mediaUrl: string | null;
    timestamp: string;
  };
  conversation?: Array<{
    role: 'customer' | 'assistant' | 'system';
    content: string | null;
    type: string;
    timestamp: string;
  }>;
}

// ============================================================================
// TIPOS - BlueChatPayload (formato esperado pelo bluetoken-ai)
// ============================================================================
export interface BlueChatPayload {
  conversation_id: string;
  message_id: string;
  timestamp: string;
  channel: 'WHATSAPP' | 'EMAIL';
  contact: {
    phone: string;
    name?: string;
    email?: string;
  };
  message: {
    type: 'text' | 'audio' | 'image' | 'document' | 'video';
    text: string;
    media_url?: string;
  };
  context?: {
    empresa?: 'TOKENIZA' | 'BLUE';
    agent_id?: string;
    source?: string; // 'BLUECHAT' - para que o sistema externo saiba que veio do ChatBlue
    tags?: string[];
    history_summary?: string;
  };
}

// ============================================================================
// TIPOS - Resposta do sistema externo (BlueChatResponse)
// ============================================================================
export interface BlueChatResponse {
  success: boolean;
  conversation_id: string;
  message_id?: string;
  lead_id?: string | null;
  action: 'RESPOND' | 'ESCALATE' | 'QUALIFY_ONLY' | 'RESOLVE';
  response?: {
    text: string;
    suggested_next?: string;
  };
  intent?: {
    detected: string;
    confidence: number;
    lead_ready: boolean;
  };
  escalation?: {
    needed: boolean;
    reason?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    toDepartmentId?: string; // Opcional: departamento específico para transferir
    toUserId?: string;       // Opcional: usuário específico para transferir
  };
  resolution?: {
    summary?: string;  // Resumo do atendimento gerado pela IA
    reason?: string;   // Motivo do encerramento
  };
  error?: string;
}

// ============================================================================
// TIPOS - Configuração da IA externa
// ============================================================================
export interface ExternalAIConfig {
  type: 'external';
  webhookUrl: string;
  webhookSecret?: string;
  externalApiKey: string;
  // Novos campos para compatibilidade com bluetoken-ai
  authType?: 'hmac' | 'bearer' | 'api-key'; // Como autenticar no webhook
  authToken?: string;        // Token Bearer ou API Key do sistema externo
  payloadFormat?: 'chatblue' | 'bluechat'; // Formato do payload
  empresa?: 'TOKENIZA' | 'BLUE'; // Empresa no contexto do bluetoken-ai
  autoReply?: boolean;       // Se deve enviar resposta automaticamente ao cliente
  autoEscalate?: boolean;    // Se deve transferir automaticamente quando IA pede
  escalateDepartmentId?: string; // Departamento para escalação padrão
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000]; // Exponential backoff

export class ExternalAIWebhookService {
  /**
   * Generate an API key for an external AI user
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sign a payload with HMAC-SHA256
   */
  static signPayload(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Check if a user is an external AI
   */
  static isExternalAI(aiConfig: any): aiConfig is ExternalAIConfig {
    return aiConfig && aiConfig.type === 'external' && !!aiConfig.webhookUrl;
  }

  /**
   * Get the payload format for the external AI config
   */
  static getPayloadFormat(config: ExternalAIConfig): 'chatblue' | 'bluechat' {
    return config.payloadFormat || 'chatblue';
  }

  // ============================================================================
  // TRANSFORMAÇÕES DE PAYLOAD
  // ============================================================================

  /**
   * Converte o tipo de mensagem do ChatBlue para o formato do BlueChatPayload
   */
  private static convertMessageType(type: string): 'text' | 'audio' | 'image' | 'document' | 'video' {
    const typeMap: Record<string, 'text' | 'audio' | 'image' | 'document' | 'video'> = {
      'TEXT': 'text',
      'AUDIO': 'audio',
      'IMAGE': 'image',
      'DOCUMENT': 'document',
      'VIDEO': 'video',
    };
    return typeMap[type?.toUpperCase()] || 'text';
  }

  /**
   * Gera um resumo do histórico da conversa para o context
   */
  private static generateHistorySummary(conversation?: WebhookPayload['conversation'], maxMessages: number = 20, maxCharsPerMsg: number = 300): string | undefined {
    if (!conversation || conversation.length === 0) return undefined;

    const lastMessages = conversation.slice(-maxMessages);
    const summary = lastMessages
      .filter(msg => msg.content)
      .map(msg => {
        const role = msg.role === 'customer' ? 'Cliente' : msg.role === 'assistant' ? 'Atendente' : 'Sistema';
        return `${role}: ${msg.content?.substring(0, maxCharsPerMsg)}`;
      })
      .join('\n');
    
    return summary || undefined;
  }

  /**
   * Transforma WebhookPayload (formato ChatBlue) em BlueChatPayload (formato bluetoken-ai)
   */
  static transformToBlueChatPayload(
    payload: WebhookPayload,
    config: ExternalAIConfig,
    agentName?: string
  ): BlueChatPayload {
    return {
      conversation_id: payload.ticket.id,
      message_id: payload.message?.id || `${payload.ticket.id}-${Date.now()}`,
      timestamp: payload.message?.timestamp || payload.timestamp,
      channel: 'WHATSAPP',
      contact: {
        phone: payload.contact.phone,
        name: payload.contact.name || undefined,
        email: payload.contact.email || undefined,
      },
      message: {
        type: this.convertMessageType(payload.message?.type || 'TEXT'),
        text: payload.message?.content || '',
        media_url: payload.message?.mediaUrl || undefined,
      },
      context: {
        empresa: config.empresa || 'BLUE',
        agent_id: agentName?.toLowerCase().replace(/\s+/g, '_') || 'chatblue',
        source: 'BLUECHAT', // Flag para o sistema externo saber que veio do ChatBlue
        history_summary: this.generateHistorySummary(payload.conversation),
      },
    };
  }

  // ============================================================================
  // ENVIO DE WEBHOOK (com suporte a ambos os formatos e autenticação)
  // ============================================================================

  /**
   * Build authentication headers based on config
   */
  private static buildAuthHeaders(config: ExternalAIConfig, body: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ChatBlue-Webhook/1.0',
    };

    const authType = config.authType || 'hmac';

    switch (authType) {
      case 'bearer':
        // Usa Bearer token (formato esperado pelo bluechat-inbound)
        if (config.authToken) {
          headers['Authorization'] = `Bearer ${config.authToken}`;
        }
        break;

      case 'api-key':
        // Usa X-API-Key header
        if (config.authToken) {
          headers['X-API-Key'] = config.authToken;
        }
        break;

      case 'hmac':
      default:
        // Usa assinatura HMAC-SHA256 (formato original do ChatBlue)
        if (config.webhookSecret) {
          headers['X-Webhook-Signature'] = this.signPayload(body, config.webhookSecret);
        }
        break;
    }

    return headers;
  }

  /**
   * Send a webhook and return the response (for synchronous processing)
   */
  private static async sendWebhookWithResponse(
    webhookUrl: string,
    payload: any,
    config: ExternalAIConfig,
    timeoutMs: number = 30000 // 30s timeout for synchronous responses
  ): Promise<{ success: boolean; data?: BlueChatResponse }> {
    const body = JSON.stringify(payload);
    const headers = this.buildAuthHeaders(config, body);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`[ExternalAI] Sending webhook (attempt ${attempt + 1}): to ${webhookUrl}`, {
          format: this.getPayloadFormat(config),
          authType: config.authType || 'hmac',
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          let responseData: BlueChatResponse | undefined;

          // Tentar parsear a resposta como JSON (BlueChatResponse)
          try {
            const text = await response.text();
            if (text && text.trim()) {
              responseData = JSON.parse(text) as BlueChatResponse;
              logger.info(`[ExternalAI] Webhook response received:`, {
                action: responseData.action,
                hasResponse: !!responseData.response?.text,
                escalation: responseData.escalation?.needed,
                intent: responseData.intent?.detected,
              });
            }
          } catch (parseError) {
            logger.debug(`[ExternalAI] Webhook response is not JSON (ok for fire-and-forget)`);
          }

          return { success: true, data: responseData };
        }

        logger.warn(`[ExternalAI] Webhook returned status ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        
        // Log response body for debugging
        try {
          const errorText = await response.text();
          logger.warn(`[ExternalAI] Error response body: ${errorText.substring(0, 500)}`);
        } catch {}

      } catch (error: any) {
        logger.error(`[ExternalAI] Webhook error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, {
          message: error?.message,
          url: webhookUrl,
        });
      }

      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }

    logger.error(`[ExternalAI] Webhook failed after ${MAX_RETRIES + 1} attempts to ${webhookUrl}`);
    return { success: false };
  }

  /**
   * Legacy: Send webhook without expecting response (fire-and-forget)
   */
  private static async sendWebhook(
    webhookUrl: string,
    payload: WebhookPayload,
    webhookSecret?: string
  ): Promise<boolean> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ChatBlue-Webhook/1.0',
    };

    if (webhookSecret) {
      headers['X-Webhook-Signature'] = this.signPayload(body, webhookSecret);
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`[ExternalAI] Sending webhook (attempt ${attempt + 1}): ${payload.event} to ${webhookUrl}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          logger.info(`[ExternalAI] Webhook sent successfully: ${payload.event} (status: ${response.status})`);
          return true;
        }

        logger.warn(`[ExternalAI] Webhook returned status ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
      } catch (error: any) {
        logger.error(`[ExternalAI] Webhook error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, {
          message: error?.message,
          url: webhookUrl,
          event: payload.event,
        });
      }

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }

    logger.error(`[ExternalAI] Webhook failed after ${MAX_RETRIES + 1} attempts: ${payload.event} to ${webhookUrl}`);
    return false;
  }

  // ============================================================================
  // CONVERSATION HISTORY
  // ============================================================================

  /**
   * Build conversation history for a ticket
   */
  private static async getConversationHistory(
    ticketId: string,
    limit: number = 50
  ): Promise<WebhookPayload['conversation']> {
    const messages = await prisma.message.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        content: true,
        type: true,
        isFromMe: true,
        createdAt: true,
        sender: {
          select: { isAI: true },
        },
      },
    });

    return messages.map(msg => ({
      role: msg.type === 'SYSTEM'
        ? 'system' as const
        : msg.isFromMe
          ? 'assistant' as const
          : 'customer' as const,
      content: msg.content,
      type: msg.type,
      timestamp: msg.createdAt.toISOString(),
    }));
  }

  // ============================================================================
  // EVENTOS PRINCIPAIS
  // ============================================================================

  /**
   * Send message.received event when a customer sends a message
   * Returns the external AI response (if synchronous) for auto-reply/escalation
   */
  static async sendMessageReceived(
    aiUser: { id: string; name?: string; aiConfig: any },
    ticket: {
      id: string;
      protocol: string;
      status: string;
      departmentId: string | null;
      department?: { name: string } | null;
      contact: { id: string; name: string | null; phone: string; email?: string | null };
      connectionId: string;
    },
    message: {
      id: string;
      content: string | null;
      type: string;
      mediaUrl: string | null;
      createdAt: Date;
    }
  ): Promise<{ success: boolean; response?: BlueChatResponse }> {
    const config = aiUser.aiConfig as ExternalAIConfig;
    if (!this.isExternalAI(config)) {
      logger.warn(`[ExternalAI] User ${aiUser.id} is not configured as external AI`);
      return { success: false };
    }

    const conversation = await this.getConversationHistory(ticket.id);

    // Build the internal payload
    const internalPayload: WebhookPayload = {
      event: 'message.received',
      timestamp: new Date().toISOString(),
      ticket: {
        id: ticket.id,
        protocol: ticket.protocol,
        status: ticket.status,
        departmentId: ticket.departmentId,
        departmentName: ticket.department?.name || null,
      },
      contact: {
        id: ticket.contact.id,
        name: ticket.contact.name,
        phone: ticket.contact.phone,
        email: ticket.contact.email || null,
      },
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        mediaUrl: message.mediaUrl,
        timestamp: message.createdAt.toISOString(),
      },
      conversation,
    };

    // Decide which format to use
    const format = this.getPayloadFormat(config);

    if (format === 'bluechat') {
      // Formato bluetoken-ai: envia BlueChatPayload e espera resposta síncrona
      const blueChatPayload = this.transformToBlueChatPayload(internalPayload, config, aiUser.name);
      
      logger.info(`[ExternalAI] Sending BlueChatPayload to ${config.webhookUrl}`, {
        conversation_id: blueChatPayload.conversation_id,
        empresa: blueChatPayload.context?.empresa,
        messageText: blueChatPayload.message.text.substring(0, 50),
      });

      const result = await this.sendWebhookWithResponse(
        config.webhookUrl,
        blueChatPayload,
        config,
        30000 // 30s timeout - a IA pode demorar para responder
      );

      return { success: result.success, response: result.data };
    } else {
      // Formato ChatBlue original: fire-and-forget
      const success = await this.sendWebhook(config.webhookUrl, internalPayload, config.webhookSecret);
      return { success };
    }
  }

  /**
   * Send ticket.assigned event when a ticket is assigned to external AI
   */
  static async sendTicketAssigned(
    aiUser: { id: string; name?: string; aiConfig: any },
    ticket: {
      id: string;
      protocol: string;
      status: string;
      departmentId: string | null;
      department?: { name: string } | null;
      contact: { id: string; name: string | null; phone: string; email?: string | null };
    }
  ): Promise<{ success: boolean; data?: BlueChatResponse }> {
    const config = aiUser.aiConfig as ExternalAIConfig;
    if (!this.isExternalAI(config)) return { success: false };

    const conversation = await this.getConversationHistory(ticket.id);

    const payload: WebhookPayload = {
      event: 'ticket.assigned',
      timestamp: new Date().toISOString(),
      ticket: {
        id: ticket.id,
        protocol: ticket.protocol,
        status: ticket.status,
        departmentId: ticket.departmentId,
        departmentName: ticket.department?.name || null,
      },
      contact: {
        id: ticket.contact.id,
        name: ticket.contact.name,
        phone: ticket.contact.phone,
        email: ticket.contact.email || null,
      },
      conversation,
    };

    const format = this.getPayloadFormat(config);

    if (format === 'bluechat') {
      // Construir mensagem rica com contexto completo para que a IA externa inicie o atendimento
      const contactName = ticket.contact.name || 'Cliente';
      const contactPhone = ticket.contact.phone;
      const contactEmail = ticket.contact.email || '';
      const departmentName = ticket.department?.name || '';

      // Gerar histórico completo (sem truncar)
      const historySummary = this.generateHistorySummary(conversation, 30, 500);

      // Montar mensagem rica com todas as informações necessárias
      const richMessageParts: string[] = [
        `[NOVO ATENDIMENTO]`,
        `Cliente: ${contactName}`,
        `Telefone: ${contactPhone}`,
      ];
      if (contactEmail) {
        richMessageParts.push(`Email: ${contactEmail}`);
      }
      if (departmentName) {
        richMessageParts.push(`Departamento: ${departmentName}`);
      }
      richMessageParts.push(`Protocolo: ${ticket.protocol}`);
      richMessageParts.push('');

      if (historySummary) {
        richMessageParts.push('Histórico da conversa:');
        richMessageParts.push(historySummary);
        richMessageParts.push('');
      }

      richMessageParts.push('Inicie o atendimento com o cliente.');

      const richMessage = richMessageParts.join('\n');

      const blueChatPayload: BlueChatPayload = {
        conversation_id: ticket.id,
        message_id: `assigned-${ticket.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        channel: 'WHATSAPP',
        contact: {
          phone: contactPhone,
          name: contactName !== 'Cliente' ? contactName : undefined,
          email: contactEmail || undefined,
        },
        message: {
          type: 'text',
          text: richMessage,
        },
        context: {
          empresa: config.empresa || 'BLUE',
          agent_id: aiUser.name?.toLowerCase().replace(/\s+/g, '_') || 'chatblue',
          source: 'BLUECHAT',
          tags: ['ticket_assigned', 'new_attendance'],
          history_summary: historySummary,
        },
      };

      logger.info(`[ExternalAI] Sending rich ticket.assigned webhook for ticket ${ticket.id} to ${aiUser.name}`, {
        contactName,
        contactPhone,
        hasEmail: !!contactEmail,
        historyLength: historySummary?.length || 0,
      });

      const result = await this.sendWebhookWithResponse(config.webhookUrl, blueChatPayload, config);
      return result;
    } else {
      const success = await this.sendWebhook(config.webhookUrl, payload, config.webhookSecret);
      return { success };
    }
  }

  /**
   * Send ticket.unassigned event when a ticket is removed from external AI
   */
  static async sendTicketUnassigned(
    aiUser: { id: string; aiConfig: any },
    ticket: {
      id: string;
      protocol: string;
      status: string;
      departmentId: string | null;
      department?: { name: string } | null;
      contact: { id: string; name: string | null; phone: string; email?: string | null };
    }
  ): Promise<boolean> {
    const config = aiUser.aiConfig as ExternalAIConfig;
    if (!this.isExternalAI(config)) return false;

    const payload: WebhookPayload = {
      event: 'ticket.unassigned',
      timestamp: new Date().toISOString(),
      ticket: {
        id: ticket.id,
        protocol: ticket.protocol,
        status: ticket.status,
        departmentId: ticket.departmentId,
        departmentName: ticket.department?.name || null,
      },
      contact: {
        id: ticket.contact.id,
        name: ticket.contact.name,
        phone: ticket.contact.phone,
        email: ticket.contact.email || null,
      },
    };

    // Para unassigned, sempre usa formato ChatBlue (não precisa de resposta)
    return this.sendWebhook(config.webhookUrl, payload, config.webhookSecret);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Find an external AI user assigned to a department
   */
  static async findExternalAIForDepartment(departmentId: string): Promise<{
    id: string;
    name: string;
    aiConfig: any;
  } | null> {
    const userDept = await prisma.userDepartment.findFirst({
      where: {
        departmentId,
        user: {
          isAI: true,
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            aiConfig: true,
          },
        },
      },
    });

    if (!userDept) return null;

    // Check if it's an external AI
    if (this.isExternalAI(userDept.user.aiConfig)) {
      return userDept.user;
    }

    return null;
  }
}
