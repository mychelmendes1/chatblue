import { WhatsAppConnection } from '@prisma/client';
import { BaileysService } from './baileys.service.js';
import { MetaCloudService } from './meta-cloud.service.js';

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

  async sendMessage(
    to: string,
    content: string,
    type: string = 'TEXT'
  ): Promise<{ messageId: string }> {
    const formattedNumber = this.formatPhoneNumber(to);

    if (this.connection.type === 'BAILEYS') {
      return this.baileysService!.sendTextMessage(formattedNumber, content);
    } else {
      return this.metaService!.sendTextMessage(formattedNumber, content);
    }
  }

  async sendMedia(
    to: string,
    mediaUrl: string,
    mediaType: string,
    caption?: string
  ): Promise<{ messageId: string }> {
    const formattedNumber = this.formatPhoneNumber(to);

    if (this.connection.type === 'BAILEYS') {
      return this.baileysService!.sendMediaMessage(
        formattedNumber,
        mediaUrl,
        mediaType,
        caption
      );
    } else {
      return this.metaService!.sendMediaMessage(
        formattedNumber,
        mediaUrl,
        mediaType,
        caption
      );
    }
  }

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

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if not present
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }
}
