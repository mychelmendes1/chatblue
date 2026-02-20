import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { startOfDay } from 'date-fns';

const router = Router();

declare global {
  namespace Express {
    interface Request {
      externalCompanyId?: string;
    }
  }
}

/**
 * Middleware: validate X-API-Key and resolve company.
 * Key must match CompanySettings.externalIntegrationApiKey for a company.
 */
async function externalApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return res.status(401).json({ error: 'X-API-Key is required' });
  }
  const settings = await prisma.companySettings.findFirst({
    where: { externalIntegrationApiKey: apiKey.trim() },
    select: { companyId: true },
  });
  if (!settings) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  req.externalCompanyId = settings.companyId;
  next();
}

router.use(externalApiKeyAuth);

/** GET /api/external/health - validate connection (requires X-API-Key) */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function calculateNPS(scores: (number | null)[]): number {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return 0;
  const promoters = valid.filter(s => s >= 9).length;
  const detractors = valid.filter(s => s <= 6).length;
  return Math.round(((promoters - detractors) / valid.length) * 100);
}

/** GET /api/external/metrics?companyId= - metrics for the day (companyId must match key's company) */
router.get('/metrics', async (req, res, next) => {
  try {
    const companyId = req.query.companyId as string;
    if (!companyId || companyId !== req.externalCompanyId) {
      return res.status(403).json({ error: 'companyId does not match the API key company' });
    }

    const now = new Date();
    const startDate = startOfDay(now);

    const [
      totalTickets,
      pendingTickets,
      resolvedTickets,
      slaBreachedTickets,
      aiHandledTickets,
      avgResponseAgg,
      avgResolutionAgg,
      ticketsForNPS,
      departmentsRaw,
    ] = await Promise.all([
      prisma.ticket.count({
        where: { companyId, createdAt: { gte: startDate, lte: now } },
      }),
      prisma.ticket.count({
        where: { companyId, status: 'PENDING', createdAt: { gte: startDate, lte: now } },
      }),
      prisma.ticket.count({
        where: { companyId, status: { in: ['RESOLVED', 'CLOSED'] }, createdAt: { gte: startDate, lte: now } },
      }),
      prisma.ticket.count({
        where: { companyId, slaBreached: true, createdAt: { gte: startDate, lte: now } },
      }),
      prisma.ticket.count({
        where: { companyId, isAIHandled: true, createdAt: { gte: startDate, lte: now } },
      }),
      prisma.ticket.aggregate({
        where: {
          companyId,
          responseTime: { not: null },
          createdAt: { gte: startDate, lte: now },
        },
        _avg: { responseTime: true },
      }),
      prisma.ticket.aggregate({
        where: {
          companyId,
          resolutionTime: { not: null },
          createdAt: { gte: startDate, lte: now },
        },
        _avg: { resolutionTime: true },
      }),
      prisma.ticket.findMany({
        where: {
          companyId,
          npsScore: { not: null },
          npsRatedAt: { gte: startDate, lte: now },
        },
        select: { npsScore: true },
      }),
      prisma.department.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
          color: true,
          tickets: {
            where: { createdAt: { gte: startDate, lte: now } },
            select: {
              status: true,
              responseTime: true,
              resolutionTime: true,
              slaBreached: true,
            },
          },
        },
      }),
    ]);

    const slaCompliance = totalTickets > 0
      ? Math.round(((totalTickets - slaBreachedTickets) / totalTickets) * 10000) / 100
      : 100;
    const npsScore = calculateNPS(ticketsForNPS.map(t => t.npsScore));
    const avgResponseTime = Math.round(avgResponseAgg._avg.responseTime ?? 0);
    const avgResolutionTime = Math.round(avgResolutionAgg._avg.resolutionTime ?? 0);

    const departments = departmentsRaw.map((dept) => {
      const total = dept.tickets.length;
      const resolved = dept.tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
      const slaBreached = dept.tickets.filter(t => t.slaBreached).length;
      const sumResponse = dept.tickets.reduce((a, t) => a + (t.responseTime ?? 0), 0);
      const sumResolution = dept.tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED')
        .reduce((a, t) => a + (t.resolutionTime ?? 0), 0);
      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        totalTickets: total,
        ticketsResolved: resolved,
        ticketsSlaBreached: slaBreached,
        avgResponseTime: total > 0 ? Math.round(sumResponse / total) : 0,
        avgResolutionTime: resolved > 0 ? Math.round(sumResolution / resolved) : 0,
      };
    });

    res.json({
      ticketsTotal: totalTickets,
      ticketsPending: pendingTickets,
      ticketsResolved: resolvedTickets,
      ticketsSlaBreached: slaBreachedTickets,
      ticketsAI: aiHandledTickets,
      avgResponseTime,
      avgResolutionTime,
      slaCompliance,
      npsScore,
      departments,
    });
  } catch (error) {
    next(error);
  }
});

export const externalRouter = router;
