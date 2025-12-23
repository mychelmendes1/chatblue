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
      };
    });

    res.json(agentMetrics.sort((a, b) => b.totalTickets - a.totalTickets));
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
