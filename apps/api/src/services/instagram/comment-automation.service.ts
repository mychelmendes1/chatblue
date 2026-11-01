import type { InstagramCommentAutomation, WhatsAppConnection } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { InstagramService, INSTAGRAM_TEXT_MAX_BYTES, splitTextByBytes } from './instagram.service.js';
import {
  applyPlaceholders,
  matchAutomation,
  normalizeMediaType,
  startOfDaySaoPaulo,
  type CommentMatchInput,
} from './comment-automation.matching.js';

export {
  matchAutomation,
  matchKeywords,
  normalizeText,
  normalizeMediaType,
  applyPlaceholders,
} from './comment-automation.matching.js';
export type {
  MatchableAutomation,
  CommentMatchInput,
  CommentMatchResult,
  CommentMatchReason,
} from './comment-automation.matching.js';

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

/** Formato do JSON `privateMessage` da automação. */
export interface CommentAutomationPrivateMessage {
  text: string;
  linkUrl?: string;
  buttonTitle?: string;
  imageUrl?: string;
}

const CLOSED_TICKET_STATUSES = ['RESOLVED', 'CLOSED'] as const;

function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return typeof error === 'string' ? error : JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parsePrivateMessage(raw: unknown): CommentAutomationPrivateMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.text !== 'string') return null;
  return {
    text: obj.text,
    linkUrl: typeof obj.linkUrl === 'string' && obj.linkUrl ? obj.linkUrl : undefined,
    buttonTitle: typeof obj.buttonTitle === 'string' && obj.buttonTitle ? obj.buttonTitle : undefined,
    imageUrl: typeof obj.imageUrl === 'string' && obj.imageUrl ? obj.imageUrl : undefined,
  };
}

/** Monta o texto do private reply (placeholders + link anexado se não estiver no texto). */
export function buildPrivateReplyText(
  pm: CommentAutomationPrivateMessage,
  username?: string | null
): string {
  const nome = username ? `@${username}` : '';
  let text = applyPlaceholders(pm.text, { nome, link: pm.linkUrl ?? '' });
  let suffix = '';
  if (pm.linkUrl && !text.includes(pm.linkUrl)) {
    suffix = `\n\n${pm.linkUrl}`;
  }
  // Private reply é UMA mensagem só (não dá para quebrar em partes): limite de 1000 bytes UTF-8.
  // Corta o texto (preservando o link no final) se acentos/emoji/link estourarem o limite.
  const maxBody = INSTAGRAM_TEXT_MAX_BYTES - Buffer.byteLength(suffix, 'utf8');
  if (Buffer.byteLength(text, 'utf8') > maxBody && maxBody > 0) {
    text = splitTextByBytes(text, maxBody)[0] ?? '';
  }
  return `${text.trim()}${suffix}`.trim();
}

/**
 * Serviço de automação de comentários (estilo ManyChat).
 * Contrato usado pelo processador do webhook e pelo MessageProcessor.
 */
export class CommentAutomationService {
  /**
   * Chamado pelo processador do webhook para cada comentário recebido.
   * Deduplica por comment id, ignora comentários da própria conta, casa com as
   * automações ativas, responde publicamente, envia o private reply (1x por
   * comentário) e registra InstagramCommentEvent. Nunca lança exceção.
   */
  static async handleCommentEvent(input: HandleCommentEventInput): Promise<void> {
    const { connection, value, field } = input;

    // a. Ignora comentários inválidos ou da própria conta
    if (!value?.id || !value.from?.id) {
      logger.debug('[CommentAutomation] Comentário sem id/from, ignorado', { connectionId: connection.id });
      return;
    }
    if (
      (connection.instagramAccountId && value.from.id === connection.instagramAccountId) ||
      (connection.instagramUsername &&
        value.from.username &&
        value.from.username.toLowerCase() === connection.instagramUsername.toLowerCase())
    ) {
      logger.debug('[CommentAutomation] Comentário da própria conta, ignorado', { commentId: value.id });
      return;
    }

    const from = value.from;
    const mediaInput: CommentMatchInput = {
      text: value.text ?? '',
      mediaId: value.media?.id ?? null,
      mediaProductType: value.media?.media_product_type ?? null,
      adId: value.media?.ad_id ?? null,
      parentId: value.parent_id ?? null,
      field,
    };

    // b. Idempotência: commentId é unique
    let eventId: string;
    try {
      const created = await prisma.instagramCommentEvent.create({
        data: {
          companyId: connection.companyId,
          connectionId: connection.id,
          commentId: value.id,
          mediaId: value.media?.id ?? '',
          mediaType: normalizeMediaType(mediaInput),
          fromIgId: from.id,
          fromUsername: from.username ?? null,
          text: value.text ?? '',
          parentId: value.parent_id ?? null,
          status: 'RECEIVED',
        },
        select: { id: true },
      });
      eventId = created.id;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        logger.debug('[CommentAutomation] Comentário já processado (duplicado)', { commentId: value.id });
        return;
      }
      logger.error('[CommentAutomation] Erro ao registrar evento de comentário', {
        commentId: value.id,
        error: errMsg(error),
      });
      return;
    }

    try {
      await CommentAutomationService.processEvent(eventId, input, mediaInput);
    } catch (error) {
      logger.error('[CommentAutomation] Erro inesperado ao processar comentário', {
        commentId: value.id,
        error: errMsg(error),
      });
      await prisma.instagramCommentEvent
        .update({ where: { id: eventId }, data: { status: 'FAILED', error: errMsg(error).slice(0, 1000) } })
        .catch(() => {});
    }
  }

  private static async processEvent(
    eventId: string,
    input: HandleCommentEventInput,
    mediaInput: CommentMatchInput
  ): Promise<void> {
    const { connection, value } = input;
    const from = value.from!;

    // c. Automações ativas (a primeira que casar vence)
    const automations = await prisma.instagramCommentAutomation.findMany({
      where: { connectionId: connection.id, companyId: connection.companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (automations.length === 0) {
      await prisma.instagramCommentEvent.update({
        where: { id: eventId },
        data: { status: 'SKIPPED', skipReason: 'no_active_automation' },
      });
      return;
    }

    let automation: InstagramCommentAutomation | null = null;
    let lastReason: string = 'no_match';
    for (const a of automations) {
      const result = matchAutomation(a, mediaInput);
      if (result.matched) {
        automation = a;
        break;
      }
      lastReason = result.reason;
    }

    // d. Nenhuma automação casou
    if (!automation) {
      await prisma.instagramCommentEvent.update({
        where: { id: eventId },
        data: { status: 'SKIPPED', skipReason: automations.length === 1 ? lastReason : `no_match:${lastReason}` },
      });
      return;
    }

    // e. Limites
    if (automation.oncePerUser) {
      const previous = await prisma.instagramCommentEvent.findFirst({
        where: {
          automationId: automation.id,
          fromIgId: from.id,
          id: { not: eventId },
          status: { in: ['REPLIED', 'PRIVATE_SENT', 'USER_REPLIED'] },
        },
        select: { id: true },
      });
      if (previous) {
        await prisma.instagramCommentEvent.update({
          where: { id: eventId },
          data: { status: 'SKIPPED', skipReason: 'once_per_user', automationId: automation.id },
        });
        return;
      }
    }

    if (automation.dailyLimit != null && automation.dailyLimit > 0) {
      const sentToday = await prisma.instagramCommentEvent.count({
        where: {
          automationId: automation.id,
          status: { in: ['PRIVATE_SENT', 'USER_REPLIED'] },
          privateSentAt: { gte: startOfDaySaoPaulo() },
        },
      });
      if (sentToday >= automation.dailyLimit) {
        await prisma.instagramCommentEvent.update({
          where: { id: eventId },
          data: { status: 'SKIPPED', skipReason: 'daily_limit', automationId: automation.id },
        });
        return;
      }
    }

    // f. MATCHED
    await prisma.$transaction([
      prisma.instagramCommentEvent.update({
        where: { id: eventId },
        data: { status: 'MATCHED', automationId: automation.id },
      }),
      prisma.instagramCommentAutomation.update({
        where: { id: automation.id },
        data: { matchedCount: { increment: 1 } },
      }),
    ]);

    const service = new InstagramService(connection);
    const nome = from.username ? `@${from.username}` : '';
    const errors: string[] = [];

    // g. Resposta pública (falha não impede o private reply)
    const publicReplies = (automation.publicReplies || []).filter((r) => r && r.trim() !== '');
    if (publicReplies.length > 0) {
      const template = publicReplies[Math.floor(Math.random() * publicReplies.length)];
      const message = applyPlaceholders(template, { nome });
      try {
        const reply = await service.replyToComment(value.id, message);
        await prisma.instagramCommentEvent.update({
          where: { id: eventId },
          data: { status: 'REPLIED', publicReplyId: reply?.id ?? null },
        });
      } catch (error) {
        const msg = `public_reply: ${errMsg(error)}`;
        errors.push(msg);
        logger.warn('[CommentAutomation] Falha na resposta pública', {
          commentId: value.id,
          automationId: automation.id,
          error: msg,
        });
        await prisma.instagramCommentEvent
          .update({ where: { id: eventId }, data: { error: msg.slice(0, 1000) } })
          .catch(() => {});
      }
    }

    // h. Private reply — a Meta permite UMA mensagem por comentário, em até 7 dias.
    // Não temos o timestamp do comentário no webhook; como o processamento é
    // praticamente em tempo real, seguimos sem checar a regra dos 7 dias.
    // `imageUrl` é ignorado aqui: um segundo sendPrivateReply (imagem) no mesmo
    // comentário seria rejeitado pela regra de 1 mensagem. A imagem pode ser
    // enviada depois que a pessoa responder no Direct (janela de 24h aberta).
    const pm = parsePrivateMessage(automation.privateMessage);
    let privateSent = false;
    if (pm && pm.text.trim() !== '') {
      const text = buildPrivateReplyText(pm, from.username);
      try {
        const result = await service.sendPrivateReply(value.id, { text });
        privateSent = true;
        await prisma.$transaction([
          prisma.instagramCommentEvent.update({
            where: { id: eventId },
            data: {
              status: 'PRIVATE_SENT',
              privateReplyMessageId: result?.messageId ?? null,
              privateSentAt: new Date(),
            },
          }),
          prisma.instagramCommentAutomation.update({
            where: { id: automation.id },
            data: { privateSentCount: { increment: 1 } },
          }),
        ]);
      } catch (error) {
        const msg = `private_reply: ${errMsg(error)}`;
        errors.push(msg);
        logger.error('[CommentAutomation] Falha no private reply', {
          commentId: value.id,
          automationId: automation.id,
          error: msg,
        });
        await prisma.instagramCommentEvent
          .update({ where: { id: eventId }, data: { status: 'FAILED', error: errors.join(' | ').slice(0, 1000) } })
          .catch(() => {});
      }
    }

    // i. Contato do usuário do IG (marca private_reply_pending se o DM saiu)
    try {
      await CommentAutomationService.upsertContact(connection, from, privateSent);
    } catch (error) {
      logger.warn('[CommentAutomation] Falha ao criar/atualizar contato', {
        igId: from.id,
        error: errMsg(error),
      });
    }

    logger.info('[CommentAutomation] Comentário processado', {
      commentId: value.id,
      automationId: automation.id,
      privateSent,
      errors: errors.length,
    });
  }

  /**
   * Cria/atualiza o Contact do usuário do Instagram. Não mexe em `lastMessageAt`:
   * o private reply NÃO abre a janela de 24h.
   */
  private static async upsertContact(
    connection: WhatsAppConnection,
    from: { id: string; username?: string },
    privateSent: boolean
  ): Promise<void> {
    const companyId = connection.companyId;
    const phone = `ig:${from.id}`;

    // Contato pode já existir pelo Direct (MessageProcessor grava phone = IGSID)
    let contact = await prisma.contact.findFirst({
      where: { companyId, instagramId: from.id },
    });
    if (!contact) {
      contact = await prisma.contact.findFirst({
        where: { companyId, OR: [{ phone }, { phone: from.id }, { lidId: from.id }] },
      });
    }

    if (!contact) {
      await prisma.contact.create({
        data: {
          companyId,
          phone,
          instagramId: from.id,
          instagramUsername: from.username ?? null,
          name: from.username ?? null,
          windowSource: privateSent ? 'private_reply_pending' : null,
        },
      });
      return;
    }

    const data: Record<string, unknown> = {};
    if (!contact.instagramId) data.instagramId = from.id;
    if (from.username && contact.instagramUsername !== from.username) data.instagramUsername = from.username;
    if (!contact.name && from.username) data.name = from.username;

    // Só marca "pendente" se não houver uma janela de 24h ativa (conversa em andamento),
    // para não rebaixar a janela de quem já está falando no Direct.
    if (privateSent) {
      const hasOpenWindow =
        contact.lastMessageAt && Date.now() - contact.lastMessageAt.getTime() < 24 * 60 * 60 * 1000;
      if (!hasOpenWindow) data.windowSource = 'private_reply_pending';
    }

    if (Object.keys(data).length > 0) {
      await prisma.contact.update({ where: { id: contact.id }, data });
    }
  }

  /**
   * Chamado quando chega uma mensagem no Direct de um IGSID. Se houver
   * InstagramCommentEvent em PRIVATE_SENT para esse usuário, marca USER_REPLIED,
   * vincula o ticket e aplica o departamento configurado na automação.
   * Nunca lança exceção.
   */
  static async onInstagramUserMessage(params: {
    connection: WhatsAppConnection;
    igsid: string;
    ticketId?: string | null;
    contactId?: string | null;
  }): Promise<void> {
    const { connection, igsid } = params;
    try {
      const event = await prisma.instagramCommentEvent.findFirst({
        where: { connectionId: connection.id, fromIgId: igsid, status: 'PRIVATE_SENT' },
        orderBy: { createdAt: 'desc' },
        include: { automation: true },
      });

      // Contato: o informado ou o do IGSID
      const contact = params.contactId
        ? await prisma.contact.findFirst({ where: { id: params.contactId, companyId: connection.companyId } })
        : await prisma.contact.findFirst({
            where: {
              companyId: connection.companyId,
              OR: [{ instagramId: igsid }, { phone: igsid }, { lidId: igsid }],
            },
          });

      // Mensagem chegou: janela padrão de 24h a partir de agora
      if (contact && contact.windowSource === 'private_reply_pending') {
        await prisma.contact.update({ where: { id: contact.id }, data: { windowSource: 'standard' } });
      }

      if (!event) return;

      // Resolve o ticket
      let ticket = params.ticketId
        ? await prisma.ticket.findFirst({
            where: { id: params.ticketId, companyId: connection.companyId },
            select: { id: true, status: true, departmentId: true },
          })
        : null;
      if (!ticket && contact) {
        ticket = await prisma.ticket.findFirst({
          where: {
            companyId: connection.companyId,
            contactId: contact.id,
            connectionId: connection.id,
            status: { notIn: [...CLOSED_TICKET_STATUSES] },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, departmentId: true },
        });
      }

      await prisma.instagramCommentEvent.update({
        where: { id: event.id },
        data: { status: 'USER_REPLIED', userRepliedAt: new Date(), ticketId: ticket?.id ?? null },
      });

      const automation = event.automation;
      if (!automation) return;

      await prisma.instagramCommentAutomation.update({
        where: { id: automation.id },
        data: { userRepliedCount: { increment: 1 } },
      });

      // Departamento configurado na automação (só para ticket ainda na fila)
      if (
        ticket &&
        automation.departmentId &&
        ticket.status === 'PENDING' &&
        ticket.departmentId !== automation.departmentId
      ) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { departmentId: automation.departmentId },
        });
        logger.info('[CommentAutomation] Ticket direcionado ao departamento da automação', {
          ticketId: ticket.id,
          departmentId: automation.departmentId,
        });
      }

      // aiEnabled === false: nada a fazer aqui; a IA é controlada por conexão em outro ponto.

      logger.info('[CommentAutomation] Usuário respondeu ao private reply', {
        eventId: event.id,
        automationId: automation.id,
        ticketId: ticket?.id,
      });
    } catch (error) {
      logger.error('[CommentAutomation] Erro em onInstagramUserMessage', {
        connectionId: connection.id,
        igsid,
        error: errMsg(error),
      });
    }
  }
}
