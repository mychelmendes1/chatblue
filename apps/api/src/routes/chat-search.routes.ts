import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { logger } from '../config/logger.js';

const router = Router();

const TICKET_INCLUDE = {
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      avatar: true,
      isClient: true,
      lastMessageAt: true,
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
  connection: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  messages: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
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
} satisfies Prisma.TicketInclude;

/**
 * GET /api/chat/search?q=...
 * Unified search: tickets (by protocol, contact name/email/phone) and contacts (name, email, phone).
 * Case and accent insensitive when unaccent extension is available.
 */
router.get('/search', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(parseInt(String(req.query.limit || '30'), 10) || 30, 50);

    if (q.length < 2) {
      return res.json({ tickets: [], contacts: [] });
    }

    const companyId = req.user!.companyId;
    const likePattern = `%${q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;

    let ticketIds: string[] = [];
    let contactIds: string[] = [];

    try {
      const [ticketRows, contactRows] = await Promise.all([
        prisma.$queryRaw<{ id: string }[]>`
          SELECT t.id
          FROM tickets t
          INNER JOIN contacts c ON t.contact_id = c.id
          WHERE t.company_id = ${companyId}
            AND (
              unaccent(lower(t.protocol)) LIKE unaccent(lower(${likePattern}))
              OR unaccent(lower(COALESCE(c.name, ''))) LIKE unaccent(lower(${likePattern}))
              OR unaccent(lower(COALESCE(c.email, ''))) LIKE unaccent(lower(${likePattern}))
              OR c.phone LIKE ${likePattern}
            )
          LIMIT ${limit}
        `,
        prisma.$queryRaw<{ id: string }[]>`
          SELECT id
          FROM contacts
          WHERE company_id = ${companyId}
            AND is_active = true
            AND (
              unaccent(lower(COALESCE(name, ''))) LIKE unaccent(lower(${likePattern}))
              OR unaccent(lower(COALESCE(email, ''))) LIKE unaccent(lower(${likePattern}))
              OR phone LIKE ${likePattern}
            )
          LIMIT ${limit}
        `,
      ]);
      ticketIds = ticketRows.map((r) => r.id);
      contactIds = contactRows.map((r) => r.id);
    } catch (rawError: any) {
      if (rawError?.message?.includes('unaccent') || rawError?.code === '42883') {
        logger.warn('unaccent not available, using case-insensitive Prisma search');
        const [ticketsByPrisma, contactsByPrisma] = await Promise.all([
          prisma.ticket.findMany({
            where: {
              companyId,
              OR: [
                { protocol: { contains: q, mode: 'insensitive' } },
                { contact: { name: { contains: q, mode: 'insensitive' } } },
                { contact: { email: { contains: q, mode: 'insensitive' } } },
                { contact: { phone: { contains: q } } },
              ],
            },
            select: { id: true },
            take: limit,
          }),
          prisma.contact.findMany({
            where: {
              companyId,
              isActive: true,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            },
            select: { id: true },
            take: limit,
          }),
        ]);
        ticketIds = ticketsByPrisma.map((t) => t.id);
        contactIds = contactsByPrisma.map((c) => c.id);
      } else {
        throw rawError;
      }
    }

    const [tickets, contactsWithTickets] = await Promise.all([
      ticketIds.length > 0
        ? prisma.ticket.findMany({
            where: { id: { in: ticketIds } },
            include: TICKET_INCLUDE,
          })
        : [],
      contactIds.length > 0
        ? prisma.contact.findMany({
            where: { id: { in: contactIds } },
            select: {
              id: true,
              phone: true,
              name: true,
              email: true,
              avatar: true,
              isClient: true,
            },
          })
        : [],
    ]);

    const openTicketsByContact = await prisma.ticket.findMany({
      where: {
        contactId: { in: contactIds },
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
      },
      select: { id: true, contactId: true },
      orderBy: { updatedAt: 'desc' },
    });

    const contactToOpenTicket = new Map<string, string>();
    for (const t of openTicketsByContact) {
      if (!contactToOpenTicket.has(t.contactId)) {
        contactToOpenTicket.set(t.contactId, t.id);
      }
    }

    const contacts = contactsWithTickets.map((c) => ({
      contact: c,
      openTicketId: contactToOpenTicket.get(c.id) ?? undefined,
    }));

    const ticketsOrdered = ticketIds
      .map((id) => tickets.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t != null);

    res.json({
      tickets: ticketsOrdered,
      contacts,
    });
  } catch (error) {
    next(error);
  }
});

export const chatSearchRouter = router;
