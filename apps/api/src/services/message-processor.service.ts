import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { generateProtocol } from '../utils/protocol.js';
import { AIService } from './ai/ai.service.js';
import { NotionService } from './notion/notion.service.js';
import { SLAService } from './sla/sla.service.js';

interface IncomingMessage {
  connectionId: string;
  companyId: string;
  from: string;
  wamid: string;
  type: string;
  content: string;
  mediaUrl?: string;
  timestamp: Date;
}

export class MessageProcessor {
  static async processIncoming(data: IncomingMessage): Promise<void> {
    try {
      const { connectionId, companyId, from, wamid, type, content, mediaUrl, timestamp } = data;

      // Get or create contact
      let contact = await prisma.contact.findFirst({
        where: { phone: from, companyId },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            phone: from,
            companyId,
          },
        });

        // Try to sync with Notion in background
        this.syncContactWithNotion(contact.id, companyId).catch((err) =>
          logger.error('Notion sync error:', err)
        );
      }

      // Get or create ticket
      let ticket = await prisma.ticket.findFirst({
        where: {
          contactId: contact.id,
          status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
        },
        include: {
          assignedTo: true,
        },
      });

      if (!ticket) {
        // Get AI user for initial handling
        const aiUser = await prisma.user.findFirst({
          where: {
            companyId,
            isAI: true,
            isActive: true,
          },
        });

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
            isAIHandled: !!aiUser,
            aiTakeoverAt: aiUser ? new Date() : null,
            slaDeadline,
            contactId: contact.id,
            connectionId,
            companyId,
            assignedToId: aiUser?.id,
            departmentId: defaultDept?.id,
          },
          include: {
            assignedTo: true,
          },
        });

        // Create activity
        await prisma.activity.create({
          data: {
            type: 'TICKET_CREATED',
            description: `New ticket created from ${from}`,
            ticketId: ticket.id,
          },
        });
      }

      // Save message
      const message = await prisma.message.create({
        data: {
          wamid,
          type: type as any,
          content,
          mediaUrl,
          isFromMe: false,
          status: 'RECEIVED',
          ticketId: ticket.id,
          connectionId,
          createdAt: timestamp,
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

      // Emit socket event
      const io = (global as any).io;
      if (io) {
        io.to(`company:${companyId}`).emit('message:received', {
          message,
          ticket: {
            id: ticket.id,
            contactId: contact.id,
            contact: {
              id: contact.id,
              name: contact.name,
              phone: contact.phone,
            },
          },
        });
      }

      // If AI is handling, process with AI
      if (ticket.isAIHandled && ticket.assignedTo?.isAI) {
        await this.processWithAI(ticket.id, companyId, content, contact);
      }
    } catch (error) {
      logger.error('Message processing error:', error);
      throw error;
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

      if (!settings?.aiEnabled || !settings?.aiApiKey) {
        return;
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          assignedTo: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          connection: true,
        },
      });

      if (!ticket || !ticket.assignedTo?.aiConfig) {
        return;
      }

      const aiConfig = ticket.assignedTo.aiConfig as any;

      // Check for transfer triggers
      const shouldTransfer = this.checkTransferTriggers(userMessage, aiConfig);

      if (shouldTransfer) {
        await this.transferToHuman(ticketId, companyId);
        return;
      }

      // Generate AI response
      const aiService = new AIService(
        settings.aiProvider || 'openai',
        settings.aiApiKey
      );

      const context = {
        contactName: contact.name || 'Cliente',
        contactPhone: contact.phone,
        isClient: contact.isClient,
        isExClient: contact.isExClient,
        history: ticket.messages.reverse().map((m) => ({
          role: m.isFromMe ? 'assistant' : 'user',
          content: m.content,
        })),
      };

      const response = await aiService.generateResponse(
        aiConfig.systemPrompt || settings.aiSystemPrompt,
        userMessage,
        context,
        {
          model: aiConfig.model || settings.aiDefaultModel,
          temperature: aiConfig.temperature || 0.7,
          maxTokens: aiConfig.maxTokens || 500,
        }
      );

      // Save and send AI response
      if (response) {
        const aiMessage = await prisma.message.create({
          data: {
            type: 'TEXT',
            content: response,
            isFromMe: true,
            isAIGenerated: true,
            status: 'PENDING',
            ticketId,
            senderId: ticket.assignedToId,
            connectionId: ticket.connectionId,
          },
        });

        // Send via WhatsApp
        const { WhatsAppService } = await import('./whatsapp/whatsapp.service.js');
        const whatsappService = new WhatsAppService(ticket.connection);
        const result = await whatsappService.sendMessage(contact.phone, response);

        await prisma.message.update({
          where: { id: aiMessage.id },
          data: {
            wamid: result.messageId,
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        // Emit socket event
        const io = (global as any).io;
        if (io) {
          io.to(`company:${companyId}`).emit('message:sent', aiMessage);
        }
      }
    } catch (error) {
      logger.error('AI processing error:', error);
    }
  }

  private static checkTransferTriggers(
    message: string,
    aiConfig: any
  ): boolean {
    const triggerKeywords = aiConfig.triggerKeywords || [
      'humano',
      'atendente',
      'pessoa',
      'falar com alguém',
      'reclamação',
    ];

    const lowerMessage = message.toLowerCase();
    return triggerKeywords.some((keyword: string) =>
      lowerMessage.includes(keyword.toLowerCase())
    );
  }

  private static async transferToHuman(
    ticketId: string,
    companyId: string
  ): Promise<void> {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isAIHandled: false,
        assignedToId: null,
        status: 'PENDING',
      },
    });

    await prisma.activity.create({
      data: {
        type: 'AI_TAKEOVER',
        description: 'AI transferred to human queue',
        ticketId,
      },
    });

    // Notify via socket
    const io = (global as any).io;
    if (io) {
      io.to(`company:${companyId}`).emit('ticket:transferred', {
        ticketId,
        reason: 'AI_TO_HUMAN',
      });
    }
  }
}
