import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
// @ts-ignore - Boom types come from Baileys
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { logger } from '../../config/logger.js';
import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

const instances = new Map<string, BaileysService>();

export class BaileysService extends EventEmitter {
  private connectionId: string;
  private socket: WASocket | null = null;
  private qrCode: string | null = null;
  private isConnecting = false;
  private retryCount = 0;
  private maxRetries = 3;

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
    if (this.isConnecting) {
      logger.info(`Already connecting: ${this.connectionId}`);
      return;
    }

    // If already connected, don't reconnect
    if (this.socket) {
      logger.info(`Already has socket: ${this.connectionId}`);
      return;
    }

    this.isConnecting = true;
    this.qrCode = null;

    try {
      const sessionPath = path.resolve(`./sessions/${this.connectionId}`);
      
      // Create sessions directory if it doesn't exist
      if (!fs.existsSync('./sessions')) {
        fs.mkdirSync('./sessions', { recursive: true });
      }
      
      // Check if we have a valid session (creds.json exists)
      const credsPath = path.join(sessionPath, 'creds.json');
      const hasValidSession = fs.existsSync(credsPath);
      
      if (!hasValidSession) {
        // No valid session, start fresh
        logger.info(`No existing session for: ${this.connectionId}`);
      } else {
        logger.info(`Found existing session for: ${this.connectionId}`);
      }
      
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      // Get the latest version
      const { version } = await fetchLatestBaileysVersion();
      logger.info(`Using Baileys version: ${version.join('.')} for: ${this.connectionId}`);

      this.socket = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: true,
        browser: ['ChatBlue', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        defaultQueryTimeoutMs: 60000,
        qrTimeout: 60000,
        connectTimeoutMs: 60000,
      });
      
      logger.info(`Socket created for: ${this.connectionId}`);

      // Handle connection events
      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          logger.info(`QR Code received for: ${this.connectionId}`);
          this.qrCode = await QRCode.toDataURL(qr);
          this.emit('qr', this.qrCode);

          await prisma.whatsAppConnection.update({
            where: { id: this.connectionId },
            data: { status: 'CONNECTING', qrCode: this.qrCode },
          });
          
          logger.info(`QR Code saved to database for: ${this.connectionId}`);
        }

        if (connection === 'close') {
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMessage = (lastDisconnect?.error as Boom)?.message || 'Unknown error';
          logger.info(`WhatsApp connection closed: ${this.connectionId}, reason: ${reason}, message: ${errorMessage}`);

          this.socket = null;
          this.isConnecting = false;

          if (reason === DisconnectReason.loggedOut || reason === 401) {
            // Session was invalidated - clear it and generate new QR
            logger.info(`Session invalidated for: ${this.connectionId}, clearing and reconnecting...`);
            const sessionPath = path.resolve(`./sessions/${this.connectionId}`);
            if (fs.existsSync(sessionPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            await prisma.whatsAppConnection.update({
              where: { id: this.connectionId },
              data: { status: 'DISCONNECTED', sessionData: Prisma.DbNull, qrCode: null },
            });
            instances.delete(this.connectionId);
            // Auto-reconnect to generate new QR code
            setTimeout(() => {
              const newInstance = BaileysService.getInstance(this.connectionId);
              newInstance.connect();
            }, 2000);
          } else if (reason === 405 || reason === DisconnectReason.connectionReplaced) {
            // Error 405 means we should retry with delay
            this.retryCount++;
            if (this.retryCount <= this.maxRetries) {
              const delay = Math.min(5000 * Math.pow(2, this.retryCount - 1), 30000);
              logger.warn(`Got 405 error (attempt ${this.retryCount}/${this.maxRetries}), retrying in ${delay}ms: ${this.connectionId}`);
              
              // Clear the session for a fresh start
              const sessionPath = path.resolve(`./sessions/${this.connectionId}`);
              if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
              }
              
              setTimeout(() => this.connect(), delay);
            } else {
              logger.error(`Max retries reached for: ${this.connectionId}`);
              this.retryCount = 0;
              await prisma.whatsAppConnection.update({
                where: { id: this.connectionId },
                data: { status: 'DISCONNECTED', qrCode: null },
              });
              this.emit('connection_error', 'Erro de conexão. O WhatsApp pode estar temporariamente indisponível. Aguarde alguns minutos e tente novamente.');
            }
          } else if (reason === DisconnectReason.restartRequired || reason === 515) {
            // Restart required after pairing - reconnect immediately
            logger.info(`Restart required for: ${this.connectionId}, reconnecting...`);
            setTimeout(() => this.connect(), 1000);
          } else if (reason === DisconnectReason.connectionClosed || 
                     reason === DisconnectReason.connectionLost ||
                     reason === DisconnectReason.timedOut) {
            // Reconnect after a delay
            logger.info(`Reconnecting WhatsApp: ${this.connectionId}`);
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
    // Try to get from memory first
    if (this.qrCode) {
      return this.qrCode;
    }
    
    // Try to get from database
    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: this.connectionId },
      select: { qrCode: true },
    });
    
    if (connection?.qrCode) {
      return connection.qrCode;
    }
    
    return null;
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
