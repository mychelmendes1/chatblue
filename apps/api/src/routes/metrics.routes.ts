import { Router } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, requireSupervisor } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

const router = Router();

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
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "Ticket"
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
router.get('/sla', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
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
router.get('/agents', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
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
router.get('/users/ranking', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
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
router.get('/users/:userId', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
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
router.get('/departments', authenticate, requireSupervisor, ensureTenant, async (req, res, next) => {
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

export { router as metricsRouter };
