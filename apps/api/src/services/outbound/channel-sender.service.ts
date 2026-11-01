import { WhatsAppConnection } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { InstagramService } from '../instagram/instagram.service.js';
import {
  InstagramWindowService,
  InstagramWindowState,
  OutboundActor,
} from '../instagram/instagram-window.service.js';

/**
 * Fachada de envio por canal. Todo envio de saída (atendente, IA, automação) deve passar por aqui
 * para que conexões INSTAGRAM usem a API do Instagram (e respeitem a janela de 24h/7d) em vez de
 * cair no MetaCloudService (WhatsApp Cloud API).
 *
 * Em caso de janela fechada no Instagram lança `InstagramWindowClosedError` (com `.state`).
 */

export interface ChannelContact {
  id?: string;
  phone: string;
  instagramId?: string | null;
  lastMessageAt?: Date | null;
  windowSource?: string | null;
}

export interface ChannelSendTextOptions {
  actor: OutboundActor;
  /** WhatsApp: id da mensagem citada (comportamento atual preservado) */
  quotedMessageId?: string;
  /** Instagram: mid da mensagem respondida */
  replyToMid?: string;
  /**
   * Nome de quem envia. WhatsApp: `*Nome:*` + separador; Instagram: `Nome: ` sem negrito.
   * Omitido → nenhum prefixo.
   */
  senderName?: string;
  /** Separador entre o prefixo e o texto no WhatsApp (padrão '\n') */
  senderSeparator?: string;
}

export interface ChannelSendMediaOptions {
  actor: OutboundActor;
  quotedMessageId?: string;
  filename?: string;
  mimetype?: string;
}

export interface ChannelSendResult {
  messageId: string;
  finalMediaUrl?: string;
  /** Tag usada no Instagram (HUMAN_AGENT quando fora da janela padrão) */
  tag?: 'HUMAN_AGENT';
  /** Estado da janela usado na decisão (somente Instagram) */
  window?: InstagramWindowState;
}

/**
 * Remove formatação do WhatsApp/Markdown que o Instagram não renderiza.
 * `*negrito*` / `**negrito**` → negrito, `_itálico_` → itálico, `~riscado~` → riscado.
 * Usa delimitadores de palavra para não quebrar URLs, snake_case, contas como 2*3*4 etc.
 */
export function stripWhatsAppFormatting(text: string): string {
  if (!text) return text;
  const before = '(^|[\\s([{"\'«])';
  const after = '(?=$|[\\s)\\]}"\'».,!?:;])';
  return text
    .replace(new RegExp(`${before}\\*\\*(?!\\s)([^*\\n]+?)\\*\\*${after}`, 'gm'), '$1$2')
    .replace(new RegExp(`${before}\\*(?!\\s)([^*\\n]+?)\\*${after}`, 'gm'), '$1$2')
    .replace(new RegExp(`${before}_(?!\\s)([^_\\n]+?)_${after}`, 'gm'), '$1$2')
    .replace(new RegExp(`${before}~(?!\\s)([^~\\n]+?)~${after}`, 'gm'), '$1$2');
}

export function isInstagramConnection(connection: Pick<WhatsAppConnection, 'type'>): boolean {
  return connection.type === 'INSTAGRAM';
}

export class ChannelSender {
  /**
   * Calcula o estado da janela do Instagram para o contato (lê do banco quando há `id`, para não
   * usar um objeto desatualizado).
   */
  static async getInstagramWindow(contact: ChannelContact): Promise<InstagramWindowState> {
    return (await this.loadInstagramContext(contact)).window;
  }

  /** Estado da janela + destinatário (IGSID), lidos do banco quando há `id`. */
  private static async loadInstagramContext(
    contact: ChannelContact
  ): Promise<{ window: InstagramWindowState; recipientId: string }> {
    let fresh: { lastMessageAt: Date | null; windowSource: string | null; instagramId: string | null } | null = null;
    if (contact.id) {
      fresh = await prisma.contact.findUnique({
        where: { id: contact.id },
        select: { lastMessageAt: true, windowSource: true, instagramId: true },
      });
    }

    const window = InstagramWindowService.getState({
      lastMessageAt: fresh ? fresh.lastMessageAt : contact.lastMessageAt ?? null,
      windowSource: fresh ? fresh.windowSource : contact.windowSource ?? null,
    });

    const recipientId = fresh?.instagramId || contact.instagramId || contact.phone;
    if (!recipientId) {
      throw new Error('Contato do Instagram sem IGSID (instagramId)');
    }

    return { window, recipientId };
  }

  static formatText(
    connection: Pick<WhatsAppConnection, 'type'>,
    content: string,
    senderName?: string,
    senderSeparator = '\n'
  ): string {
    if (isInstagramConnection(connection)) {
      const plain = stripWhatsAppFormatting(content);
      return senderName ? `${senderName}: ${plain}` : plain;
    }
    return senderName ? `*${senderName}:*${senderSeparator}${content}` : content;
  }

  static async sendText(
    connection: WhatsAppConnection,
    contact: ChannelContact,
    content: string,
    options: ChannelSendTextOptions
  ): Promise<ChannelSendResult> {
    const text = this.formatText(connection, content, options.senderName, options.senderSeparator);

    if (isInstagramConnection(connection)) {
      const { window, recipientId } = await this.loadInstagramContext(contact);
      // Lança InstagramWindowClosedError se não puder enviar
      const sendOptions = InstagramWindowService.resolveSendOptions(window, options.actor);

      const instagramService = new InstagramService(connection);
      const result = await instagramService.sendTextMessage(recipientId, text, {
        ...(sendOptions.tag && { tag: sendOptions.tag }),
        ...(options.replyToMid && { replyToMid: options.replyToMid }),
      });

      if (sendOptions.tag) {
        logger.info(`[ChannelSender] Instagram: mensagem enviada com tag HUMAN_AGENT (contato ${contact.id || recipientId})`);
      }

      return { messageId: result.messageId, tag: sendOptions.tag, window };
    }

    const whatsappService = new WhatsAppService(connection);
    const result = await whatsappService.sendMessage(contact.phone, text, {
      quotedMessageId: options.quotedMessageId,
    });
    return { messageId: result.messageId };
  }

  static async sendMedia(
    connection: WhatsAppConnection,
    contact: ChannelContact,
    mediaUrl: string,
    mediaType: string,
    caption: string | undefined,
    options: ChannelSendMediaOptions
  ): Promise<ChannelSendResult> {
    if (isInstagramConnection(connection)) {
      const { window, recipientId } = await this.loadInstagramContext(contact);
      const sendOptions = InstagramWindowService.resolveSendOptions(window, options.actor);

      const instagramService = new InstagramService(connection);
      const result = await instagramService.sendMediaMessage(recipientId, mediaUrl, mediaType, {
        ...(sendOptions.tag && { tag: sendOptions.tag }),
      });

      // Instagram não tem legenda em anexos: envia a legenda como texto logo em seguida
      const captionText = caption?.trim() ? stripWhatsAppFormatting(caption.trim()) : '';
      if (captionText) {
        try {
          await instagramService.sendTextMessage(recipientId, captionText, {
            ...(sendOptions.tag && { tag: sendOptions.tag }),
          });
        } catch (error: any) {
          logger.warn('[ChannelSender] Instagram: falha ao enviar legenda como texto', {
            message: error?.message,
          });
        }
      }

      return { messageId: result.messageId, finalMediaUrl: mediaUrl, tag: sendOptions.tag, window };
    }

    const whatsappService = new WhatsAppService(connection);
    return whatsappService.sendMedia(contact.phone, mediaUrl, mediaType, caption, {
      quotedMessageId: options.quotedMessageId,
      filename: options.filename,
      mimetype: options.mimetype,
    });
  }
}
