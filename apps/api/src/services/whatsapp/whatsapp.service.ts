import { WhatsAppConnection } from '@prisma/client';
import { BaileysService } from './baileys.service.js';
import { MetaCloudService } from './meta-cloud.service.js';
import { logger } from '../../config/logger.js';

export class WhatsAppService {
  private connection: WhatsAppConnection;
  private baileysService?: BaileysService;
  private metaService?: MetaCloudService;

  constructor(connection: WhatsAppConnection) {
    this.connection = connection;

    if (connection.type === 'BAILEYS') {
      this.baileysService = BaileysService.getInstance(connection.id);
    } else {
      this.metaService = new MetaCloudService(connection);
    }
  }

  /**
   * Get the connection type
   */
  getConnectionType(): 'BAILEYS' | 'META_CLOUD' {
    return this.connection.type as 'BAILEYS' | 'META_CLOUD';
  }

  /**
   * Send a text message
   */
  async sendMessage(
    to: string,
    content: string,
    options?: {
      quotedMessageId?: string;
    }
  ): Promise<{ messageId: string }> {
    logger.debug(`Formatting phone number: ${to}`);
    const formattedNumber = this.formatPhoneNumber(to);
    logger.debug(`Formatted phone number: ${formattedNumber}`);

    if (this.connection.type === 'BAILEYS') {
      // TODO: Add quoted message support to Baileys if needed
      return this.baileysService!.sendTextMessage(formattedNumber, content);
    } else {
      return this.metaService!.sendTextMessage(formattedNumber, content, {
        quotedMessageId: options?.quotedMessageId,
      });
    }
  }

  /**
   * Send media (image, video, audio, document)
   */
  async sendMedia(
    to: string,
    mediaUrl: string,
    mediaType: string,
    caption?: string,
    options?: {
      quotedMessageId?: string;
    }
  ): Promise<{ messageId: string; finalMediaUrl?: string }> {
    const formattedNumber = this.formatPhoneNumber(to);

    if (this.connection.type === 'BAILEYS') {
      return this.baileysService!.sendMediaMessage(
        formattedNumber,
        mediaUrl,
        mediaType,
        caption
      );
    } else {
      const result = await this.metaService!.sendMediaMessage(
        formattedNumber,
        mediaUrl,
        mediaType,
        caption
      );
      return { ...result, finalMediaUrl: mediaUrl };
    }
  }

  /**
   * Send a template message (Meta Cloud only)
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: any[]
  ): Promise<{ messageId: string }> {
    if (this.connection.type !== 'META_CLOUD') {
      throw new Error('Templates are only available for Meta Cloud API');
    }

    const formattedNumber = this.formatPhoneNumber(to);
    return this.metaService!.sendTemplate(
      formattedNumber,
      templateName,
      languageCode,
      components
    );
  }

  /**
   * Delete a message (Baileys only)
   */
  async deleteMessage(to: string, wamid: string): Promise<void> {
    if (this.connection.type !== 'BAILEYS') {
      throw new Error('Message deletion is only available for Baileys connections');
    }

    const formattedNumber = this.formatPhoneNumber(to);
    return this.baileysService!.deleteMessage(formattedNumber, wamid);
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(
    to: string,
    messageId: string,
    emoji: string
  ): Promise<{ messageId: string }> {
    const formattedNumber = this.formatPhoneNumber(to);

    if (this.connection.type === 'BAILEYS') {
      // Baileys reaction support
      return this.baileysService!.sendReaction(formattedNumber, messageId, emoji);
    } else {
      return this.metaService!.sendReaction(formattedNumber, messageId, emoji);
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    to: string,
    messageId: string
  ): Promise<{ messageId: string }> {
    const formattedNumber = this.formatPhoneNumber(to);

    if (this.connection.type === 'BAILEYS') {
      // Baileys: send empty emoji to remove
      return this.baileysService!.sendReaction(formattedNumber, messageId, '');
    } else {
      return this.metaService!.removeReaction(formattedNumber, messageId);
    }
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    if (this.connection.type === 'BAILEYS') {
      // Baileys marks messages as read automatically or through a different method
      return this.baileysService!.markAsRead(messageId);
    } else {
      return this.metaService!.markAsRead(messageId);
    }
  }

  /**
   * Send an interactive button message (Meta Cloud only)
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
    if (this.connection.type !== 'META_CLOUD') {
      throw new Error('Interactive messages are only available for Meta Cloud API');
    }

    const formattedNumber = this.formatPhoneNumber(to);
    return this.metaService!.sendButtonMessage(
      formattedNumber,
      bodyText,
      buttons,
      options
    );
  }

  /**
   * Send an interactive list message (Meta Cloud only)
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
    if (this.connection.type !== 'META_CLOUD') {
      throw new Error('Interactive messages are only available for Meta Cloud API');
    }

    const formattedNumber = this.formatPhoneNumber(to);
    return this.metaService!.sendListMessage(
      formattedNumber,
      bodyText,
      buttonText,
      sections,
      options
    );
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
    const formattedNumber = this.formatPhoneNumber(to);

    if (this.connection.type === 'BAILEYS') {
      return this.baileysService!.sendLocation(formattedNumber, latitude, longitude, options);
    } else {
      return this.metaService!.sendLocation(formattedNumber, latitude, longitude, options);
    }
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
    const formattedNumber = this.formatPhoneNumber(to);

    if (this.connection.type === 'BAILEYS') {
      return this.baileysService!.sendContact(formattedNumber, contacts);
    } else {
      return this.metaService!.sendContact(formattedNumber, contacts, quotedMessageId);
    }
  }

  /**
   * Download media from a message
   * For Meta Cloud: downloads from temporary URL
   * For Baileys: media is already downloaded locally
   */
  async downloadMedia(
    mediaId: string,
    filename?: string
  ): Promise<{ localPath: string; mimeType: string }> {
    if (this.connection.type === 'BAILEYS') {
      // Baileys already stores media locally
      throw new Error('Baileys media is already stored locally');
    } else {
      return this.metaService!.downloadMedia(mediaId, filename);
    }
  }

  /**
   * Get available templates (Meta Cloud only)
   */
  async getTemplates(): Promise<any[]> {
    if (this.connection.type !== 'META_CLOUD') {
      return [];
    }

    return this.metaService!.getTemplates();
  }

  /**
   * Format phone number to standard format
   */
  private formatPhoneNumber(phone: string): string {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Remove WhatsApp JID suffix if present (@s.whatsapp.net, @lid, etc)
    let cleaned = phone.replace(/@[^@]*$/g, '');
    
    // Remove all non-numeric characters
    cleaned = cleaned.replace(/\D/g, '');

    if (!cleaned || cleaned.length === 0) {
      throw new Error('Invalid phone number format');
    }

    // Only add Brazil country code (55) if:
    // 1. Number has 10-11 digits (Brazilian format without country code)
    // 2. Number doesn't already have a valid country code
    // Numbers with 12+ digits likely already have country code
    if (cleaned.length <= 11 && cleaned.length >= 10) {
      // Likely a Brazilian number without country code
      if (!cleaned.startsWith('55')) {
        cleaned = '55' + cleaned;
      }
    }
    // If number has 12+ digits, assume it already has country code
    // Don't modify it

    return cleaned;
  }
}
