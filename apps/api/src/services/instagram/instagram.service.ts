import { WhatsAppConnection } from '@prisma/client';
import { logger } from '../../config/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { getUploadsDir } from '../../utils/uploads-dir.util.js';
import { decryptSecret } from '../../utils/crypto.util.js';
import { buildMetaError, getInstagramGraphVersion } from './instagram-oauth.service.js';

/** Limite de texto de uma mensagem no Instagram Direct (bytes UTF-8) */
export const INSTAGRAM_TEXT_MAX_BYTES = 1000;

export interface InstagramSendOptions {
  /** Tag HUMAN_AGENT: estende a janela para 7 dias (somente atendente humano) */
  tag?: 'HUMAN_AGENT';
  /** Responder a uma mensagem específica (mid) */
  replyToMid?: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

const MEDIA_FIELDS = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp';

/**
 * Divide um texto em pedaços de até `maxBytes` bytes UTF-8, preferindo quebrar
 * em quebra de linha/espaço e nunca cortando um caractere no meio.
 */
export function splitTextByBytes(text: string, maxBytes = INSTAGRAM_TEXT_MAX_BYTES): string[] {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return [text];

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    if (Buffer.byteLength(rest, 'utf8') <= maxBytes) {
      chunks.push(rest);
      break;
    }
    // Maior prefixo (por code point) que cabe em maxBytes
    let bytes = 0;
    let cut = 0;
    for (const ch of rest) {
      const b = Buffer.byteLength(ch, 'utf8');
      if (bytes + b > maxBytes) break;
      bytes += b;
      cut += ch.length;
    }
    let piece = rest.slice(0, cut);
    // Tenta quebrar em fronteira natural se não perder mais da metade do pedaço
    const breakAt = Math.max(piece.lastIndexOf('\n'), piece.lastIndexOf(' '));
    if (breakAt > cut / 2) {
      piece = rest.slice(0, breakAt);
      rest = rest.slice(breakAt + 1);
    } else {
      rest = rest.slice(cut);
    }
    if (piece.trim().length > 0) chunks.push(piece);
  }
  return chunks;
}

export class InstagramService {
  private connection: WhatsAppConnection;

  constructor(connection: WhatsAppConnection) {
    this.connection = connection;
  }

  // ============================================
  // Infra
  // ============================================

  /** Conexões manuais antigas (Página do Facebook) podem continuar no graph.facebook.com */
  private get usesFacebookGraph(): boolean {
    return (
      this.connection.authMethod !== 'oauth' &&
      process.env.INSTAGRAM_LEGACY_FACEBOOK_GRAPH === 'true'
    );
  }

  private get baseUrl(): string {
    const version = getInstagramGraphVersion();
    return this.usesFacebookGraph
      ? `https://graph.facebook.com/${version}`
      : `https://graph.instagram.com/${version}`;
  }

  private get token(): string {
    return decryptSecret(this.connection.accessToken) || '';
  }

  /** ID da conta usado nos endpoints `/{ig-id}/...` */
  private get igId(): string {
    return this.connection.instagramAccountId || 'me';
  }

  /**
   * Chamada genérica à Graph API. Lança Error com a mensagem da Meta e `err.meta`
   * ({ code, error_subcode, type, fbtrace_id }).
   */
  private async request<T = any>(
    method: 'GET' | 'POST' | 'DELETE',
    apiPath: string,
    options: { query?: Record<string, string | number | boolean | undefined>; body?: any; logLabel?: string } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/${apiPath.replace(/^\//, '')}`);
    for (const [k, v] of Object.entries(options.query || {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), { method, headers, body });
    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok || data?.error) {
      const err = buildMetaError(data, `Instagram API error (${response.status})`, response.status);
      logger.error(`Instagram ${options.logLabel || apiPath} failed:`, {
        status: response.status,
        error: data?.error || data,
        connectionId: this.connection.id,
      });
      throw err;
    }

    return data as T;
  }

  private async postMessage(
    payload: Record<string, any>,
    options: InstagramSendOptions = {},
    logLabel = 'send message'
  ): Promise<{ messageId: string; recipientId?: string }> {
    const body: Record<string, any> = { ...payload };
    if (options.tag === 'HUMAN_AGENT') {
      body.messaging_type = 'MESSAGE_TAG';
      body.tag = 'HUMAN_AGENT';
    }
    if (options.replyToMid) {
      body.reply_to = { mid: options.replyToMid };
    }
    const data = await this.request<any>('POST', `${this.igId}/messages`, { body, logLabel });
    return { messageId: data.message_id || '', recipientId: data.recipient_id };
  }

  private async sendAttachment(
    recipientId: string,
    type: 'image' | 'video' | 'audio' | 'file',
    url: string,
    options: { tag?: 'HUMAN_AGENT' } = {}
  ): Promise<{ messageId: string }> {
    const { messageId } = await this.postMessage(
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type,
            payload: { url, is_reusable: true },
          },
        },
      },
      options,
      `send ${type}`
    );
    return { messageId };
  }

  // ============================================
  // Conta
  // ============================================

  /**
   * Test connection to Instagram API.
   * Returns { valid: true } on success, or { valid: false, error: '...' } with the Meta API error message.
   */
  async testConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      const target = this.usesFacebookGraph ? this.igId : 'me';
      await this.request('GET', target, {
        query: { fields: this.usesFacebookGraph ? 'id,username,name' : 'id,user_id,username' },
        logLabel: 'testConnection',
      });
      logger.info('[Instagram] testConnection → OK');
      return { valid: true };
    } catch (error: any) {
      const message = error?.message || String(error);
      if (error?.meta) {
        return { valid: false, error: `Meta API (${error.status || error.meta.code || '?'}): ${message}` };
      }
      logger.error('Instagram connection test exception:', { message });
      return { valid: false, error: `Erro de rede: ${message}` };
    }
  }

  /**
   * Get Instagram account info
   */
  async getAccountInfo(): Promise<{
    id: string;
    username: string;
    name: string;
    profilePictureUrl?: string;
  } | null> {
    try {
      const target = this.usesFacebookGraph ? this.igId : 'me';
      const data = await this.request<any>('GET', target, {
        query: { fields: 'id,username,name,profile_picture_url' },
        logLabel: 'getAccountInfo',
      });
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        profilePictureUrl: data.profile_picture_url,
      };
    } catch (error) {
      logger.error('Failed to get Instagram account info:', error);
      return null;
    }
  }

  // ============================================
  // Mensagens (Direct)
  // ============================================

  /**
   * Send a text message via Instagram DM.
   * Textos acima de 1000 bytes são quebrados em envios sequenciais; retorna o último messageId.
   */
  async sendTextMessage(
    recipientId: string,
    content: string,
    options: InstagramSendOptions = {}
  ): Promise<{ messageId: string }> {
    const parts = splitTextByBytes(content || '');
    let lastId = '';
    for (let i = 0; i < parts.length; i++) {
      const { messageId } = await this.postMessage(
        {
          recipient: { id: recipientId },
          message: { text: parts[i] },
        },
        // reply_to apenas na primeira parte
        { tag: options.tag, replyToMid: i === 0 ? options.replyToMid : undefined },
        'send message'
      );
      lastId = messageId;
    }
    return { messageId: lastId };
  }

  /**
   * Send an image message via Instagram DM
   */
  async sendImageMessage(
    recipientId: string,
    imageUrl: string,
    options: { tag?: 'HUMAN_AGENT' } = {}
  ): Promise<{ messageId: string }> {
    return this.sendAttachment(recipientId, 'image', imageUrl, options);
  }

  /**
   * Send a video message via Instagram DM
   */
  async sendVideoMessage(
    recipientId: string,
    videoUrl: string,
    options: { tag?: 'HUMAN_AGENT' } = {}
  ): Promise<{ messageId: string }> {
    return this.sendAttachment(recipientId, 'video', videoUrl, options);
  }

  /**
   * Send an audio message via Instagram DM
   */
  async sendAudioMessage(
    recipientId: string,
    audioUrl: string,
    options: { tag?: 'HUMAN_AGENT' } = {}
  ): Promise<{ messageId: string }> {
    return this.sendAttachment(recipientId, 'audio', audioUrl, options);
  }

  /**
   * Send a file/document message via Instagram DM
   */
  async sendFileMessage(
    recipientId: string,
    fileUrl: string,
    options: { tag?: 'HUMAN_AGENT' } = {}
  ): Promise<{ messageId: string }> {
    return this.sendAttachment(recipientId, 'file', fileUrl, options);
  }

  /**
   * Send a media message (routes to appropriate method based on type)
   */
  async sendMediaMessage(
    recipientId: string,
    mediaUrl: string,
    mediaType: string,
    options: { tag?: 'HUMAN_AGENT' } = {}
  ): Promise<{ messageId: string }> {
    switch (mediaType.toUpperCase()) {
      case 'IMAGE':
        return this.sendImageMessage(recipientId, mediaUrl, options);
      case 'VIDEO':
        return this.sendVideoMessage(recipientId, mediaUrl, options);
      case 'AUDIO':
        return this.sendAudioMessage(recipientId, mediaUrl, options);
      case 'DOCUMENT':
      default:
        return this.sendFileMessage(recipientId, mediaUrl, options);
    }
  }

  /**
   * Send a sticker via Instagram DM
   */
  async sendSticker(
    recipientId: string,
    _stickerId: string
  ): Promise<{ messageId: string }> {
    const { messageId } = await this.postMessage(
      {
        recipient: { id: recipientId },
        message: { attachment: { type: 'like_heart' } }, // Instagram heart sticker
      },
      {},
      'send sticker'
    );
    return { messageId };
  }

  /**
   * Send a heart/like reaction
   */
  async sendHeartReaction(recipientId: string): Promise<{ messageId: string }> {
    const { messageId } = await this.postMessage(
      {
        recipient: { id: recipientId },
        message: { attachment: { type: 'like_heart' } },
      },
      {},
      'send heart'
    );
    return { messageId };
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(
    recipientId: string,
    messageId: string,
    emoji: string
  ): Promise<{ success: boolean }> {
    try {
      await this.postMessage(
        {
          recipient: { id: recipientId },
          sender_action: 'react',
          payload: {
            message_id: messageId,
            reaction: emoji || 'love', // Default to love reaction
          },
        },
        {},
        'send reaction'
      );
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    recipientId: string,
    messageId: string
  ): Promise<{ success: boolean }> {
    try {
      await this.postMessage(
        {
          recipient: { id: recipientId },
          sender_action: 'unreact',
          payload: { message_id: messageId },
        },
        {},
        'remove reaction'
      );
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Get user profile from Instagram (IGSID)
   */
  async getUserProfile(igsid: string): Promise<{
    id: string;
    username?: string;
    name?: string;
    profilePic?: string;
    followerCount?: number;
    isUserFollowBusiness?: boolean;
    isBusinessFollowUser?: boolean;
    isVerifiedUser?: boolean;
  } | null> {
    try {
      const data = await this.request<any>('GET', igsid, {
        query: {
          fields:
            'name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user,is_verified_user',
        },
        logLabel: 'getUserProfile',
      });
      return {
        id: data.id || igsid,
        username: data.username,
        name: data.name,
        profilePic: data.profile_pic,
        followerCount: data.follower_count,
        isUserFollowBusiness: data.is_user_follow_business,
        isBusinessFollowUser: data.is_business_follow_user,
        isVerifiedUser: data.is_verified_user,
      };
    } catch (error) {
      logger.warn('Failed to get Instagram user profile:', { igsid, error: (error as any)?.message });
      return null;
    }
  }

  /**
   * Download media from Instagram
   */
  async downloadMedia(
    mediaUrl: string,
    filename?: string
  ): Promise<{ localPath: string; mimeType: string }> {
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Determine file extension from mime type
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
    };

    const extension = extensionMap[contentType.split(';')[0].trim()] || 'bin';
    const finalFilename = filename || `instagram_${Date.now()}.${extension}`;

    // Save to uploads directory
    const uploadsDir = getUploadsDir();
    const mediaDir = path.join(uploadsDir, 'media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const localPath = path.join(mediaDir, finalFilename);

    // Get buffer and save
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(localPath, buffer);

    logger.info(`Instagram media downloaded: ${localPath}`);

    return { localPath, mimeType: contentType };
  }

  /**
   * Mark a message as seen
   */
  async markAsSeen(senderId: string): Promise<boolean> {
    try {
      await this.postMessage({ recipient: { id: senderId }, sender_action: 'mark_seen' }, {}, 'mark_seen');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(recipientId: string, isTyping: boolean): Promise<boolean> {
    try {
      await this.postMessage(
        { recipient: { id: recipientId }, sender_action: isTyping ? 'typing_on' : 'typing_off' },
        {},
        'typing indicator'
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send an Ice Breaker message (predefined quick replies for conversation starters)
   */
  async sendIceBreaker(
    recipientId: string,
    text: string,
    quickReplies: Array<{ title: string; payload: string }>
  ): Promise<{ messageId: string }> {
    const { messageId } = await this.postMessage(
      {
        recipient: { id: recipientId },
        message: {
          text,
          quick_replies: quickReplies.slice(0, 13).map((qr) => ({
            content_type: 'text',
            title: qr.title.slice(0, 20),
            payload: qr.payload,
          })),
        },
      },
      {},
      'send ice breaker'
    );
    return { messageId };
  }

  /**
   * Send a generic template (carousel)
   */
  async sendGenericTemplate(
    recipientId: string,
    elements: Array<{
      title: string;
      subtitle?: string;
      imageUrl?: string;
      defaultAction?: { type: string; url: string };
      buttons?: Array<{ type: string; title: string; url?: string; payload?: string }>;
    }>
  ): Promise<{ messageId: string }> {
    const { messageId } = await this.postMessage(
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: elements.slice(0, 10).map((el) => ({
                title: el.title,
                subtitle: el.subtitle,
                image_url: el.imageUrl,
                default_action: el.defaultAction
                  ? { type: el.defaultAction.type, url: el.defaultAction.url }
                  : undefined,
                buttons: el.buttons?.slice(0, 3).map((btn) => ({
                  type: btn.type,
                  title: btn.title,
                  url: btn.url,
                  payload: btn.payload,
                })),
              })),
            },
          },
        },
      },
      {},
      'send generic template'
    );
    return { messageId };
  }

  /**
   * Send a product template
   */
  async sendProductTemplate(
    recipientId: string,
    productId: string
  ): Promise<{ messageId: string }> {
    const { messageId } = await this.postMessage(
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: { template_type: 'product', product_id: productId },
          },
        },
      },
      {},
      'send product template'
    );
    return { messageId };
  }

  // ============================================
  // Comentários
  // ============================================

  /**
   * Resposta pública a um comentário (POST /{comment-id}/replies)
   */
  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    const data = await this.request<any>('POST', `${commentId}/replies`, {
      body: { message },
      logLabel: 'replyToComment',
    });
    return { id: data.id || '' };
  }

  /**
   * Private reply: DM a partir de um comentário (1 por comentário, até 7 dias).
   * POST /{ig-id}/messages com recipient: { comment_id }
   */
  async sendPrivateReply(
    commentId: string,
    message: { text: string } | { attachment: any }
  ): Promise<{ messageId: string; recipientId?: string }> {
    return this.postMessage(
      {
        recipient: { comment_id: commentId },
        message,
      },
      {},
      'sendPrivateReply'
    );
  }

  /**
   * Oculta/mostra um comentário (POST /{comment-id}?hide=true|false)
   */
  async hideComment(commentId: string, hide: boolean): Promise<{ success: boolean }> {
    const data = await this.request<any>('POST', commentId, {
      query: { hide: hide ? 'true' : 'false' },
      logLabel: 'hideComment',
    });
    return { success: data?.success !== false };
  }

  // ============================================
  // Mídia (posts/reels)
  // ============================================

  async getMedia(mediaId: string): Promise<InstagramMedia> {
    return this.request<InstagramMedia>('GET', mediaId, {
      query: { fields: MEDIA_FIELDS },
      logLabel: 'getMedia',
    });
  }

  async listMedia(
    limit = 25,
    after?: string
  ): Promise<{ data: InstagramMedia[]; paging?: { cursors?: { before?: string; after?: string }; next?: string } }> {
    const data = await this.request<any>('GET', `${this.igId}/media`, {
      query: { fields: MEDIA_FIELDS, limit, after },
      logLabel: 'listMedia',
    });
    return { data: data.data || [], paging: data.paging };
  }
}
