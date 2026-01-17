import { Router } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, requireSupervisor } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calcula NPS a partir dos scores
 * NPS = % Promotores (9-10) - % Detratores (0-6)
 */
function calculateNPS(scores: (number | null)[]): { nps: number; promoters: number; passives: number; detractors: number; total: number } {
  const validScores = scores.filter((s): s is number => s !== null);
  if (validScores.length === 0) {
    return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
  }

  const promoters = validScores.filter(s => s >= 9).length;
  const passives = validScores.filter(s => s >= 7 && s <= 8).length;
  const detractors = validScores.filter(s => s <= 6).length;
  const total = validScores.length;

  const nps = Math.round(((promoters - detractors) / total) * 100);

  return { nps, promoters, passives, detractors, total };
}

/**
 * Calcula variação percentual entre dois valores
 */
function calculateVariation(current: number, previous: number): { value: number; percentage: number; trend: 'up' | 'down' | 'stable' } {
  if (previous === 0) {
    return { value: current, percentage: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'stable' };
  }
  const percentage = ((current - previous) / previous) * 100;
  return {
    value: current - previous,
    percentage: Math.round(percentage * 10) / 10,
    trend: percentage > 1 ? 'up' : percentage < -1 ? 'down' : 'stable',
  };
}

// Dashboard metrics
router.get('/dashboard', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);

    const companyId = req.user!.companyId;

    // Get ticket counts
    const [
      totalTickets,
      pendingTickets,
      inProgressTickets,
      resolvedTickets,
      slaBreached,
      aiHandled,
    ] = await Promise.all([
      prisma.ticket.count({
        where: { companyId, createdAt: { gte: startDate } },
      }),
      prisma.ticket.count({
        where: { companyId, status: 'PENDING' },
      }),
      prisma.ticket.count({
        where: { companyId, status: 'IN_PROGRESS' },
      }),
      prisma.ticket.count({
        where: { companyId, status: 'RESOLVED', createdAt: { gte: startDate } },
      }),
      prisma.ticket.count({
        where: { companyId, slaBreached: true, createdAt: { gte: startDate } },
      }),
      prisma.ticket.count({
        where: { companyId, isAIHandled: true, createdAt: { gte: startDate } },
      }),
    ]);

    // Average response time
    const avgResponseTime = await prisma.ticket.aggregate({
      where: {
        companyId,
        responseTime: { not: null },
        createdAt: { gte: startDate },
      },
      _avg: { responseTime: true },
    });

    // Average resolution time
    const avgResolutionTime = await prisma.ticket.aggregate({
      where: {
        companyId,
        resolutionTime: { not: null },
        createdAt: { gte: startDate },
      },
      _avg: { resolutionTime: true },
    });

    // SLA compliance rate
    const slaCompliance = totalTickets > 0
      ? ((totalTickets - slaBreached) / totalTickets) * 100
      : 100;

    // Tickets per day
    const ticketsPerDay = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM "tickets"
      WHERE company_id = ${companyId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      summary: {
        totalTickets,
        pendingTickets,
        inProgressTickets,
        resolvedTickets,
        slaBreached,
        aiHandled,
        slaCompliance: Math.round(slaCompliance * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        avgResolutionTime: Math.round(avgResolutionTime._avg.resolutionTime || 0),
      },
      ticketsPerDay,
    });
  } catch (error) {
    next(error);
  }
});

// SLA metrics
router.get('/sla', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);

    const companyId = req.user!.companyId;

    // SLA by department
    const slaByDepartment = await prisma.department.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            tickets: {
              where: { createdAt: { gte: startDate } },
            },
          },
        },
        tickets: {
          where: { createdAt: { gte: startDate } },
          select: {
            slaBreached: true,
            responseTime: true,
            resolutionTime: true,
          },
        },
      },
    });

    const departmentMetrics = slaByDepartment.map((dept) => {
      const totalTickets = dept.tickets.length;
      const breached = dept.tickets.filter((t) => t.slaBreached).length;
      const avgResponseTime = dept.tickets.reduce((acc, t) => acc + (t.responseTime || 0), 0) / (totalTickets || 1);

      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        totalTickets,
        breached,
        compliance: totalTickets > 0 ? ((totalTickets - breached) / totalTickets) * 100 : 100,
        avgResponseTime: Math.round(avgResponseTime),
      };
    });

    // Critical tickets (SLA about to breach)
    const criticalTickets = await prisma.ticket.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        slaDeadline: { lte: new Date(Date.now() + 15 * 60 * 1000) }, // 15 min
        slaBreached: false,
      },
      include: {
        contact: {
          select: { name: true, phone: true },
        },
        assignedTo: {
          select: { name: true },
        },
      },
      orderBy: { slaDeadline: 'asc' },
      take: 10,
    });

    res.json({
      departmentMetrics,
      criticalTickets,
    });
  } catch (error) {
    next(error);
  }
});

// Agent performance
router.get('/agents', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);

    const agents = await prisma.user.findMany({
      where: {
        companyId: req.user!.companyId,
        role: { in: ['AGENT', 'SUPERVISOR'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        isAI: true,
        isOnline: true,
        tickets: {
          where: { createdAt: { gte: startDate } },
          select: {
            status: true,
            responseTime: true,
            resolutionTime: true,
            slaBreached: true,
            rating: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
            },
          },
        },
      },
    });

    const agentMetrics = agents.map((agent) => {
      const totalTickets = agent.tickets.length;
      const resolvedTickets = agent.tickets.filter((t) => t.status === 'RESOLVED').length;
      const slaBreached = agent.tickets.filter((t) => t.slaBreached).length;
      const avgResponseTime = agent.tickets.reduce((acc, t) => acc + (t.responseTime || 0), 0) / (totalTickets || 1);
      const avgResolutionTime = agent.tickets.reduce((acc, t) => acc + (t.resolutionTime || 0), 0) / (resolvedTickets || 1);

      // Rating metrics
      const ratedTickets = agent.tickets.filter((t) => t.rating !== null);
      const avgRating = ratedTickets.length > 0
        ? ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTickets.length
        : null;

      return {
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar,
        isAI: agent.isAI,
        isOnline: agent.isOnline,
        totalTickets,
        resolvedTickets,
        activeTickets: agent._count.tickets,
        slaCompliance: totalTickets > 0 ? ((totalTickets - slaBreached) / totalTickets) * 100 : 100,
        avgResponseTime: Math.round(avgResponseTime),
        avgResolutionTime: Math.round(avgResolutionTime),
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        totalRatings: ratedTickets.length,
      };
    });

    res.json(agentMetrics.sort((a, b) => b.totalTickets - a.totalTickets));
  } catch (error) {
    next(error);
  }
});

// Detailed user performance ranking
router.get('/users/ranking', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '30', sortBy = 'totalTickets' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);

    const users = await prisma.user.findMany({
      where: {
        companyId: req.user!.companyId,
        isActive: true,
        isAI: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        tickets: {
          where: { createdAt: { gte: startDate } },
          select: {
            id: true,
            status: true,
            responseTime: true,
            resolutionTime: true,
            waitingTime: true,
            slaBreached: true,
            rating: true,
            ratingComment: true,
            createdAt: true,
            resolvedAt: true,
          },
        },
        messages: {
          where: { createdAt: { gte: startDate }, isFromMe: true },
          select: { id: true },
        },
      },
    });

    const userMetrics = users.map((user) => {
      const totalTickets = user.tickets.length;
      const resolvedTickets = user.tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
      const pendingTickets = user.tickets.filter((t) => t.status === 'PENDING').length;
      const inProgressTickets = user.tickets.filter((t) => t.status === 'IN_PROGRESS').length;
      const slaBreached = user.tickets.filter((t) => t.slaBreached).length;

      // Time metrics
      const ticketsWithResponseTime = user.tickets.filter((t) => t.responseTime !== null);
      const avgResponseTime = ticketsWithResponseTime.length > 0
        ? ticketsWithResponseTime.reduce((acc, t) => acc + (t.responseTime || 0), 0) / ticketsWithResponseTime.length
        : 0;

      const ticketsWithResolutionTime = user.tickets.filter((t) => t.resolutionTime !== null);
      const avgResolutionTime = ticketsWithResolutionTime.length > 0
        ? ticketsWithResolutionTime.reduce((acc, t) => acc + (t.resolutionTime || 0), 0) / ticketsWithResolutionTime.length
        : 0;

      // Rating metrics
      const ratedTickets = user.tickets.filter((t) => t.rating !== null);
      const avgRating = ratedTickets.length > 0
        ? ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTickets.length
        : null;

      // Rating distribution
      const ratingDistribution = {
        1: ratedTickets.filter((t) => t.rating === 1).length,
        2: ratedTickets.filter((t) => t.rating === 2).length,
        3: ratedTickets.filter((t) => t.rating === 3).length,
        4: ratedTickets.filter((t) => t.rating === 4).length,
        5: ratedTickets.filter((t) => t.rating === 5).length,
      };

      // Messages sent
      const messagesSent = user.messages.length;

      // Resolution rate
      const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

      // SLA compliance
      const slaCompliance = totalTickets > 0 ? ((totalTickets - slaBreached) / totalTickets) * 100 : 100;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        totalTickets,
        resolvedTickets,
        pendingTickets,
        inProgressTickets,
        messagesSent,
        avgResponseTime: Math.round(avgResponseTime),
        avgResolutionTime: Math.round(avgResolutionTime),
        slaBreached,
        slaCompliance: Math.round(slaCompliance * 10) / 10,
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        totalRatings: ratedTickets.length,
        ratingDistribution,
      };
    });

    // Sort by specified field
    const sortField = sortBy as string;
    userMetrics.sort((a: any, b: any) => {
      if (sortField === 'avgRating') {
        return (b.avgRating || 0) - (a.avgRating || 0);
      }
      return (b[sortField] || 0) - (a[sortField] || 0);
    });

    res.json(userMetrics);
  } catch (error) {
    next(error);
  }
});

// Get specific user detailed metrics
router.get('/users/:userId', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);

    const user = await prisma.user.findFirst({
      where: {
        id: req.params.userId,
        companyId: req.user!.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get tickets with detailed info
    const tickets = await prisma.ticket.findMany({
      where: {
        assignedToId: user.id,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        protocol: true,
        status: true,
        priority: true,
        responseTime: true,
        resolutionTime: true,
        slaBreached: true,
        rating: true,
        ratingComment: true,
        createdAt: true,
        resolvedAt: true,
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Daily performance for chart
    const dailyPerformance: any[] = [];
    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayTickets = tickets.filter((t) =>
        t.createdAt >= dayStart && t.createdAt <= dayEnd
      );

      const dayResolved = dayTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
      const dayRated = dayTickets.filter((t) => t.rating !== null);

      dailyPerformance.push({
        date: format(date, 'yyyy-MM-dd'),
        ticketsReceived: dayTickets.length,
        ticketsResolved: dayResolved.length,
        avgRating: dayRated.length > 0
          ? dayRated.reduce((acc, t) => acc + (t.rating || 0), 0) / dayRated.length
          : null,
      });
    }

    // Recent ratings with comments
    const recentRatings = tickets
      .filter((t) => t.rating !== null)
      .slice(0, 10)
      .map((t) => ({
        ticketId: t.id,
        protocol: t.protocol,
        rating: t.rating,
        comment: t.ratingComment,
        contactName: t.contact.name,
        date: t.resolvedAt || t.createdAt,
      }));

    res.json({
      user,
      summary: {
        totalTickets: tickets.length,
        resolvedTickets: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
        avgResponseTime: Math.round(
          tickets.filter((t) => t.responseTime).reduce((acc, t) => acc + (t.responseTime || 0), 0) /
          (tickets.filter((t) => t.responseTime).length || 1)
        ),
        avgResolutionTime: Math.round(
          tickets.filter((t) => t.resolutionTime).reduce((acc, t) => acc + (t.resolutionTime || 0), 0) /
          (tickets.filter((t) => t.resolutionTime).length || 1)
        ),
        slaBreached: tickets.filter((t) => t.slaBreached).length,
        avgRating: tickets.filter((t) => t.rating).length > 0
          ? Math.round(tickets.filter((t) => t.rating).reduce((acc, t) => acc + (t.rating || 0), 0) / tickets.filter((t) => t.rating).length * 10) / 10
          : null,
        totalRatings: tickets.filter((t) => t.rating).length,
      },
      dailyPerformance,
      recentRatings,
      recentTickets: tickets.slice(0, 20),
    });
  } catch (error) {
    next(error);
  }
});

// Department metrics
router.get('/departments', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);

    const departments = await prisma.department.findMany({
      where: {
        companyId: req.user!.companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        color: true,
        tickets: {
          where: { createdAt: { gte: startDate } },
          select: {
            status: true,
            responseTime: true,
            slaBreached: true,
          },
        },
        users: {
          select: {
            user: {
              select: { isOnline: true },
            },
          },
        },
      },
    });

    const deptMetrics = departments.map((dept) => {
      const totalTickets = dept.tickets.length;
      const resolved = dept.tickets.filter((t) => t.status === 'RESOLVED').length;
      const pending = dept.tickets.filter((t) => t.status === 'PENDING').length;
      const inProgress = dept.tickets.filter((t) => t.status === 'IN_PROGRESS').length;
      const onlineAgents = dept.users.filter((u) => u.user.isOnline).length;

      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        totalTickets,
        resolved,
        pending,
        inProgress,
        totalAgents: dept.users.length,
        onlineAgents,
      };
    });

    res.json(deptMetrics);
  } catch (error) {
    next(error);
  }
});

// ============================================
// FASE 1: NPS + COMPARAÇÃO MÊS A MÊS
// ============================================

// NPS Metrics
router.get('/nps', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);
    const companyId = req.user!.companyId;

    // Get NPS scores
    const tickets = await prisma.ticket.findMany({
      where: {
        companyId,
        npsScore: { not: null },
        npsRatedAt: { gte: startDate },
      },
      select: {
        npsScore: true,
        npsComment: true,
        npsRatedAt: true,
        departmentId: true,
        assignedToId: true,
      },
    });

    const npsScores = tickets.map(t => t.npsScore);
    const npsData = calculateNPS(npsScores);

    // NPS by department
    const departments = await prisma.department.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, color: true },
    });

    const npsByDepartment = departments.map(dept => {
      const deptTickets = tickets.filter(t => t.departmentId === dept.id);
      const deptNPS = calculateNPS(deptTickets.map(t => t.npsScore));
      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        ...deptNPS,
      };
    });

    // NPS trend (daily)
    const npsTrend: { date: string; nps: number; responses: number }[] = [];
    for (let i = Math.min(days, 30); i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayTickets = tickets.filter(t =>
        t.npsRatedAt && t.npsRatedAt >= dayStart && t.npsRatedAt <= dayEnd
      );

      const dayNPS = calculateNPS(dayTickets.map(t => t.npsScore));
      npsTrend.push({
        date: format(date, 'yyyy-MM-dd'),
        nps: dayNPS.nps,
        responses: dayNPS.total,
      });
    }

    // Recent comments (detractors first for attention)
    const recentComments = tickets
      .filter(t => t.npsComment)
      .sort((a, b) => (a.npsScore || 0) - (b.npsScore || 0))
      .slice(0, 10)
      .map(t => ({
        score: t.npsScore,
        comment: t.npsComment,
        date: t.npsRatedAt,
        category: t.npsScore! >= 9 ? 'promoter' : t.npsScore! >= 7 ? 'passive' : 'detractor',
      }));

    res.json({
      summary: npsData,
      byDepartment: npsByDepartment,
      trend: npsTrend,
      recentComments,
    });
  } catch (error) {
    next(error);
  }
});

// Monthly comparison
router.get('/comparison', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;

    // Current month
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    // Previous month
    const previousMonthStart = startOfMonth(subMonths(new Date(), 1));
    const previousMonthEnd = endOfMonth(subMonths(new Date(), 1));

    // Fetch data for both periods
    const [currentTickets, previousTickets] = await Promise.all([
      prisma.ticket.findMany({
        where: { companyId, createdAt: { gte: currentMonthStart, lte: currentMonthEnd } },
        select: {
          status: true,
          slaBreached: true,
          responseTime: true,
          resolutionTime: true,
          rating: true,
          npsScore: true,
          isAIHandled: true,
          isFirstContactResolution: true,
          wasAbandoned: true,
          reopenCount: true,
        },
      }),
      prisma.ticket.findMany({
        where: { companyId, createdAt: { gte: previousMonthStart, lte: previousMonthEnd } },
        select: {
          status: true,
          slaBreached: true,
          responseTime: true,
          resolutionTime: true,
          rating: true,
          npsScore: true,
          isAIHandled: true,
          isFirstContactResolution: true,
          wasAbandoned: true,
          reopenCount: true,
        },
      }),
    ]);

    // Calculate metrics for each period
    const calcMetrics = (tickets: typeof currentTickets) => {
      const total = tickets.length;
      const resolved = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
      const slaBreached = tickets.filter(t => t.slaBreached).length;
      const aiHandled = tickets.filter(t => t.isAIHandled).length;
      const fcr = tickets.filter(t => t.isFirstContactResolution).length;
      const abandoned = tickets.filter(t => t.wasAbandoned).length;
      const reopened = tickets.filter(t => t.reopenCount > 0).length;

      const withResponseTime = tickets.filter(t => t.responseTime !== null);
      const avgResponseTime = withResponseTime.length > 0
        ? withResponseTime.reduce((acc, t) => acc + (t.responseTime || 0), 0) / withResponseTime.length
        : 0;

      const withResolutionTime = tickets.filter(t => t.resolutionTime !== null);
      const avgResolutionTime = withResolutionTime.length > 0
        ? withResolutionTime.reduce((acc, t) => acc + (t.resolutionTime || 0), 0) / withResolutionTime.length
        : 0;

      const withRating = tickets.filter(t => t.rating !== null);
      const avgRating = withRating.length > 0
        ? withRating.reduce((acc, t) => acc + (t.rating || 0), 0) / withRating.length
        : 0;

      const npsData = calculateNPS(tickets.map(t => t.npsScore));

      return {
        totalTickets: total,
        resolvedTickets: resolved,
        slaCompliance: total > 0 ? ((total - slaBreached) / total) * 100 : 100,
        avgResponseTime: Math.round(avgResponseTime),
        avgResolutionTime: Math.round(avgResolutionTime),
        avgRating: Math.round(avgRating * 10) / 10,
        nps: npsData.nps,
        aiHandledRate: total > 0 ? (aiHandled / total) * 100 : 0,
        fcrRate: total > 0 ? (fcr / total) * 100 : 0,
        abandonRate: total > 0 ? (abandoned / total) * 100 : 0,
        reopenRate: total > 0 ? (reopened / total) * 100 : 0,
      };
    };

    const currentMetrics = calcMetrics(currentTickets);
    const previousMetrics = calcMetrics(previousTickets);

    // Build comparison object
    const comparison = {
      currentMonth: format(currentMonthStart, 'yyyy-MM'),
      previousMonth: format(previousMonthStart, 'yyyy-MM'),
      metrics: {
        totalTickets: {
          current: currentMetrics.totalTickets,
          previous: previousMetrics.totalTickets,
          ...calculateVariation(currentMetrics.totalTickets, previousMetrics.totalTickets),
          isPositiveGood: null, // Depends on context
        },
        resolvedTickets: {
          current: currentMetrics.resolvedTickets,
          previous: previousMetrics.resolvedTickets,
          ...calculateVariation(currentMetrics.resolvedTickets, previousMetrics.resolvedTickets),
          isPositiveGood: true,
        },
        slaCompliance: {
          current: Math.round(currentMetrics.slaCompliance * 10) / 10,
          previous: Math.round(previousMetrics.slaCompliance * 10) / 10,
          ...calculateVariation(currentMetrics.slaCompliance, previousMetrics.slaCompliance),
          isPositiveGood: true,
        },
        avgResponseTime: {
          current: currentMetrics.avgResponseTime,
          previous: previousMetrics.avgResponseTime,
          ...calculateVariation(currentMetrics.avgResponseTime, previousMetrics.avgResponseTime),
          isPositiveGood: false, // Lower is better
        },
        avgResolutionTime: {
          current: currentMetrics.avgResolutionTime,
          previous: previousMetrics.avgResolutionTime,
          ...calculateVariation(currentMetrics.avgResolutionTime, previousMetrics.avgResolutionTime),
          isPositiveGood: false, // Lower is better
        },
        avgRating: {
          current: currentMetrics.avgRating,
          previous: previousMetrics.avgRating,
          ...calculateVariation(currentMetrics.avgRating, previousMetrics.avgRating),
          isPositiveGood: true,
        },
        nps: {
          current: currentMetrics.nps,
          previous: previousMetrics.nps,
          ...calculateVariation(currentMetrics.nps, previousMetrics.nps),
          isPositiveGood: true,
        },
        aiHandledRate: {
          current: Math.round(currentMetrics.aiHandledRate * 10) / 10,
          previous: Math.round(previousMetrics.aiHandledRate * 10) / 10,
          ...calculateVariation(currentMetrics.aiHandledRate, previousMetrics.aiHandledRate),
          isPositiveGood: true,
        },
        fcrRate: {
          current: Math.round(currentMetrics.fcrRate * 10) / 10,
          previous: Math.round(previousMetrics.fcrRate * 10) / 10,
          ...calculateVariation(currentMetrics.fcrRate, previousMetrics.fcrRate),
          isPositiveGood: true,
        },
        abandonRate: {
          current: Math.round(currentMetrics.abandonRate * 10) / 10,
          previous: Math.round(previousMetrics.abandonRate * 10) / 10,
          ...calculateVariation(currentMetrics.abandonRate, previousMetrics.abandonRate),
          isPositiveGood: false, // Lower is better
        },
        reopenRate: {
          current: Math.round(currentMetrics.reopenRate * 10) / 10,
          previous: Math.round(previousMetrics.reopenRate * 10) / 10,
          ...calculateVariation(currentMetrics.reopenRate, previousMetrics.reopenRate),
          isPositiveGood: false, // Lower is better
        },
      },
    };

    res.json(comparison);
  } catch (error) {
    next(error);
  }
});

// Historical monthly data (last 12 months)
router.get('/history', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;
    const months: any[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));

      const tickets = await prisma.ticket.findMany({
        where: { companyId, createdAt: { gte: monthStart, lte: monthEnd } },
        select: {
          status: true,
          slaBreached: true,
          responseTime: true,
          rating: true,
          npsScore: true,
          isAIHandled: true,
          isFirstContactResolution: true,
        },
      });

      const total = tickets.length;
      const resolved = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
      const slaBreached = tickets.filter(t => t.slaBreached).length;
      const fcr = tickets.filter(t => t.isFirstContactResolution).length;
      const npsData = calculateNPS(tickets.map(t => t.npsScore));

      const withResponseTime = tickets.filter(t => t.responseTime !== null);
      const avgResponseTime = withResponseTime.length > 0
        ? Math.round(withResponseTime.reduce((acc, t) => acc + (t.responseTime || 0), 0) / withResponseTime.length)
        : 0;

      const withRating = tickets.filter(t => t.rating !== null);
      const avgRating = withRating.length > 0
        ? Math.round(withRating.reduce((acc, t) => acc + (t.rating || 0), 0) / withRating.length * 10) / 10
        : 0;

      months.push({
        month: format(monthStart, 'yyyy-MM'),
        label: format(monthStart, 'MMM/yy'),
        totalTickets: total,
        resolvedTickets: resolved,
        slaCompliance: total > 0 ? Math.round(((total - slaBreached) / total) * 1000) / 10 : 100,
        avgResponseTime,
        avgRating,
        nps: npsData.nps,
        fcrRate: total > 0 ? Math.round((fcr / total) * 1000) / 10 : 0,
      });
    }

    res.json(months);
  } catch (error) {
    next(error);
  }
});

// ============================================
// FASE 2: FCR + REABERTURA + ABANDONO
// ============================================

// Quality metrics (FCR, Reopen, Abandon)
router.get('/quality', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);
    const companyId = req.user!.companyId;

    const tickets = await prisma.ticket.findMany({
      where: { companyId, createdAt: { gte: startDate } },
      select: {
        id: true,
        status: true,
        isFirstContactResolution: true,
        reopenCount: true,
        wasAbandoned: true,
        abandonedAt: true,
        waitingTime: true,
        departmentId: true,
        assignedToId: true,
      },
    });

    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    const fcr = tickets.filter(t => t.isFirstContactResolution).length;
    const reopened = tickets.filter(t => t.reopenCount > 0).length;
    const totalReopens = tickets.reduce((acc, t) => acc + t.reopenCount, 0);
    const abandoned = tickets.filter(t => t.wasAbandoned).length;

    const withWaitingTime = tickets.filter(t => t.waitingTime !== null);
    const avgWaitingTime = withWaitingTime.length > 0
      ? Math.round(withWaitingTime.reduce((acc, t) => acc + (t.waitingTime || 0), 0) / withWaitingTime.length)
      : 0;

    // By department
    const departments = await prisma.department.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, color: true },
    });

    const byDepartment = departments.map(dept => {
      const deptTickets = tickets.filter(t => t.departmentId === dept.id);
      const deptTotal = deptTickets.length;
      const deptFCR = deptTickets.filter(t => t.isFirstContactResolution).length;
      const deptReopened = deptTickets.filter(t => t.reopenCount > 0).length;
      const deptAbandoned = deptTickets.filter(t => t.wasAbandoned).length;

      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        totalTickets: deptTotal,
        fcrRate: deptTotal > 0 ? Math.round((deptFCR / deptTotal) * 1000) / 10 : 0,
        reopenRate: deptTotal > 0 ? Math.round((deptReopened / deptTotal) * 1000) / 10 : 0,
        abandonRate: deptTotal > 0 ? Math.round((deptAbandoned / deptTotal) * 1000) / 10 : 0,
      };
    });

    // Daily trend
    const trend: { date: string; fcr: number; reopen: number; abandon: number }[] = [];
    for (let i = Math.min(days, 30); i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayTickets = tickets.filter(t => {
        const ticketDate = new Date((t as any).createdAt || date);
        return ticketDate >= dayStart && ticketDate <= dayEnd;
      });

      const dayTotal = dayTickets.length;
      trend.push({
        date: format(date, 'yyyy-MM-dd'),
        fcr: dayTotal > 0 ? Math.round((dayTickets.filter(t => t.isFirstContactResolution).length / dayTotal) * 100) : 0,
        reopen: dayTotal > 0 ? Math.round((dayTickets.filter(t => t.reopenCount > 0).length / dayTotal) * 100) : 0,
        abandon: dayTotal > 0 ? Math.round((dayTickets.filter(t => t.wasAbandoned).length / dayTotal) * 100) : 0,
      });
    }

    res.json({
      summary: {
        totalTickets: total,
        resolvedTickets: resolved,
        fcrCount: fcr,
        fcrRate: total > 0 ? Math.round((fcr / total) * 1000) / 10 : 0,
        reopenedCount: reopened,
        reopenRate: total > 0 ? Math.round((reopened / total) * 1000) / 10 : 0,
        totalReopens,
        abandonedCount: abandoned,
        abandonRate: total > 0 ? Math.round((abandoned / total) * 1000) / 10 : 0,
        avgWaitingTime,
      },
      byDepartment,
      trend,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// FASE 3: MÉTRICAS DETALHADAS DE IA
// ============================================

// AI detailed metrics
router.get('/ai', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);
    const companyId = req.user!.companyId;

    const tickets = await prisma.ticket.findMany({
      where: { companyId, createdAt: { gte: startDate } },
      select: {
        id: true,
        status: true,
        isAIHandled: true,
        aiTakeoverAt: true,
        humanTakeoverAt: true,
        rating: true,
        npsScore: true,
        responseTime: true,
        resolutionTime: true,
        slaBreached: true,
      },
    });

    const total = tickets.length;
    const aiHandled = tickets.filter(t => t.isAIHandled);
    const humanHandled = tickets.filter(t => !t.isAIHandled);
    const aiResolved = aiHandled.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
    const aiToHuman = aiHandled.filter(t => t.humanTakeoverAt !== null);

    // Calculate AI metrics
    const aiWithRating = aiHandled.filter(t => t.rating !== null);
    const aiAvgRating = aiWithRating.length > 0
      ? aiWithRating.reduce((acc, t) => acc + (t.rating || 0), 0) / aiWithRating.length
      : 0;

    const humanWithRating = humanHandled.filter(t => t.rating !== null);
    const humanAvgRating = humanWithRating.length > 0
      ? humanWithRating.reduce((acc, t) => acc + (t.rating || 0), 0) / humanWithRating.length
      : 0;

    const aiNPS = calculateNPS(aiHandled.map(t => t.npsScore));
    const humanNPS = calculateNPS(humanHandled.map(t => t.npsScore));

    // Response and resolution times
    const aiWithResponseTime = aiHandled.filter(t => t.responseTime !== null);
    const aiAvgResponseTime = aiWithResponseTime.length > 0
      ? Math.round(aiWithResponseTime.reduce((acc, t) => acc + (t.responseTime || 0), 0) / aiWithResponseTime.length)
      : 0;

    const humanWithResponseTime = humanHandled.filter(t => t.responseTime !== null);
    const humanAvgResponseTime = humanWithResponseTime.length > 0
      ? Math.round(humanWithResponseTime.reduce((acc, t) => acc + (t.responseTime || 0), 0) / humanWithResponseTime.length)
      : 0;

    // Estimated savings (assuming human cost per ticket)
    const estimatedCostPerHumanTicket = 5; // R$ - can be configurable
    const estimatedSavings = aiResolved.length * estimatedCostPerHumanTicket;

    // Daily trend
    const trend: { date: string; aiTickets: number; humanTickets: number; handoffRate: number }[] = [];
    for (let i = Math.min(days, 30); i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // For simplicity, we'll estimate based on AI takeover dates
      const dayAI = aiHandled.filter(t =>
        t.aiTakeoverAt && t.aiTakeoverAt >= dayStart && t.aiTakeoverAt <= dayEnd
      ).length;

      const dayHandoff = aiToHuman.filter(t =>
        t.humanTakeoverAt && t.humanTakeoverAt >= dayStart && t.humanTakeoverAt <= dayEnd
      ).length;

      trend.push({
        date: format(date, 'yyyy-MM-dd'),
        aiTickets: dayAI,
        humanTickets: Math.max(0, Math.round(total / days) - dayAI), // Estimate
        handoffRate: dayAI > 0 ? Math.round((dayHandoff / dayAI) * 100) : 0,
      });
    }

    res.json({
      summary: {
        totalTickets: total,
        aiHandled: aiHandled.length,
        aiHandledRate: total > 0 ? Math.round((aiHandled.length / total) * 1000) / 10 : 0,
        aiResolved: aiResolved.length,
        aiResolutionRate: aiHandled.length > 0 ? Math.round((aiResolved.length / aiHandled.length) * 1000) / 10 : 0,
        handoffToHuman: aiToHuman.length,
        handoffRate: aiHandled.length > 0 ? Math.round((aiToHuman.length / aiHandled.length) * 1000) / 10 : 0,
        estimatedSavings,
      },
      comparison: {
        ai: {
          avgRating: Math.round(aiAvgRating * 10) / 10,
          nps: aiNPS.nps,
          avgResponseTime: aiAvgResponseTime,
          slaCompliance: aiHandled.length > 0
            ? Math.round(((aiHandled.length - aiHandled.filter(t => t.slaBreached).length) / aiHandled.length) * 1000) / 10
            : 100,
        },
        human: {
          avgRating: Math.round(humanAvgRating * 10) / 10,
          nps: humanNPS.nps,
          avgResponseTime: humanAvgResponseTime,
          slaCompliance: humanHandled.length > 0
            ? Math.round(((humanHandled.length - humanHandled.filter(t => t.slaBreached).length) / humanHandled.length) * 1000) / 10
            : 100,
        },
      },
      trend,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// FASE 4: DASHBOARD EXECUTIVO
// ============================================

// Executive summary (all key metrics in one call)
router.get('/executive', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;

    // Current month
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    // Previous month
    const previousMonthStart = startOfMonth(subMonths(new Date(), 1));
    const previousMonthEnd = endOfMonth(subMonths(new Date(), 1));

    // Today
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Fetch all data
    const [currentTickets, previousTickets, todayTickets, activeAgents] = await Promise.all([
      prisma.ticket.findMany({
        where: { companyId, createdAt: { gte: currentMonthStart, lte: currentMonthEnd } },
        select: {
          status: true,
          slaBreached: true,
          responseTime: true,
          resolutionTime: true,
          rating: true,
          npsScore: true,
          isAIHandled: true,
          isFirstContactResolution: true,
          wasAbandoned: true,
        },
      }),
      prisma.ticket.findMany({
        where: { companyId, createdAt: { gte: previousMonthStart, lte: previousMonthEnd } },
        select: {
          status: true,
          slaBreached: true,
          responseTime: true,
          rating: true,
          npsScore: true,
          isAIHandled: true,
          isFirstContactResolution: true,
        },
      }),
      prisma.ticket.findMany({
        where: { companyId, createdAt: { gte: todayStart, lte: todayEnd } },
        select: { id: true, status: true },
      }),
      prisma.user.count({
        where: { companyId, isOnline: true, isActive: true },
      }),
    ]);

    // Pending tickets (all time)
    const pendingTickets = await prisma.ticket.count({
      where: { companyId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });

    // Calculate current month metrics
    const current = {
      total: currentTickets.length,
      resolved: currentTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      slaBreached: currentTickets.filter(t => t.slaBreached).length,
      aiHandled: currentTickets.filter(t => t.isAIHandled).length,
      fcr: currentTickets.filter(t => t.isFirstContactResolution).length,
      abandoned: currentTickets.filter(t => t.wasAbandoned).length,
    };

    const previous = {
      total: previousTickets.length,
      resolved: previousTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      slaBreached: previousTickets.filter(t => t.slaBreached).length,
    };

    // Calculate averages
    const currentWithResponseTime = currentTickets.filter(t => t.responseTime !== null);
    const avgResponseTime = currentWithResponseTime.length > 0
      ? Math.round(currentWithResponseTime.reduce((acc, t) => acc + (t.responseTime || 0), 0) / currentWithResponseTime.length)
      : 0;

    const currentWithRating = currentTickets.filter(t => t.rating !== null);
    const avgRating = currentWithRating.length > 0
      ? Math.round(currentWithRating.reduce((acc, t) => acc + (t.rating || 0), 0) / currentWithRating.length * 10) / 10
      : 0;

    const npsData = calculateNPS(currentTickets.map(t => t.npsScore));

    res.json({
      realtime: {
        todayTickets: todayTickets.length,
        todayResolved: todayTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
        pendingTickets,
        activeAgents,
      },
      monthSummary: {
        totalTickets: current.total,
        resolvedTickets: current.resolved,
        slaCompliance: current.total > 0 ? Math.round(((current.total - current.slaBreached) / current.total) * 1000) / 10 : 100,
        avgResponseTime,
        avgRating,
        nps: npsData.nps,
        npsResponses: npsData.total,
        aiHandledRate: current.total > 0 ? Math.round((current.aiHandled / current.total) * 1000) / 10 : 0,
        fcrRate: current.total > 0 ? Math.round((current.fcr / current.total) * 1000) / 10 : 0,
        abandonRate: current.total > 0 ? Math.round((current.abandoned / current.total) * 1000) / 10 : 0,
      },
      variations: {
        tickets: calculateVariation(current.total, previous.total),
        resolved: calculateVariation(current.resolved, previous.resolved),
        slaCompliance: calculateVariation(
          current.total > 0 ? ((current.total - current.slaBreached) / current.total) * 100 : 100,
          previous.total > 0 ? ((previous.total - previous.slaBreached) / previous.total) * 100 : 100
        ),
      },
      npsBreakdown: npsData,
    });
  } catch (error) {
    next(error);
  }
});

// Export data endpoint
router.get('/export', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
  try {
    const { period = '30', format: exportFormat = 'json' } = req.query;
    const days = parseInt(period as string);
    const startDate = subDays(new Date(), days);
    const companyId = req.user!.companyId;

    const tickets = await prisma.ticket.findMany({
      where: { companyId, createdAt: { gte: startDate } },
      select: {
        protocol: true,
        status: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
        slaBreached: true,
        responseTime: true,
        resolutionTime: true,
        rating: true,
        npsScore: true,
        isAIHandled: true,
        isFirstContactResolution: true,
        wasAbandoned: true,
        reopenCount: true,
        department: { select: { name: true } },
        assignedTo: { select: { name: true } },
        contact: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data for export
    const exportData = tickets.map(t => ({
      protocolo: t.protocol,
      status: t.status,
      prioridade: t.priority,
      data_criacao: format(t.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      data_resolucao: t.resolvedAt ? format(t.resolvedAt, 'yyyy-MM-dd HH:mm:ss') : '',
      sla_violado: t.slaBreached ? 'Sim' : 'Não',
      tempo_resposta_segundos: t.responseTime || '',
      tempo_resolucao_segundos: t.resolutionTime || '',
      avaliacao: t.rating || '',
      nps: t.npsScore || '',
      atendido_ia: t.isAIHandled ? 'Sim' : 'Não',
      fcr: t.isFirstContactResolution ? 'Sim' : 'Não',
      abandonado: t.wasAbandoned ? 'Sim' : 'Não',
      reaberturas: t.reopenCount,
      departamento: t.department?.name || '',
      atendente: t.assignedTo?.name || '',
      contato_nome: t.contact.name || '',
      contato_telefone: t.contact.phone,
    }));

    if (exportFormat === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row =>
        Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=metricas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      return res.send(csv);
    }

    res.json({
      exportDate: new Date().toISOString(),
      period: { start: startDate.toISOString(), end: new Date().toISOString() },
      totalRecords: exportData.length,
      data: exportData,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// FASE 5: METAS E ALERTAS
// ============================================

// Get all goals
router.get('/goals', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;

    const goals = await prisma.metricGoal.findMany({
      where: { companyId },
      include: {
        department: { select: { name: true, color: true } },
        user: { select: { name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate current values for each goal
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      let currentValue = 0;
      const startDate = goal.period === 'daily' ? startOfDay(new Date())
        : goal.period === 'weekly' ? subDays(new Date(), 7)
        : goal.period === 'quarterly' ? subMonths(new Date(), 3)
        : startOfMonth(new Date());

      const where: any = { companyId, createdAt: { gte: startDate } };
      if (goal.departmentId) where.departmentId = goal.departmentId;
      if (goal.userId) where.assignedToId = goal.userId;

      const tickets = await prisma.ticket.findMany({
        where,
        select: {
          status: true,
          slaBreached: true,
          responseTime: true,
          rating: true,
          npsScore: true,
          isFirstContactResolution: true,
        },
      });

      const total = tickets.length;

      switch (goal.metric) {
        case 'totalTickets':
          currentValue = total;
          break;
        case 'slaCompliance':
          currentValue = total > 0
            ? ((total - tickets.filter(t => t.slaBreached).length) / total) * 100
            : 100;
          break;
        case 'avgResponseTime':
          const withRT = tickets.filter(t => t.responseTime !== null);
          currentValue = withRT.length > 0
            ? withRT.reduce((acc, t) => acc + (t.responseTime || 0), 0) / withRT.length
            : 0;
          break;
        case 'avgRating':
          const withRating = tickets.filter(t => t.rating !== null);
          currentValue = withRating.length > 0
            ? withRating.reduce((acc, t) => acc + (t.rating || 0), 0) / withRating.length
            : 0;
          break;
        case 'nps':
          const npsData = calculateNPS(tickets.map(t => t.npsScore));
          currentValue = npsData.nps;
          break;
        case 'fcrRate':
          currentValue = total > 0
            ? (tickets.filter(t => t.isFirstContactResolution).length / total) * 100
            : 0;
          break;
      }

      const progress = goal.target > 0 ? (currentValue / goal.target) * 100 : 0;

      return {
        ...goal,
        currentValue: Math.round(currentValue * 10) / 10,
        progress: Math.min(Math.round(progress * 10) / 10, 100),
        isAchieved: currentValue >= goal.target,
      };
    }));

    res.json(goalsWithProgress);
  } catch (error) {
    next(error);
  }
});

// Create goal
router.post('/goals', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
  try {
    const { name, metric, target, period, departmentId, userId } = req.body;
    const companyId = req.user!.companyId;

    const goal = await prisma.metricGoal.create({
      data: {
        name,
        metric,
        target: parseFloat(target),
        period: period || 'monthly',
        companyId,
        departmentId: departmentId || null,
        userId: userId || null,
      },
    });

    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
});

// Update goal
router.put('/goals/:id', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, metric, target, period, isActive, departmentId, userId } = req.body;
    const companyId = req.user!.companyId;

    const goal = await prisma.metricGoal.update({
      where: { id, companyId },
      data: {
        name,
        metric,
        target: target !== undefined ? parseFloat(target) : undefined,
        period,
        isActive,
        departmentId,
        userId,
      },
    });

    res.json(goal);
  } catch (error) {
    next(error);
  }
});

// Delete goal
router.delete('/goals/:id', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    await prisma.metricGoal.delete({
      where: { id, companyId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get all alerts
router.get('/alerts', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;

    const alerts = await prisma.metricAlert.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

// Create alert
router.post('/alerts', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
  try {
    const { name, metric, condition, threshold, notifyEmail, notifyInApp, notifyWebhook } = req.body;
    const companyId = req.user!.companyId;

    const alert = await prisma.metricAlert.create({
      data: {
        name,
        metric,
        condition,
        threshold: parseFloat(threshold),
        notifyEmail: notifyEmail ?? true,
        notifyInApp: notifyInApp ?? true,
        notifyWebhook,
        companyId,
      },
    });

    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
});

// Update alert
router.put('/alerts/:id', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, metric, condition, threshold, isActive, notifyEmail, notifyInApp, notifyWebhook } = req.body;
    const companyId = req.user!.companyId;

    const alert = await prisma.metricAlert.update({
      where: { id, companyId },
      data: {
        name,
        metric,
        condition,
        threshold: threshold !== undefined ? parseFloat(threshold) : undefined,
        isActive,
        notifyEmail,
        notifyInApp,
        notifyWebhook,
      },
    });

    res.json(alert);
  } catch (error) {
    next(error);
  }
});

// Delete alert
router.delete('/alerts/:id', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    await prisma.metricAlert.delete({
      where: { id, companyId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Check alerts (can be called by a cron job)
router.post('/alerts/check', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
  try {
    const companyId = req.user!.companyId;
    const triggeredAlerts: any[] = [];

    const alerts = await prisma.metricAlert.findMany({
      where: { companyId, isActive: true },
    });

    // Get current metrics
    const startDate = startOfMonth(new Date());
    const tickets = await prisma.ticket.findMany({
      where: { companyId, createdAt: { gte: startDate } },
      select: {
        slaBreached: true,
        responseTime: true,
        rating: true,
        npsScore: true,
        isFirstContactResolution: true,
        wasAbandoned: true,
      },
    });

    const total = tickets.length;
    const metrics: Record<string, number> = {
      totalTickets: total,
      slaCompliance: total > 0 ? ((total - tickets.filter(t => t.slaBreached).length) / total) * 100 : 100,
      avgResponseTime: tickets.filter(t => t.responseTime).length > 0
        ? tickets.filter(t => t.responseTime).reduce((acc, t) => acc + (t.responseTime || 0), 0) / tickets.filter(t => t.responseTime).length
        : 0,
      avgRating: tickets.filter(t => t.rating).length > 0
        ? tickets.filter(t => t.rating).reduce((acc, t) => acc + (t.rating || 0), 0) / tickets.filter(t => t.rating).length
        : 0,
      nps: calculateNPS(tickets.map(t => t.npsScore)).nps,
      fcrRate: total > 0 ? (tickets.filter(t => t.isFirstContactResolution).length / total) * 100 : 0,
      abandonRate: total > 0 ? (tickets.filter(t => t.wasAbandoned).length / total) * 100 : 0,
    };

    for (const alert of alerts) {
      const currentValue = metrics[alert.metric] ?? 0;
      let isTriggered = false;

      switch (alert.condition) {
        case 'below':
          isTriggered = currentValue < alert.threshold;
          break;
        case 'above':
          isTriggered = currentValue > alert.threshold;
          break;
        case 'equals':
          isTriggered = Math.abs(currentValue - alert.threshold) < 0.01;
          break;
      }

      if (isTriggered) {
        await prisma.metricAlert.update({
          where: { id: alert.id },
          data: {
            lastTriggeredAt: new Date(),
            triggerCount: { increment: 1 },
          },
        });

        triggeredAlerts.push({
          alert,
          currentValue,
          message: `Alerta "${alert.name}": ${alert.metric} está ${alert.condition === 'below' ? 'abaixo' : alert.condition === 'above' ? 'acima' : 'igual a'} ${alert.threshold} (atual: ${Math.round(currentValue * 10) / 10})`,
        });
      }
    }

    res.json({
      checked: alerts.length,
      triggered: triggeredAlerts.length,
      alerts: triggeredAlerts,
    });
  } catch (error) {
    next(error);
  }
});

export { router as metricsRouter };
