import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service.js';
import { logger } from '../config/logger.js';
import { normalizeMediaUrl } from '../utils/media-url.util.js';

const router = Router();

// Get messages for a ticket (including history from previous tickets)
router.get('/ticket/:ticketId', authenticate, ensureTenant, async (req, res, next) => {
  try {
    // Pagination: Default to 100 messages per page, allow up to 500
    const page = parseInt(req.query.page as string) || 1;
    const requestedLimit = parseInt(req.query.limit as string) || 100;
    const limit = Math.min(requestedLimit, 500); // Max 500 per request
    const includeHistory = req.query.includeHistory === 'true';

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.ticketId,
        companyId: req.user!.companyId,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Collect all ticket IDs for history (current + previous tickets)
    const ticketIds: string[] = [req.params.ticketId];
    
    if (includeHistory === 'true') {
      // Walk back through the ticket chain to get all previous tickets
      let currentTicket = ticket;
      while (currentTicket.previousTicketId) {
        ticketIds.unshift(currentTicket.previousTicketId); // Add to beginning
        const prevTicket = await prisma.ticket.findUnique({
          where: { id: currentTicket.previousTicketId },
        });
        if (!prevTicket) break;
        currentTicket = prevTicket;
      }
    }

    // Get total count first
    const total = await prisma.message.count({ where: { ticketId: { in: ticketIds } } });

    // For pagination, we want newest messages first (desc order)
    // Page 1 = most recent messages, Page 2 = older messages, etc.
    // Calculate skip: if total is 1000, page 1 (skip 0, take 100) gets messages 901-1000
    //                  page 2 (skip 100, take 100) gets messages 801-900, etc.
    const skip = Math.max(0, total - (page * limit));
    const actualTake = Math.min(limit, total - skip);

    const messages = await prisma.message.findMany({
      where: { ticketId: { in: ticketIds } },
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
          },
        },
        ticket: {
          select: {
            id: true,
            protocol: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Keep asc for proper chronological order
      skip: Math.max(0, skip),
      take: actualTake > 0 ? actualTake : 0,
    });

    // Normalize media URLs to use correct API_URL
    const normalizedMessages = messages.map((message: any) => ({
      ...message,
      mediaUrl: normalizeMediaUrl(message.mediaUrl),
      quoted: message.quoted ? {
        ...message.quoted,
        // Note: quoted messages typically don't have mediaUrl, but normalize if they do
      } : null,
    }));

    res.json({
      messages: normalizedMessages,
      ticketIds, // Return all ticket IDs for reference
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: (skip + actualTake) < total, // Has older messages if we haven't reached the end
      },
    });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/ticket/:ticketId', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { content, type = 'TEXT', quotedId, isInternal = false, mentionedUserIds = [] } = z.object({
      content: z.string().min(1),
      type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).optional(),
      quotedId: z.string().cuid().optional(),
      isInternal: z.boolean().optional(),
      mentionedUserIds: z.array(z.string()).optional(),
    }).parse(req.body);

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.ticketId,
        companyId: req.user!.companyId,
      },
      include: {
        contact: true,
        connection: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Get sender name for formatting
    const sender = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true },
    });

    // Create message in database
    const message = await prisma.message.create({
      data: {
        type: type || 'TEXT',
        content,
        isFromMe: true,
        isAIGenerated: false,
        isInternal,
        mentionedUserIds: mentionedUserIds || [],
        status: isInternal ? 'DELIVERED' : 'PENDING',
        ticketId: ticket.id,
        senderId: req.user!.userId,
        connectionId: ticket.connectionId,
        quotedId,
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

    let updatedMessage = message;

    // Only send to WhatsApp if not internal
    if (!isInternal) {
      // Format message with sender name in bold for WhatsApp
      const senderName = sender?.name || 'Atendente';
      const formattedContent = `*${senderName}:*\n\n${content}`;

      // Log contact phone for debugging
      logger.debug(`Sending message to contact phone: ${ticket.contact.phone} (ticket: ${ticket.id}, contact: ${ticket.contact.id})`);

      // Send via WhatsApp
      const whatsappService = new WhatsAppService(ticket.connection);
      const result = await whatsappService.sendMessage(ticket.contact.phone, formattedContent, type);

      // Update message with WhatsApp ID and SENT status
      updatedMessage = await prisma.message.update({
        where: { id: message.id },
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

      // Update ticket - auto-assign to agent if no one is assigned
      const shouldAssign = !ticket.assignedToId;
      const shouldChangeStatus = ticket.status === 'PENDING';
      
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          updatedAt: new Date(),
          // Auto-assign ticket to the agent who sends the first message
          ...(shouldAssign && {
            assignedToId: req.user!.userId,
          }),
          // Change status to IN_PROGRESS if it was PENDING
          ...(shouldChangeStatus && {
            status: 'IN_PROGRESS',
          }),
          // Set first response time if not set
          ...(ticket.firstResponse === null && {
            firstResponse: new Date(),
            responseTime: Math.floor((Date.now() - ticket.createdAt.getTime()) / 1000),
          }),
        },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatar: true,
              isClient: true,
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
              content: true,
              type: true,
              createdAt: true,
              isFromMe: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  isFromMe: false,
                  readAt: null,
                },
              },
            },
          },
        },
      });

      // Emit ticket update to update the ticket list for all users
      if (shouldAssign || shouldChangeStatus) {
        const io = req.app.get('io');
        io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);
        
        logger.info('Ticket auto-assigned', {
          ticketId: ticket.id,
          assignedToId: req.user!.userId,
          assignedToName: sender?.name,
          previousStatus: ticket.status,
          newStatus: updatedTicket.status,
        });
      }
    }

    // Emit socket event with updated message (with SENT status)
    const io = req.app.get('io');
    // Normalize media URL before emitting
    const normalizedUpdatedMessage = {
      ...updatedMessage,
      mediaUrl: normalizeMediaUrl(updatedMessage.mediaUrl),
      quoted: updatedMessage.quoted ? {
        ...updatedMessage.quoted,
        // Note: quoted messages typically don't have mediaUrl
      } : null,
    };
    io.to(`ticket:${ticket.id}`).emit('message:sent', normalizedUpdatedMessage);

    // Notify mentioned users
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      for (const userId of mentionedUserIds) {
        io.to(`user:${userId}`).emit('mention:received', {
          ticketId: ticket.id,
          message: normalizedUpdatedMessage,
          fromUser: sender?.name,
        });
      }
    }

    res.status(201).json(normalizedUpdatedMessage);
  } catch (error) {
    next(error);
  }
});

// Send media message
router.post('/ticket/:ticketId/media', authenticate, ensureTenant, async (req, res, next) => {
  try {
    // This would handle file upload via multer
    // For now, we'll accept a URL
    const { mediaUrl, mediaType, caption } = z.object({
      mediaUrl: z.string().url(),
      mediaType: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']),
      caption: z.string().optional(),
    }).parse(req.body);

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.ticketId,
        companyId: req.user!.companyId,
      },
      include: {
        contact: true,
        connection: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        type: mediaType,
        mediaUrl,
        caption,
        isFromMe: true,
        status: 'PENDING',
        ticketId: ticket.id,
        senderId: req.user!.userId,
        connectionId: ticket.connectionId,
      },
    });

    // Send via WhatsApp
    // Normalize URL to HTTPS before sending - Baileys needs to download the file
    const normalizedMediaUrl = normalizeMediaUrl(mediaUrl) || mediaUrl;
    const originalMediaUrl = message.mediaUrl; // Store original URL for comparison
    
    const whatsappService = new WhatsAppService(ticket.connection);
    const result = await whatsappService.sendMedia(
      ticket.contact.phone,
      normalizedMediaUrl,
      mediaType,
      caption
    );

    // Update message with WhatsApp ID, status, and final media URL (converted if audio)
    // For audio files, result.finalMediaUrl will be the converted OGG file URL
    logger.info(`[Media Send] result.finalMediaUrl: ${result.finalMediaUrl}, originalMediaUrl: ${originalMediaUrl}, normalizedMediaUrl: ${normalizedMediaUrl}`);
    
    const updateData: any = {
      wamid: result.messageId,
      status: 'SENT',
      sentAt: new Date(),
    };
    
    // If audio was converted, update mediaUrl to point to the converted OGG file
    // Compare with original URL (before normalization) to detect conversion
    const finalUrl = result.finalMediaUrl || normalizedMediaUrl;
    if (result.finalMediaUrl && result.finalMediaUrl !== originalMediaUrl && result.finalMediaUrl.includes('audio-converted')) {
      updateData.mediaUrl = result.finalMediaUrl;
      logger.info(`[Media Send] ✅ Updating message mediaUrl to converted file: ${result.finalMediaUrl} (was: ${originalMediaUrl})`);
    } else {
      logger.info(`[Media Send] ⚠️ NOT updating mediaUrl - finalMediaUrl: ${result.finalMediaUrl}, originalMediaUrl: ${originalMediaUrl}`);
    }

    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: updateData,
    });

    // Emit socket event
    const io = req.app.get('io');
    // Normalize media URL before emitting
    const normalizedUpdatedMessage = {
      ...updatedMessage,
      mediaUrl: normalizeMediaUrl(updatedMessage.mediaUrl),
    };
    io.to(`ticket:${ticket.id}`).emit('message:sent', normalizedUpdatedMessage);

    res.status(201).json(normalizedUpdatedMessage);
  } catch (error) {
    next(error);
  }
});

// Mark messages as read
router.post('/ticket/:ticketId/read', authenticate, ensureTenant, async (req, res, next) => {
  try {
    await prisma.message.updateMany({
      where: {
        ticketId: req.params.ticketId,
        isFromMe: false,
        readAt: null,
      },
      data: {
        readAt: new Date(),
        status: 'READ',
      },
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
});

// Send template message (Meta Cloud API only)
router.post('/template', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { ticketId, templateName, languageCode, components } = z.object({
      ticketId: z.string().cuid(),
      templateName: z.string().min(1),
      languageCode: z.string().min(2).default('pt_BR'),
      components: z.array(z.object({
        type: z.enum(['header', 'body', 'button']),
        parameters: z.array(z.object({
          type: z.enum(['text', 'currency', 'date_time', 'image', 'document', 'video']),
          text: z.string().optional(),
          currency: z.object({
            fallback_value: z.string(),
            code: z.string(),
            amount_1000: z.number(),
          }).optional(),
          date_time: z.object({
            fallback_value: z.string(),
          }).optional(),
          image: z.object({ link: z.string() }).optional(),
          document: z.object({ link: z.string(), filename: z.string().optional() }).optional(),
          video: z.object({ link: z.string() }).optional(),
        })).optional(),
        sub_type: z.string().optional(),
        index: z.number().optional(),
      })).optional(),
    }).parse(req.body);

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        companyId: req.user!.companyId,
      },
      include: {
        contact: true,
        connection: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Templates only work with Meta Cloud connections
    if (ticket.connection.type !== 'META_CLOUD') {
      return res.status(400).json({
        error: 'Templates are only available for Meta Cloud API connections',
      });
    }

    // Get sender name
    const sender = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true },
    });

    // Build template content preview (for the message record)
    const templateContent = `[Template: ${templateName}]`;

    // Create message in database
    const message = await prisma.message.create({
      data: {
        type: 'TEMPLATE',
        content: templateContent,
        isFromMe: true,
        isAIGenerated: false,
        isInternal: false,
        status: 'PENDING',
        ticketId: ticket.id,
        senderId: req.user!.userId,
        connectionId: ticket.connectionId,
        metadata: {
          templateName,
          languageCode,
          components,
        },
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

    // Send via WhatsApp
    const whatsappService = new WhatsAppService(ticket.connection);
    const result = await whatsappService.sendTemplate(
      ticket.contact.phone,
      templateName,
      languageCode,
      components
    );

    // Update message with WhatsApp ID and SENT status
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
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
      },
    });

    // Update ticket - auto-assign to agent if no one is assigned
    const shouldAssign = !ticket.assignedToId;
    const shouldChangeStatus = ticket.status === 'PENDING';
    
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date(),
        ...(shouldAssign && {
          assignedToId: req.user!.userId,
        }),
        ...(shouldChangeStatus && {
          status: 'IN_PROGRESS',
        }),
        ...(ticket.firstResponse === null && {
          firstResponse: new Date(),
          responseTime: Math.floor((Date.now() - ticket.createdAt.getTime()) / 1000),
        }),
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            isClient: true,
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
            content: true,
            type: true,
            createdAt: true,
            isFromMe: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isFromMe: false,
                readAt: null,
              },
            },
          },
        },
      },
    });

    // Emit socket events
    const io = req.app.get('io');
    io.to(`ticket:${ticket.id}`).emit('message:sent', updatedMessage);
    
    if (shouldAssign || shouldChangeStatus) {
      io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);
      
      logger.info('Template sent and ticket auto-assigned', {
        ticketId: ticket.id,
        templateName,
        assignedToId: req.user!.userId,
        assignedToName: sender?.name,
      });
    }

    res.status(201).json(updatedMessage);
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: req.params.id,
        ticket: {
          companyId: req.user!.companyId,
        },
      },
      include: {
        ticket: {
          include: {
            contact: true,
            connection: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Only allow deleting messages sent by the user (isFromMe = true)
    if (!message.isFromMe) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    // Check if message was already deleted
    if (message.deletedAt) {
      return res.status(400).json({ error: 'Message already deleted' });
    }

    // Delete message via WhatsApp (for everyone)
    if (message.wamid && message.ticket.connection) {
      try {
        const whatsappService = new WhatsAppService(message.ticket.connection);
        await whatsappService.deleteMessage(message.ticket.contact.phone, message.wamid);
        logger.info(`Message ${message.id} deleted via WhatsApp (wamid: ${message.wamid})`);
      } catch (error: any) {
        logger.error('Error deleting message via WhatsApp:', error);
        // Continue even if WhatsApp deletion fails - mark as deleted in our system
      }
    }

    // Mark message as deleted in database
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        deletedAt: new Date(),
        deletedBy: req.user!.userId,
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

    // Emit socket event
    const io = req.app.get('io');
    io.to(`ticket:${message.ticketId}`).emit('message:deleted', {
      messageId: message.id,
      deletedAt: updatedMessage.deletedAt,
      deletedBy: updatedMessage.deletedBy,
    });

    res.json(updatedMessage);
  } catch (error) {
    next(error);
  }
});

export { router as messageRouter };
