import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { logger } from '../../config/logger.js';
import { prisma } from '../../config/database.js';
import { EventEmitter } from 'events';

const instances = new Map<string, BaileysService>();

export class BaileysService extends EventEmitter {
  private connectionId: string;
  private socket: WASocket | null = null;
  private qrCode: string | null = null;
  private isConnecting = false;

  private constructor(connectionId: string) {
    super();
    this.connectionId = connectionId;
  }

  static getInstance(connectionId: string): BaileysService {
    if (!instances.has(connectionId)) {
      instances.set(connectionId, new BaileysService(connectionId));
    }
    return instances.get(connectionId)!;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.socket) {
      return;
    }

    this.isConnecting = true;

    try {
      const sessionPath = `./sessions/${this.connectionId}`;
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['ChatBlue', 'Chrome', '1.0.0'],
      });

      // Handle connection events
      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = await QRCode.toDataURL(qr);
          this.emit('qr', this.qrCode);

          await prisma.whatsAppConnection.update({
            where: { id: this.connectionId },
            data: { status: 'CONNECTING', qrCode: this.qrCode },
          });
        }

        if (connection === 'close') {
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;

          if (reason === DisconnectReason.loggedOut) {
            await prisma.whatsAppConnection.update({
              where: { id: this.connectionId },
              data: { status: 'DISCONNECTED', sessionData: null },
            });
            instances.delete(this.connectionId);
          } else if (reason !== DisconnectReason.restartRequired) {
            // Reconnect
            setTimeout(() => this.connect(), 5000);
          }
        }

        if (connection === 'open') {
          this.qrCode = null;
          const phone = this.socket?.user?.id?.split(':')[0];

          await prisma.whatsAppConnection.update({
            where: { id: this.connectionId },
            data: {
              status: 'CONNECTED',
              qrCode: null,
              phone,
              lastConnected: new Date(),
            },
          });

          this.emit('connected', { phone });
          logger.info(`WhatsApp connected: ${this.connectionId}`);
        }
      });

      // Handle credential updates
      this.socket.ev.on('creds.update', saveCreds);

      // Handle incoming messages
      this.socket.ev.on('messages.upsert', async (m) => {
        for (const msg of m.messages) {
          if (!msg.key.fromMe && m.type === 'notify') {
            await this.handleIncomingMessage(msg);
          }
        }
      });

      // Handle message status updates
      this.socket.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
          if (update.update.status) {
            this.emit('message_status', {
              id: update.key.id,
              status: this.mapStatus(update.update.status),
            });
          }
        }
      });
    } catch (error) {
      logger.error('Baileys connection error:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
    }
    instances.delete(this.connectionId);
  }

  async getQRCode(): Promise<string | null> {
    if (!this.socket && !this.isConnecting) {
      await this.connect();
    }
    return this.qrCode;
  }

  async sendTextMessage(
    to: string,
    content: string
  ): Promise<{ messageId: string }> {
    if (!this.socket) {
      throw new Error('WhatsApp not connected');
    }

    const jid = `${to}@s.whatsapp.net`;
    const result = await this.socket.sendMessage(jid, { text: content });

    return { messageId: result?.key?.id || '' };
  }

  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    mediaType: string,
    caption?: string
  ): Promise<{ messageId: string }> {
    if (!this.socket) {
      throw new Error('WhatsApp not connected');
    }

    const jid = `${to}@s.whatsapp.net`;
    let message: any;

    switch (mediaType) {
      case 'IMAGE':
        message = { image: { url: mediaUrl }, caption };
        break;
      case 'VIDEO':
        message = { video: { url: mediaUrl }, caption };
        break;
      case 'AUDIO':
        message = { audio: { url: mediaUrl }, mimetype: 'audio/mp4' };
        break;
      case 'DOCUMENT':
        message = { document: { url: mediaUrl }, caption };
        break;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }

    const result = await this.socket.sendMessage(jid, message);

    return { messageId: result?.key?.id || '' };
  }

  private async handleIncomingMessage(msg: any): Promise<void> {
    try {
      const from = msg.key.remoteJid?.replace('@s.whatsapp.net', '');
      if (!from) return;

      let content = '';
      let type = 'TEXT';
      let mediaUrl = '';

      if (msg.message?.conversation) {
        content = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        content = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage) {
        type = 'IMAGE';
        content = msg.message.imageMessage.caption || '';
        // TODO: Download and store media
      } else if (msg.message?.videoMessage) {
        type = 'VIDEO';
        content = msg.message.videoMessage.caption || '';
      } else if (msg.message?.audioMessage) {
        type = 'AUDIO';
      } else if (msg.message?.documentMessage) {
        type = 'DOCUMENT';
        content = msg.message.documentMessage.fileName || '';
      }

      this.emit('message', {
        id: msg.key.id,
        from,
        type,
        content,
        mediaUrl,
        timestamp: msg.messageTimestamp * 1000,
      });
    } catch (error) {
      logger.error('Error handling incoming message:', error);
    }
  }

  private mapStatus(status: number): string {
    switch (status) {
      case 2:
        return 'SENT';
      case 3:
        return 'DELIVERED';
      case 4:
        return 'READ';
      default:
        return 'PENDING';
    }
  }
}
