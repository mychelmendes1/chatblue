import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { generateProtocol } from '../utils/protocol.js';

const router = Router();

const CampaignDispatchedSchema = z.object({
  event: z.literal('campaign.dispatched'),
  dispatchedAt: z.string().datetime({ message: 'dispatchedAt must be ISO 8601' }),
  campaignId: z.number().int().positive(),
  campaignName: z.string().min(1),
  company: z.string().min(1),
  message: z.string(),
  contacts: z.array(
    z.object({
      name: z.string().nullable().optional(),
      phone: z.string().min(1),
    })
  ),
});

/** Optional: validate Bearer token when CHAT_WEBHOOK_SECRET is set */
function optionalWebhookAuth(req: any, res: any, next: any) {
  const secret = process.env.CHAT_WEBHOOK_SECRET;
  if (!secret) return next();
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || token !== secret) {
    return res.status(401).json({ error: 'Invalid or missing webhook secret' });
  }
  next();
}

router.post('/campaign-dispatched', optionalWebhookAuth, async (req, res, next) => {
  try {
    const payload = CampaignDispatchedSchema.parse(req.body);
    const dispatchedAt = new Date(payload.dispatchedAt);

    const company = await prisma.company.findFirst({
      where: {
        name: { contains: payload.company.trim(), mode: 'insensitive' },
        isActive: true,
      },
    });

    if (!company) {
      return res.status(400).json({
        error: `Empresa não encontrada: "${payload.company}". Verifique o nome no payload.`,
      });
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        companyId: company.id,
        isActive: true,
        status: 'CONNECTED',
      },
      orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
    });

    const connectionToUse =
      connection ||
      (await prisma.whatsAppConnection.findFirst({
        where: { companyId: company.id, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { lastConnected: 'desc' }],
      }));

    if (!connectionToUse) {
      return res.status(400).json({
        error: 'Nenhuma conexão WhatsApp ativa encontrada para esta empresa',
      });
    }

    const commercialDept = await prisma.department.findFirst({
      where: {
        companyId: company.id,
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

    const existing = await prisma.campaignDispatch.findUnique({
      where: {
        companyId_campaignId_dispatchedAt: {
          companyId: company.id,
          campaignId: payload.campaignId,
          dispatchedAt,
        },
      },
    });

    if (existing) {
      return res.status(200).json({ ok: true, alreadyProcessed: true });
    }

    await prisma.campaignDispatch.create({
      data: {
        companyId: company.id,
        campaignId: payload.campaignId,
        dispatchedAt,
      },
    });

    let ticketsCreated = 0;
    const BATCH = 200;
    for (let i = 0; i < payload.contacts.length; i += BATCH) {
      const chunk = payload.contacts.slice(i, i + BATCH);
      for (const c of chunk) {
        const normalizedPhone = c.phone.replace(/\D/g, '');
        if (normalizedPhone.length < 10) continue;

        let contact = await prisma.contact.findFirst({
          where: {
            companyId: company.id,
            phone: normalizedPhone,
          },
        });

        if (contact) {
          const updates: { name?: string } = {};
          if (c.name != null && c.name !== contact.name) updates.name = c.name;
          if (Object.keys(updates).length > 0) {
            contact = await prisma.contact.update({
              where: { id: contact.id },
              data: updates,
            });
          }
        } else {
          contact = await prisma.contact.create({
            data: {
              companyId: company.id,
              phone: normalizedPhone,
              name: c.name || undefined,
            },
          });
        }

        const openTicket = await prisma.ticket.findFirst({
          where: {
            contactId: contact.id,
            connectionId: connectionToUse.id,
            status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
          },
        });

        if (openTicket) continue;

        const protocol = generateProtocol();
        const ticket = await prisma.ticket.create({
          data: {
            protocol,
            status: 'PENDING',
            priority: 'MEDIUM',
            contactId: contact.id,
            connectionId: connectionToUse.id,
            companyId: company.id,
            departmentId: commercialDept.id,
            assignedToId: null,
            campaignId: payload.campaignId,
            campaignDispatchedAt: dispatchedAt,
          },
        });

        await prisma.message.create({
          data: {
            type: 'TEXT',
            content: payload.message,
            isFromMe: true,
            status: 'DELIVERED',
            ticketId: ticket.id,
            connectionId: connectionToUse.id,
          },
        });

        ticketsCreated++;
      }
    }

    return res.status(200).json({ ok: true, ticketsCreated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Payload inválido',
        details: error.errors,
      });
    }
    logger.error('Campaign dispatch webhook error:', error);
    next(error);
  }
});

export const campaignDispatchRouter = router;
