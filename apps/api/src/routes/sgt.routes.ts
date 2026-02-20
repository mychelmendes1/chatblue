import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { generateProtocol } from '../utils/protocol.js';
import { ExternalAIWebhookService } from '../services/external-ai/external-ai-webhook.service.js';
import { MessageProcessor } from '../services/message-processor.service.js';
import { SLAService } from '../services/sla/sla.service.js';
import { sendOutboundEvent } from '../services/outbound-webhook.service.js';

const router = Router();

/** Schema do payload SGT */
const SgtInboundSchema = z.object({
  phone: z.string().min(10, 'Telefone é obrigatório (mín. 10 caracteres)'),
  message: z.string().min(1, 'Mensagem/contexto do lead é obrigatório'),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

/** Autenticação: X-API-Key ou Authorization Bearer = slug da empresa */
const authenticateSgt = async (req: any, res: any, next: any) => {
  try {
    const apiKey =
      req.headers['x-api-key'] ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!apiKey) {
      return res.status(401).json({ error: 'API Key é obrigatória (header X-API-Key ou Authorization: Bearer)' });
    }

    const company = await prisma.company.findFirst({
      where: {
        slug: apiKey.trim(),
        isActive: true,
      },
    });

    if (!company) {
      return res.status(401).json({ error: 'API Key inválida ou empresa inativa' });
    }

    req.companyId = company.id;
    req.company = company;
    next();
  } catch (error) {
    logger.error('SGT authentication error:', error);
    res.status(500).json({ error: 'Erro na autenticação' });
  }
};

/**
 * POST /inbound
 * Recebe lead do SGT: cria contato, ticket no departamento Comercial (IA externa) e envia BlueChatPayload para a IA.
 */
router.post('/inbound', authenticateSgt, async (req, res, next) => {
  try {
    const body = SgtInboundSchema.parse(req.body);
    const companyId = (req as any).companyId;

    const normalizedPhone = body.phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      return res.status(400).json({ error: 'Telefone inválido (mínimo 10 dígitos)' });
    }

    // Contato: buscar ou criar
    let contact = await prisma.contact.findFirst({
      where: {
        companyId,
        phone: normalizedPhone,
      },
    });

    if (contact) {
      const updates: { name?: string; email?: string } = {};
      if (body.name != null && body.name !== contact.name) updates.name = body.name;
      if (body.email != null && body.email !== '' && body.email !== contact.email) updates.email = body.email;
      if (Object.keys(updates).length > 0) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: updates,
        });
      }
    } else {
      contact = await prisma.contact.create({
        data: {
          companyId,
          phone: normalizedPhone,
          name: body.name || undefined,
          email: body.email && body.email !== '' ? body.email : undefined,
        },
      });
    }

    // Conexão WhatsApp ativa
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        companyId,
        isActive: true,
        status: 'CONNECTED',
      },
      orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
    });

    const connectionToUse =
      connection ||
      (await prisma.whatsAppConnection.findFirst({
        where: { companyId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
      }));

    if (!connectionToUse) {
      return res.status(400).json({
        error: 'Nenhuma conexão WhatsApp ativa encontrada para esta empresa',
      });
    }

    // Departamento "Comercial" com IA externa (Amélia)
    const commercialDept = await prisma.department.findFirst({
      where: {
        companyId,
        isActive: true,
        name: { contains: 'comercial', mode: 'insensitive' },
      },
      orderBy: { order: 'asc' },
    });

    if (!commercialDept) {
      return res.status(400).json({
        error: 'Departamento Comercial não encontrado para esta empresa',
      });
    }

    const aiUser = await ExternalAIWebhookService.findExternalAIForDepartment(commercialDept.id);
    if (!aiUser) {
      return res.status(400).json({
        error:
          'Departamento Comercial não possui atendente de IA externa configurado. Vincule um usuário IA externa ao departamento.',
      });
    }

    // SLA para o departamento comercial
    const slaDeadline = await SLAService.calculateDeadline(companyId, commercialDept.id);

    // Criar ticket atribuído à IA externa
    const protocol = generateProtocol();
    const ticket = await prisma.ticket.create({
      data: {
        protocol,
        status: 'PENDING',
        priority: 'MEDIUM',
        contactId: contact.id,
        connectionId: connectionToUse.id,
        companyId,
        departmentId: commercialDept.id,
        assignedToId: aiUser.id,
        isAIHandled: true,
        aiTakeoverAt: new Date(),
        slaDeadline,
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
        department: { select: { id: true, name: true } },
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

    // Activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_CREATED',
        description: `Ticket criado via SGT (aquecimento de leads) - lead encaminhado para IA`,
        ticketId: ticket.id,
      },
    });

    // Primeira mensagem: contexto do lead (como se fosse mensagem do cliente) para a IA
    const leadMessage = await prisma.message.create({
      data: {
        type: 'TEXT',
        content: body.message,
        isFromMe: false,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: connectionToUse.id,
      },
    });
    sendOutboundEvent(companyId, 'message_created', {
      ticketId: ticket.id,
      companyId,
      messageId: leadMessage.id,
      type: leadMessage.type,
      content: leadMessage.content ?? undefined,
      isFromMe: leadMessage.isFromMe,
      createdAt: leadMessage.createdAt.toISOString(),
    });

    // Enviar para a IA externa (BlueChatPayload via sendTicketAssigned)
    const ticketForWebhook = {
      id: ticket.id,
      protocol: ticket.protocol,
      status: ticket.status,
      departmentId: ticket.departmentId,
      department: ticket.department,
      contact: ticket.contact,
      connectionId: connectionToUse.id,
    };

    const webhookResult = await ExternalAIWebhookService.sendTicketAssigned(
      { id: aiUser.id, name: aiUser.name, aiConfig: aiUser.aiConfig },
      ticketForWebhook
    );

    // Opcional: se a IA retornar resposta (RESPOND) e autoReply estiver ativo, enviar ao cliente via WhatsApp
    if (webhookResult.success && webhookResult.data) {
      try {
        await MessageProcessor.processExternalAIResponse(
          webhookResult.data,
          {
            ...ticketForWebhook,
            connection: connectionToUse,
            companyId,
          },
          { id: aiUser.id, name: aiUser.name || 'IA Externa', aiConfig: aiUser.aiConfig },
          companyId
        );
      } catch (processErr: any) {
        logger.warn('[SGT] Erro ao processar resposta da IA (envio WhatsApp):', processErr?.message);
      }
    }

    // Socket: notificar painel do novo ticket
    const io = (req as any).app?.get?.('io');
    if (io) {
      const fullTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          contact: { select: { id: true, name: true, phone: true, avatar: true, isClient: true } },
          assignedTo: { select: { id: true, name: true, avatar: true, isAI: true } },
          department: { select: { id: true, name: true, color: true } },
          _count: { select: { messages: { where: { isFromMe: false, readAt: null } } } },
        },
      });
      if (fullTicket) {
        io.to(`company:${companyId}`).emit('ticket:created', { ...fullTicket, lastMessage: null });
      }
    }

    logger.info(`[SGT] Lead criado: ticket=${ticket.id}, protocol=${ticket.protocol}, contact=${contact.phone}`);

    return res.status(201).json({
      success: true,
      ticketId: ticket.id,
      protocol: ticket.protocol,
      contactId: contact.id,
      ...(webhookResult.data && {
        aiResponse: {
          action: webhookResult.data.action,
          text: webhookResult.data.response?.text,
        },
      }),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors,
      });
    }
    next(error);
  }
});

export default router;
