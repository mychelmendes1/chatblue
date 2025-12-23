import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service.js';

const router = Router();

// Get messages for a ticket
router.get('/ticket/:ticketId', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.ticketId,
        companyId: req.user!.companyId,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { ticketId: req.params.ticketId },
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
        },
        orderBy: { createdAt: 'asc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.message.count({ where: { ticketId: req.params.ticketId } }),
    ]);

    res.json({
      messages,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/ticket/:ticketId', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { content, type = 'TEXT', quotedId } = z.object({
      content: z.string().min(1),
      type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).optional(),
      quotedId: z.string().cuid().optional(),
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

    // Create message in database
    const message = await prisma.message.create({
      data: {
        type: type || 'TEXT',
        content,
        isFromMe: true,
        isAIGenerated: false,
        status: 'PENDING',
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
      },
    });

    // Send via WhatsApp
    const whatsappService = new WhatsAppService(ticket.connection);
    const result = await whatsappService.sendMessage(ticket.contact.phone, content, type);

    // Update message with WhatsApp ID
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        wamid: result.messageId,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    // Update ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date(),
        // Set first response time if not set
        ...(ticket.firstResponse === null && {
          firstResponse: new Date(),
          responseTime: Math.floor((Date.now() - ticket.createdAt.getTime()) / 1000),
        }),
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`ticket:${ticket.id}`).emit('message:sent', updatedMessage);

    res.status(201).json(updatedMessage);
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
    const whatsappService = new WhatsAppService(ticket.connection);
    const result = await whatsappService.sendMedia(
      ticket.contact.phone,
      mediaUrl,
      mediaType,
      caption
    );

    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        wamid: result.messageId,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`ticket:${ticket.id}`).emit('message:sent', updatedMessage);

    res.status(201).json(updatedMessage);
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

export { router as messageRouter };
