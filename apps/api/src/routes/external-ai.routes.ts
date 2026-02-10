import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticateExternalAI } from '../middlewares/external-ai-auth.middleware.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../middlewares/error.middleware.js';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service.js';
import { ExternalAIWebhookService } from '../services/external-ai/external-ai-webhook.service.js';
import { logger } from '../config/logger.js';
import { normalizeMediaUrl } from '../utils/media-url.util.js';

const router = Router();

// All routes require external AI authentication
router.use(authenticateExternalAI);

/**
 * Helper: Validate ticket belongs to the AI user's company and is assigned to them
 */
async function validateTicketAccess(ticketId: string, aiUser: { id: string; companyId: string }) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      companyId: aiUser.companyId,
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      connection: true,
      department: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          isAI: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  return ticket;
}

/**
 * Helper: Get an active WhatsApp connection for sending messages
 */
async function getActiveConnection(ticket: any) {
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { id: ticket.connectionId },
  });

  if (!connection || connection.status !== 'CONNECTED' || !connection.isActive) {
    // Try to find another active connection
    const activeConnection = await prisma.whatsAppConnection.findFirst({
      where: {
        companyId: ticket.companyId,
        status: 'CONNECTED',
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { lastConnected: 'desc' },
      ],
    });

    if (!activeConnection) {
      throw new ValidationError('No active WhatsApp connection available');
    }

    // Update ticket to use the new connection
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { connectionId: activeConnection.id },
    });

    return activeConnection;
  }

  return connection;
}

// ============================================================================
// POST /messages - Send a message (text or media) on behalf of the external AI
// ============================================================================
router.post('/messages', async (req, res, next) => {
  try {
    const { ticketId, content, type = 'TEXT', mediaUrl, caption } = z.object({
      ticketId: z.string().min(1),
      content: z.string().optional(),
      type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).optional(),
      mediaUrl: z.string().url().optional(),
      caption: z.string().optional(),
    }).parse(req.body);

    // Validate: text messages need content, media messages need mediaUrl
    if (type === 'TEXT' && !content) {
      throw new ValidationError('Content is required for text messages');
    }
    if (['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(type || '') && !mediaUrl) {
      throw new ValidationError('mediaUrl is required for media messages');
    }

    const ticket = await validateTicketAccess(ticketId, req.aiUser!);
    const connection = await getActiveConnection(ticket);

    const whatsappService = new WhatsAppService(connection);

    // Format message with AI agent name
    const aiName = req.aiUser!.name || 'Assistente';

    // Create message in database
    const message = await prisma.message.create({
      data: {
        type: type || 'TEXT',
        content: content || caption || null,
        mediaUrl: mediaUrl || null,
        isFromMe: true,
        isAIGenerated: true,
        status: 'PENDING',
        ticketId: ticket.id,
        senderId: req.aiUser!.id,
        connectionId: connection.id,
      },
    });

    let result: { messageId: string; finalMediaUrl?: string };

    if (type === 'TEXT' || !mediaUrl) {
      // Send text message
      const formattedContent = `*${aiName}:*\n${content}`;
      result = await whatsappService.sendMessage(ticket.contact.phone, formattedContent);
    } else {
      // Send media message
      result = await whatsappService.sendMedia(
        ticket.contact.phone,
        mediaUrl,
        type || 'IMAGE',
        caption ? `*${aiName}:*\n${caption}` : undefined
      );
    }

    // Update message with WhatsApp ID
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        wamid: result.messageId,
        status: 'SENT',
        sentAt: new Date(),
        ...(result.finalMediaUrl && { mediaUrl: result.finalMediaUrl }),
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

    // Update ticket status and timestamps
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date(),
        status: ticket.status === 'PENDING' ? 'IN_PROGRESS' : ticket.status,
        ...(ticket.firstResponse === null && {
          firstResponse: new Date(),
          responseTime: Math.floor((Date.now() - ticket.createdAt.getTime()) / 1000),
        }),
      },
    });

    // Emit socket events
    const io = (global as any).io;
    if (io) {
      io.to(`ticket:${ticket.id}`).emit('message:sent', {
        ...updatedMessage,
        mediaUrl: normalizeMediaUrl(updatedMessage.mediaUrl),
      });
    }

    logger.info(`[ExternalAI] Message sent for ticket ${ticket.id} by ${req.aiUser!.name}`);

    res.json({
      success: true,
      message: {
        id: updatedMessage.id,
        type: updatedMessage.type,
        content: updatedMessage.content,
        status: updatedMessage.status,
        createdAt: updatedMessage.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /tickets/:id/transfer - Transfer ticket to another department or user
// ============================================================================
router.post('/tickets/:id/transfer', async (req, res, next) => {
  try {
    const { toDepartmentId, toUserId, reason } = z.object({
      toDepartmentId: z.string().optional(),
      toUserId: z.string().optional(),
      reason: z.string().optional(),
    }).parse(req.body);

    if (!toDepartmentId && !toUserId) {
      throw new ValidationError('Must specify toDepartmentId or toUserId');
    }

    const ticket = await validateTicketAccess(req.params.id, req.aiUser!);

    // Build update data
    const updateData: any = {
      status: 'PENDING',
      isAIHandled: false,
      humanTakeoverAt: new Date(),
      assignedToId: null,
    };

    if (toDepartmentId) {
      updateData.departmentId = toDepartmentId;
    }
    if (toUserId) {
      updateData.assignedToId = toUserId;
    }

    // Check if target department has another external AI
    if (toDepartmentId && !toUserId) {
      const externalAI = await ExternalAIWebhookService.findExternalAIForDepartment(toDepartmentId);
      if (externalAI && externalAI.id !== req.aiUser!.id) {
        // Assign to the new external AI
        updateData.assignedToId = externalAI.id;
        updateData.isAIHandled = true;
        updateData.status = 'IN_PROGRESS';
      }
    }

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

    // Create transfer record
    await prisma.ticketTransfer.create({
      data: {
        ticketId: ticket.id,
        fromUserId: req.aiUser!.id,
        toUserId: updateData.assignedToId,
        fromDeptId: ticket.departmentId,
        toDeptId: toDepartmentId || null,
        transferType: toDepartmentId ? 'DEPT_TO_DEPT' : 'USER_TO_USER',
        reason: reason || 'Transferred by external AI',
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_TRANSFERRED',
        description: `Ticket transferred by external AI ${req.aiUser!.name}`,
        ticketId: ticket.id,
        userId: req.aiUser!.id,
        metadata: { reason, toDepartmentId, toUserId },
      },
    });

    // Get target name for system message
    let toName = '';
    if (toUserId) {
      const toUser = await prisma.user.findUnique({ where: { id: toUserId }, select: { name: true } });
      toName = toUser?.name || 'outro atendente';
    } else if (toDepartmentId) {
      const toDept = await prisma.department.findUnique({ where: { id: toDepartmentId }, select: { name: true } });
      toName = `departamento ${toDept?.name || ''}`;
    }

    // Create system message
    const systemMessage = await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: `Atendimento transferido por ${req.aiUser!.name} (IA) para ${toName}`,
        isFromMe: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Emit socket events
    const io = (global as any).io;
    if (io) {
      io.to(`company:${req.aiUser!.companyId}`).emit('ticket:transferred', {
        ticketId: ticket.id,
        fromUserId: req.aiUser!.id,
        toUserId: updateData.assignedToId,
        toDepartmentId,
      });
      io.to(`company:${req.aiUser!.companyId}`).emit('ticket:updated', {
        ...updatedTicket,
        _count: { messages: 0 },
      });
      io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

      // Notify target user
      if (updateData.assignedToId && !updateData.isAIHandled) {
        io.to(`user:${updateData.assignedToId}`).emit('notification', {
          type: 'ticket_assigned',
          title: 'Nova conversa atribuída',
          message: `Uma conversa com ${updatedTicket.contact?.name || 'cliente'} foi transferida para você`,
          ticketId: ticket.id,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }

    // If transferred to a department with external AI, send webhook
    if (updateData.isAIHandled && updateData.assignedToId) {
      const newAIUser = await prisma.user.findUnique({
        where: { id: updateData.assignedToId },
        select: { id: true, aiConfig: true },
      });
      if (newAIUser && ExternalAIWebhookService.isExternalAI(newAIUser.aiConfig)) {
        await ExternalAIWebhookService.sendTicketAssigned(
          newAIUser,
          { ...updatedTicket, contact: ticket.contact }
        );
      }
    }

    logger.info(`[ExternalAI] Ticket ${ticket.id} transferred by ${req.aiUser!.name}`);

    res.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        departmentId: updatedTicket.departmentId,
        departmentName: updatedTicket.department?.name,
        assignedToId: updatedTicket.assignedToId,
        assignedToName: updatedTicket.assignedTo?.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /tickets/:id/resolve - Resolve a ticket
// ============================================================================
router.post('/tickets/:id/resolve', async (req, res, next) => {
  try {
    const { reason } = z.object({
      reason: z.string().optional(),
    }).parse(req.body);

    const ticket = await validateTicketAccess(req.params.id, req.aiUser!);

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        isAIHandled: false,
      },
      include: {
        contact: {
          select: { id: true, name: true, phone: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_RESOLVED',
        description: reason || `Ticket resolved by external AI ${req.aiUser!.name}`,
        ticketId: ticket.id,
        userId: req.aiUser!.id,
      },
    });

    // Create system message
    await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: `Atendimento resolvido por ${req.aiUser!.name} (IA)${reason ? `: ${reason}` : ''}`,
        isFromMe: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Emit socket events
    const io = (global as any).io;
    if (io) {
      io.to(`company:${req.aiUser!.companyId}`).emit('ticket:updated', {
        ...updatedTicket,
        _count: { messages: 0 },
      });
      io.to(`ticket:${ticket.id}`).emit('ticket:statusChanged', {
        ticketId: ticket.id,
        status: 'RESOLVED',
      });
    }

    logger.info(`[ExternalAI] Ticket ${ticket.id} resolved by ${req.aiUser!.name}`);

    res.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /tickets/:id/close - Close a ticket
// ============================================================================
router.post('/tickets/:id/close', async (req, res, next) => {
  try {
    const { reason } = z.object({
      reason: z.string().optional(),
    }).parse(req.body);

    const ticket = await validateTicketAccess(req.params.id, req.aiUser!);

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        isAIHandled: false,
      },
      include: {
        contact: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_CLOSED',
        description: reason || `Ticket closed by external AI ${req.aiUser!.name}`,
        ticketId: ticket.id,
        userId: req.aiUser!.id,
      },
    });

    // Emit socket events
    const io = (global as any).io;
    if (io) {
      io.to(`company:${req.aiUser!.companyId}`).emit('ticket:updated', {
        ...updatedTicket,
        _count: { messages: 0 },
      });
    }

    logger.info(`[ExternalAI] Ticket ${ticket.id} closed by ${req.aiUser!.name}`);

    res.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /tickets/:id - Get ticket details
// ============================================================================
router.get('/tickets/:id', async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.aiUser!.companyId,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatar: true,
            isClient: true,
          },
        },
        department: {
          select: { id: true, name: true, color: true },
        },
        assignedTo: {
          select: { id: true, name: true, isAI: true },
        },
        connection: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    res.json({
      ticket: {
        id: ticket.id,
        protocol: ticket.protocol,
        status: ticket.status,
        isAIHandled: ticket.isAIHandled,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        contact: ticket.contact,
        department: ticket.department,
        assignedTo: ticket.assignedTo,
        connection: {
          id: ticket.connection.id,
          name: ticket.connection.name,
          type: ticket.connection.type,
        },
        messageCount: ticket._count.messages,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /tickets/:id/messages - Get conversation history
// ============================================================================
router.get('/tickets/:id/messages', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.aiUser!.companyId,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          type: true,
          content: true,
          mediaUrl: true,
          isFromMe: true,
          isAIGenerated: true,
          status: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              isAI: true,
            },
          },
        },
      }),
      prisma.message.count({ where: { ticketId: ticket.id } }),
    ]);

    const normalizedMessages = messages.map((msg: any) => ({
      ...msg,
      mediaUrl: normalizeMediaUrl(msg.mediaUrl),
      role: msg.type === 'SYSTEM'
        ? 'system'
        : msg.isFromMe
          ? 'assistant'
          : 'customer',
    }));

    res.json({
      messages: normalizedMessages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as externalAIRouter };
