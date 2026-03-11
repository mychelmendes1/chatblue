import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { redis } from '../config/redis.js';
import { generateProtocol } from '../utils/protocol.js';
import { normalizeMediaUrl } from '../utils/media-url.util.js';
import { getUploadsDir } from '../utils/uploads-dir.util.js';
import { getActiveConnectionForTicket } from '../utils/connection-for-ticket.js';
import { toCanonicalPhone } from '../utils/canonical-phone.js';
import { AIService } from './ai/ai.service.js';
import { ContextBuilderService } from './ai/context-builder.service.js';
import { TranscriptionService } from './ai/transcription.service.js';
import { TransferAnalyzerService } from './ai/transfer-analyzer.service.js';
import { NotionService } from './notion/notion.service.js';
import { SLAService } from './sla/sla.service.js';
import { ExternalAIWebhookService, BlueChatResponse, ExternalAIConfig } from './external-ai/external-ai-webhook.service.js';
import { WhatsAppService } from './whatsapp/whatsapp.service.js';
import { sendOutboundEvent } from './outbound-webhook.service.js';
import * as path from 'path';

// Cooldown de 4 horas para mensagens de fora do horário (em segundos)
const OUT_OF_HOURS_COOLDOWN_SECONDS = 4 * 60 * 60; // 4 horas

interface IncomingMessage {
  connectionId: string;
  companyId: string;
  from: string;
  pushName?: string;
  profilePicUrl?: string;
  wamid: string;
  type: string;
  content: string;
  mediaUrl?: string;
  timestamp: Date;
  quotedMessageId?: string; // WhatsApp message ID of the quoted/replied message
  metadata?: {
    platform?: 'whatsapp' | 'instagram';
    latitude?: number;
    longitude?: number;
    locationName?: string;
    locationAddress?: string;
    contacts?: any[];
    interactiveResponse?: {
      type: string;
      buttonId?: string;
      buttonText?: string;
      listId?: string;
      listTitle?: string;
      listDescription?: string;
    };
  };
}

/** CompanySettings subset for business hours */
type BusinessHoursSettings = {
  businessHoursEnabled: boolean | null;
  businessHoursTimezone: string | null;
  businessHoursDays: string | null;
  businessHoursStartTime: string | null;
  businessHoursEndTime: string | null;
};

export class MessageProcessor {
  /**
   * Check if a given date is within configured business hours (in company timezone).
   * Returns true if no restriction (disabled or missing config) or if current time is inside the window.
   */
  private static isWithinBusinessHours(settings: BusinessHoursSettings | null, now: Date): boolean {
    if (!settings?.businessHoursEnabled) return true;
    const tz = settings.businessHoursTimezone || 'America/Sao_Paulo';
    const daysStr = settings.businessHoursDays?.trim();
    const startStr = settings.businessHoursStartTime?.trim();
    const endStr = settings.businessHoursEndTime?.trim();
    if (!daysStr || !startStr || !endStr) return true;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
    const dayNum = dayNames.indexOf(dayStr);
    if (dayNum === -1) return true;

    const allowedDays = new Set(daysStr.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => !isNaN(n)));
    if (!allowedDays.has(dayNum)) return false;

    const timeStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    const [h, m] = timeStr.split(':').map(Number);
    const currentMinutes = h * 60 + (m || 0);

    const [sh, sm] = startStr.split(':').map((x) => parseInt(x.trim(), 10) || 0);
    const [eh, em] = endStr.split(':').map((x) => parseInt(x.trim(), 10) || 0);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Normalize phone number: remove WhatsApp JID suffixes and non-numeric characters
   */
  private static normalizePhoneNumber(phone: string): string {
    if (!phone) return phone;
    
    // Remove WhatsApp JID suffix if present (@s.whatsapp.net, @lid, etc)
    let normalized = phone.replace(/@[^@]*$/g, '');
    
    // Remove all non-numeric characters
    normalized = normalized.replace(/\D/g, '');
    
    return normalized;
  }

  /**
   * Extract email address from text using regex
   * Returns the first valid email found, or null if none found
   */
  private static extractEmailFromText(text: string): string | null {
    if (!text) return null;
    
    // Email regex pattern - matches most common email formats
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
    const matches = text.match(emailRegex);
    
    if (matches && matches.length > 0) {
      // Return the first valid email found
      // Clean up common false positives (like URLs with @)
      const email = matches[0].trim();
      
      // Basic validation - should not be too short or contain suspicious patterns
      if (email.length >= 5 && 
          !email.startsWith('@') && 
          !email.endsWith('@') &&
          email.split('@').length === 2) {
        return email.toLowerCase();
      }
    }
    
    return null;
  }

  /** Check if a string looks like an email (e.g. pushName can be the contact email). */
  private static looksLikeEmail(str: string | undefined): boolean {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    return trimmed.length >= 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(trimmed);
  }

  /**
   * Check if a phone number appears to be a LID (Linked ID)
   * LIDs are used by WhatsApp when users have phone number privacy enabled
   * They are typically 15+ digits and don't follow standard phone number patterns
   */
  private static isLikelyLid(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    
    // LIDs are typically 15+ digits
    if (cleanPhone.length >= 15) {
      return true;
    }
    
    // Brazilian numbers start with 55 and have 12-13 digits
    if (cleanPhone.startsWith('55') && cleanPhone.length >= 12 && cleanPhone.length <= 13) {
      return false;
    }
    
    // Most valid international numbers are 10-14 digits
    if (cleanPhone.length >= 10 && cleanPhone.length <= 14) {
      // Check for common country codes
      const commonCodes = ['1', '7', '44', '49', '33', '39', '34', '351'];
      for (const code of commonCodes) {
        if (cleanPhone.startsWith(code)) {
          return false;
        }
      }
    }
    
    // If it's a very long number, likely a LID
    return cleanPhone.length >= 15;
  }

  static async processIncoming(data: IncomingMessage): Promise<void> {
    try {
      const { connectionId, companyId, from, pushName, profilePicUrl, wamid, type, content, mediaUrl, timestamp } = data;

      // Normalize phone number before using it
      const normalizedPhone = this.normalizePhoneNumber(from);
      
      if (!normalizedPhone) {
        logger.error(`Invalid phone number received: ${from}`);
        return;
      }

      logger.debug(`Normalized phone: ${from} -> ${normalizedPhone}`);

      // Canonical phone for contact unification (e.g. Brazil 9th digit: 554298067510 and 5542998067510 -> same contact)
      const canonicalPhone = !normalizedPhone ? undefined : toCanonicalPhone(normalizedPhone);

      // Check if this looks like a LID (Linked ID) instead of a real phone number
      const isLid = this.isLikelyLid(normalizedPhone);
      if (isLid) {
        logger.warn(`Phone ${normalizedPhone} appears to be a LID (WhatsApp privacy ID). User may have phone privacy enabled.`);
      }

      const isInstagram = data.metadata?.platform === 'instagram';

      // Get or create contact - search by normalized phone, canonical phone, LID, or Instagram ID
      const contactWhere: any = {
        companyId,
        OR: [
          { phone: normalizedPhone },
          { phone: from },
          { lidId: normalizedPhone },
        ],
      };
      if (canonicalPhone) {
        contactWhere.OR.push({ canonicalPhone: canonicalPhone });
      }
      if (isInstagram) {
        contactWhere.OR.push({ instagramId: normalizedPhone }, { instagramId: from });
      }
      // Same person may use LID and real phone; unify by email when pushName is email
      const pushNameEmail = this.looksLikeEmail(pushName) ? pushName!.trim().toLowerCase() : null;
      if (pushNameEmail) {
        contactWhere.OR.push(
          { email: pushNameEmail },
          { name: pushNameEmail },
          { name: pushName } // legacy: name stored as email string
        );
      }
      let contact = await prisma.contact.findFirst({
        where: contactWhere,
      });

      // Before creating a new contact, try to find by email/name (avoids duplicate when same person uses LID vs phone)
      if (!contact && pushNameEmail) {
        contact = await prisma.contact.findFirst({
          where: {
            companyId,
            OR: [{ email: pushNameEmail }, { name: pushNameEmail }, { name: pushName?.trim() }],
          },
        });
        if (contact) {
          logger.info(`Found existing contact by email/name ${pushNameEmail} (${contact.phone}); associating sender ${normalizedPhone}${isLid ? ' [LID]' : ''}`);
        }
      }

      // Fallback: same person may appear with different phone/LID and pushName not set as email
      // Try to find by exact normalized name (avoids duplicates like "Henry Meistet" + 55... vs "Henry Meistet" + LID)
      const pushNameTrim = pushName?.trim();
      if (!contact && pushNameTrim && pushNameTrim.length >= 2) {
        const byName = await prisma.contact.findMany({
          where: {
            companyId,
            name: { equals: pushNameTrim, mode: 'insensitive' },
          },
        });
        if (byName.length === 1) {
          contact = byName[0];
          logger.info(`Found existing contact by name "${pushNameTrim}" (${contact.phone}); associating sender ${normalizedPhone}${isLid ? ' [LID]' : ''}`);
        }
      }

      if (!contact) {
        // Create new contact with pushName as name and profile picture
        const contactData: any = {
          name: pushName || undefined,
          avatar: profilePicUrl || undefined,
          companyId,
        };
        if (pushNameEmail) {
          contactData.email = pushNameEmail;
        }

        if (isLid) {
          contactData.phone = normalizedPhone;
          contactData.lidId = normalizedPhone;
          logger.warn(`Creating contact with LID: ${normalizedPhone}. Messages may not be delivered until real phone is resolved.`);
        } else if (isInstagram) {
          contactData.phone = normalizedPhone;
          contactData.instagramId = normalizedPhone;
        } else {
          contactData.phone = normalizedPhone;
        }

        contact = await prisma.contact.create({ data: contactData });

        logger.info(`New contact created: ${normalizedPhone} (${pushName || 'sem nome'}) - original: ${from}${isLid ? ' [LID]' : ''}${isInstagram ? ' [Instagram]' : ''}`);

        // Try to sync with Notion in background
        this.syncContactWithNotion(contact.id, companyId).catch((err) =>
          logger.error('Notion sync error:', err)
        );
      } else {
        // Update contact if we have new info (name or avatar)
        const updates: any = {};
        if (pushName && !contact.name) {
          updates.name = pushName;
        }
        if (profilePicUrl && !contact.avatar) {
          updates.avatar = profilePicUrl;
        }
        
        // If the contact was previously stored with a LID and we now have a real phone, update it
        if (contact.lidId && !isLid && normalizedPhone !== contact.phone) {
          updates.phone = normalizedPhone;
          logger.info(`Updating contact phone from LID ${contact.lidId} to real phone: ${normalizedPhone}`);
        }
        
        // If we're receiving from a LID and the contact doesn't have one stored, save it
        if (isLid && !contact.lidId) {
          updates.lidId = normalizedPhone;
          logger.info(`Associating LID ${normalizedPhone} with contact ${contact.phone}`);
        }

        // If this is Instagram and contact doesn't have instagramId, save it
        if (isInstagram && !contact.instagramId) {
          updates.instagramId = normalizedPhone;
          logger.info(`Associating Instagram ID ${normalizedPhone} with contact ${contact.phone}`);
        }

        // Backfill email when we matched by name (legacy) so future messages unify by email
        if (pushNameEmail && !contact.email) {
          updates.email = pushNameEmail;
        }

        if (Object.keys(updates).length > 0) {
          contact = await prisma.contact.update({
            where: { id: contact.id },
            data: updates,
          });
          logger.info(`Contact updated: ${contact.phone} -> ${JSON.stringify(updates)}`);
        }
        
        // If contact phone is not normalized (contains @), update it
        if (contact.phone !== normalizedPhone && contact.phone.includes('@') && !isLid) {
          logger.warn(`Updating contact phone from ${contact.phone} to ${normalizedPhone}`);
          contact = await prisma.contact.update({
            where: { id: contact.id },
            data: { phone: normalizedPhone },
          });
        }

        // If we found contact by canonicalPhone but phone format differs (e.g. 12 vs 13 digits), keep latest format for sending
        if (!isLid && contact.phone !== normalizedPhone && contact.canonicalPhone === canonicalPhone) {
          logger.info(`Updating contact phone to latest format: ${contact.phone} -> ${normalizedPhone}`);
          contact = await prisma.contact.update({
            where: { id: contact.id },
            data: { phone: normalizedPhone },
          });
        }

        // Ensure canonicalPhone is set (e.g. backfill missed or old contact)
        if (canonicalPhone && !contact.canonicalPhone) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { canonicalPhone },
          });
          contact = { ...contact, canonicalPhone };
        }
      }

      // Get or create ticket
      // Look for an open ticket for this contact (any connection or orphaned) so conversations follow when they reconnect
      let ticket = await prisma.ticket.findFirst({
        where: {
          contactId: contact.id,
          status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          assignedTo: true,
        },
      });

      if (ticket) {
        // Reattach ticket to current connection (e.g. after session was deleted and they reconnected)
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { connectionId },
        });
        ticket = { ...ticket, connectionId };
      }

      // If no open ticket, check if there's a resolved/closed ticket to reopen
      let wasReopened = false;
      if (!ticket) {
        const closedTicket = await prisma.ticket.findFirst({
          where: {
            contactId: contact.id,
            status: { in: ['RESOLVED', 'CLOSED'] },
          },
          orderBy: { updatedAt: 'desc' },
        });

        if (closedTicket) {
          // Reopen the closed ticket - check if AI is enabled for this connection
          logger.info(`Reopening closed ticket ${closedTicket.protocol} for contact ${from}`);
          
          // Get connection settings to check if AI is enabled
          const connectionSettings = await prisma.whatsAppConnection.findUnique({
            where: { id: connectionId },
            select: { 
              aiEnabled: true, 
              defaultUserId: true,
              defaultUser: {
                select: { id: true, name: true, isActive: true }
              }
            },
          });

          const shouldUseAI = connectionSettings?.aiEnabled !== false;
          let assignedUserId: string | null = null;
          let aiUser: any = null;

          if (shouldUseAI) {
            // Get INTERNAL AI user for handling the reopened ticket (Triagem)
            // External AIs should only be assigned when ticket is transferred to their department
            const allAIUsers = await prisma.user.findMany({
              where: {
                companyId,
                isAI: true,
                isActive: true,
              },
              select: {
                id: true,
                name: true,
                aiConfig: true,
              },
            });
            // Prefer internal AI over external AI for initial triage
            const internalAI = allAIUsers.find(u => {
              const config = u.aiConfig as any;
              return !config || config.type !== 'external';
            });
            aiUser = internalAI || null;
            assignedUserId = aiUser?.id || null;
            if (aiUser) {
              logger.info(`Reopening ticket - AI enabled, assigning to internal AI: ${aiUser.name}`);
            } else {
              logger.info(`Reopening ticket - AI enabled but no internal AI found`);
            }
          } else {
            // AI disabled - use default user if configured
            if (connectionSettings?.defaultUserId && connectionSettings?.defaultUser?.isActive) {
              assignedUserId = connectionSettings.defaultUserId;
              logger.info(`Reopening ticket - AI disabled, assigning to default user: ${connectionSettings.defaultUser.name}`);
            } else {
              logger.info(`Reopening ticket - AI disabled, no default user - ticket goes to queue`);
            }
          }

          ticket = await prisma.ticket.update({
            where: { id: closedTicket.id },
            data: {
              status: 'PENDING', // Back to triage/pending
              resolvedAt: null,
              closedAt: null,
              connectionId, // Reattach to current connection (e.g. after session was deleted and they reconnected)
              isAIHandled: shouldUseAI && !!aiUser, // Only if AI enabled and AI user exists
              assignedToId: assignedUserId, // Assign to AI or default user
              departmentId: null, // Reset department - goes back to Triage
              humanTakeoverAt: shouldUseAI ? null : new Date(), // Mark human takeover if AI disabled
              aiTakeoverAt: shouldUseAI && aiUser ? new Date() : null, // Only if AI handling
            },
            include: {
              assignedTo: true,
              contact: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  avatar: true,
                  isClient: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          });
          
          wasReopened = true;

          // Create activity for reopening
          const reopenDescription = shouldUseAI && aiUser
            ? `Ticket reopened automatically - new message from ${from}. Sent to AI triage.`
            : assignedUserId
              ? `Ticket reopened automatically - new message from ${from}. Assigned to ${connectionSettings?.defaultUser?.name || 'default user'}.`
              : `Ticket reopened automatically - new message from ${from}. Sent to queue.`;
          
          await prisma.activity.create({
            data: {
              type: 'TICKET_REOPENED',
              description: reopenDescription,
              ticketId: ticket.id,
            },
          });

          // Create system message for reopening
          const systemContent = shouldUseAI && aiUser
            ? `🔄 Atendimento reaberto automaticamente - encaminhado para triagem da IA`
            : assignedUserId
              ? `🔄 Atendimento reaberto automaticamente - atribuído para ${connectionSettings?.defaultUser?.name || 'atendente'}`
              : `🔄 Atendimento reaberto automaticamente - aguardando atendente`;
          
          const reopenMsg = await prisma.message.create({
            data: {
              type: 'SYSTEM',
              content: systemContent,
              isFromMe: true,
              isInternal: true,
              status: 'DELIVERED',
              ticketId: ticket.id,
              connectionId,
            },
          });
          sendOutboundEvent(companyId, 'message_created', {
            ticketId: ticket.id,
            companyId,
            messageId: reopenMsg.id,
            type: reopenMsg.type,
            content: reopenMsg.content ?? undefined,
            isFromMe: reopenMsg.isFromMe,
            createdAt: reopenMsg.createdAt.toISOString(),
          });

          // Emit socket event for real-time update with full ticket data
          const io = (global as any).io;
          if (io) {
            io.to(`company:${companyId}`).emit('ticket:updated', {
              id: ticket.id,
              protocol: ticket.protocol,
              status: ticket.status,
              priority: ticket.priority,
              isAIHandled: ticket.isAIHandled,
              humanTakeoverAt: ticket.humanTakeoverAt,
              departmentId: null, // Explicitly set to null for Triage
              department: null, // No department - goes to Triage
              createdAt: ticket.createdAt,
              updatedAt: ticket.updatedAt,
              contactId: ticket.contactId,
              contact: (ticket as any).contact ? {
                id: (ticket as any).contact.id,
                name: (ticket as any).contact.name,
                phone: (ticket as any).contact.phone,
                avatar: (ticket as any).contact.avatar,
              } : null,
              assignedTo: ticket.assignedTo ? {
                id: ticket.assignedTo.id,
                name: ticket.assignedTo.name,
                avatar: ticket.assignedTo.avatar,
                isAI: ticket.assignedTo.isAI,
              } : null,
              _count: { messages: 1 }, // New message coming
            });
          }
        }
      }

      if (!ticket) {
        // Get connection settings to check if AI is enabled
        const connection = await prisma.whatsAppConnection.findUnique({
          where: { id: connectionId },
          select: { 
            aiEnabled: true, 
            defaultUserId: true,
            defaultUser: {
              select: { id: true, name: true, isActive: true }
            }
          },
        });

        // Determine if AI should handle and who should be assigned
        let shouldUseAI = connection?.aiEnabled !== false; // Default to true if not set
        let assignedUserId: string | null = null;
        let aiUser: any = null;

        if (shouldUseAI) {
          // AI is enabled for this connection - get INTERNAL AI user for triage
          // External AIs should only be assigned when ticket is transferred to their department
          const allAIUsers = await prisma.user.findMany({
            where: {
              companyId,
              isAI: true,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              aiConfig: true,
            },
          });
          // Prefer internal AI over external AI for initial triage
          const internalAI = allAIUsers.find(u => {
            const config = u.aiConfig as any;
            return !config || config.type !== 'external';
          });
          aiUser = internalAI || null;
          assignedUserId = aiUser?.id || null;
          if (aiUser) {
            logger.info(`New ticket - AI enabled, assigning to internal AI: ${(aiUser as any).name}`);
          } else {
            logger.info(`New ticket - AI enabled but no internal AI found`);
          }
        } else {
          // AI is disabled for this connection - use default user if configured
          if (connection?.defaultUserId && connection?.defaultUser?.isActive) {
            assignedUserId = connection.defaultUserId;
            logger.info(`AI disabled for connection ${connectionId}, assigning to default user: ${connection.defaultUser.name}`);
          } else {
            // No default user - ticket goes to queue unassigned
            logger.info(`AI disabled for connection ${connectionId}, no default user configured - ticket goes to queue`);
          }
        }

        // Get default department (triagem)
        const defaultDept = await prisma.department.findFirst({
          where: {
            companyId,
            parentId: null, // Root department
            isActive: true,
          },
          orderBy: { order: 'asc' },
        });

        // Calculate SLA deadline
        const slaDeadline = await SLAService.calculateDeadline(
          companyId,
          defaultDept?.id
        );

        ticket = await prisma.ticket.create({
          data: {
            protocol: generateProtocol(),
            status: 'PENDING',
            isAIHandled: shouldUseAI && !!aiUser,
            aiTakeoverAt: shouldUseAI && aiUser ? new Date() : null,
            slaDeadline,
            contactId: contact.id,
            connectionId,
            companyId,
            assignedToId: assignedUserId,
            departmentId: defaultDept?.id,
          },
          include: {
            assignedTo: true,
          },
        });

        sendOutboundEvent(companyId, 'conversation_created', {
          ticketId: ticket.id,
          companyId: ticket.companyId,
          contactId: ticket.contactId,
          protocol: ticket.protocol,
          status: ticket.status,
          departmentId: ticket.departmentId ?? undefined,
          createdAt: ticket.createdAt.toISOString(),
        });

        // Create activity
        await prisma.activity.create({
          data: {
            type: 'TICKET_CREATED',
            description: `New ticket created from ${from}`,
            ticketId: ticket.id,
          },
        });

        // Create system message for new ticket
        const assignedName = ticket.assignedTo?.name || 'Sistema';
        const systemMessage = await prisma.message.create({
          data: {
            type: 'SYSTEM',
            content: ticket.isAIHandled 
              ? `Atendimento iniciado por ${assignedName} (IA)`
              : `Novo atendimento criado`,
            isFromMe: true,
            status: 'DELIVERED',
            ticketId: ticket.id,
            connectionId,
          },
        });

        sendOutboundEvent(companyId, 'message_created', {
          ticketId: ticket.id,
          companyId,
          messageId: systemMessage.id,
          type: systemMessage.type,
          content: systemMessage.content ?? undefined,
          isFromMe: systemMessage.isFromMe,
          createdAt: systemMessage.createdAt.toISOString(),
        });

        // Emit socket event for new ticket
        const io = (global as any).io;
        if (io) {
          // Get full ticket data for socket event
          try {
            const fullTicket = await prisma.ticket.findUnique({
              where: { id: ticket.id },
              include: {
                contact: {
                  select: { id: true, name: true, phone: true, avatar: true, isClient: true },
                },
                assignedTo: {
                  select: { id: true, name: true, avatar: true, isAI: true },
                },
                department: {
                  select: { id: true, name: true, color: true },
                },
                _count: {
                  select: {
                    messages: { where: { isFromMe: false, readAt: null } },
                  },
                },
              },
            });
            
            if (fullTicket) {
              io.to(`company:${companyId}`).emit('ticket:created', {
                ...fullTicket,
                lastMessage: null,
              });
              logger.info(`Emitted ticket:created for ticket ${ticket.id} with full data`);
            } else {
              // Fallback if query fails
              io.to(`company:${companyId}`).emit('ticket:created', {
                id: ticket.id,
                protocol: ticket.protocol,
                status: ticket.status,
                priority: 'MEDIUM',
                isAIHandled: ticket.isAIHandled,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                contact: {
                  id: contact.id,
                  name: contact.name,
                  phone: contact.phone,
                },
                assignedTo: ticket.assignedTo,
              });
              logger.info(`Emitted ticket:created for ticket ${ticket.id} with fallback data`);
            }
          } catch (error) {
            logger.error(`Error fetching full ticket data for socket event: ${error}`);
            // Fallback emit
            io.to(`company:${companyId}`).emit('ticket:created', {
              id: ticket.id,
              protocol: ticket.protocol,
              status: ticket.status,
              priority: 'MEDIUM',
              isAIHandled: ticket.isAIHandled,
              createdAt: ticket.createdAt,
              updatedAt: ticket.updatedAt,
              contact: {
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
              },
              assignedTo: ticket.assignedTo,
            });
          }
        }
      }

      // Transcribe audio if needed
      let transcription: string | null = null;
      
      // For IMAGE/VIDEO messages, save caption in both content and caption fields
      // For DOCUMENT, content is the filename, caption is separate
      let caption: string | undefined = undefined;
      let messageContent = content;
      
      if (type === 'AUDIO' && mediaUrl) {
        transcription = await this.transcribeAudio(companyId, mediaUrl);
        if (transcription) {
          logger.info(`Audio transcribed: ${transcription.substring(0, 100)}...`);
          // Use transcription as content for AI processing
          messageContent = `[Áudio transcrito]: ${transcription}`;
        } else {
          messageContent = content || '[Mensagem de áudio]';
        }
      } else if (type === 'IMAGE' || type === 'VIDEO') {
        // Caption is in content for images/videos
        caption = content || undefined;
        messageContent = content || undefined;
      } else if (type === 'DOCUMENT') {
        // For documents, content is filename, caption is not used here
        messageContent = content || undefined;
      } else if (type === 'AUDIO') {
        messageContent = content || '[Mensagem de áudio]';
      }

      // Skip duplicate message (same wamid already saved for this ticket - e.g. WhatsApp retry)
      if (wamid) {
        const existingByWamid = await prisma.message.findFirst({
          where: { ticketId: ticket.id, wamid },
        });
        if (existingByWamid) {
          logger.info(`Skipping duplicate message by wamid for ticket ${ticket.id} (wamid: ${wamid})`);
          return;
        }
      }

      // Save message
      const message = await prisma.message.create({
        data: {
          wamid,
          type: type as any,
          content: messageContent,
          caption, // Save caption separately for IMAGE/VIDEO
          mediaUrl,
          transcription, // Save transcription for audio messages
          isFromMe: false,
          status: 'RECEIVED',
          ticketId: ticket.id,
          connectionId,
          quotedId: data.quotedMessageId || null, // Link to the quoted/replied message
          metadata: data.metadata || {}, // Extra metadata (location, contacts, interactive responses)
          createdAt: timestamp,
        },
      });

      sendOutboundEvent(companyId, 'message_created', {
        ticketId: ticket.id,
        companyId,
        messageId: message.id,
        type: message.type,
        content: message.content ?? undefined,
        mediaUrl: message.mediaUrl ?? undefined,
        isFromMe: message.isFromMe,
        createdAt: message.createdAt.toISOString(),
      });

      // Horário de funcionamento: se recebemos fora do horário, enviar mensagem automática
      const companySettings = await prisma.companySettings.findUnique({
        where: { companyId },
      });
      type SettingsWithBusinessHours = BusinessHoursSettings & {
        outOfHoursMessage?: string | null;
        awayMessage?: string | null;
      };
      const s = companySettings as unknown as SettingsWithBusinessHours | null;
      const businessSettings: BusinessHoursSettings | null = s
        ? {
            businessHoursEnabled: s.businessHoursEnabled ?? null,
            businessHoursTimezone: s.businessHoursTimezone ?? null,
            businessHoursDays: s.businessHoursDays ?? null,
            businessHoursStartTime: s.businessHoursStartTime ?? null,
            businessHoursEndTime: s.businessHoursEndTime ?? null,
          }
        : null;
      if (
        s?.businessHoursEnabled &&
        !this.isWithinBusinessHours(businessSettings, new Date())
      ) {
        const outOfHoursText =
          (s.outOfHoursMessage ?? s.awayMessage)?.trim();
        if (outOfHoursText) {
          // Verificar cooldown de 4 horas para não enviar mensagem repetida
          const cooldownKey = `out-of-hours:${companyId}:${contact.phone}`;
          const lastSent = await redis.get(cooldownKey);
          
          if (lastSent) {
            logger.debug(`Out-of-hours message skipped for ${contact.phone} - cooldown active (sent at ${lastSent})`);
          } else {
            try {
              const connection = await prisma.whatsAppConnection.findUnique({
                where: { id: connectionId },
              });
              if (connection) {
                const { WhatsAppService } = await import('./whatsapp/whatsapp.service.js');
                const whatsappService = new WhatsAppService(connection);
                const result = await whatsappService.sendMessage(contact.phone, outOfHoursText);
                const sentMessage = await prisma.message.create({
                  data: {
                    type: 'TEXT',
                    content: outOfHoursText,
                    isFromMe: true,
                    status: 'SENT',
                    ticketId: ticket.id,
                    connectionId,
                    wamid: result.messageId,
                  },
                });

                sendOutboundEvent(companyId, 'message_created', {
                  ticketId: ticket.id,
                  companyId,
                  messageId: sentMessage.id,
                  type: sentMessage.type,
                  content: sentMessage.content ?? undefined,
                  isFromMe: sentMessage.isFromMe,
                  createdAt: sentMessage.createdAt.toISOString(),
                });
                
                // Salvar no Redis com cooldown de 4 horas
                await redis.setex(cooldownKey, OUT_OF_HOURS_COOLDOWN_SECONDS, new Date().toISOString());
                
                const io = (global as any).io;
                if (io) {
                  io.to(`ticket:${ticket.id}`).emit('message:new', {
                    ...sentMessage,
                    ticketId: ticket.id,
                  });
                  io.to(`company:${companyId}`).emit('message:new', {
                    ...sentMessage,
                    ticketId: ticket.id,
                  });
                }
                logger.info(`Out-of-hours auto-reply sent for ticket ${ticket.id} (next allowed in 4 hours)`);
              }
            } catch (err) {
              logger.error('Failed to send out-of-hours message:', err);
            }
          }
        }
      }

      // Extract email from message content if contact doesn't have email
      if (messageContent && !contact.email) {
        const extractedEmail = this.extractEmailFromText(messageContent);
        if (extractedEmail) {
          try {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { email: extractedEmail },
            });
            logger.info(`Email extracted and saved for contact ${contact.id}: ${extractedEmail}`);
            // Update contact object for socket emission
            contact.email = extractedEmail;
          } catch (error) {
            logger.error(`Failed to update contact email: ${error}`);
          }
        }
      }

      // Update contact's lastMessageAt for 24-hour messaging window tracking (Meta Cloud API)
      await prisma.contact.update({
        where: { id: contact.id },
        data: { lastMessageAt: timestamp },
      });

      // Fetch message with quoted relation for socket emission
      const messageWithQuoted = await prisma.message.findUnique({
        where: { id: message.id },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isAI: true,
            },
          },
          quoted: {
            select: {
              id: true,
              content: true,
              type: true,
              isFromMe: true,
            },
          },
        },
      });

      // Update ticket
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: ticket.status === 'WAITING' ? 'IN_PROGRESS' : ticket.status,
          updatedAt: new Date(),
        },
      });

      // Emit socket events
      const io = (global as any).io;
      if (io && messageWithQuoted) {
        // Normalize media URL before emitting
        const normalizedMessage = {
          ...messageWithQuoted,
          mediaUrl: normalizeMediaUrl(messageWithQuoted.mediaUrl),
          transcription, // Include transcription in socket event
        };
        
        // Emit message received event
        io.to(`company:${companyId}`).emit('message:received', {
          message: normalizedMessage,
          ticket: {
            id: ticket.id,
            contactId: contact.id,
            contact: {
              id: contact.id,
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
            },
          },
        });

        // Fetch updated ticket with unread count for sidebar refresh
        const updatedTicketForSocket = await prisma.ticket.findUnique({
          where: { id: ticket.id },
          include: {
            contact: {
              select: { id: true, name: true, phone: true, email: true, avatar: true, isClient: true },
            },
            assignedTo: {
              select: { id: true, name: true, avatar: true, isAI: true },
            },
            department: {
              select: { id: true, name: true, color: true },
            },
            _count: {
              select: {
                messages: { where: { isFromMe: false, readAt: null } },
              },
            },
          },
        });

        // Emit message:new to ticket room for real-time chat updates
        const ticketRoom = `ticket:${ticket.id}`;
        logger.info(`[Socket] Preparing to emit message:new to room ${ticketRoom} for message ${normalizedMessage.id}`);
        
        // Emit to ticket room (for users viewing this specific ticket)
        io.to(ticketRoom).emit('message:new', {
          ...normalizedMessage,
          ticketId: ticket.id,
        });
        
        // Also emit to company room as fallback (for sidebar updates)
        io.to(`company:${companyId}`).emit('message:new', {
          ...normalizedMessage,
          ticketId: ticket.id,
        });
        
        logger.info(`[Socket] message:new emitted for message ${normalizedMessage.id} to ticket ${ticket.id} in room ${ticketRoom} and company:${companyId}`);

        // Emit ticket updated with full data to refresh and reorder the sidebar
        io.to(`company:${companyId}`).emit('ticket:updated', {
          ...updatedTicketForSocket,
          lastMessage: {
            id: normalizedMessage.id,
            type: normalizedMessage.type,
            content: normalizedMessage.content,
            mediaUrl: normalizedMessage.mediaUrl, // Already normalized
            transcription,
            isFromMe: false,
            createdAt: normalizedMessage.createdAt,
          },
        });
      }

      // If AI is handling, process with AI (but only if AI is enabled for this connection)
      if (ticket.isAIHandled && ticket.assignedTo?.isAI) {
        // Check if this is an external AI user
        const aiConfig = ticket.assignedTo?.aiConfig as any;
        if (ExternalAIWebhookService.isExternalAI(aiConfig)) {
          // External AI: send webhook instead of processing internally
          logger.info(`[ExternalAI] Sending webhook for ticket ${ticket.id} to external AI ${ticket.assignedTo.name}`);
          
          // Get ticket with department info for the webhook
          const ticketForWebhook = await prisma.ticket.findUnique({
            where: { id: ticket.id },
            include: {
              contact: {
                select: { id: true, name: true, phone: true, email: true },
              },
              department: {
                select: { id: true, name: true },
              },
              connection: true,
            },
          });

          if (ticketForWebhook) {
            const webhookResult = await ExternalAIWebhookService.sendMessageReceived(
              { id: ticket.assignedTo.id, name: ticket.assignedTo.name, aiConfig: ticket.assignedTo.aiConfig },
              {
                id: ticketForWebhook.id,
                protocol: ticketForWebhook.protocol,
                status: ticketForWebhook.status,
                departmentId: ticketForWebhook.departmentId,
                department: ticketForWebhook.department,
                contact: ticketForWebhook.contact,
                connectionId: ticketForWebhook.connectionId,
              },
              {
                id: messageWithQuoted?.id || '',
                content: type === 'AUDIO' && transcription ? transcription : content,
                type,
                mediaUrl: messageWithQuoted?.mediaUrl ? normalizeMediaUrl(messageWithQuoted.mediaUrl) : null,
                createdAt: messageWithQuoted?.createdAt || new Date(),
              }
            );

            // Process the synchronous response from external AI (if available)
            if (webhookResult.success && webhookResult.response) {
              await this.processExternalAIResponse(
                webhookResult.response,
                ticketForWebhook,
                ticket.assignedTo,
                companyId
              );
            }
          }
        } else {
          // Internal AI: use built-in AI processing
          // Double-check that AI is enabled for this connection
          const connectionAICheck = await prisma.whatsAppConnection.findUnique({
            where: { id: connectionId },
            select: { aiEnabled: true },
          });

          if (connectionAICheck?.aiEnabled !== false) {
            // Use transcription for audio messages, otherwise use original content
            const contentForAI = type === 'AUDIO' && transcription 
              ? transcription 
              : content;

            // Avoid duplicate AI reply: if the same content from the contact was already received in the last 90s, skip (e.g. duplicate delivery or user sent twice)
            const normalizeForDedup = (t: string) => (t || '').trim().replace(/\s+/g, ' ');
            const contentNormalized = normalizeForDedup(contentForAI || '');
            let skipAIForDuplicateContent = false;
            if (contentNormalized && message.id) {
              const since = new Date(Date.now() - 90 * 1000);
              const recentFromContact = await prisma.message.findMany({
                where: {
                  ticketId: ticket.id,
                  isFromMe: false,
                  id: { not: message.id },
                  createdAt: { gte: since },
                  content: { not: null },
                },
                select: { content: true },
                take: 20,
              });
              skipAIForDuplicateContent = recentFromContact.some(
                (m) => m.content && normalizeForDedup(m.content) === contentNormalized
              );
              if (skipAIForDuplicateContent) {
                logger.info(`Skipping AI reply for duplicate content in ticket ${ticket.id} (last 90s)`);
              }
            }
            if (!skipAIForDuplicateContent && contentForAI) {
              await this.processWithAI(ticket.id, companyId, contentForAI, contact);
            } else if (!contentForAI) {
              logger.warn(`No content to process for AI: type=${type}, hasTranscription=${!!transcription}`);
            }
          } else {
            logger.info(`AI processing skipped - AI disabled for connection ${connectionId}`);
          }
        }
      }
    } catch (error: any) {
      // Use console.error to ensure error details are always logged
      console.error('=== MESSAGE PROCESSING ERROR ===');
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Error name:', error?.name);
      console.error('Error code:', error?.code);
      console.error('Full error:', error);
      console.error('Data:', { from: data.from, type: data.type, connectionId: data.connectionId });
      console.error('================================');
      
      logger.error('Message processing error:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        name: error?.name || 'Error',
        code: error?.code,
        from: data.from,
        type: data.type,
        connectionId: data.connectionId,
        errorString: String(error),
      });
      throw error;
    }
  }

  /**
   * Transcribe audio message using OpenAI Whisper
   */
  private static async transcribeAudio(
    companyId: string,
    mediaUrl: string
  ): Promise<string | null> {
    try {
      // Get company settings to check for Whisper API key
      const settings = await prisma.companySettings.findUnique({
        where: { companyId },
        select: { aiEnabled: true, aiApiKey: true, aiProvider: true, whisperApiKey: true },
      });

      if (!settings?.aiEnabled) {
        logger.warn('AI not enabled, cannot transcribe audio');
        return null;
      }

      // For transcription, we need OpenAI API key (Whisper is OpenAI only)
      // Use whisperApiKey if available, otherwise fall back to aiApiKey (if OpenAI)
      let apiKeyToUse: string | null = null;

      if (settings.whisperApiKey) {
        // Use dedicated Whisper API key
        apiKeyToUse = settings.whisperApiKey;
        logger.info('Using dedicated Whisper API key for transcription');
      } else if (settings.aiProvider === 'openai' && settings.aiApiKey) {
        // Fall back to main AI key if provider is OpenAI
        apiKeyToUse = settings.aiApiKey;
        logger.info('Using main OpenAI API key for transcription');
      } else if (settings.aiApiKey?.startsWith('sk-') && !settings.aiApiKey?.startsWith('sk-ant-')) {
        // Try to use main key if it looks like an OpenAI key
        apiKeyToUse = settings.aiApiKey;
        logger.info('Using main API key (looks like OpenAI) for transcription');
      }

      if (!apiKeyToUse) {
        logger.warn('No valid OpenAI API key for Whisper transcription. Configure whisperApiKey in settings.');
        return null;
      }

      const transcriptionService = new TranscriptionService(apiKeyToUse);

      // Check if mediaUrl is a local file path or URL
      if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        // It's a URL - download and transcribe (use shared uploads dir for temp cache)
        const uploadsDir = getUploadsDir();
        return await transcriptionService.transcribeFromUrl(mediaUrl, uploadsDir, 'pt');
      } else {
        // It's a local file path
        const fullPath = mediaUrl.startsWith('/') 
          ? mediaUrl 
          : path.join(process.cwd(), mediaUrl);
        return await transcriptionService.transcribe(fullPath, 'pt');
      }
    } catch (error: any) {
      logger.error('Audio transcription failed:', error);
      return null;
    }
  }

  private static async syncContactWithNotion(
    contactId: string,
    companyId: string
  ): Promise<void> {
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!settings?.notionApiKey || !settings?.notionDatabaseId || !settings?.notionSyncEnabled) {
      return;
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) return;

    const notionService = new NotionService(settings.notionApiKey);
    const notionData = await notionService.findContact(
      settings.notionDatabaseId,
      contact.phone,
      contact.email
    );

    if (notionData) {
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          notionPageId: notionData.pageId,
          isClient: notionData.isClient,
          isExClient: notionData.isExClient,
          clientSince: notionData.clientSince,
          name: notionData.name || contact.name,
        },
      });
    }
  }

  // ============================================================================
  // PROCESSAMENTO DE RESPOSTA DA IA EXTERNA (síncrona)
  // ============================================================================

  /**
   * Processa a resposta síncrona de uma IA externa (bluetoken-ai)
   * - Se action === 'RESPOND' e tem texto: envia a mensagem de volta ao cliente via WhatsApp
   * - Se escalation.needed === true: transfere o ticket para humano/departamento
   */
  static async processExternalAIResponse(
    response: BlueChatResponse,
    ticket: {
      id: string;
      protocol: string;
      status: string;
      departmentId: string | null;
      department?: { id: string; name: string } | null;
      contact: { id: string; name: string | null; phone: string; email?: string | null };
      connectionId: string;
      connection?: any;
      companyId?: string;
    },
    aiUser: { id: string; name: string; aiConfig: any },
    companyId: string
  ): Promise<void> {
    const config = aiUser.aiConfig as ExternalAIConfig;
    const autoReply = config.autoReply !== false; // Default: true
    const autoEscalate = config.autoEscalate !== false; // Default: true

    logger.info(`[ExternalAI] Processing response for ticket ${ticket.id}:`, {
      action: response.action,
      hasText: !!response.response?.text,
      escalationNeeded: response.escalation?.needed,
      autoReply,
      autoEscalate,
    });

    // ========================================================================
    // 1. Enviar resposta da IA de volta ao cliente
    // ========================================================================
    if (autoReply && response.action === 'RESPOND' && response.response?.text) {
      try {
        // Obter conexão ativa para envio (reatribui ticket se sessão foi excluída)
        const { connection } = await getActiveConnectionForTicket(ticket);
        if (connection) {
          const whatsappService = new WhatsAppService(connection);
          const aiName = aiUser.name || 'Assistente IA';
          const formattedMessage = `*${aiName}:*\n${response.response.text}`;

          // Enviar mensagem via WhatsApp
          const sendResult = await whatsappService.sendMessage(ticket.contact.phone, formattedMessage);

          // Salvar mensagem no banco de dados
          const aiMessage = await prisma.message.create({
            data: {
              type: 'TEXT',
              content: response.response.text,
              isFromMe: true,
              isAIGenerated: true,
              status: 'SENT',
              wamid: sendResult.messageId,
              sentAt: new Date(),
              ticketId: ticket.id,
              senderId: aiUser.id,
              connectionId: connection.id,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  isAI: true,
                },
              },
            },
          });
          sendOutboundEvent(companyId, 'message_created', {
            ticketId: ticket.id,
            companyId,
            messageId: aiMessage.id,
            type: aiMessage.type,
            content: aiMessage.content ?? undefined,
            isFromMe: aiMessage.isFromMe,
            createdAt: aiMessage.createdAt.toISOString(),
          });

          // Atualizar status do ticket
          const ticketCurrentData = await prisma.ticket.findUnique({ where: { id: ticket.id }, select: { firstResponse: true, status: true, createdAt: true } });
          const newStatus = ticketCurrentData?.status === 'PENDING' ? 'IN_PROGRESS' as const : undefined;
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              updatedAt: new Date(),
              ...(newStatus && { status: newStatus }),
              ...(!ticketCurrentData?.firstResponse && {
                firstResponse: new Date(),
                responseTime: Math.floor((Date.now() - (ticketCurrentData?.createdAt?.getTime() || Date.now())) / 1000),
              }),
            },
          });

          // Emitir eventos de socket
          const io = (global as any).io;
          if (io) {
            const normalizedAiMessage = {
              ...aiMessage,
              mediaUrl: normalizeMediaUrl(aiMessage.mediaUrl),
            };
            io.to(`ticket:${ticket.id}`).emit('message:sent', normalizedAiMessage);
            io.to(`ticket:${ticket.id}`).emit('message:new', normalizedAiMessage);
          }

          logger.info(`[ExternalAI] Auto-reply sent for ticket ${ticket.id}: "${response.response.text.substring(0, 50)}..."`);
        } else {
          logger.warn(`[ExternalAI] No active WhatsApp connection found to send auto-reply for ticket ${ticket.id}`);
        }
      } catch (error: any) {
        logger.error(`[ExternalAI] Error sending auto-reply for ticket ${ticket.id}:`, {
          message: error?.message,
          stack: error?.stack,
        });
      }
    }

    // ========================================================================
    // 2. Escalar para humano se a IA pediu
    // ========================================================================
    if (autoEscalate && response.escalation?.needed) {
      try {
        const escalation = response.escalation;
        logger.info(`[ExternalAI] Escalation requested for ticket ${ticket.id}:`, {
          reason: escalation.reason,
          priority: escalation.priority,
          toDepartmentId: escalation.toDepartmentId,
          toUserId: escalation.toUserId,
        });

        // Determinar para onde transferir
        const toDepartmentId = escalation.toDepartmentId || config.escalateDepartmentId || null;
        const toUserId = escalation.toUserId || null;

        const updateData: any = {
          status: 'PENDING',
          isAIHandled: false,
          humanTakeoverAt: new Date(),
          assignedToId: toUserId || null,
        };

        if (toDepartmentId) {
          updateData.departmentId = toDepartmentId;
        }

        // Se não temos departamento nem usuário específico, mantemos no mesmo departamento
        // mas tiramos a atribuição da IA
        const updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: updateData,
          include: {
            contact: {
              select: { id: true, name: true, phone: true, avatar: true },
            },
            assignedTo: {
              select: { id: true, name: true, avatar: true, isAI: true },
            },
            department: {
              select: { id: true, name: true, color: true },
            },
          },
        });

        // Criar registro de transferência
        await prisma.ticketTransfer.create({
          data: {
            ticketId: ticket.id,
            fromUserId: aiUser.id,
            toUserId: toUserId,
            fromDeptId: ticket.departmentId,
            toDeptId: toDepartmentId,
            transferType: toDepartmentId ? 'DEPT_TO_DEPT' : 'USER_TO_USER',
            reason: escalation.reason || 'Escalated by external AI',
          },
        });

        // Criar mensagem de sistema
        const reason = escalation.reason || 'Escalada solicitada pela IA';
        let toName = '';
        if (toUserId) {
          const toUser = await prisma.user.findUnique({ where: { id: toUserId }, select: { name: true } });
          toName = toUser?.name || 'atendente humano';
        } else if (toDepartmentId) {
          const toDept = await prisma.department.findUnique({ where: { id: toDepartmentId }, select: { name: true } });
          toName = `departamento ${toDept?.name || ''}`;
        } else {
          toName = 'atendente humano';
        }

        const systemMessage = await prisma.message.create({
          data: {
            type: 'SYSTEM',
            content: `${aiUser.name} (IA) transferiu o atendimento para ${toName}. Motivo: ${reason}`,
            isFromMe: true,
            status: 'DELIVERED',
            ticketId: ticket.id,
            connectionId: ticket.connectionId,
          },
        });
        sendOutboundEvent(companyId, 'message_created', {
          ticketId: ticket.id,
          companyId,
          messageId: systemMessage.id,
          type: systemMessage.type,
          content: systemMessage.content ?? undefined,
          isFromMe: systemMessage.isFromMe,
          createdAt: systemMessage.createdAt.toISOString(),
        });

        // Criar atividade
        await prisma.activity.create({
          data: {
            type: 'TICKET_TRANSFERRED',
            description: `Ticket escalated by external AI ${aiUser.name}: ${reason}`,
            ticketId: ticket.id,
            userId: aiUser.id,
            metadata: { reason, priority: escalation.priority, toDepartmentId, toUserId },
          },
        });

        // Emitir eventos de socket
        const io = (global as any).io;
        if (io) {
          io.to(`company:${companyId}`).emit('ticket:transferred', {
            ticketId: ticket.id,
            fromUserId: aiUser.id,
            toUserId: toUserId,
            toDepartmentId,
          });
          io.to(`company:${companyId}`).emit('ticket:updated', {
            ...updatedTicket,
            _count: { messages: 0 },
          });
          io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

          // Notificar usuário alvo
          if (toUserId) {
            io.to(`user:${toUserId}`).emit('notification', {
              type: 'ticket_assigned',
              title: 'Conversa escalada pela IA',
              message: `${aiUser.name} transferiu uma conversa com ${updatedTicket.contact?.name || 'cliente'} para você`,
              ticketId: ticket.id,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
        }

        logger.info(`[ExternalAI] Ticket ${ticket.id} escalated to ${toName} by ${aiUser.name}`);
      } catch (error: any) {
        logger.error(`[ExternalAI] Error escalating ticket ${ticket.id}:`, {
          message: error?.message,
          stack: error?.stack,
        });
      }
    }

    // ========================================================================
    // 3. Resolver/fechar o ticket se a IA pediu
    // ========================================================================
    if (response.action === 'RESOLVE') {
      try {
        logger.info(`[ExternalAI] Resolve requested for ticket ${ticket.id} by ${aiUser.name}`);

        // Enviar mensagem de despedida se houver texto na resposta
        if (autoReply && response.response?.text) {
          const { connection } = await getActiveConnectionForTicket(ticket);
          if (connection) {
            const whatsappService = new WhatsAppService(connection);
            const aiName = aiUser.name || 'Assistente IA';
            const formattedMessage = `*${aiName}:*\n${response.response.text}`;

            const sendResult = await whatsappService.sendMessage(ticket.contact.phone, formattedMessage);

            const aiMessage = await prisma.message.create({
              data: {
                type: 'TEXT',
                content: response.response.text,
                isFromMe: true,
                isAIGenerated: true,
                status: 'SENT',
                wamid: sendResult.messageId,
                sentAt: new Date(),
                ticketId: ticket.id,
                senderId: aiUser.id,
                connectionId: connection.id,
              },
              include: {
                sender: { select: { id: true, name: true, avatar: true, isAI: true } },
              },
            });
            sendOutboundEvent(companyId, 'message_created', {
              ticketId: ticket.id,
              companyId,
              messageId: aiMessage.id,
              type: aiMessage.type,
              content: aiMessage.content ?? undefined,
              isFromMe: aiMessage.isFromMe,
              createdAt: aiMessage.createdAt.toISOString(),
            });

            const io = (global as any).io;
            if (io) {
              const normalizedMsg = { ...aiMessage, mediaUrl: normalizeMediaUrl(aiMessage.mediaUrl) };
              io.to(`ticket:${ticket.id}`).emit('message:sent', normalizedMsg);
              io.to(`ticket:${ticket.id}`).emit('message:new', normalizedMsg);
            }

            logger.info(`[ExternalAI] Farewell message sent for ticket ${ticket.id}: "${response.response.text.substring(0, 50)}..."`);
          }
        }

        // Resolver o ticket
        const resolutionSummary = response.resolution?.summary || `Atendimento finalizado por ${aiUser.name} (IA)`;
        const resolutionReason = response.resolution?.reason || 'Conversa concluída pela IA';

        const updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'RESOLVED' as const,
            resolvedAt: new Date(),
            isAIHandled: false,
            resolutionNote: resolutionReason,
            isFirstContactResolution: ((ticket as any).reopenCount ?? 0) === 0,
          },
          include: {
            contact: { select: { id: true, name: true, phone: true, avatar: true } },
            assignedTo: { select: { id: true, name: true, avatar: true, isAI: true } },
            department: { select: { id: true, name: true, color: true } },
          },
        });

        // Criar mensagem de sistema
        const systemMessage = await prisma.message.create({
          data: {
            type: 'SYSTEM',
            content: `✅ Atendimento resolvido por ${aiUser.name} (IA)\n\n📋 Resumo: ${resolutionSummary}`,
            isFromMe: true,
            status: 'DELIVERED',
            ticketId: ticket.id,
            connectionId: ticket.connectionId,
          },
        });
        sendOutboundEvent(companyId, 'message_created', {
          ticketId: ticket.id,
          companyId,
          messageId: systemMessage.id,
          type: systemMessage.type,
          content: systemMessage.content ?? undefined,
          isFromMe: systemMessage.isFromMe,
          createdAt: systemMessage.createdAt.toISOString(),
        });

        // Criar atividade
        await prisma.activity.create({
          data: {
            type: 'TICKET_RESOLVED',
            description: `Ticket resolved by external AI ${aiUser.name}`,
            ticketId: ticket.id,
            userId: aiUser.id,
            metadata: { summary: resolutionSummary, reason: resolutionReason },
          },
        });

        // Emitir eventos de socket
        const io = (global as any).io;
        if (io) {
          io.to(`company:${companyId}`).emit('ticket:updated', {
            ...updatedTicket,
            _count: { messages: 0 },
          });
          io.to(`ticket:${ticket.id}`).emit('ticket:statusChanged', {
            ticketId: ticket.id,
            status: 'RESOLVED',
            resolvedAt: updatedTicket.resolvedAt,
          });
          io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });
        }

        logger.info(`[ExternalAI] Ticket ${ticket.id} resolved by ${aiUser.name}. Summary: ${resolutionSummary.substring(0, 100)}`);
      } catch (error: any) {
        logger.error(`[ExternalAI] Error resolving ticket ${ticket.id}:`, {
          message: error?.message,
          stack: error?.stack,
        });
      }
    }
  }

  private static async processWithAI(
    ticketId: string,
    companyId: string,
    userMessage: string,
    contact: any
  ): Promise<void> {
    try {
      const settings = await prisma.companySettings.findUnique({
        where: { companyId },
      });

      if (!settings) {
        logger.warn(`AI: CompanySettings não encontrado para companyId ${companyId}`);
        return;
      }

      if (!settings.aiEnabled) {
        logger.debug(`AI: IA não está habilitada para companyId ${companyId}`);
        return;
      }

      if (!settings.aiApiKey) {
        logger.warn(`AI: API Key não configurada para companyId ${companyId}. Configure em Settings > AI`);
        return;
      }

      logger.debug(`AI: Configurações OK - provider=${settings.aiProvider}, hasApiKey=${!!settings.aiApiKey}`);

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          assignedTo: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          connection: true,
          department: true,
          company: true,
        },
      });

      if (!ticket) {
        logger.warn(`AI: Ticket ${ticketId} não encontrado`);
        return;
      }

      if (!ticket.assignedTo) {
        logger.warn(`AI: Ticket ${ticketId} não está atribuído a nenhum usuário`);
        return;
      }

      if (!ticket.assignedTo.aiConfig) {
        logger.warn(`AI: Ticket ${ticketId} atribuído a ${ticket.assignedTo.name} (${ticket.assignedTo.id}) mas usuário não tem aiConfig. ${ticket.assignedTo.isAI ? 'Usuário é marcado como IA mas sem configuração.' : 'Usuário não é IA.'}`);
        return;
      }

      logger.debug(`AI: Processando mensagem do ticket ${ticketId} com usuário IA ${ticket.assignedTo.name}`);

      const aiConfig = ticket.assignedTo.aiConfig as any;

      // Build context using ContextBuilderService
      // Use agent-specific personality settings if available, otherwise fall back to company settings
      const contextBuilder = new ContextBuilderService({
        personalityConfig: {
          tone: (aiConfig.personalityTone || settings.aiPersonalityTone || 'friendly') as any,
          style: (aiConfig.personalityStyle || settings.aiPersonalityStyle || 'conversational') as any,
          useEmojis: aiConfig.useEmojis ?? settings.aiUseEmojis ?? true,
          useClientName: aiConfig.useClientName ?? settings.aiUseClientName ?? true,
        },
        guardrailsConfig: {
          enabled: aiConfig.guardrailsEnabled ?? settings.aiGuardrailsEnabled ?? true,
        },
      });

      // Build enhanced context with knowledge base and FAQ
      const builtContext = await contextBuilder.buildContext(
        ticketId,
        userMessage,
        {
          name: ticket.assignedTo.name,
          systemPrompt: aiConfig.systemPrompt || settings.aiSystemPrompt,
          trainingData: aiConfig.trainingData || '',
        }
      );

      // Validate user message with guardrails
      const userValidation = builtContext.guardrails.validateUserMessage(userMessage);
      if (!userValidation.isValid && userValidation.action === 'block') {
        // Log blocked attempt but don't respond with suggested response
        logger.warn('User message blocked by guardrails:', { ticketId, reason: userValidation.reason });
        
        // Use suggested response for jailbreak attempts
        if (userValidation.suggestedResponse) {
          await this.sendAIResponse(
            ticketId,
            companyId,
            userValidation.suggestedResponse,
            ticket,
            contact
          );
        }
        return;
      }

      // Generate AI response with enhanced context
      const provider = settings.aiProvider || 'openai';
      const aiService = new AIService(provider, settings.aiApiKey);

      // Determine the model to use - must be compatible with the provider
      // If agent model is for a different provider, use company default
      let modelToUse = aiConfig.model || settings.aiDefaultModel;
      
      // Check if model is compatible with provider
      const isOpenAIModel = modelToUse?.startsWith('gpt-') || modelToUse?.includes('gpt');
      const isAnthropicModel = modelToUse?.startsWith('claude-');
      
      if (provider === 'anthropic' && isOpenAIModel) {
        // Agent has OpenAI model but company uses Anthropic - use company default
        modelToUse = settings.aiDefaultModel || 'claude-sonnet-4-6';
        logger.info(`Agent model ${aiConfig.model} incompatible with Anthropic, using ${modelToUse}`);
      } else if (provider === 'openai' && isAnthropicModel) {
        // Agent has Anthropic model but company uses OpenAI - use company default
        modelToUse = settings.aiDefaultModel || 'gpt-4-turbo-preview';
        logger.info(`Agent model ${aiConfig.model} incompatible with OpenAI, using ${modelToUse}`);
      }

      // ============================================
      // TRANSFER ANALYSIS - Using Claude Haiku for semantic analysis
      // ============================================
      
      // Build conversation history for transfer analyzer
      const conversationHistory = ticket.messages
        .slice()
        .reverse()
        .map(m => ({
          role: (m.isFromMe ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        }));

      // Initialize transfer analyzer with Anthropic API key
      // Uses Haiku for fast, cheap analysis
      const transferAnalyzer = new TransferAnalyzerService(settings.aiApiKey);

      // PRE-ANALYSIS: Check if we should transfer BEFORE generating response
      logger.info('TransferAnalyzer: Starting pre-analysis', { 
        userMessage: userMessage.slice(0, 100),
        historyLength: conversationHistory.length 
      });
      
      const preAnalysis = await transferAnalyzer.preAnalyze(
        userMessage,
        conversationHistory,
        companyId
      );

      // If TRANSFER_CERTAIN, transfer immediately without generating response
      if (preAnalysis.decision === 'TRANSFER_CERTAIN') {
        logger.info('TransferAnalyzer: PRE-ANALYSIS decided TRANSFER_CERTAIN', {
          department: preAnalysis.departmentName,
          confidence: preAnalysis.confidence,
          reason: preAnalysis.reason,
        });

        try {
          const transferMessage = preAnalysis.departmentName 
            ? `Entendi! Vou transferir você para o setor de ${preAnalysis.departmentName}. Um de nossos atendentes vai continuar seu atendimento em breve. 🙏`
            : `Entendi! Vou transferir você para um de nossos atendentes humanos. Aguarde um momento, por favor. 🙏`;
          
          await this.sendAIResponse(ticketId, companyId, transferMessage, ticket, contact);
          await this.transferToHuman(ticketId, companyId, ticket.connectionId, preAnalysis.departmentId);
        } catch (transferError: any) {
          logger.error('Transfer error (pre-analysis):', {
            message: transferError?.message,
            stack: transferError?.stack?.slice(0, 500),
          });
        }
        return;
      }

      // If NO_TRANSFER (certain), generate response without post-analysis
      if (preAnalysis.decision === 'NO_TRANSFER') {
        logger.info('TransferAnalyzer: PRE-ANALYSIS decided NO_TRANSFER', {
          confidence: preAnalysis.confidence,
          reason: preAnalysis.reason,
        });

        const response = await aiService.generateResponse(
          builtContext.systemPrompt,
          userMessage,
          builtContext.context,
          {
            model: modelToUse,
            temperature: aiConfig.temperature || 0.7,
            maxTokens: aiConfig.maxTokens || 1000,
          }
        );

        if (response) {
          const responseValidation = builtContext.guardrails.validateAIResponse(response, userMessage);
          let finalResponse = response;
          if (!responseValidation.isValid && responseValidation.suggestedResponse) {
            finalResponse = responseValidation.suggestedResponse;
            logger.warn('AI response replaced by guardrails:', { ticketId, reason: responseValidation.reason });
          }
          await this.sendAIResponse(ticketId, companyId, finalResponse, ticket, contact);
        }
        return;
      }

      // UNCERTAIN case - Generate response and do POST-ANALYSIS
      logger.info('TransferAnalyzer: PRE-ANALYSIS decided UNCERTAIN, proceeding to generate response', {
        confidence: preAnalysis.confidence,
        reason: preAnalysis.reason,
      });

      const response = await aiService.generateResponse(
        builtContext.systemPrompt,
        userMessage,
        builtContext.context,
        {
          model: modelToUse,
          temperature: aiConfig.temperature || 0.7,
          maxTokens: aiConfig.maxTokens || 1000,
        }
      );

      // Validate AI response with guardrails
      if (response) {
        const responseValidation = builtContext.guardrails.validateAIResponse(response, userMessage);
        
        let finalResponse = response;
        if (!responseValidation.isValid && responseValidation.suggestedResponse) {
          finalResponse = responseValidation.suggestedResponse;
          logger.warn('AI response replaced by guardrails:', { ticketId, reason: responseValidation.reason });
        }

        logger.info(`AI response generated (first 200 chars): ${finalResponse.slice(0, 200)}`);

        // =================================================================
        // DETECÇÃO DIRETA de intenção de transferência no texto gerado
        // Isso é mais confiável que o postAnalysis para padrões óbvios
        // =================================================================
        const transferPatterns = [
          /vou transferir voc[eê]/i,
          /transferindo para/i,
          /vou te encaminhar/i,
          /vou conectar voc[eê]/i,
          /direcionando seu atendimento/i,
          /TRANSFERINDO PARA:/i,
          /vou passar voc[eê] para/i,
          /encaminhando para/i,
          /vou te direcionar/i,
          /transferir.{0,30}(comercial|suporte|financeiro|atendente|especialista|consultor)/i,
        ];
        const directTransferDetected = transferPatterns.some(p => p.test(finalResponse));

        if (directTransferDetected) {
          logger.info('DIRECT TRANSFER DETECTION: Transfer intent detected in AI response text, forcing transfer');
        }
        
        // POST-ANALYSIS: Check if generated response indicates transfer
        logger.info('TransferAnalyzer: Starting post-analysis on AI response');
        
        const postAnalysis = await transferAnalyzer.postAnalyze(
          userMessage,
          finalResponse,
          conversationHistory,
          companyId
        );

        // Forçar transferência se detecção direta encontrou padrão, mesmo que postAnalysis discorde
        const shouldTransfer = postAnalysis.shouldTransfer || directTransferDetected;

        if (shouldTransfer) {
          logger.info('TransferAnalyzer: TRANSFER decided', {
            department: postAnalysis.departmentName,
            reason: postAnalysis.reason,
            directDetection: directTransferDetected,
            postAnalysisAgrees: postAnalysis.shouldTransfer,
          });

          try {
            // Use adapted message if available, otherwise use generated response
            const messageToSend = postAnalysis.adaptedMessage || finalResponse;
            await this.sendAIResponse(ticketId, companyId, messageToSend, ticket, contact);
            await this.transferToHuman(ticketId, companyId, ticket.connectionId, postAnalysis.departmentId);
          } catch (transferError: any) {
            logger.error('Transfer error (post-analysis):', {
              message: transferError?.message,
              stack: transferError?.stack?.slice(0, 500),
            });
            // If transfer fails, the response was already sent
          }
          return;
        }

        // No transfer needed - send the response
        logger.info('TransferAnalyzer: POST-ANALYSIS decided NO transfer needed');
        await this.sendAIResponse(ticketId, companyId, finalResponse, ticket, contact);
      }
    } catch (error: any) {
      logger.error('AI processing error:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type,
        name: error?.name,
        stack: error?.stack?.slice(0, 500),
      });
    }
  }

  private static async sendAIResponse(
    ticketId: string,
    companyId: string,
    response: string,
    ticket: any,
    contact: any
  ): Promise<void> {
    // Get AI agent name
    const aiAgent = ticket.assignedToId ? await prisma.user.findUnique({
      where: { id: ticket.assignedToId },
      select: { name: true },
    }) : null;
    const aiName = aiAgent?.name || 'Assistente';

    // Check if response should be split into multiple messages
    // The AI uses |||SPLIT||| marker to indicate message breaks
    const messageParts = response.split('|||SPLIT|||').map(part => part.trim()).filter(part => part.length > 0);
    
    // If no split markers, check if message is too long and should be auto-split
    const finalParts = messageParts.length > 1 ? messageParts : this.autoSplitIfNeeded(response);
    
    logger.info(`Sending AI response in ${finalParts.length} part(s)`);

    const { WhatsAppService } = await import('./whatsapp/whatsapp.service.js');
    const whatsappService = new WhatsAppService(ticket.connection);
    const io = (global as any).io;

    let lastMessage: any = null;

    for (let i = 0; i < finalParts.length; i++) {
      // Filtrar blocos de "nota interna" que a IA pode gerar indevidamente (ex: ---TRANSFERINDO PARA:)
      const cleanedPart = finalParts[i]
        .replace(/---\s*\n?\*?\*?TRANSFERINDO PARA:[\s\S]*$/i, '')
        .replace(/---\s*\n?\*?\*?TRANSFER[ÊE]NCIA:[\s\S]*$/i, '')
        .replace(/\*?\*?TRANSFERINDO PARA:\s*[\s\S]*$/i, '')
        .trim();
      if (!cleanedPart) continue; // Pula partes que só tinham nota interna

      const part = cleanedPart;
      
      // Add delay between messages to simulate human typing (except for first message)
      if (i > 0) {
        const typingDelay = this.calculateTypingDelay(part);
        logger.debug(`Waiting ${typingDelay}ms before sending next message...`);
        await new Promise(resolve => setTimeout(resolve, typingDelay));
      }

      // Save message to database
      const aiMessage = await prisma.message.create({
        data: {
          type: 'TEXT',
          content: part,
          isFromMe: true,
          isAIGenerated: true,
          status: 'PENDING',
          ticketId,
          senderId: ticket.assignedToId,
          connectionId: ticket.connectionId,
        },
      });
      sendOutboundEvent(companyId, 'message_created', {
        ticketId,
        companyId,
        messageId: aiMessage.id,
        type: aiMessage.type,
        content: aiMessage.content ?? undefined,
        isFromMe: aiMessage.isFromMe,
        createdAt: aiMessage.createdAt.toISOString(),
      });

      // Only add name to first message
      const messageContent = i === 0 ? `*${aiName}:*\n${part}` : part;

      // Send via WhatsApp
      const result = await whatsappService.sendMessage(contact.phone, messageContent);

      lastMessage = await prisma.message.update({
        where: { id: aiMessage.id },
        data: {
          wamid: result.messageId,
          status: 'SENT',
          sentAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isAI: true,
            },
          },
          quoted: {
            select: {
              id: true,
              content: true,
              type: true,
              isFromMe: true,
            },
          },
        },
      });

      // Emit socket events for each message
      if (io) {
        // Normalize media URL before emitting
        const normalizedLastMessage = {
          ...lastMessage,
          mediaUrl: normalizeMediaUrl(lastMessage.mediaUrl),
        };
        
        io.to(`company:${companyId}`).emit('message:sent', {
          ...normalizedLastMessage,
          ticketId,
        });
        
        const ticketRoom = `ticket:${ticketId}`;
        logger.info(`[Socket] Preparing to emit message:new (AI response) to room ${ticketRoom} for message ${normalizedLastMessage.id}`);
        io.to(ticketRoom).emit('message:new', {
          ...normalizedLastMessage,
          ticketId,
        });
        logger.info(`[Socket] message:new (AI response) emitted for message ${normalizedLastMessage.id} to ticket ${ticketId} in room ${ticketRoom}`);
      }
    }

    // Update ticket with last message for sidebar
    if (io && lastMessage) {
      io.to(`company:${companyId}`).emit('ticket:updated', {
        id: ticketId,
        updatedAt: new Date().toISOString(),
        lastMessage: {
          id: lastMessage.id,
          type: 'TEXT',
          content: finalParts[finalParts.length - 1],
          isFromMe: true,
          createdAt: lastMessage.createdAt,
        },
      });
    }
  }

  /**
   * Generate and send an opening message when a ticket is assigned to internal AI.
   * Builds context from conversation history and asks the AI to send a first message to the client.
   */
  static async generateAndSendOpeningMessage(ticketId: string, companyId: string): Promise<void> {
    try {
      const settings = await prisma.companySettings.findUnique({
        where: { companyId },
      });
      if (!settings?.aiEnabled || !settings.aiApiKey) {
        logger.debug(`[OpeningMessage] AI not enabled or no API key for company ${companyId}`);
        return;
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          contact: true,
          connection: true,
          department: true,
          company: true,
          assignedTo: {
            select: { id: true, name: true, isAI: true, aiConfig: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 30,
            where: { type: { not: 'SYSTEM' } },
          },
        },
      });

      if (!ticket?.assignedTo?.isAI || !ticket.assignedTo.aiConfig) {
        logger.debug(`[OpeningMessage] Ticket ${ticketId} not assigned to internal AI`);
        return;
      }
      if (ExternalAIWebhookService.isExternalAI(ticket.assignedTo.aiConfig)) {
        logger.debug(`[OpeningMessage] Ticket ${ticketId} assigned to external AI, skip opening message`);
        return;
      }

      const aiConfig = ticket.assignedTo.aiConfig as any;
      const syntheticMessage =
        'Esta conversa foi transferida para você. Com base no histórico abaixo, envie uma única mensagem inicial ao cliente, apresentando-se e continuando o atendimento de forma natural. Não repita o histórico na resposta.';

      const contextBuilder = new ContextBuilderService({
        personalityConfig: {
          tone: (aiConfig.personalityTone || settings.aiPersonalityTone || 'friendly') as any,
          style: (aiConfig.personalityStyle || settings.aiPersonalityStyle || 'conversational') as any,
          useEmojis: aiConfig.useEmojis ?? settings.aiUseEmojis ?? true,
          useClientName: aiConfig.useClientName ?? settings.aiUseClientName ?? true,
        },
        guardrailsConfig: {
          enabled: aiConfig.guardrailsEnabled ?? settings.aiGuardrailsEnabled ?? true,
        },
      });

      const builtContext = await contextBuilder.buildContext(ticketId, syntheticMessage, {
        name: ticket.assignedTo.name,
        systemPrompt: aiConfig.systemPrompt || settings.aiSystemPrompt,
        trainingData: aiConfig.trainingData || '',
      });

      const provider = settings.aiProvider || 'openai';
      const aiService = new AIService(provider, settings.aiApiKey);
      let modelToUse = aiConfig.model || settings.aiDefaultModel;
      const isOpenAIModel = modelToUse?.startsWith('gpt-') || modelToUse?.includes('gpt');
      const isAnthropicModel = modelToUse?.startsWith('claude-');
      if (provider === 'anthropic' && isOpenAIModel) {
        modelToUse = settings.aiDefaultModel || 'claude-sonnet-4-6';
      } else if (provider === 'openai' && isAnthropicModel) {
        modelToUse = settings.aiDefaultModel || 'gpt-4-turbo-preview';
      }

      const response = await aiService.generateResponse(
        builtContext.systemPrompt,
        syntheticMessage,
        builtContext.context,
        {
          model: modelToUse,
          temperature: aiConfig.temperature ?? 0.7,
          maxTokens: aiConfig.maxTokens ?? 1000,
        }
      );

      if (response?.trim()) {
        const responseValidation = builtContext.guardrails.validateAIResponse(response, syntheticMessage);
        const finalResponse = responseValidation.isValid ? response : (responseValidation.suggestedResponse || response);
        await this.sendAIResponse(ticketId, companyId, finalResponse, ticket, ticket.contact);
        logger.info(`[OpeningMessage] Sent opening message for ticket ${ticketId}`);
      }
    } catch (err: any) {
      logger.error(`[OpeningMessage] Error for ticket ${ticketId}:`, { message: err?.message });
    }
  }

  /**
   * Calculate typing delay based on message length
   * Simulates human typing speed (roughly 40-60 WPM)
   */
  private static calculateTypingDelay(message: string): number {
    const wordsCount = message.split(/\s+/).length;
    // Base delay: 800ms + 100ms per word, capped at 3000ms
    const delay = Math.min(800 + (wordsCount * 100), 3000);
    // Add some randomness (±200ms)
    return delay + (Math.random() * 400 - 200);
  }

  /**
   * Auto-split long messages into smaller chunks
   * Only if the message is over 300 chars and has natural break points
   */
  private static autoSplitIfNeeded(response: string): string[] {
    // If message is short enough, don't split
    if (response.length < 300) {
      return [response];
    }

    // Try to split on double newlines (paragraph breaks)
    const paragraphs = response.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 1) {
      // Combine very short paragraphs with next one
      const combined: string[] = [];
      let current = '';
      
      for (const para of paragraphs) {
        if (current.length + para.length < 200) {
          current = current ? `${current}\n\n${para}` : para;
        } else {
          if (current) combined.push(current);
          current = para;
        }
      }
      if (current) combined.push(current);
      
      // Only split if we have 2-4 parts
      if (combined.length >= 2 && combined.length <= 4) {
        return combined;
      }
    }

    // If no natural break points, return as single message
    return [response];
  }

  // Legacy keyword-based functions removed - replaced by TransferAnalyzerService
  // which uses Claude Haiku for semantic analysis instead of keyword matching

  private static async transferToHuman(
    ticketId: string,
    companyId: string,
    connectionId?: string | null,
    departmentId?: string | null
  ): Promise<void> {
    // Build update data
    const updateData: any = {
      isAIHandled: false,
      humanTakeoverAt: new Date(),
      assignedToId: null,
      status: 'PENDING',
    };

    // If departmentId is provided, assign to that department
    if (departmentId) {
      updateData.departmentId = departmentId;
      logger.info(`Transferring ticket ${ticketId} to department ${departmentId}`);

      // Check if the target department has an external AI user
      const externalAI = await ExternalAIWebhookService.findExternalAIForDepartment(departmentId);
      if (externalAI) {
        logger.info(`[ExternalAI] Department ${departmentId} has external AI: ${externalAI.name} (${externalAI.id})`);
        updateData.assignedToId = externalAI.id;
        updateData.isAIHandled = true;
        updateData.status = 'IN_PROGRESS';
        updateData.humanTakeoverAt = null;
        updateData.aiTakeoverAt = new Date();
      }
    }

    // Update ticket status
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            isClient: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isAI: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            isFromMe: true,
          },
        },
      },
    });

    await prisma.activity.create({
      data: {
        type: 'AI_TAKEOVER',
        description: updateData.isAIHandled
          ? `AI transferred to external AI ${updatedTicket.assignedTo?.name || 'Unknown'} in department ${updatedTicket.department?.name || 'Unknown'}`
          : departmentId 
            ? `AI transferred to department ${updatedTicket.department?.name || 'Unknown'}`
            : 'AI transferred to human queue',
        ticketId,
      },
    });

    // Notify via socket - emit complete ticket data for real-time update
    const io = (global as any).io;
    if (io) {
      // Emit ticket:updated with full ticket data so frontend updates immediately
      io.to(`company:${companyId}`).emit('ticket:updated', {
        ...updatedTicket,
        _count: { messages: 0 },
        lastMessage: updatedTicket.messages[0] || null,
      });

      // Also emit ticket:transferred for any specific handling
      io.to(`company:${companyId}`).emit('ticket:transferred', {
        ticketId,
        departmentId: updatedTicket.departmentId,
        departmentName: updatedTicket.department?.name,
        reason: updateData.isAIHandled ? 'AI_TO_EXTERNAL_AI' : 'AI_TO_HUMAN',
      });

      // Notify the specific ticket room
      io.to(`ticket:${ticketId}`).emit('ticket:statusChanged', {
        ticketId,
        status: updatedTicket.status,
        departmentId: updatedTicket.departmentId,
        departmentName: updatedTicket.department?.name,
        assignedToId: updatedTicket.assignedToId,
        isAIHandled: updatedTicket.isAIHandled,
      });
    }

    // If assigned to external AI, send webhook and process synchronous response
    if (updateData.isAIHandled && updateData.assignedToId) {
      const externalAIUser = await prisma.user.findUnique({
        where: { id: updateData.assignedToId },
        select: { id: true, name: true, aiConfig: true },
      });
      if (externalAIUser && ExternalAIWebhookService.isExternalAI(externalAIUser.aiConfig)) {
        try {
          const webhookResult = await ExternalAIWebhookService.sendTicketAssigned(
            externalAIUser,
            {
              id: updatedTicket.id,
              protocol: updatedTicket.protocol,
              status: updatedTicket.status,
              departmentId: updatedTicket.departmentId,
              department: updatedTicket.department,
              contact: updatedTicket.contact as any,
            }
          );

          // Processar resposta síncrona da IA externa (se ela respondeu)
          if (webhookResult.success && webhookResult.data) {
            logger.info(`[ExternalAI] Processing synchronous response from ticket.assigned webhook for ticket ${updatedTicket.id}`);
            await this.processExternalAIResponse(
              webhookResult.data,
              {
                id: updatedTicket.id,
                protocol: updatedTicket.protocol,
                status: updatedTicket.status,
                departmentId: updatedTicket.departmentId,
                department: updatedTicket.department as any,
                contact: updatedTicket.contact as any,
                connectionId,
              },
              {
                id: externalAIUser.id,
                name: externalAIUser.name || 'IA Externa',
                aiConfig: externalAIUser.aiConfig,
              },
              companyId
            );
          }
        } catch (webhookError: any) {
          logger.error(`[ExternalAI] Error sending/processing ticket.assigned webhook for ticket ${updatedTicket.id}:`, {
            message: webhookError?.message,
            stack: webhookError?.stack?.slice(0, 500),
          });
        }
      }
    }
    
    logger.info(`Ticket ${ticketId} transferred${updateData.isAIHandled ? ` to external AI ${updatedTicket.assignedTo?.name}` : ` to human queue`}${departmentId ? ` (department: ${updatedTicket.department?.name})` : ''}`);
  }
}
