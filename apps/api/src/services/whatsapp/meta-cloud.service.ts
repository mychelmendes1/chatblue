import { WhatsAppConnection } from '@prisma/client';
import { logger } from '../../config/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const META_API_URL = 'https://graph.facebook.com/v18.0';

// Get the uploads directory path
const getUploadsDir = () => {
  const possiblePaths = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'apps', 'api', 'uploads'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  // Create default path if none exists
  const defaultPath = possiblePaths[0];
  fs.mkdirSync(defaultPath, { recursive: true });
  return defaultPath;
};

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

  /**
   * Send a text message
   */
  async sendTextMessage(
    to: string,
    content: string,
    options?: {
      quotedMessageId?: string;
      previewUrl?: boolean;
    }
  ): Promise<{ messageId: string }> {
    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { 
        body: content,
        preview_url: options?.previewUrl ?? true,
      },
    };

    // Add reply context if quoting a message
    if (options?.quotedMessageId) {
      body.context = {
        message_id: options.quotedMessageId,
      };
    }

    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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

  /**
   * Get media URL from Meta (temporary URL)
   */
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

  /**
   * Download media from Meta's temporary URL and save locally
   * Meta's media URLs are temporary and require authentication
   */
  async downloadMedia(mediaId: string, filename?: string): Promise<{ localPath: string; mimeType: string }> {
    // First, get the media URL
    const mediaInfoResponse = await fetch(`${META_API_URL}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${this.connection.accessToken}`,
      },
    });

    const mediaInfo = await mediaInfoResponse.json();

    if (!mediaInfoResponse.ok) {
      logger.error('Failed to get media info:', mediaInfo);
      throw new Error('Failed to get media info');
    }

    const mediaUrl = mediaInfo.url;
    const mimeType = mediaInfo.mime_type || 'application/octet-stream';

    // Download the actual media file (requires auth header)
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${this.connection.accessToken}`,
      },
    });

    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media: ${mediaResponse.status}`);
    }

    // Determine file extension from mime type
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'audio/aac': 'aac',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/amr': 'amr',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    };

    const extension = extensionMap[mimeType] || 'bin';
    const finalFilename = filename || `${mediaId}.${extension}`;
    
    // Save to uploads directory
    const uploadsDir = getUploadsDir();
    const mediaDir = path.join(uploadsDir, 'media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const localPath = path.join(mediaDir, finalFilename);
    
    // Get buffer and save
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(localPath, buffer);

    logger.info(`Media downloaded from Meta Cloud: ${localPath}`);

    return { localPath, mimeType };
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(
    to: string,
    messageId: string,
    emoji: string
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
          type: 'reaction',
          reaction: {
            message_id: messageId,
            emoji: emoji, // Use empty string to remove reaction
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send reaction failed:', data);
      throw new Error(data.error?.message || 'Failed to send reaction');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    to: string,
    messageId: string
  ): Promise<{ messageId: string }> {
    return this.sendReaction(to, messageId, ''); // Empty emoji removes reaction
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
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
          status: 'read',
          message_id: messageId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud mark as read failed:', data);
      return false;
    }

    return data.success === true;
  }

  /**
   * Send an interactive message with buttons
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    options?: {
      headerText?: string;
      footerText?: string;
      quotedMessageId?: string;
    }
  ): Promise<{ messageId: string }> {
    const interactive: any = {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.slice(0, 20), // Max 20 chars
          },
        })),
      },
    };

    if (options?.headerText) {
      interactive.header = { type: 'text', text: options.headerText };
    }
    if (options?.footerText) {
      interactive.footer = { text: options.footerText };
    }

    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive,
    };

    if (options?.quotedMessageId) {
      body.context = { message_id: options.quotedMessageId };
    }

    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send button message failed:', data);
      throw new Error(data.error?.message || 'Failed to send button message');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  /**
   * Send an interactive message with a list
   */
  async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    options?: {
      headerText?: string;
      footerText?: string;
      quotedMessageId?: string;
    }
  ): Promise<{ messageId: string }> {
    const interactive: any = {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonText.slice(0, 20), // Max 20 chars
        sections: sections.slice(0, 10).map((section) => ({
          title: section.title.slice(0, 24), // Max 24 chars
          rows: section.rows.slice(0, 10).map((row) => ({
            id: row.id.slice(0, 200), // Max 200 chars
            title: row.title.slice(0, 24), // Max 24 chars
            description: row.description?.slice(0, 72), // Max 72 chars
          })),
        })),
      },
    };

    if (options?.headerText) {
      interactive.header = { type: 'text', text: options.headerText };
    }
    if (options?.footerText) {
      interactive.footer = { text: options.footerText };
    }

    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive,
    };

    if (options?.quotedMessageId) {
      body.context = { message_id: options.quotedMessageId };
    }

    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send list message failed:', data);
      throw new Error(data.error?.message || 'Failed to send list message');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  /**
   * Send a location message
   */
  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    options?: {
      name?: string;
      address?: string;
      quotedMessageId?: string;
    }
  ): Promise<{ messageId: string }> {
    const location: any = {
      latitude,
      longitude,
    };

    if (options?.name) location.name = options.name;
    if (options?.address) location.address = options.address;

    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'location',
      location,
    };

    if (options?.quotedMessageId) {
      body.context = { message_id: options.quotedMessageId };
    }

    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send location failed:', data);
      throw new Error(data.error?.message || 'Failed to send location');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  /**
   * Send a contact card
   */
  async sendContact(
    to: string,
    contacts: Array<{
      name: { formatted_name: string; first_name?: string; last_name?: string };
      phones?: Array<{ phone: string; type?: string }>;
      emails?: Array<{ email: string; type?: string }>;
    }>,
    quotedMessageId?: string
  ): Promise<{ messageId: string }> {
    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'contacts',
      contacts,
    };

    if (quotedMessageId) {
      body.context = { message_id: quotedMessageId };
    }

    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send contact failed:', data);
      throw new Error(data.error?.message || 'Failed to send contact');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  /**
   * Upload media to Meta's servers for sending
   */
  async uploadMedia(
    filePath: string,
    mimeType: string
  ): Promise<{ mediaId: string }> {
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    // Create form data
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);

    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud upload media failed:', data);
      throw new Error(data.error?.message || 'Failed to upload media');
    }

    return { mediaId: data.id };
  }

  /**
   * Send media using a pre-uploaded media ID
   */
  async sendMediaById(
    to: string,
    mediaId: string,
    mediaType: string,
    options?: {
      caption?: string;
      filename?: string;
      quotedMessageId?: string;
    }
  ): Promise<{ messageId: string }> {
    const typeMap: Record<string, string> = {
      IMAGE: 'image',
      VIDEO: 'video',
      AUDIO: 'audio',
      DOCUMENT: 'document',
      STICKER: 'sticker',
    };

    const type = typeMap[mediaType] || 'document';

    const mediaObject: any = { id: mediaId };
    if (options?.caption && type !== 'audio' && type !== 'sticker') {
      mediaObject.caption = options.caption;
    }
    if (options?.filename && type === 'document') {
      mediaObject.filename = options.filename;
    }

    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type,
      [type]: mediaObject,
    };

    if (options?.quotedMessageId) {
      body.context = { message_id: options.quotedMessageId };
    }

    const response = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Meta Cloud send media by ID failed:', data);
      throw new Error(data.error?.message || 'Failed to send media');
    }

    return { messageId: data.messages?.[0]?.id || '' };
  }

  /**
   * Get list of message templates
   */
  async getTemplates(): Promise<any[]> {
    // Get business account ID first
    const phoneResponse = await fetch(
      `${META_API_URL}/${this.connection.phoneNumberId}`,
      {
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
        },
      }
    );

    const phoneData = await phoneResponse.json();
    if (!phoneResponse.ok) {
      throw new Error('Failed to get phone number info');
    }

    const wabaId = phoneData.verified_name ? 
      await this.getWABAId() : null;

    if (!wabaId) {
      logger.warn('Could not determine WABA ID for template listing');
      return [];
    }

    const response = await fetch(
      `${META_API_URL}/${wabaId}/message_templates`,
      {
        headers: {
          Authorization: `Bearer ${this.connection.accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Failed to get templates:', data);
      return [];
    }

    return data.data || [];
  }

  /**
   * Get WhatsApp Business Account ID
   */
  private async getWABAId(): Promise<string | null> {
    try {
      const response = await fetch(
        `${META_API_URL}/${this.connection.phoneNumberId}?fields=id,verified_name,code_verification_status,display_phone_number,quality_rating,platform_type,throughput,webhook_configuration`,
        {
          headers: {
            Authorization: `Bearer ${this.connection.accessToken}`,
          },
        }
      );

      const data = await response.json();
      
      // The WABA ID might need to be retrieved differently depending on account setup
      // For now, we'll try to extract it from the account info
      if (data.id) {
        // Try to get the WABA ID from the phone number's parent
        const wabaResponse = await fetch(
          `${META_API_URL}/${this.connection.phoneNumberId}?fields=whatsapp_business_account`,
          {
            headers: {
              Authorization: `Bearer ${this.connection.accessToken}`,
            },
          }
        );
        
        const wabaData = await wabaResponse.json();
        return wabaData.whatsapp_business_account?.id || null;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get WABA ID:', error);
      return null;
    }
  }

  /**
   * Check if the 24-hour messaging window is open for a contact
   * Note: This is a heuristic based on the last message received
   */
  async checkMessagingWindow(contactPhone: string): Promise<{
    isOpen: boolean;
    expiresAt?: Date;
  }> {
    // The Meta API doesn't provide a direct way to check the window
    // This would need to be tracked locally based on incoming messages
    // For now, return a placeholder that indicates we need template messages
    return {
      isOpen: false, // Conservative approach - assume window is closed
      expiresAt: undefined,
    };
  }
}
