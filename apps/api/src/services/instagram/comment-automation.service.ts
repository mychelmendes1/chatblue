import type { WhatsAppConnection } from '@prisma/client';
import { logger } from '../../config/logger.js';

/**
 * Payload de um comentário vindo do webhook `comments` / `live_comments`
 * (Instagram API with Instagram Login). `entry.id` é a conta; `value` é isto.
 */
export interface InstagramCommentWebhookValue {
  id: string;                 // comment id
  text?: string;
  from?: { id: string; username?: string };
  media?: { id: string; media_product_type?: string; ad_id?: string; ad_title?: string };
  parent_id?: string;
}

export interface HandleCommentEventInput {
  connection: WhatsAppConnection;
  value: InstagramCommentWebhookValue;
  field: 'comments' | 'live_comments';
  receivedAt: Date;
}

/**
 * Serviço de automação de comentários (estilo ManyChat).
 * STUB: a implementação completa é feita em `comment-automation.service.ts`
 * pelo módulo de automação. As assinaturas públicas abaixo são o contrato
 * usado pelo processador do webhook e pelo MessageProcessor.
 */
export class CommentAutomationService {
  /**
   * Chamado pelo processador do webhook para cada comentário recebido.
   * Deve: deduplicar por comment id, ignorar comentários da própria conta,
   * casar com as automações ativas, responder publicamente, enviar o private
   * reply (1x por comentário) e registrar InstagramCommentEvent.
   */
  static async handleCommentEvent(input: HandleCommentEventInput): Promise<void> {
    logger.debug('[CommentAutomation] stub handleCommentEvent', {
      connectionId: input.connection.id,
      commentId: input.value.id,
    });
  }

  /**
   * Chamado quando chega uma mensagem no Direct de um IGSID. Se houver
   * InstagramCommentEvent em PRIVATE_SENT para esse usuário, marca USER_REPLIED,
   * vincula o ticket e aplica departamento/IA configurados na automação.
   */
  static async onInstagramUserMessage(params: {
    connection: WhatsAppConnection;
    igsid: string;
    ticketId?: string | null;
    contactId?: string | null;
  }): Promise<void> {
    logger.debug('[CommentAutomation] stub onInstagramUserMessage', {
      connectionId: params.connection.id,
      igsid: params.igsid,
    });
  }
}
