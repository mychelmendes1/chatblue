import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { InstagramService } from './instagram.service.js';

/**
 * Funções compartilhadas de tratamento dos eventos `messaging` do webhook do Instagram.
 * Usadas pelo processador da fila `instagram-webhook`.
 */

export interface ExtractedInstagramMessage {
  type: string;
  content: string;
  mediaUrl?: string;
  quotedMessageId?: string;
  reactionEmoji?: string;
  reactionMessageId?: string;
  storyMention?: {
    id: string;
    url?: string;
  };
  storyReply?: {
    id: string;
    url?: string;
  };
}

/**
 * Extract message content from Instagram webhook message
 */
export async function extractInstagramMessageContent(
  message: any,
  connection: any
): Promise<ExtractedInstagramMessage> {
  let type = 'TEXT';
  let content = '';
  let mediaUrl: string | undefined;
  let quotedMessageId: string | undefined;
  let reactionEmoji: string | undefined;
  let reactionMessageId: string | undefined;
  let storyMention: { id: string; url?: string } | undefined;
  let storyReply: { id: string; url?: string } | undefined;

  // Check if this is a reply
  if (message.reply_to?.mid) {
    quotedMessageId = message.reply_to.mid;
  }

  // Resposta a story (pode vir junto com texto)
  if (message.reply_to?.story) {
    storyReply = {
      id: message.reply_to.story.id,
      url: message.reply_to.story.url,
    };
  }

  // Handle different message types
  if (message.text) {
    type = 'TEXT';
    content = message.text;
  } else if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0];
    const attachmentType = attachment.type;
    const payload = attachment.payload || {};

    switch (attachmentType) {
      case 'image':
        type = 'IMAGE';
        mediaUrl = payload.url;
        break;
      case 'video':
        type = 'VIDEO';
        mediaUrl = payload.url;
        break;
      case 'audio':
        type = 'AUDIO';
        mediaUrl = payload.url;
        break;
      case 'file':
        type = 'DOCUMENT';
        mediaUrl = payload.url;
        break;
      case 'share':
        // Shared post or story
        type = 'TEXT';
        content = payload.url || '[Shared content]';
        break;
      case 'story_mention':
        // User mentioned our account in their story
        type = 'SYSTEM';
        content = '[Story mention]';
        storyMention = {
          id: payload.story_id || payload.id,
          url: payload.url,
        };
        break;
      case 'reel':
        type = 'VIDEO';
        content = '[Reel shared]';
        mediaUrl = payload.url;
        break;
      case 'ig_reel':
        type = 'VIDEO';
        content = payload.title || '[Instagram Reel]';
        mediaUrl = payload.url;
        break;
      default:
        type = 'TEXT';
        content = `[${attachmentType}]`;
    }
  } else if (message.sticker_id) {
    type = 'STICKER';
    content = message.sticker_id.toString();
  } else if (message.reaction) {
    // This is a reaction to a message
    reactionEmoji = message.reaction.emoji;
    reactionMessageId = message.reaction.mid;
  } else if (message.referral?.story) {
    // Reply to a story
    type = 'TEXT';
    content = message.text || '[Story reply]';
    storyReply = {
      id: message.referral.story.id,
      url: message.referral.story.url,
    };
  }

  // Download media if present
  if (mediaUrl && connection) {
    try {
      const instagramService = new InstagramService(connection);
      const { localPath } = await instagramService.downloadMedia(mediaUrl);
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      mediaUrl = `${apiUrl}/uploads/media/${localPath.split('/').pop()}`;
    } catch (error) {
      logger.error('Failed to download Instagram media:', error);
    }
  }

  return {
    type,
    content,
    mediaUrl,
    quotedMessageId,
    reactionEmoji,
    reactionMessageId,
    storyMention,
    storyReply,
  };
}

/**
 * Handle Instagram reaction to a message
 */
export async function handleInstagramReaction(
  messageId: string,
  emoji: string,
  from: string,
  fromMe: boolean,
  connectionId?: string
): Promise<void> {
  try {
    // Find the message
    const message = await prisma.message.findFirst({
      where: { wamid: messageId, ...(connectionId && { connectionId }) },
      include: { ticket: true },
    });

    if (!message) {
      logger.warn(`Message not found for Instagram reaction: ${messageId}`);
      return;
    }

    // Store reaction
    if (emoji) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          reactions: {
            push: {
              emoji,
              from,
              fromMe,
              platform: 'instagram',
              timestamp: new Date().toISOString(),
            },
          },
        },
      });
    } else {
      // Remove reaction
      const currentReactions = (message.reactions as any[]) || [];
      const filteredReactions = currentReactions.filter(
        (r) => !(r.from === from && r.fromMe === fromMe)
      );

      await prisma.message.update({
        where: { id: message.id },
        data: {
          reactions: filteredReactions,
        },
      });
    }

    // Emit socket event
    const io = (global as any).io;
    if (io && message.ticket) {
      io.to(`ticket:${message.ticket.id}`).emit('message:reaction', {
        messageId: message.id,
        wamid: messageId,
        emoji,
        from,
        fromMe,
        platform: 'instagram',
      });
    }

    logger.info(`Instagram reaction ${emoji || '(removed)'} on message ${messageId}`);
  } catch (error) {
    logger.error('Error handling Instagram reaction:', error);
  }
}

/**
 * Extrai dados de referral (anúncio Click-to-Direct, link ig.me etc.) do evento.
 */
export function extractInstagramReferral(event: any):
  | { ref?: string; source?: string; type?: string; ad_id?: string; ads_context_data?: any }
  | undefined {
  const referral = event?.referral || event?.message?.referral || event?.postback?.referral;
  if (!referral || referral.story) {
    // `referral.story` é resposta a story, não anúncio
    if (!referral?.ad_id && !referral?.source) return undefined;
  }
  return {
    ref: referral.ref,
    source: referral.source,
    type: referral.type,
    ad_id: referral.ad_id,
    ads_context_data: referral.ads_context_data,
  };
}
