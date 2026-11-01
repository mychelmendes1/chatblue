import { Job } from 'bullmq';
import type { WhatsAppConnection } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { redis } from '../../config/redis.js';
import { MessageProcessor } from '../../services/message-processor.service.js';
import { InstagramService } from '../../services/instagram/instagram.service.js';
import { CommentAutomationService } from '../../services/instagram/comment-automation.service.js';
import { InstagramWindowService } from '../../services/instagram/instagram-window.service.js';
import {
  extractInstagramMessageContent,
  extractInstagramReferral,
  handleInstagramReaction,
} from '../../services/instagram/instagram-webhook.handlers.js';

export interface InstagramWebhookJobData {
  entry: any;
  receivedAt: string | number;
}

const EVENT_DEDUPE_TTL_SECONDS = 7 * 24 * 3600;
const PROFILE_CACHE_TTL_SECONDS = 24 * 3600;

/**
 * Marca o evento como visto (SET NX). Retorna false se já foi processado.
 */
async function claimEvent(key: string | undefined): Promise<boolean> {
  if (!key) return true;
  try {
    const res = await redis.set(`ig:evt:${key}`, '1', 'EX', EVENT_DEDUPE_TTL_SECONDS, 'NX');
    return res === 'OK';
  } catch (error) {
    // Sem Redis: melhor processar do que perder o evento
    logger.warn('[IG Webhook] Falha no dedupe Redis, processando assim mesmo', { key });
    return true;
  }
}

async function releaseEvent(key: string | undefined): Promise<void> {
  if (!key) return;
  try {
    await redis.del(`ig:evt:${key}`);
  } catch {
    // ignore
  }
}

/** Nome do usuário (best-effort, com cache de 24 h) */
async function getPushName(connection: WhatsAppConnection, igsid: string): Promise<string | undefined> {
  const cacheKey = `ig:profile:${connection.id}:${igsid}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) return cached || undefined;
  } catch {
    // ignore
  }
  try {
    const profile = await new InstagramService(connection).getUserProfile(igsid);
    const name = profile?.name || (profile?.username ? `@${profile.username}` : '');
    try {
      await redis.set(cacheKey, name, 'EX', PROFILE_CACHE_TTL_SECONDS);
    } catch {
      // ignore
    }
    if (profile?.username) {
      await prisma.contact
        .updateMany({
          where: {
            companyId: connection.companyId,
            OR: [{ instagramId: igsid }, { phone: igsid }],
            instagramUsername: null,
          },
          data: { instagramUsername: profile.username },
        })
        .catch(() => undefined);
    }
    return name || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Retry do BullMQ após falha parcial: processIncoming lança mesmo depois de gravar a mensagem
 * (ex.: erro na IA). Sem esta checagem o retry duplicaria a mensagem e a resposta automática.
 */
async function alreadyStored(connection: WhatsAppConnection, mid: string | undefined): Promise<boolean> {
  if (!mid) return false;
  const existing = await prisma.message.findFirst({
    where: { wamid: mid, connectionId: connection.id },
    select: { id: true },
  });
  if (existing) {
    logger.debug(`[IG Webhook] Mensagem ${mid} já gravada, ignorando reprocessamento`);
    return true;
  }
  return false;
}

/** messaging_seen: marca nossas mensagens como lidas até o watermark */
async function handleRead(connection: WhatsAppConnection, senderId: string, event: any): Promise<void> {
  let watermark: Date | null = null;
  if (event.read?.watermark) {
    watermark = new Date(Number(event.read.watermark));
  } else if (event.read?.mid) {
    const msg = await prisma.message.findFirst({
      where: { wamid: event.read.mid, connectionId: connection.id },
      select: { createdAt: true },
    });
    watermark = msg?.createdAt || (event.timestamp ? new Date(Number(event.timestamp)) : null);
  } else if (event.timestamp) {
    watermark = new Date(Number(event.timestamp));
  }
  if (!watermark || isNaN(watermark.getTime())) return;

  const readAt = event.timestamp ? new Date(Number(event.timestamp)) : new Date();
  const where = {
    connectionId: connection.id,
    isFromMe: true,
    status: { in: ['SENT', 'DELIVERED'] as any },
    createdAt: { lte: watermark },
    ticket: {
      contact: { OR: [{ instagramId: senderId }, { phone: senderId }] },
    },
  };

  const toUpdate = await prisma.message.findMany({
    where,
    select: { id: true, wamid: true, ticketId: true },
    take: 500,
  });
  if (toUpdate.length === 0) return;

  await prisma.message.updateMany({
    where: { id: { in: toUpdate.map((m) => m.id) } },
    data: { status: 'READ', readAt },
  });

  const io = (global as any).io;
  if (io) {
    for (const m of toUpdate) {
      io.to(`ticket:${m.ticketId}`).emit('message:status', {
        messageId: m.id,
        wamid: m.wamid,
        status: 'READ',
      });
    }
  }
  logger.debug(`[IG Webhook] ${toUpdate.length} mensagem(ns) marcadas como lidas (${connection.id})`);
}

/** Processa um evento de `entry.messaging[]` */
async function handleMessagingEvent(connection: WhatsAppConnection, event: any): Promise<void> {
  const senderId: string | undefined = event.sender?.id;
  const timestamp = event.timestamp ? new Date(Number(event.timestamp)) : new Date();

  if (!senderId) return;

  // Ecos (mensagens enviadas pela própria conta/app)
  if (event.message?.is_echo === true || senderId === connection.instagramAccountId) {
    return;
  }

  if (event.message) {
    const message = event.message;

    if (message.is_deleted) {
      logger.info(`[IG Webhook] Mensagem apagada pelo usuário: ${message.mid}`);
      return;
    }

    if (await alreadyStored(connection, message.mid)) return;

    const extracted = await extractInstagramMessageContent(message, connection);

    // Reações chegando dentro de `message`
    if (extracted.reactionEmoji !== undefined && extracted.reactionMessageId) {
      await handleInstagramReaction(
        extracted.reactionMessageId,
        extracted.reactionEmoji,
        senderId,
        false,
        connection.id
      );
      return;
    }

    if (message.is_unsupported && !extracted.content && !extracted.mediaUrl) {
      extracted.content = '[Mensagem não suportada]';
    }

    const referral = extractInstagramReferral(event);
    const pushName = await getPushName(connection, senderId);

    await MessageProcessor.processIncoming({
      connectionId: connection.id,
      companyId: connection.companyId,
      from: senderId,
      pushName,
      wamid: message.mid,
      type: extracted.type,
      content: extracted.content,
      mediaUrl: extracted.mediaUrl,
      timestamp,
      quotedMessageId: extracted.quotedMessageId,
      metadata: {
        platform: 'instagram',
        storyMention: extracted.storyMention,
        storyReply: extracted.storyReply,
        ...(referral && { referral }),
      } as any,
    });

    await notifyCommentAutomation(connection, senderId);
    return;
  }

  if (event.reaction) {
    // message_reactions: { mid, action: 'react' | 'unreact', reaction, emoji }
    const emoji = event.reaction.action === 'unreact' ? '' : event.reaction.emoji || '';
    await handleInstagramReaction(event.reaction.mid, emoji, senderId, false, connection.id);
    return;
  }

  if (event.read) {
    await handleRead(connection, senderId, event);
    return;
  }

  if (event.postback) {
    if (await alreadyStored(connection, event.postback.mid)) return;

    const payload = event.postback.payload;
    const title = event.postback.title;
    const referral = extractInstagramReferral(event);
    const pushName = await getPushName(connection, senderId);

    await MessageProcessor.processIncoming({
      connectionId: connection.id,
      companyId: connection.companyId,
      from: senderId,
      pushName,
      wamid: event.postback.mid || `postback_${senderId}_${event.timestamp || Date.now()}`,
      type: 'INTERACTIVE',
      content: title || payload,
      timestamp,
      metadata: {
        platform: 'instagram',
        interactiveResponse: {
          type: 'postback',
          payload,
          title,
        } as any,
        ...(referral && { referral }),
      } as any,
    });

    await notifyCommentAutomation(connection, senderId);
    return;
  }

  if (event.referral) {
    // Usuário veio de anúncio (Click-to-Direct) ou link ig.me sem mandar mensagem ainda
    const referral = extractInstagramReferral(event);
    logger.info('[IG Webhook] Referral recebido', { connectionId: connection.id, senderId, referral });
    if (referral && (referral.ad_id || String(referral.source || '').toUpperCase() === 'ADS')) {
      // Abre a janela de 7 dias (Click-to-Direct) a partir do momento do referral
      const contact = await prisma.contact
        .findFirst({
          where: {
            companyId: connection.companyId,
            OR: [{ instagramId: senderId }, { phone: senderId }],
          },
          select: { id: true },
        })
        .catch(() => null);
      if (contact) {
        await InstagramWindowService.registerInbound(
          contact.id,
          event.timestamp ? new Date(Number(event.timestamp)) : new Date(),
          { fromAd: true }
        ).catch((error) => logger.warn('[IG Webhook] Falha ao abrir janela ctd_ad', { error }));
      }
    }
    return;
  }

  logger.debug('[IG Webhook] Evento messaging não tratado', { keys: Object.keys(event) });
}

async function notifyCommentAutomation(connection: WhatsAppConnection, igsid: string): Promise<void> {
  try {
    await CommentAutomationService.onInstagramUserMessage({ connection, igsid });
  } catch (error) {
    logger.error('[IG Webhook] CommentAutomationService.onInstagramUserMessage falhou', {
      connectionId: connection.id,
      igsid,
      error: (error as any)?.message || error,
    });
  }
}

/** Chave de dedupe de um evento messaging */
function messagingEventKey(event: any): string | undefined {
  if (event.message?.mid) return event.message.mid;
  if (event.postback?.mid) return `postback:${event.postback.mid}`;
  if (event.reaction?.mid) {
    return `reaction:${event.reaction.mid}:${event.sender?.id}:${event.reaction.action || ''}:${event.reaction.emoji || ''}:${event.timestamp || ''}`;
  }
  if (event.referral) return `referral:${event.sender?.id}:${event.timestamp || ''}`;
  return undefined; // read/seen são idempotentes
}

/** Lista de mudanças (comments/live_comments) nas duas formas possíveis do payload */
function collectChanges(entry: any): Array<{ field: string; value: any }> {
  const changes: Array<{ field: string; value: any }> = [];
  if (Array.isArray(entry.changes)) {
    for (const change of entry.changes) {
      if (change?.field) changes.push({ field: change.field, value: change.value });
    }
  }
  if (entry.field && entry.value) {
    changes.push({ field: entry.field, value: entry.value });
  }
  return changes;
}

/**
 * Processa um `entry` do webhook do Instagram (fila `instagram-webhook`).
 */
export async function instagramWebhookProcessor(job: Job<InstagramWebhookJobData>): Promise<void> {
  const { entry } = job.data;
  const receivedAt = job.data.receivedAt ? new Date(job.data.receivedAt) : new Date();

  if (!entry?.id) {
    logger.warn('[IG Webhook] Entry sem id, descartado', { jobId: job.id });
    return;
  }

  const connection = await prisma.whatsAppConnection.findFirst({
    where: { type: 'INSTAGRAM', instagramAccountId: String(entry.id), isActive: true },
  });

  if (!connection) {
    logger.warn(`[IG Webhook] Nenhuma conexão INSTAGRAM ativa para a conta ${entry.id}; evento descartado`);
    return;
  }

  const errors: any[] = [];

  // Mensagens do Direct (e standby, quando outro app tem o controle da conversa)
  const messagingEvents: any[] = [...(entry.messaging || [])];
  if (Array.isArray(entry.standby) && entry.standby.length > 0) {
    logger.debug('[IG Webhook] Eventos standby ignorados', { count: entry.standby.length });
  }

  for (const event of messagingEvents) {
    const key = messagingEventKey(event);
    if (!(await claimEvent(key))) {
      logger.debug(`[IG Webhook] Evento duplicado ignorado: ${key}`);
      continue;
    }
    try {
      await handleMessagingEvent(connection, event);
    } catch (error) {
      await releaseEvent(key);
      errors.push(error);
      logger.error('[IG Webhook] Erro ao processar evento messaging', {
        connectionId: connection.id,
        key,
        error: (error as any)?.message || error,
      });
    }
  }

  // Comentários / lives
  for (const change of collectChanges(entry)) {
    if (change.field !== 'comments' && change.field !== 'live_comments') {
      logger.debug(`[IG Webhook] Campo ${change.field} não tratado`);
      continue;
    }
    const commentId = change.value?.id;
    if (!commentId) continue;
    if (!(await claimEvent(String(commentId)))) {
      logger.debug(`[IG Webhook] Comentário duplicado ignorado: ${commentId}`);
      continue;
    }
    try {
      await CommentAutomationService.handleCommentEvent({
        connection,
        value: change.value,
        field: change.field,
        receivedAt,
      });
    } catch (error) {
      await releaseEvent(String(commentId));
      errors.push(error);
      logger.error('[IG Webhook] Erro ao processar comentário', {
        connectionId: connection.id,
        commentId,
        error: (error as any)?.message || error,
      });
    }
  }

  if (errors.length > 0) {
    // Faz o BullMQ tentar de novo; eventos já processados estão protegidos pelo dedupe
    throw errors[0];
  }
}
