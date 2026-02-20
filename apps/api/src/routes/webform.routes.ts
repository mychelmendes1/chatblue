import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { generateProtocol } from '../utils/protocol.js';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service.js';
import { normalizeMediaUrl } from '../utils/media-url.util.js';
import { sendOutboundEvent } from '../services/outbound-webhook.service.js';

const router = Router();

// Middleware para autenticação via API Key
const authenticateWebform = async (req: any, res: any, next: any) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.body.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API Key é obrigatória' });
    }

    // Buscar empresa pela API key ou slug
    // Note: webformApiKey doesn't exist in schema, using slug as alternative
    const company = await prisma.company.findFirst({
      where: {
        slug: apiKey, // Using slug as API key alternative
        isActive: true,
      },
    });

    if (!company) {
      return res.status(401).json({ error: 'API Key inválida' });
    }

    // Adicionar companyId à requisição
    req.companyId = company.id;
    req.company = company;
    next();
  } catch (error) {
    logger.error('Webform authentication error:', error);
    res.status(500).json({ error: 'Erro na autenticação' });
  }
};

// API pública para receber formulários e criar conversas
router.post('/submit', authenticateWebform, async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      message,
      companySlug, // Opcional: slug da empresa (alternativa ao API key)
    } = z.object({
      name: z.string().min(1, 'Nome é obrigatório'),
      phone: z.string().min(10, 'Telefone é obrigatório'),
      email: z.string().email().optional(),
      message: z.string().min(1, 'Mensagem é obrigatória'),
      companySlug: z.string().optional(),
    }).parse(req.body);

    const companyId = (req as any).companyId;

    // Normalizar telefone (remover caracteres não numéricos)
    const normalizedPhone = phone.replace(/\D/g, '');

    // Verificar se já existe um contato com esse telefone
    let contact = await prisma.contact.findFirst({
      where: {
        companyId,
        phone: normalizedPhone,
      },
    });

    // Criar ou atualizar contato
    if (contact) {
      // Atualizar informações do contato se necessário
      const updateData: any = {};
      if (name && name !== contact.name) {
        updateData.name = name;
      }
      if (email && email !== contact.email) {
        updateData.email = email;
      }
      
      if (Object.keys(updateData).length > 0) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: updateData,
        });
      }
    } else {
      // Criar novo contato
      contact = await prisma.contact.create({
        data: {
          name,
          phone: normalizedPhone,
          email: email || undefined,
          companyId,
          isClient: true,
          isActive: true,
        },
      });
    }

    // Verificar se já existe um ticket aberto para este contato
    let ticket = await prisma.ticket.findFirst({
      where: {
        contactId: contact.id,
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
      },
      include: {
        connection: true,
      },
    });

    // Se não existe ticket aberto, criar um novo
    if (!ticket) {
      // Encontrar conexão WhatsApp ativa (priorizar conectadas)
      const connection = await prisma.whatsAppConnection.findFirst({
        where: {
          companyId,
          isActive: true,
          status: 'CONNECTED',
        },
      });

      // Se não encontrou conexão conectada, tentar qualquer conexão ativa
      const connectionToUse = connection || await prisma.whatsAppConnection.findFirst({
        where: {
          companyId,
          isActive: true,
        },
      });

      if (!connectionToUse) {
        return res.status(400).json({ 
          error: 'Nenhuma conexão WhatsApp ativa encontrada para esta empresa' 
        });
      }

      // Criar ticket
      const protocol = await generateProtocol();
      
      // Buscar departamento padrão (Triagem)
      const defaultDepartment = await prisma.department.findFirst({
        where: {
          companyId,
          name: { contains: 'Triagem', mode: 'insensitive' },
          isActive: true,
        },
      });

      ticket = await prisma.ticket.create({
        data: {
          protocol,
          status: 'PENDING',
          priority: 'MEDIUM',
          contactId: contact.id,
          connectionId: connectionToUse.id,
          companyId,
          departmentId: defaultDepartment?.id,
        },
        include: {
          connection: true,
          contact: true,
        },
      });

      // Criar activity (Activity model doesn't have companyId directly)
      await prisma.activity.create({
        data: {
          type: 'TICKET_CREATED',
          description: 'Ticket criado via formulário web',
          ticketId: ticket.id,
        },
      });
    }

    // Enviar mensagem de boas-vindas via WhatsApp
    try {
      // Verificar se a conexão está conectada antes de enviar
      if (ticket.connection.status !== 'CONNECTED') {
        logger.warn(`Connection ${ticket.connection.id} is not connected (status: ${ticket.connection.status}). Message will be queued.`);
      }

      const whatsappService = new WhatsAppService(ticket.connection);
      
      // Enviar mensagem de boas-vindas
      const result = await whatsappService.sendMessage(
        contact.phone,
        message
      );

      // Criar mensagem no banco de dados
      const welcomeMessage = await prisma.message.create({
        data: {
          type: 'TEXT',
          content: message,
          isFromMe: true,
          isAIGenerated: false,
          status: 'SENT',
          wamid: result.messageId,
          ticketId: ticket.id,
          connectionId: ticket.connectionId,
          sentAt: new Date(),
        },
      });
      sendOutboundEvent(companyId, 'message_created', {
        ticketId: ticket.id,
        companyId,
        messageId: welcomeMessage.id,
        type: welcomeMessage.type,
        content: welcomeMessage.content ?? undefined,
        isFromMe: welcomeMessage.isFromMe,
        createdAt: welcomeMessage.createdAt.toISOString(),
      });

      // Emitir evento socket
      const io = req.app.get('io');
      if (io) {
        io.to(`company:${companyId}`).emit('ticket:created', ticket);
      }

      logger.info(`Webform submission processed: ticket=${ticket.id}, contact=${contact.id}, phone=${contact.phone}`);

      res.status(201).json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        ticketId: ticket.id,
        protocol: ticket.protocol,
        contactId: contact.id,
      });
    } catch (whatsappError: any) {
      logger.error('Error sending welcome message via WhatsApp:', whatsappError);
      
      // Mesmo se falhar o envio, retornar sucesso pois o ticket foi criado
      res.status(201).json({
        success: true,
        message: 'Conversa criada, mas houve um problema ao enviar a mensagem',
        ticketId: ticket.id,
        protocol: ticket.protocol,
        contactId: contact.id,
        warning: 'Mensagem não foi enviada via WhatsApp. Verifique a conexão.',
      });
    }
  } catch (error: any) {
    logger.error('Webform submission error:', error);
    
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

