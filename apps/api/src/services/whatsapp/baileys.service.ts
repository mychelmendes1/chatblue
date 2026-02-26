// Lazy-loaded to avoid ESM/require crash in Docker (ERR_REQUIRE_ESM)
import type { WASocket, BaileysEventMap } from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';

let _baileys: typeof import('@whiskeysockets/baileys') | null = null;
async function getBaileys(): Promise<typeof import('@whiskeysockets/baileys')> {
  if (!_baileys) _baileys = await import('@whiskeysockets/baileys');
  return _baileys;
}
import { logger } from '../../config/logger.js';
import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { MessageProcessor } from '../message-processor.service.js';
import { normalizeMediaUrl } from '../../utils/media-url.util.js';
import { getUploadsDir } from '../../utils/uploads-dir.util.js';
import { emailService } from '../email/email.service.js';

const instances = new Map<string, BaileysService>();

// Cached WhatsApp version — fetched once at startup and refreshed every 6h to avoid 405 errors.
// Fallback to a recent known-good version if fetch fails.
const FALLBACK_WHATSAPP_VERSION: [number, number, number] = [2, 3000, 1034030014];
let _cachedWAVersion: [number, number, number] | null = null;
let _versionFetchedAt = 0;
const VERSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function getWhatsAppVersion(): Promise<[number, number, number]> {
  const now = Date.now();
  if (_cachedWAVersion && (now - _versionFetchedAt) < VERSION_TTL_MS) {
    return _cachedWAVersion;
  }
  try {
    const baileys = await getBaileys();
    const b = baileys as any;
    const fetchVersion = b.fetchLatestWaWebVersion ?? b.fetchWAWebVersion ?? b.fetchLatestBaileysVersion;
    if (typeof fetchVersion !== 'function') {
      throw new Error('No version fetch function found');
    }
    const result = await fetchVersion();
    const version = result?.version;
    if (!version || !Array.isArray(version)) {
      throw new Error('Invalid version result');
    }
    _cachedWAVersion = version as [number, number, number];
    _versionFetchedAt = now;
    logger.info(`Fetched WhatsApp version: ${version.join('.')}, isLatest: ${result?.isLatest ?? '?'}`);
    return _cachedWAVersion;
  } catch (error: any) {
    logger.warn(`Failed to fetch WhatsApp version, using fallback: ${error?.message}`);
    if (_cachedWAVersion) return _cachedWAVersion;
    return FALLBACK_WHATSAPP_VERSION;
  }
}

// Get the sessions directory path
// When PM2 runs with cwd = apps/api, process.cwd() is already apps/api,
// so we must NOT prepend apps/api again.
const getSessionsDir = () => {
  const cwd = process.cwd();
  const cwdEndsWithApi = cwd.endsWith(path.join('apps', 'api'));

  const possiblePaths = cwdEndsWithApi
    ? [
        path.join(cwd, 'sessions'),
        path.resolve('./sessions'),
      ]
    : [
        path.join(cwd, 'apps', 'api', 'sessions'),
        path.join(cwd, 'sessions'),
        path.resolve('./sessions'),
      ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  const defaultPath = possiblePaths[0];
  if (!fs.existsSync(defaultPath)) {
    fs.mkdirSync(defaultPath, { recursive: true });
  }
  return defaultPath;
};

export class BaileysService extends EventEmitter {
  private connectionId: string;
  private socket: WASocket | null = null;
  private qrCode: string | null = null;
  private isConnecting = false;
  private isConnected = false;
  private isDeleted = false; // Flag to track if connection was deleted
  private retryCount = 0;
  private maxRetries = 3;
  private conflictCount = 0;
  private maxConflicts = 5;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;
  private connectionReject: ((error: Error) => void) | null = null;
  
  // LID to Phone mapping cache
  private lidMapping: Map<string, string> = new Map();

  private constructor(connectionId: string) {
    super();
    this.connectionId = connectionId;
  }

  static getInstance(connectionId: string): BaileysService {
    const existing = instances.get(connectionId);
    
    // If instance exists but is marked as deleted, remove it and create new one
    if (existing && existing.isDeleted) {
      logger.info(`Removing deleted instance for: ${connectionId}`);
      instances.delete(connectionId);
    }
    
    if (!instances.has(connectionId)) {
      instances.set(connectionId, new BaileysService(connectionId));
    }
    return instances.get(connectionId)!;
  }
  
  // Get an existing instance without creating new one
  static getExistingInstance(connectionId: string): BaileysService | null {
    const instance = instances.get(connectionId);
    if (instance && instance.isDeleted) {
      instances.delete(connectionId);
      return null;
    }
    return instance || null;
  }

  // Mark this connection as deleted to prevent further operations
  markAsDeleted(): void {
    logger.info(`Marking connection as deleted: ${this.connectionId}`);
    this.isDeleted = true;
    // Note: Don't remove from instances yet - let disconnect() handle that
    // This allows disconnect() to still find the instance and clean up properly
  }

  // Send disconnection alert email
  private async sendDisconnectionAlert(reason?: string): Promise<void> {
    try {
      // Get connection details
      const connection = await prisma.whatsAppConnection.findUnique({
        where: { id: this.connectionId },
        include: {
          company: { select: { name: true } },
        },
      });

      if (!connection || this.isDeleted) {
        return;
      }

      const recipients = emailService.getAlertRecipients();
      if (recipients.length === 0) {
        logger.warn("No alert recipients configured for disconnection email");
        return;
      }

      const frontendUrl = process.env.FRONTEND_URL || "https://app.chatblue.com.br";
      const disconnectedAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

      await emailService.sendConnectionDown(recipients, {
        connectionName: connection.name,
        companyName: connection.company?.name || "Empresa não identificada",
        connectionsUrl: `${frontendUrl}/connections`,
        disconnectReason: reason,
        disconnectedAt,
      });

      logger.info(`Disconnection alert sent for connection: ${this.connectionId}`);
    } catch (error) {
      logger.error(`Failed to send disconnection alert: ${this.connectionId}`, error);
    }
  }

  // Safe database update that checks if connection still exists
  private async safeUpdateConnection(data: any): Promise<boolean> {
    if (this.isDeleted) {
      logger.debug(`Skipping update for deleted connection: ${this.connectionId}`);
      return false;
    }

    try {
      // Check if connection exists first
      const exists = await prisma.whatsAppConnection.findUnique({
        where: { id: this.connectionId },
        select: { id: true },
      });

      if (!exists) {
        logger.debug(`Connection no longer exists: ${this.connectionId}`);
        this.isDeleted = true;
        instances.delete(this.connectionId);
        return false;
      }

      await prisma.whatsAppConnection.update({
        where: { id: this.connectionId },
        data,
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found - connection was deleted
        logger.debug(`Connection was deleted: ${this.connectionId}`);
        this.isDeleted = true;
        instances.delete(this.connectionId);
        return false;
      }
      logger.error(`Error updating connection ${this.connectionId}:`, error);
      return false;
    }
  }

  async connect(): Promise<void> {
    // Check if connection was marked as deleted - don't reconnect
    if (this.isDeleted) {
      logger.info(`Connection ${this.connectionId} is marked as deleted, not connecting`);
      return;
    }
    
    if (this.isConnecting) {
      logger.info(`Already connecting: ${this.connectionId}`);
      // Return existing promise if already connecting
      if (this.connectionPromise) {
        return this.connectionPromise;
      }
      return;
    }

    // If already connected, don't reconnect
    if (this.socket && this.isConnected) {
      logger.info(`Already connected: ${this.connectionId}`);
      return;
    }
    
    // Double-check the connection still exists in database before connecting
    try {
      const connectionExists = await prisma.whatsAppConnection.findUnique({
        where: { id: this.connectionId },
        select: { id: true, isActive: true },
      });
      
      if (!connectionExists) {
        logger.info(`Connection ${this.connectionId} no longer exists in database, not connecting`);
        this.isDeleted = true;
        instances.delete(this.connectionId);
        return;
      }
      
      if (!connectionExists.isActive) {
        logger.info(`Connection ${this.connectionId} is inactive, not connecting`);
        this.isDeleted = true;
        instances.delete(this.connectionId);
        return;
      }
    } catch (error: any) {
      logger.error(`Error checking connection existence: ${error?.message}`);
    }

    // Clean up any existing socket to prevent stale event listeners from firing
    if (this.socket) {
      try {
        this.socket.ev.removeAllListeners('connection.update');
        this.socket.ev.removeAllListeners('creds.update');
        this.socket.ev.removeAllListeners('messages.upsert');
        this.socket.ev.removeAllListeners('messages.update');
        this.socket.end(undefined);
      } catch (_) { /* ignore cleanup errors */ }
      this.socket = null;
    }

    this.isConnecting = true;
    this.isConnected = false;
    this.qrCode = null;

    // Create a promise that will resolve when connected
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;
    });

    try {
      const baileys = await getBaileys();
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = baileys;

      const sessionsDir = getSessionsDir();
      const sessionPath = path.join(sessionsDir, this.connectionId);
      
      // Ensure session directory exists before using it
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
        logger.info(`Created session directory: ${sessionPath}`);
      }
      
      logger.info(`Using sessions directory: ${sessionsDir}`);
      logger.info(`Session path for ${this.connectionId}: ${sessionPath}`);
      
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

      // Fetch latest WhatsApp version to avoid 405 Connection Failure
      const waVersion = await getWhatsAppVersion();
      logger.info(`Using WhatsApp version ${waVersion.join('.')} for: ${this.connectionId}`);
      this.socket = makeWASocket({
        auth: state,
        logger,
        version: waVersion,
        browser: Browsers.ubuntu('Chrome'),
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
          // Skip if connection was deleted
          if (this.isDeleted) {
            logger.debug(`Skipping QR for deleted connection: ${this.connectionId}`);
            return;
          }
          
          logger.info(`QR Code received for: ${this.connectionId}`);
          this.qrCode = await QRCode.toDataURL(qr);
          this.emit('qr', this.qrCode);

          const updated = await this.safeUpdateConnection({ status: 'CONNECTING', qrCode: this.qrCode });
          if (updated) {
            logger.info(`QR Code saved to database for: ${this.connectionId}`);
          }
        }

        if (connection === 'close') {
          const reason = (lastDisconnect?.error as any)?.output?.statusCode;
          const errorMessage = (lastDisconnect?.error as any)?.message || 'Unknown error';
          logger.info(`WhatsApp connection closed: ${this.connectionId}, reason: ${reason}, message: ${errorMessage}`);

          const wasConnected = this.isConnected;
          this.socket = null;
          this.isConnecting = false;
          this.isConnected = false;

          if (reason === DisconnectReason.loggedOut || reason === 401) {
            // Session was invalidated - clear it and generate new QR
            logger.info(`Session invalidated for: ${this.connectionId}, clearing and reconnecting...`);
            const sessionPath = path.join(getSessionsDir(), this.connectionId);
            if (fs.existsSync(sessionPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            
            const updated = await this.safeUpdateConnection({ 
              status: 'DISCONNECTED', 
              sessionData: Prisma.DbNull, 
              qrCode: null 
            });
            
            // Send disconnection alert email
            await this.sendDisconnectionAlert("Sessão invalidada (logout ou token expirado)");
            
            if (!updated || this.isDeleted) {
              // Connection was deleted, don't try to reconnect
              return;
            }
            
            instances.delete(this.connectionId);
            // Auto-reconnect to generate new QR code
            setTimeout(() => {
              if (!this.isDeleted) {
                const newInstance = BaileysService.getInstance(this.connectionId);
                newInstance.connect();
              }
            }, 2000);
          } else if (reason === 405) {
            // Error 405: protocol version mismatch - clear session and retry
            this.retryCount++;
            if (this.retryCount <= this.maxRetries) {
              const delay = Math.min(5000 * Math.pow(2, this.retryCount - 1), 30000);
              logger.warn(`Got 405 error (attempt ${this.retryCount}/${this.maxRetries}), retrying in ${delay}ms: ${this.connectionId}`);
              
              const sessionPath = path.join(getSessionsDir(), this.connectionId);
              if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
              }
              
              setTimeout(() => this.connect(), delay);
            } else {
              logger.error(`Max retries reached for: ${this.connectionId}`);
              this.retryCount = 0;
              await this.safeUpdateConnection({ status: 'DISCONNECTED', qrCode: null });
              await this.sendDisconnectionAlert("Número máximo de tentativas de reconexão atingido (erro 405)");
              this.emit('connection_error', 'Erro de conexão. O WhatsApp pode estar temporariamente indisponível. Aguarde alguns minutos e tente novamente.');
            }
          } else if (reason === DisconnectReason.connectionReplaced || reason === 440) {
            // Conflict: another device/session replaced ours.
            // Session creds are still valid - do NOT delete them.
            this.conflictCount++;
            logger.warn(`Connection replaced/conflict (attempt ${this.conflictCount}/${this.maxConflicts}) for: ${this.connectionId}`);
            
            if (this.conflictCount <= this.maxConflicts) {
              const delay = Math.min(10000 * this.conflictCount, 60000);
              logger.info(`Will reconnect with existing session in ${delay}ms: ${this.connectionId}`);
              await this.safeUpdateConnection({ status: 'CONNECTING' });
              setTimeout(() => this.connect(), delay);
            } else {
              logger.error(`Max conflict retries reached for: ${this.connectionId}. Another device may be actively using this number.`);
              this.conflictCount = 0;
              await this.safeUpdateConnection({ status: 'DISCONNECTED', qrCode: null });
              await this.sendDisconnectionAlert("Conflito de sessão - outro dispositivo pode estar usando este número");
              this.emit('connection_error', 'Conflito de sessão. Outro dispositivo pode estar usando este número no WhatsApp Web. Desconecte os outros dispositivos e tente novamente.');
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
          } else if (reason === 428 || errorMessage.includes('Connection Terminated by Server')) {
            // Error 428: Connection Terminated by Server
            // Session creds are still valid - do NOT delete them.
            // Just wait and reconnect with existing session.
            logger.warn(`Connection terminated by server (428) for: ${this.connectionId}. Reconnecting with existing session...`);
            
            await this.safeUpdateConnection({ status: 'CONNECTING' });
            
            if (!this.isDeleted) {
              const delay = 5000 + Math.random() * 10000; // 5-15 seconds
              logger.info(`Will reconnect ${this.connectionId} in ${Math.round(delay/1000)}s (keeping session)...`);
              setTimeout(() => {
                if (!this.isDeleted) {
                  this.connect();
                }
              }, delay);
            }
          } else {
            // Unknown error - log and mark as disconnected
            logger.error(`Unknown disconnect reason (${reason}) for: ${this.connectionId}, message: ${errorMessage}`);
            await this.safeUpdateConnection({ 
              status: 'DISCONNECTED', 
              qrCode: null 
            });
            
            // Try to reconnect after a delay for unknown errors
            if (!this.isDeleted && wasConnected) {
              logger.info(`Attempting to reconnect after unknown error: ${this.connectionId}`);
              setTimeout(() => {
                if (!this.isDeleted) {
                  this.connect();
                }
              }, 10000);
            }
          }
        }

        if (connection === 'open') {
          // Skip if connection was deleted
          if (this.isDeleted) {
            logger.debug(`Connection opened but marked as deleted: ${this.connectionId}`);
            return;
          }
          
          this.qrCode = null;
          this.isConnected = true;
          this.retryCount = 0;
          this.conflictCount = 0;
          const phone = this.socket?.user?.id?.split(':')[0];

          const updated = await this.safeUpdateConnection({
            status: 'CONNECTED',
            qrCode: null,
            phone,
            lastConnected: new Date(),
          });

          if (updated) {
            this.emit('connected', { phone });
            logger.info(`WhatsApp connected: ${this.connectionId}`);
          }
          
          // Resolve the connection promise
          if (this.connectionResolve) {
            this.connectionResolve();
            this.connectionResolve = null;
            this.connectionReject = null;
            this.connectionPromise = null;
          }
        }
      });

      // Handle credential updates
      this.socket.ev.on('creds.update', saveCreds);

      // Handle incoming messages
      this.socket.ev.on('messages.upsert', async (m) => {
        logger.info(`Messages upsert event received: ${m.messages.length} messages, type: ${m.type}`);
        
        for (const msg of m.messages) {
          logger.info(`Message: fromMe=${msg.key.fromMe}, remoteJid=${msg.key.remoteJid}, type=${m.type}`);
          
          if (!msg.key.fromMe && m.type === 'notify') {
            logger.info(`Processing incoming message from: ${msg.key.remoteJid}`);
            await this.handleIncomingMessage(msg);
          }
        }
      });

      // Handle message reactions
      this.socket.ev.on('messages.reaction', async (reactions) => {
        for (const reaction of reactions) {
          try {
            await this.handleReaction(reaction);
          } catch (error: any) {
            logger.error('Error handling reaction:', error);
          }
        }
      });

      // Handle message deletions
      this.socket.ev.on('messages.delete', async (deletions: any) => {
        // Handle different deletion formats
        const deletionList = Array.isArray(deletions) ? deletions : 
          (deletions.keys ? deletions.keys : [deletions]);
        
        for (const deletion of deletionList) {
          try {
            await this.handleMessageDelete(deletion);
          } catch (error: any) {
            logger.error('Error handling message delete:', error);
          }
        }
      });

      // Handle message status updates
      this.socket.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
          if (update.update.status) {
            const newStatus = this.mapStatus(update.update.status);
            const messageId = update.key.id;
            
            // Update message status in database
            try {
              const updatedMessage = await prisma.message.updateMany({
                where: { wamid: messageId },
                data: { 
                  status: newStatus as any,
                  ...(newStatus === 'DELIVERED' && { deliveredAt: new Date() }),
                  ...(newStatus === 'READ' && { readAt: new Date() }),
                },
              });
              
              if (updatedMessage.count > 0) {
                logger.debug(`Message status updated: ${messageId} -> ${newStatus}`);
                
                // Emit socket event for real-time update
                const io = (global as any).io;
                if (io) {
                  // Find the message to get the ticketId
                  const message = await prisma.message.findFirst({
                    where: { wamid: messageId },
                    select: { id: true, ticketId: true, ticket: { select: { companyId: true } } },
                  });
                  
                  if (message) {
                    io.to(`ticket:${message.ticketId}`).emit('message:status', {
                      messageId: message.id,
                      wamid: messageId,
                      status: newStatus,
                    });
                  }
                }
              }
            } catch (error) {
              logger.error('Error updating message status:', error);
            }
            
            this.emit('message_status', {
              id: messageId,
              status: newStatus,
            });
          }
        }
      });

      // Handle LID mapping updates (Baileys v7: lid-mapping.update returns LID/PN mappings)
      this.socket.ev.on('lid-mapping.update' as any, async (mapping: unknown) => {
        const entries = Array.isArray(mapping) ? mapping : [];
        logger.info(`LID mapping update received: ${entries.length} entries`);
        for (const item of entries) {
          const lid = (item as any)?.lid ?? (item as any)?.lidJid?.replace?.(/@[^@]*$/g, '')?.replace(/\D/g, '');
          const phone = (item as any)?.phone ?? (item as any)?.pn ?? (item as any)?.phoneNumber?.replace?.(/\D/g, '');
          if (!lid || !phone || lid === phone) continue;
          logger.info(`LID mapping: ${lid} -> ${phone}`);
          this.lidMapping.set(lid, phone);
          try {
            const connection = await prisma.whatsAppConnection.findUnique({
              where: { id: this.connectionId },
              select: { companyId: true },
            });
            if (connection) {
              const updated = await prisma.contact.updateMany({
                where: {
                  companyId: connection.companyId,
                  OR: [{ lidId: lid }, { phone: lid }],
                },
                data: { phone, lidId: lid },
              });
              if (updated.count > 0) {
                logger.info(`Updated ${updated.count} contact(s) with real phone: ${phone}`);
              }
            }
          } catch (error) {
            logger.error('Error updating contact with LID mapping:', error);
          }
        }
      });

      // Handle contacts updates (Baileys v7: Contact has id + phoneNumber or id + lid; no jid/lid legacy fields)
      this.socket.ev.on('contacts.update', async (contacts) => {
        for (const contact of contacts) {
          const c = contact as { id?: string; phoneNumber?: string; lid?: string };
          let lid = '';
          let phone = '';
          const rawId = c.id ?? '';
          if (rawId.endsWith('@lid')) {
            lid = rawId.replace(/@[^@]*$/g, '').replace(/\D/g, '');
            phone = (c.phoneNumber ?? '').replace(/\D/g, '');
          } else if (rawId.endsWith('@s.whatsapp.net')) {
            phone = rawId.replace(/@[^@]*$/g, '').replace(/\D/g, '');
            lid = (c.lid ?? '').replace(/@[^@]*$/g, '').replace(/\D/g, '');
          }
          if (lid && phone && lid !== phone && this.isValidPhoneNumber(phone)) {
            logger.info(`Contact update with LID mapping: ${lid} -> ${phone}`);
            this.lidMapping.set(lid, phone);
            try {
              const connection = await prisma.whatsAppConnection.findUnique({
                where: { id: this.connectionId },
                select: { companyId: true },
              });
              if (connection) {
                await prisma.contact.updateMany({
                  where: {
                    companyId: connection.companyId,
                    OR: [{ lidId: lid }, { phone: lid }],
                  },
                  data: { phone, lidId: lid },
                });
              }
            } catch (error) {
              logger.error('Error updating contact from contacts.update:', error);
            }
          }
        }
      });

      // Handle contacts upsert (Baileys v7: id is preferred; if id is LID then phoneNumber present, else lid present)
      this.socket.ev.on('contacts.upsert', async (contacts) => {
        for (const contact of contacts) {
          const c = contact as { id?: string; phoneNumber?: string; lid?: string };
          const rawId = c.id ?? '';
          if (rawId.includes('@lid')) {
            logger.debug(`New contact with LID: ${JSON.stringify(contact)}`);
          }
          let lid = '';
          let phone = '';
          if (rawId.endsWith('@lid')) {
            lid = rawId.replace(/@[^@]*$/g, '').replace(/\D/g, '');
            phone = (c.phoneNumber ?? '').replace(/\D/g, '');
          } else if (rawId.endsWith('@s.whatsapp.net')) {
            phone = rawId.replace(/@[^@]*$/g, '').replace(/\D/g, '');
            lid = (c.lid ?? '').replace(/@[^@]*$/g, '').replace(/\D/g, '');
          }
          if (lid && phone && lid !== phone && this.isValidPhoneNumber(phone)) {
            logger.info(`Contact upsert with LID mapping: ${lid} -> ${phone}`);
            this.lidMapping.set(lid, phone);
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

  async disconnect(forceLogout: boolean = false): Promise<void> {
    logger.info(`Disconnecting Baileys for: ${this.connectionId} (forceLogout: ${forceLogout})`);
    
    if (this.socket) {
      try {
        // Remove all event listeners to prevent further processing
        this.socket.ev.removeAllListeners('connection.update');
        this.socket.ev.removeAllListeners('creds.update');
        this.socket.ev.removeAllListeners('messages.upsert');
        this.socket.ev.removeAllListeners('messages.update');
        this.socket.ev.removeAllListeners('messages.reaction');
        this.socket.ev.removeAllListeners('messages.delete');
        this.socket.ev.removeAllListeners('contacts.update');
        this.socket.ev.removeAllListeners('contacts.upsert');
        this.socket.ev.removeAllListeners('lid-mapping.update' as any);
        
        logger.info(`Event listeners removed for: ${this.connectionId}`);
        
        if (forceLogout) {
          // Force logout from WhatsApp - this invalidates the session completely
          try {
            await this.socket.logout();
            logger.info(`Logged out from WhatsApp for: ${this.connectionId}`);
          } catch (logoutError: any) {
            // Logout may fail if already disconnected, that's OK
            logger.warn(`Logout error (expected if already disconnected): ${logoutError?.message}`);
          }
        }
        
        // Close the websocket connection
        try {
          // First try to end gracefully
          this.socket.end(undefined);
          
          // Also close the websocket directly if available
          const ws = (this.socket as any).ws;
          if (ws && typeof ws.close === 'function') {
            ws.close();
          }
        } catch (closeError: any) {
          logger.warn(`Socket close error (expected if already closed): ${closeError?.message}`);
        }
        
        logger.info(`Socket closed for: ${this.connectionId}`);
      } catch (error: any) {
        logger.error(`Error during disconnect for ${this.connectionId}:`, error?.message);
      } finally {
        this.socket = null;
      }
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.connectionResolve = null;
    this.connectionReject = null;
    
    // Clear LID mapping cache
    this.lidMapping.clear();
    
    // Remove from instances map
    instances.delete(this.connectionId);
    
    logger.info(`Baileys disconnected completely for: ${this.connectionId}`);
  }

  // Check if socket is connected (used for health checks)
  isSocketConnected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  /**
   * Get the current LID to phone number mappings
   * Useful for debugging and verification
   */
  getLidMappings(): Map<string, string> {
    return this.lidMapping;
  }

  /**
   * Manually add a LID to phone mapping
   * Can be used when we discover the real number through other means
   */
  addLidMapping(lid: string, phone: string): void {
    logger.info(`Manually adding LID mapping: ${lid} -> ${phone}`);
    this.lidMapping.set(lid, phone);
  }

  /**
   * Try to resolve a phone number from a LID
   * Checks local cache and database
   */
  async getPhoneFromLid(lid: string): Promise<string | null> {
    // Check local cache
    if (this.lidMapping.has(lid)) {
      return this.lidMapping.get(lid)!;
    }
    
    // Check database
    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: this.connectionId },
      select: { companyId: true },
    });
    
    if (connection) {
      const contact = await prisma.contact.findFirst({
        where: { 
          companyId: connection.companyId,
          lidId: lid,
          NOT: { phone: lid }, // Only if phone is different from lid
        },
        select: { phone: true },
      });
      
      if (contact?.phone) {
        // Save to cache
        this.lidMapping.set(lid, contact.phone);
        return contact.phone;
      }
    }
    
    return null;
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

  /**
   * Wait for the next QR code to be emitted (or return existing one).
   * Resolves with the QR data URL when received, or null after timeoutMs.
   */
  waitForQRCode(timeoutMs: number): Promise<string | null> {
    return new Promise((resolve) => {
      const existing = this.qrCode;
      if (existing) {
        resolve(existing);
        return;
      }
      const timer = setTimeout(() => {
        this.off('qr', onQr);
        resolve(this.qrCode);
      }, timeoutMs);
      const onQr = (dataUrl: string) => {
        clearTimeout(timer);
        this.off('qr', onQr);
        resolve(dataUrl);
      };
      this.once('qr', onQr);
    });
  }

  async sendTextMessage(
    to: string,
    content: string
  ): Promise<{ messageId: string }> {
    // Try to reconnect if socket is not available but session exists
    if (!this.socket || !this.isConnected) {
      const sessionPath = path.join(getSessionsDir(), this.connectionId);
      const credsPath = path.join(sessionPath, 'creds.json');
      
      logger.info(`Checking session at: ${credsPath}`);
      
      if (fs.existsSync(credsPath)) {
        logger.info(`Reconnecting Baileys for message send: ${this.connectionId}`);
        
        // Start connection if not already connecting
        if (!this.isConnecting) {
          this.connect(); // Don't await - let it run in background
        }
        
        // Wait for the connection to be established (max 30 seconds)
        const timeout = 30000;
        const startTime = Date.now();
        
        while ((!this.socket || !this.isConnected) && (Date.now() - startTime) < timeout) {
          await new Promise(resolve => setTimeout(resolve, 500));
          logger.debug(`Waiting for connection... socket: ${!!this.socket}, connected: ${this.isConnected}`);
        }
        
        if (!this.socket || !this.isConnected) {
          throw new Error('Falha ao reconectar WhatsApp. Tempo limite excedido. Tente reconectar manualmente.');
        }
        
        logger.info(`Successfully reconnected for message send: ${this.connectionId}`);
      } else {
        logger.warn(`Session file not found at: ${credsPath}`);
        throw new Error('WhatsApp não conectado. Por favor, conecte o WhatsApp primeiro escaneando o QR Code.');
      }
    }

    const jid = `${to}@s.whatsapp.net`;
    logger.info(`Sending message to ${jid}`);
    const result = await this.socket.sendMessage(jid, { text: content });
    logger.info(`Message sent successfully to ${jid}, messageId: ${result?.key?.id}`);

    return { messageId: result?.key?.id || '' };
  }

  async deleteMessage(to: string, wamid: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não conectado');
    }

    const jid = `${to}@s.whatsapp.net`;
    
    // Baileys v7+ delete message format
    await this.socket.sendMessage(jid, {
      delete: {
        remoteJid: jid,
        fromMe: true,
        id: wamid,
      },
    });

    logger.info(`Message deleted: ${wamid} to ${jid}`);
  }

  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    mediaType: string,
    caption?: string,
    options?: {
      filename?: string;
      mimetype?: string;
    }
  ): Promise<{ messageId: string; finalMediaUrl?: string }> {
    // Normalize media URL to HTTPS - Baileys needs to download the file
    // Always log original URL for debugging
    logger.info(`Original media URL: ${mediaUrl}`);
    const normalizedUrl = normalizeMediaUrl(mediaUrl) || mediaUrl;
    
    // Log URL normalization for debugging (always log to see what's happening)
    if (normalizedUrl !== mediaUrl) {
      logger.info(`Media URL normalized: ${mediaUrl} -> ${normalizedUrl}`);
    } else {
      logger.warn(`Media URL was NOT normalized - still using: ${normalizedUrl}`);
    }
    
    // For audio files, we need to convert WebM to OGG/Opus (WhatsApp compatible format)
    let convertedAudioPath: string | null = null;
    let convertedFilePath: string | null = null; // Path to the final converted file for buffer sending
    let finalMediaUrl = normalizedUrl;
    
    try {
      const testResponse = await fetch(normalizedUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        logger.error(`Media URL not accessible: ${normalizedUrl} (Status: ${testResponse.status})`);
        throw new Error(`Arquivo de mídia não está acessível. Status: ${testResponse.status}`);
      }
      const contentType = testResponse.headers.get('content-type');
      logger.info(`Media URL verified: ${normalizedUrl} (Status: ${testResponse.status}, Content-Type: ${contentType})`);
      
      // For audio files in WebM format, convert to OGG/Opus
      if (mediaType === 'AUDIO' && normalizedUrl.toLowerCase().includes('.webm')) {
        logger.info(`Converting WebM audio to OGG/Opus format for WhatsApp compatibility...`);
        
        // Download the WebM file
        const tempDir = path.join(getUploadsDir(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const webmPath = path.join(tempDir, `input-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`);
        const oggPath = path.join(tempDir, `output-${Date.now()}-${Math.random().toString(36).substring(7)}.ogg`);
        
        // Download WebM file
        const response = await fetch(normalizedUrl);
        if (!response.ok) {
          throw new Error(`Failed to download audio file: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(webmPath, buffer);
        logger.info(`WebM file downloaded: ${webmPath} (${buffer.length} bytes)`);
        
        // Try converting WebM to OGG/Opus using FFmpeg
        try {
          await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
              '-i', webmPath,
              '-avoid_negative_ts', 'make_zero',  // Required for WhatsApp compatibility!
              '-c:a', 'libopus',  // Use Opus codec
              '-b:a', '64k',      // Bitrate 64kbps (good quality for voice)
              '-ar', '48000',     // Sample rate 48kHz
              '-ac', '1',         // Mono channel (voice)
              '-y',               // Overwrite output file
              oggPath
            ]);
            
            let stderr = '';
            
            ffmpeg.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            ffmpeg.on('close', (code) => {
              // Clean up input file
              try {
                if (fs.existsSync(webmPath)) {
                  fs.unlinkSync(webmPath);
                }
              } catch (e) {
                logger.warn(`Failed to cleanup WebM file: ${webmPath}`, e);
              }
              
              if (code === 0) {
                logger.info(`Audio converted successfully: ${oggPath}`);
                convertedAudioPath = oggPath;
                
                // Copy converted file to uploads directory with a permanent name
                const uploadsDir = getUploadsDir();
                const mediaDir = path.join(uploadsDir, 'media');
                if (!fs.existsSync(mediaDir)) {
                  fs.mkdirSync(mediaDir, { recursive: true });
                }
                
                const finalFileName = `audio-converted-${Date.now()}.ogg`;
                const finalPath = path.join(mediaDir, finalFileName);
                fs.copyFileSync(oggPath, finalPath);
                convertedFilePath = finalPath; // Store path for buffer sending
                logger.info(`Converted audio saved: ${finalPath}`);
                
                // Update finalMediaUrl to point to the converted file
                const apiUrl = process.env.API_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3001}`;
                finalMediaUrl = `${apiUrl}/uploads/media/${finalFileName}`;
                logger.info(`finalMediaUrl updated to converted OGG file: ${finalMediaUrl}`);
                
                // Clean up temporary OGG file (keep the final one)
                try {
                  if (fs.existsSync(oggPath)) {
                    fs.unlinkSync(oggPath);
                  }
                } catch (e) {
                  logger.warn(`Failed to cleanup temp OGG file: ${oggPath}`, e);
                }
                
                resolve();
              } else {
                logger.error(`FFmpeg conversion failed with code ${code}:`, stderr);
                reject(new Error(`Falha ao converter áudio: código ${code}`));
              }
            });
            
            ffmpeg.on('error', (error) => {
              logger.error(`FFmpeg spawn error:`, error);
              // Clean up input file on spawn error
              try {
                if (fs.existsSync(webmPath)) {
                  fs.unlinkSync(webmPath);
                }
              } catch (e) {
                // Ignore cleanup errors
              }
              reject(error);
            });
          });
        } catch (conversionError: any) {
          // FFmpeg not available or conversion failed — fallback to sending the raw file as buffer
          logger.warn(`FFmpeg conversion failed, falling back to sending raw WebM as buffer: ${conversionError?.message}`);
          
          // Try to extract the local file path from the URL to read directly from disk
          try {
            const uploadsDir = getUploadsDir();
            const urlPathMatch = normalizedUrl.match(/\/uploads\/(.*)/);
            if (urlPathMatch) {
              const localPath = path.join(uploadsDir, urlPathMatch[1]);
              if (fs.existsSync(localPath)) {
                convertedFilePath = localPath; // Use the original file as buffer
                logger.info(`Fallback: using original file as buffer: ${localPath}`);
              }
            }
          } catch (fallbackError) {
            logger.warn(`Fallback path extraction failed`, fallbackError);
          }
        }
      }
    } catch (error: any) {
      // Clean up on error
      if (convertedAudioPath && fs.existsSync(convertedAudioPath)) {
        try {
          fs.unlinkSync(convertedAudioPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      // For audio files, try fallback: read file from disk directly
      if (mediaType === 'AUDIO') {
        try {
          const uploadsDir = getUploadsDir();
          const urlPathMatch = normalizedUrl.match(/\/uploads\/(.*)/);
          if (urlPathMatch) {
            const localPath = path.join(uploadsDir, urlPathMatch[1]);
            if (fs.existsSync(localPath)) {
              convertedFilePath = localPath;
              logger.warn(`Media URL verification failed but file exists locally, using buffer fallback: ${localPath}`);
            } else {
              throw error; // Re-throw if file doesn't exist locally either
            }
          } else {
            throw error;
          }
        } catch (fallbackError) {
          logger.error(`Failed to verify/convert media URL: ${normalizedUrl}`, {
            error: error?.message || error,
            stack: error?.stack,
          });
          throw new Error(`Não foi possível processar o arquivo de mídia: ${error?.message || error}`);
        }
      } else {
        logger.error(`Failed to verify media URL: ${normalizedUrl}`, {
          error: error?.message || error,
          stack: error?.stack,
        });
        throw new Error(`Não foi possível processar o arquivo de mídia: ${error?.message || error}`);
      }
    }
    
    // Try to reconnect if socket is not available but session exists
    if (!this.socket || !this.isConnected) {
      const sessionPath = path.join(getSessionsDir(), this.connectionId);
      const credsPath = path.join(sessionPath, 'creds.json');
      
      if (fs.existsSync(credsPath)) {
        logger.info(`Reconnecting Baileys for media send: ${this.connectionId}`);
        
        // Start connection if not already connecting
        if (!this.isConnecting) {
          this.connect(); // Don't await - let it run in background
        }
        
        // Wait for the connection to be established (max 30 seconds)
        const timeout = 30000;
        const startTime = Date.now();
        
        while ((!this.socket || !this.isConnected) && (Date.now() - startTime) < timeout) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!this.socket || !this.isConnected) {
          throw new Error('Falha ao reconectar WhatsApp. Tempo limite excedido. Tente reconectar manualmente.');
        }
        
        logger.info(`Successfully reconnected for media send: ${this.connectionId}`);
      } else {
        throw new Error('WhatsApp não conectado. Por favor, conecte o WhatsApp primeiro escaneando o QR Code.');
      }
    }

    const jid = `${to}@s.whatsapp.net`;
    let message: any;

    // Use normalized URL for Baileys
    // Determine mimetype based on file extension
    // IMPORTANT: WhatsApp only accepts OGG/Opus, MP3, or M4A for audio
    // WebM files with audio use Opus codec, so we treat them as OGG/Opus
    let mimetype = 'audio/ogg; codecs=opus'; // Default to OGG/Opus (WhatsApp preferred format)
    if (normalizedUrl) {
      const urlLower = normalizedUrl.toLowerCase();
      if (urlLower.includes('.ogg') || urlLower.includes('.opus')) {
        mimetype = 'audio/ogg; codecs=opus';
      } else if (urlLower.includes('.webm')) {
        // WebM audio files typically use Opus codec, which is compatible with OGG/Opus
        // WhatsApp doesn't accept audio/webm, so we use audio/ogg; codecs=opus
        mimetype = 'audio/ogg; codecs=opus';
        logger.info(`Converting WebM audio mimetype to OGG/Opus for WhatsApp compatibility`);
      } else if (urlLower.includes('.mp3')) {
        mimetype = 'audio/mpeg';
      } else if (urlLower.includes('.m4a')) {
        mimetype = 'audio/mp4';
      }
    }
    
    switch (mediaType) {
      case 'IMAGE':
        message = { image: { url: normalizedUrl }, caption };
        break;
      case 'VIDEO':
        message = { video: { url: normalizedUrl }, caption };
        break;
      case 'AUDIO':
        // Use converted OGG file if available, otherwise use original URL
        const audioUrl = finalMediaUrl || normalizedUrl;
        
        // If we have a converted local OGG file, send as buffer for better compatibility
        if (convertedFilePath && fs.existsSync(convertedFilePath)) {
          const audioBuffer = fs.readFileSync(convertedFilePath);
          logger.info(`Sending audio as PTT (voice message) via buffer: ${audioBuffer.length} bytes, mimetype: ${mimetype}`);
          // ptt: true makes it a voice message (push-to-talk) instead of audio file
          message = { audio: audioBuffer, mimetype, ptt: true };
        } else {
          // Fallback to URL if no local file
          logger.info(`Sending audio as PTT (voice message) via URL: ${audioUrl}, mimetype: ${mimetype}`);
          message = { audio: { url: audioUrl }, mimetype, ptt: true };
        }
        break;
      case 'DOCUMENT':
        // Extract filename from URL or use provided filename
        let filename = options?.filename;
        if (!filename && normalizedUrl) {
          try {
            // Try to extract filename from URL
            const urlPath = new URL(normalizedUrl).pathname;
            const urlFilename = path.basename(urlPath);
            // Remove UUID prefix if present (format: uuid-filename.ext)
            filename = urlFilename.includes('-') ? urlFilename.split('-').slice(1).join('-') : urlFilename;
          } catch (e) {
            // If URL parsing fails, try simple extraction
            const urlParts = normalizedUrl.split('/');
            const lastPart = urlParts[urlParts.length - 1];
            filename = lastPart.includes('-') ? lastPart.split('-').slice(1).join('-') : lastPart;
          }
        }
        
        // Determine mimetype from filename or use provided
        let documentMimetype = options?.mimetype || 'application/pdf';
        if (filename) {
          const ext = path.extname(filename).toLowerCase();
          const mimetypeMap: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
          };
          documentMimetype = mimetypeMap[ext] || documentMimetype;
        }
        
        // Baileys requires filename and mimetype for documents
        message = { 
          document: { 
            url: normalizedUrl,
            fileName: filename || 'document.pdf',
            mimetype: documentMimetype
          }, 
          caption 
        };
        logger.info(`Sending document: filename=${filename || 'document.pdf'}, mimetype=${documentMimetype}, url=${normalizedUrl}`);
        break;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }

    const mediaUrlForLog = finalMediaUrl || normalizedUrl;
    logger.info(`Sending media message via Baileys: type=${mediaType}, url=${mediaUrlForLog}, to=${to}`);
    
    try {
      const result = await this.socket.sendMessage(jid, message);
      
      if (!result || !result.key || !result.key.id) {
        logger.error(`Baileys sendMessage returned invalid result:`, result);
        throw new Error('Resposta inválida do Baileys ao enviar mídia');
      }
      
      logger.info(`Media message sent successfully: messageId=${result.key.id}`);
      
      // Return the final media URL (converted OGG for audio, or original for other types)
      const returnedFinalMediaUrl = finalMediaUrl || normalizedUrl;
      logger.info(`Returning finalMediaUrl: ${returnedFinalMediaUrl} (original: ${normalizedUrl}, converted: ${finalMediaUrl})`);
      
      return { 
        messageId: result.key.id,
        finalMediaUrl: returnedFinalMediaUrl
      };
    } catch (error: any) {
      
      logger.error(`Failed to send media message via Baileys:`, {
        error: error?.message || error,
        stack: error?.stack,
        type: mediaType,
        url: normalizedUrl,
        to,
        mimetype,
      });
      throw new Error(`Falha ao enviar mídia via WhatsApp: ${error?.message || error}`);
    }
  }

  private async handleIncomingMessage(msg: any): Promise<void> {
    try {
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid) return;

      // Ignore group messages and broadcast
      if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
        logger.debug(`Ignoring non-individual message from: ${remoteJid}`);
        return;
      }

      // Check if this is a LID (Linked ID) - used when users have phone number privacy enabled
      const isLid = remoteJid.endsWith('@lid');
      
      // Baileys v7+ provides the real phone number in remoteJidAlt when available
      const remoteJidAlt = msg.key.remoteJidAlt;
      
      // Log full message structure for debugging LID issues
      if (isLid) {
        logger.info(`=== LID MESSAGE DEBUG ===`);
        logger.info(`remoteJid: ${remoteJid}`);
        logger.info(`remoteJidAlt: ${remoteJidAlt}`);
        logger.info(`msg.key: ${JSON.stringify(msg.key)}`);
        logger.info(`msg.pushName: ${msg.pushName}`);
        
        // Check for user_wid or other fields that might contain the real number
        if (msg.message) {
          const msgKeys = Object.keys(msg.message);
          logger.info(`msg.message keys: ${msgKeys.join(', ')}`);
        }
        
        logger.info(`=== END LID DEBUG ===`);
      }
      
      // Extract phone number from JID, removing any suffix (@s.whatsapp.net, @lid, etc)
      let from = remoteJid.replace(/@[^@]*$/g, '');
      // Remove any remaining non-numeric characters (shouldn't be needed, but just in case)
      from = from.replace(/\D/g, '');
      if (!from) return;
      
      // Store the original LID for reference
      const originalLid = from;

      // If this is a LID, try to get the real phone number
      if (isLid) {
        logger.info(`Received message from LID: ${from} - attempting to resolve real phone number`);
        
        // Method 1 (BEST): Use remoteJidAlt from Baileys v7+ which contains the real number
        if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
          const altPhone = remoteJidAlt.replace(/@[^@]*$/g, '').replace(/\D/g, '');
          if (altPhone && this.isValidPhoneNumber(altPhone)) {
            logger.info(`✅ Resolved LID ${from} using remoteJidAlt: ${altPhone}`);
            // Save mapping for future use
            this.lidMapping.set(from, altPhone);
            from = altPhone;
          }
        }
        // Method 2: Check local LID mapping cache
        else if (this.lidMapping.has(from)) {
          const cachedPhone = this.lidMapping.get(from)!;
          logger.info(`✅ Resolved LID ${from} from local cache: ${cachedPhone}`);
          from = cachedPhone;
        }
        // Method 3: Try other sources (database, participant field, etc)
        else {
          const realPhone = await this.resolvePhoneFromLid(from, msg);
          
          if (realPhone && realPhone !== from) {
            logger.info(`✅ Resolved LID ${from} to real phone: ${realPhone}`);
            // Save to cache for future use
            this.lidMapping.set(from, realPhone);
            from = realPhone;
          } else {
            logger.warn(`⚠️ Could not resolve LID ${from} to real phone number - user has phone privacy enabled`);
          }
        }
      }
      
      // Validate that the phone number looks like a real phone number
      // Brazilian numbers: 55 + DDD (2 digits) + number (8-9 digits) = 12-13 digits
      // LIDs are typically 15+ digits and don't start with country codes
      const isValidPhone = this.isValidPhoneNumber(from);
      if (!isValidPhone) {
        logger.warn(`Phone number ${from} appears to be a LID or invalid. Messages may not be delivered correctly.`);
      }

      let content = '';
      let type = 'TEXT';
      let mediaUrl = '';
      let quotedMessageId: string | null = null;

      // Check if this is a reply to another message
      // Baileys stores the quoted message ID in contextInfo.stanzaId
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo ||
                         msg.message?.imageMessage?.contextInfo ||
                         msg.message?.videoMessage?.contextInfo ||
                         msg.message?.audioMessage?.contextInfo ||
                         msg.message?.documentMessage?.contextInfo;
      
      if (contextInfo?.stanzaId) {
        quotedMessageId = contextInfo.stanzaId;
        logger.info(`Message is a reply to WhatsApp message ID: ${quotedMessageId}`);
      }

      if (msg.message?.conversation) {
        content = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        content = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage) {
        type = 'IMAGE';
        content = msg.message.imageMessage.caption || '';
        mediaUrl = await this.downloadAndSaveMedia(msg, 'image', 'jpg');
      } else if (msg.message?.videoMessage) {
        type = 'VIDEO';
        content = msg.message.videoMessage.caption || '';
        mediaUrl = await this.downloadAndSaveMedia(msg, 'video', 'mp4');
      } else if (msg.message?.audioMessage) {
        type = 'AUDIO';
        mediaUrl = await this.downloadAndSaveMedia(msg, 'audio', 'ogg');
      } else if (msg.message?.documentMessage) {
        type = 'DOCUMENT';
        content = msg.message.documentMessage.fileName || '';
        const ext = msg.message.documentMessage.fileName?.split('.').pop() || 'pdf';
        mediaUrl = await this.downloadAndSaveMedia(msg, 'document', ext);
      }

      // Skip if no content
      if (!content && type === 'TEXT') {
        logger.debug(`Skipping message with no text content from: ${from}`);
        return;
      }

      // Get pushName (contact display name from WhatsApp)
      const pushName = msg.pushName || '';
      
      // Try to get profile picture
      let profilePicUrl = '';
      try {
        profilePicUrl = await this.getProfilePicture(from);
      } catch (error) {
        logger.debug(`Could not get profile picture for ${from}`);
      }
      
      logger.info(`Incoming message from ${from} (${pushName || 'sem nome'}): ${content.substring(0, 50)}...`);

      // Get connection info to get companyId
      const connection = await prisma.whatsAppConnection.findUnique({
        where: { id: this.connectionId },
        select: { companyId: true },
      });

      if (!connection) {
        logger.error(`Connection not found: ${this.connectionId}`);
        return;
      }

      // Find the quoted message ID if this is a reply
      let quotedMessageDbId: string | null = null;
      if (quotedMessageId) {
        // Find the message in our database by WhatsApp message ID (wamid)
        const quotedMessage = await prisma.message.findFirst({
          where: { 
            wamid: quotedMessageId,
            connectionId: this.connectionId,
          },
          select: { id: true },
        });
        if (quotedMessage) {
          quotedMessageDbId = quotedMessage.id;
          logger.info(`Found quoted message in database: ${quotedMessageDbId}`);
        } else {
          logger.warn(`Quoted message ${quotedMessageId} not found in database`);
        }
      }

      // Process the incoming message
      await MessageProcessor.processIncoming({
        connectionId: this.connectionId,
        companyId: connection.companyId,
        from,
        pushName,
        profilePicUrl,
        wamid: msg.key.id || '',
        type,
        content,
        mediaUrl,
        timestamp: new Date(msg.messageTimestamp * 1000),
        quotedMessageId: quotedMessageDbId || undefined,
      });

      // Also emit the event for any additional listeners
      this.emit('message', {
        id: msg.key.id,
        from,
        type,
        content,
        mediaUrl,
        timestamp: msg.messageTimestamp * 1000,
      });
    } catch (error: any) {
      logger.error('Error handling incoming message:', {
        message: error?.message,
        stack: error?.stack,
        error: error?.toString ? error.toString() : error,
        connectionId: this.connectionId,
      });
      logger.error('Full error object:', error);
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

  /**
   * Validate if a phone number looks like a real phone number
   * Brazilian numbers: 55 + DDD (2 digits) + number (8-9 digits) = 12-13 digits
   * LIDs are typically 15+ digits and don't follow country code patterns
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Remove non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Phone numbers should be between 10-15 digits
    // LIDs are typically 15+ digits
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return false;
    }
    
    // Brazilian numbers start with 55 and have 12-13 digits
    if (cleanPhone.startsWith('55') && cleanPhone.length >= 12 && cleanPhone.length <= 13) {
      return true;
    }
    
    // Other valid country codes (1-3 digits) + phone number
    // Most international numbers are 10-14 digits
    const validCountryCodes = ['1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98', '351', '352', '353', '354', '355', '356', '357', '358', '359', '370', '371', '372', '373', '374', '375', '376', '377', '378', '380', '381', '382', '383', '385', '386', '387', '389', '420', '421', '423'];
    
    for (const code of validCountryCodes) {
      if (cleanPhone.startsWith(code) && cleanPhone.length >= 10 && cleanPhone.length <= 14) {
        return true;
      }
    }
    
    // If it's a very long number (15+ digits without matching country code), it's likely a LID
    if (cleanPhone.length >= 15) {
      return false;
    }
    
    // Default: accept if reasonable length
    return cleanPhone.length >= 10 && cleanPhone.length <= 14;
  }

  /**
   * Try to resolve a real phone number from a LID (Linked ID)
   * LIDs are used when users have phone number privacy enabled
   */
  private async resolvePhoneFromLid(lid: string, msg: any): Promise<string | null> {
    try {
      // Method 0 (Baileys v7): participantAlt contains PN when participant is LID (groups/broadcast)
      const participantAlt = msg.key?.participantAlt;
      if (participantAlt && participantAlt.includes('@s.whatsapp.net')) {
        const pn = participantAlt.replace(/@[^@]*$/g, '').replace(/\D/g, '');
        if (pn && this.isValidPhoneNumber(pn)) {
          logger.debug(`Found real phone in participantAlt: ${pn}`);
          return pn;
        }
      }

      // Method 0b (Baileys v7): signalRepository.lidMapping.getPNForLID
      const sock = this.socket as any;
      if (sock?.signalRepository?.lidMapping?.getPNForLID) {
        try {
          const pn = await Promise.resolve(sock.signalRepository.lidMapping.getPNForLID(lid + '@lid'));
          if (pn) {
            const phone = String(pn).replace(/@[^@]*$/g, '').replace(/\D/g, '');
            if (phone && this.isValidPhoneNumber(phone)) {
              logger.debug(`Found real phone via signalRepository.lidMapping: ${phone}`);
              return phone;
            }
          }
        } catch (_) {
          logger.debug(`getPNForLID failed for LID ${lid}`);
        }
      }

      // Method 1: Check if participant field contains the real number
      if (msg.key?.participant) {
        const participant = msg.key.participant.replace(/@[^@]*$/g, '').replace(/\D/g, '');
        if (participant && this.isValidPhoneNumber(participant)) {
          logger.debug(`Found real phone in participant: ${participant}`);
          return participant;
        }
      }

      // Method 2: Check verifiedBizName - business accounts sometimes have phone in metadata
      if (msg.verifiedBizName) {
        logger.debug(`Message from verified business: ${msg.verifiedBizName}`);
      }

      // Method 3: Try to look up the contact in our database by LID
      // If we've previously associated this LID with a real phone, use that
      const existingContact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: lid },
            { lidId: lid }, // If we add a lidId field
          ]
        },
        select: { phone: true, lidId: true },
      });

      if (existingContact?.phone && existingContact.phone !== lid && this.isValidPhoneNumber(existingContact.phone)) {
        logger.debug(`Found real phone from existing contact: ${existingContact.phone}`);
        return existingContact.phone;
      }

      // Method 4: Try to use Baileys' onWhatsApp to check if LID corresponds to a number
      // Note: This might not work for LIDs as they're specifically privacy-protected
      if (this.socket) {
        try {
          // For LIDs, we can try to get the business profile which sometimes has the number
          const businessProfile = await this.socket.getBusinessProfile?.(lid + '@lid');
          if (businessProfile && typeof businessProfile === 'object' && 'wid' in businessProfile) {
            const wid = (businessProfile as any).wid;
            const businessPhone = String(wid).replace(/@[^@]*$/g, '').replace(/\D/g, '');
            if (businessPhone && this.isValidPhoneNumber(businessPhone)) {
              logger.debug(`Found real phone from business profile: ${businessPhone}`);
              return businessPhone;
            }
          }
        } catch (e) {
          // Business profile lookup failed, which is expected for non-business accounts
          logger.debug(`Business profile lookup failed for LID ${lid}`);
        }

        // Method 4b: Try to fetch contact info directly
        try {
          const socketAny = this.socket as any;
          const contact = socketAny.contactsStore?.contacts?.[lid + '@lid'];
          if (contact) {
            logger.debug(`Contact info from store: ${JSON.stringify(contact)}`);
            // Check for any field that might have the real number
            const possibleNumberFields = ['id', 'jid', 'phone', 'number', 'wid'];
            for (const field of possibleNumberFields) {
              if (contact[field]) {
                const extracted = String(contact[field]).replace(/@[^@]*$/g, '').replace(/\D/g, '');
                if (extracted && this.isValidPhoneNumber(extracted)) {
                  logger.debug(`Found real phone in contact.${field}: ${extracted}`);
                  return extracted;
                }
              }
            }
          }
        } catch (e) {
          logger.debug(`Contact store lookup failed for LID ${lid}`);
        }

        // Method 4c: Try to use fetchStatus which might have user info
        try {
          const status = await this.socket.fetchStatus?.(lid + '@lid');
          logger.debug(`Status for LID ${lid}: ${JSON.stringify(status)}`);
        } catch (e) {
          logger.debug(`Status fetch failed for LID ${lid}`);
        }
      }

      // Method 5: Check message context/quoted messages for phone number
      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        const contextParticipant = msg.message.extendedTextMessage.contextInfo.participant
          .replace(/@[^@]*$/g, '')
          .replace(/\D/g, '');
        if (contextParticipant && this.isValidPhoneNumber(contextParticipant)) {
          logger.debug(`Found real phone in context participant: ${contextParticipant}`);
          return contextParticipant;
        }
      }

      // Method 6: Check if msg has a user_wid field (some WhatsApp versions include this)
      const possibleMsgFields = ['user_wid', 'senderKeyHash', 'deviceSentMessage'];
      for (const field of possibleMsgFields) {
        if (msg[field]) {
          logger.debug(`msg.${field}: ${JSON.stringify(msg[field])}`);
        }
      }

      // Could not resolve LID to real phone number
      logger.debug(`Could not resolve LID ${lid} to real phone number`);
      return null;
    } catch (error) {
      logger.error(`Error resolving phone from LID ${lid}:`, error);
      return null;
    }
  }

  // Download and save media from WhatsApp message
  private async downloadAndSaveMedia(msg: any, folder: string, extension: string): Promise<string> {
    try {
      if (!this.socket) {
        logger.error('Socket not available for media download');
        return '';
      }

      const baileys = await getBaileys();
      // Download the media buffer
      const buffer = await baileys.downloadMediaMessage(
        msg,
        'buffer',
        {},
        {
          logger: undefined as any,
          reuploadRequest: this.socket.updateMediaMessage,
        }
      );

      if (!buffer) {
        logger.error('Failed to download media buffer');
        return '';
      }

      // Use shared uploads path (same as server static and upload.service)
      const uploadsDir = getUploadsDir();
      
      // Map folder names to match upload.service.ts structure
      // baileys uses: image, audio, video, document
      // upload.service uses: media (for images/videos/audio), documents (for PDFs/docs)
      let targetFolder = folder;
      if (folder === 'image' || folder === 'video' || folder === 'audio') {
        targetFolder = 'media'; // Save in media folder like upload.service
      } else if (folder === 'document') {
        targetFolder = 'documents'; // Save in documents folder like upload.service
      }
      
      const mediaDir = path.join(uploadsDir, targetFolder);
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}-${randomId}.${extension}`;
      const filePath = path.join(mediaDir, filename);

      // Save the file
      fs.writeFileSync(filePath, buffer);

      // Return the URL path with API base
      // Use API_URL from env, or construct from PORT and HOST if available
      let apiUrl = process.env.API_URL;
      if (!apiUrl) {
        const port = process.env.PORT || process.env.API_PORT || 3001;
        const host = process.env.HOST || 'localhost';
        apiUrl = `http://${host}:${port}`;
      }
      
      // Use targetFolder for URL to match directory structure
      const mediaUrl = `${apiUrl}/uploads/${targetFolder}/${filename}`;
      logger.info(`Media saved: ${mediaUrl}`);
      
      return mediaUrl;
    } catch (error) {
      logger.error('Error downloading media:', error);
      return '';
    }
  }

  /**
   * Get profile picture URL for a phone number
   */
  async getProfilePicture(phone: string): Promise<string> {
    if (!this.socket || !this.isConnected) {
      return '';
    }

    try {
      const jid = `${phone}@s.whatsapp.net`;
      const url = await this.socket.profilePictureUrl(jid, 'image');
      return url || '';
    } catch (error) {
      // Profile picture not available (privacy settings or no picture)
      return '';
    }
  }

  /**
   * Handle message reactions
   */
  private async handleReaction(reaction: any): Promise<void> {
    try {
      const { key, reaction: reactionData } = reaction;
      if (!key?.id || !key?.remoteJid) return;

      // Find the message in our database by WhatsApp message ID
      const message = await prisma.message.findFirst({
        where: { 
          wamid: key.id,
          connectionId: this.connectionId,
        },
        select: { 
          id: true, 
          reactions: true,
          ticket: { select: { companyId: true, id: true } },
        },
      });

      if (!message) {
        logger.debug(`Reaction received for unknown message: ${key.id}`);
        return;
      }

      // Parse existing reactions or initialize empty array
      const reactions = (message.reactions as any) || [];
      
      // Get sender info
      const remoteJid = key.remoteJid;
      let senderPhone = remoteJid.replace(/@[^@]*$/g, '').replace(/\D/g, '');
      
      // Get contact info
      const contact = await prisma.contact.findFirst({
        where: {
          companyId: message.ticket.companyId,
          OR: [
            { phone: senderPhone },
            { lidId: senderPhone },
          ],
        },
        select: { id: true, name: true },
      });

      const senderName = contact?.name || senderPhone;
      const emoji = reactionData?.text || '👍';

      // Remove existing reaction from this sender
      const filteredReactions = reactions.filter((r: any) => 
        r.userId !== senderPhone && r.userId !== contact?.id
      );

      // Add new reaction if emoji is present (removal if emoji is empty)
      if (emoji) {
        filteredReactions.push({
          emoji,
          userId: senderPhone,
          userName: senderName,
          timestamp: new Date().toISOString(),
        });
      }

      // Update message with reactions
      await prisma.message.update({
        where: { id: message.id },
        data: { reactions: filteredReactions },
      });

      logger.info(`Reaction ${emoji} added to message ${message.id} by ${senderName}`);

      // Emit socket event
      const io = (global as any).io;
      if (io) {
        io.to(`ticket:${message.ticket.id}`).emit('message:reaction', {
          messageId: message.id,
          reactions: filteredReactions,
        });
      }
    } catch (error: any) {
      logger.error('Error handling reaction:', error);
    }
  }

  /**
   * Handle message deletions
   */
  private async handleMessageDelete(deletion: any): Promise<void> {
    try {
      const { keys } = deletion;
      if (!keys || !Array.isArray(keys)) return;

      for (const key of keys) {
        if (!key.id || !key.remoteJid) continue;

        // Find the message in our database
        const message = await prisma.message.findFirst({
          where: { 
            wamid: key.id,
            connectionId: this.connectionId,
          },
          select: { 
            id: true,
            ticket: { select: { companyId: true, id: true } },
          },
        });

        if (!message) {
          logger.debug(`Delete received for unknown message: ${key.id}`);
          continue;
        }

        // Check if message was deleted for everyone or just for sender
        const isDeletedForEveryone = deletion.delete?.item === 'message';

        // Mark message as deleted
        await prisma.message.update({
          where: { id: message.id },
          data: { 
            deletedAt: new Date(),
            deletedBy: isDeletedForEveryone ? 'CLIENT' : null, // 'CLIENT' indicates deleted by sender
          },
        });

        logger.info(`Message ${message.id} marked as deleted (for everyone: ${isDeletedForEveryone})`);

        // Emit socket event
        const io = (global as any).io;
        if (io) {
          io.to(`ticket:${message.ticket.id}`).emit('message:deleted', {
            messageId: message.id,
            deletedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error: any) {
      logger.error('Error handling message delete:', error);
    }
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(
    to: string,
    messageId: string,
    emoji: string
  ): Promise<{ messageId: string }> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não conectado');
    }

    const jid = `${to}@s.whatsapp.net`;
    
    const result = await this.socket.sendMessage(jid, {
      react: {
        text: emoji, // Empty string to remove reaction
        key: {
          remoteJid: jid,
          fromMe: false, // We're reacting to a received message
          id: messageId,
        },
      },
    });

    logger.info(`Reaction sent: ${emoji} to message ${messageId}`);
    return { messageId: result?.key?.id || '' };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.socket || !this.isConnected) {
      return false;
    }

    try {
      // Find the message to get the JID
      const message = await prisma.message.findFirst({
        where: { wamid: messageId },
        include: {
          ticket: {
            include: {
              contact: true,
            },
          },
        },
      });

      if (!message || !message.ticket?.contact?.phone) {
        logger.warn(`Message not found for marking as read: ${messageId}`);
        return false;
      }

      const jid = `${message.ticket.contact.phone}@s.whatsapp.net`;

      await this.socket.readMessages([
        {
          remoteJid: jid,
          id: messageId,
          participant: undefined,
        },
      ]);

      logger.info(`Message marked as read: ${messageId}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to mark message as read:', error);
      return false;
    }
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
    }
  ): Promise<{ messageId: string }> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não conectado');
    }

    const jid = `${to}@s.whatsapp.net`;

    const locationMessage: any = {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
      },
    };

    if (options?.name) {
      locationMessage.location.name = options.name;
    }
    if (options?.address) {
      locationMessage.location.address = options.address;
    }

    const result = await this.socket.sendMessage(jid, locationMessage);

    logger.info(`Location sent to ${jid}: ${latitude}, ${longitude}`);
    return { messageId: result?.key?.id || '' };
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
    }>
  ): Promise<{ messageId: string }> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não conectado');
    }

    const jid = `${to}@s.whatsapp.net`;

    // Convert to vCard format for Baileys
    const vCards = contacts.map((contact) => {
      let vCard = 'BEGIN:VCARD\nVERSION:3.0\n';
      vCard += `FN:${contact.name.formatted_name}\n`;
      
      if (contact.name.first_name || contact.name.last_name) {
        vCard += `N:${contact.name.last_name || ''};${contact.name.first_name || ''};;;\n`;
      }

      if (contact.phones) {
        for (const phone of contact.phones) {
          const type = phone.type?.toUpperCase() || 'CELL';
          vCard += `TEL;type=${type}:${phone.phone}\n`;
        }
      }

      if (contact.emails) {
        for (const email of contact.emails) {
          const type = email.type?.toUpperCase() || 'HOME';
          vCard += `EMAIL;type=${type}:${email.email}\n`;
        }
      }

      vCard += 'END:VCARD';
      return vCard;
    });

    const result = await this.socket.sendMessage(jid, {
      contacts: {
        displayName: contacts[0]?.name.formatted_name || 'Contact',
        contacts: contacts.map((contact, index) => ({
          vcard: vCards[index],
        })),
      },
    });

    logger.info(`Contact card sent to ${jid}`);
    return { messageId: result?.key?.id || '' };
  }
}
