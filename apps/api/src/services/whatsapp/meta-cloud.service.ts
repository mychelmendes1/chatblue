import { WhatsAppConnection } from '@prisma/client';
import { logger } from '../../config/logger.js';

const META_API_URL = 'https://graph.facebook.com/v18.0';

export class MetaCloudService {
  private connection: WhatsAppConnection;

  constructor(connection: WhatsAppConnection) {
    this.connection = connection;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${META_API_URL}/${this.connection.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${this.connection.accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('Meta Cloud connection test failed:', error);
      return false;
    }
  }

  async sendTextMessage(
    to: string,
    content: string
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: content },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send message failed:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    mediaType: string,
    caption?: string
  ): Promise<{ messageId: string }> {
    const typeMap: Record<string, string> = {
      IMAGE: 'image',
      VIDEO: 'video',
      AUDIO: 'audio',
      DOCUMENT: 'document',
    };

    const type = typeMap[mediaType] || 'document';

    const mediaObject: any = { link: mediaUrl };
    if (caption && type !== 'audio') {
      mediaObject.caption = caption;
    }

    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type,
          [type]: mediaObject,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send media failed:', data);
      throw new Error(data.error?.message || 'Failed to send media');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: any[]
  ): Promise<{ messageId: string }> {
    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send template failed:', data);
      throw new Error(data.error?.message || 'Failed to send template');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    const response = await fetch(`${META_API_URL}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${this.connection.accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Failed to get media URL');
    }

    return data.url;
  }
}
