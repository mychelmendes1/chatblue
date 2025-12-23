import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ForbiddenError } from '../middlewares/error.middleware.js';
import { generateProtocol } from '../utils/protocol.js';

const router = Router();

// List tickets
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const {
      status,
      departmentId,
      assignedToId,
      priority,
      isAIHandled,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    // Get user's departments for visibility
    const userDepartments = await prisma.userDepartment.findMany({
      where: { userId: req.user!.userId },
      select: { departmentId: true },
    });

    const deptIds = userDepartments.map((d) => d.departmentId);

    // Get parent departments (higher in hierarchy)
    const visibleDeptIds = new Set(deptIds);
    for (const deptId of deptIds) {
      const dept = await prisma.department.findUnique({
        where: { id: deptId },
        select: { parentId: true },
      });
      if (dept?.parentId) {
        visibleDeptIds.add(dept.parentId);
      }
    }

    const where: any = {
      companyId: req.user!.companyId,
      ...(status && { status: status as string }),
      ...(departmentId && { departmentId: departmentId as string }),
      ...(assignedToId && { assignedToId: assignedToId as string }),
      ...(priority && { priority: priority as string }),
      ...(isAIHandled !== undefined && { isAIHandled: isAIHandled === 'true' }),
      ...(search && {
        OR: [
          { protocol: { contains: search as string } },
          { contact: { name: { contains: search as string, mode: 'insensitive' } } },
          { contact: { phone: { contains: search as string } } },
        ],
      }),
    };

    // Non-admins can only see tickets from their departments or assigned to them
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role)) {
      where.OR = [
        { assignedToId: req.user!.userId },
        { departmentId: { in: Array.from(visibleDeptIds) } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatar: true,
              isClient: true,
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
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              content: true,
              type: true,
              createdAt: true,
              isFromMe: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { updatedAt: 'desc' },
        ],
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      tickets,
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

// Get ticket
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: {
        contact: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
            isAI: true,
          },
        },
        department: true,
        connection: {
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
          },
        },
        transfers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// Assign ticket
router.post('/:id/assign', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { userId } = z.object({
      userId: z.string().cuid(),
    }).parse(req.body);

    const ticket = await prisma.ticket.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: {
        assignedToId: userId,
        status: 'IN_PROGRESS',
        humanTakeoverAt: new Date(),
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_ASSIGNED',
        description: `Ticket assigned`,
        ticketId: ticket.id,
        userId: req.user!.userId,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:assigned', {
      ticketId: ticket.id,
      assignedToId: userId,
    });

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// Takeover ticket (from AI)
router.post('/:id/takeover', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assignedToId: req.user!.userId,
        isAIHandled: false,
        humanTakeoverAt: new Date(),
        status: 'IN_PROGRESS',
      },
    });

    // Create transfer record
    await prisma.ticketTransfer.create({
      data: {
        ticketId: ticket.id,
        fromUserId: ticket.assignedToId,
        toUserId: req.user!.userId,
        transferType: 'AI_TO_HUMAN',
        reason: 'Agent takeover',
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'HUMAN_TAKEOVER',
        description: 'Human agent took over from AI',
        ticketId: ticket.id,
        userId: req.user!.userId,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
});

// Transfer ticket
router.post('/:id/transfer', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { toDepartmentId, toUserId, reason } = z.object({
      toDepartmentId: z.string().cuid().optional(),
      toUserId: z.string().cuid().optional(),
      reason: z.string().optional(),
    }).parse(req.body);

    if (!toDepartmentId && !toUserId) {
      throw new ForbiddenError('Must specify department or user');
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        ...(toDepartmentId && { departmentId: toDepartmentId }),
        ...(toUserId && { assignedToId: toUserId }),
        status: 'PENDING',
      },
    });

    // Create transfer record
    await prisma.ticketTransfer.create({
      data: {
        ticketId: ticket.id,
        fromUserId: ticket.assignedToId,
        toUserId,
        fromDeptId: ticket.departmentId,
        toDeptId: toDepartmentId,
        transferType: toDepartmentId ? 'DEPT_TO_DEPT' : 'USER_TO_USER',
        reason,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_TRANSFERRED',
        description: `Ticket transferred`,
        ticketId: ticket.id,
        userId: req.user!.userId,
        metadata: { reason, toDepartmentId, toUserId },
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:transferred', {
      ticketId: ticket.id,
      fromUserId: ticket.assignedToId,
      toUserId,
      toDepartmentId,
    });

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
});

// Update ticket status
router.put('/:id/status', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['PENDING', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']),
    }).parse(req.body);

    const ticket = await prisma.ticket.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: {
        status,
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
        ...(status === 'CLOSED' && { closedAt: new Date() }),
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: status === 'RESOLVED' ? 'TICKET_RESOLVED' : 'TICKET_CLOSED',
        description: `Ticket ${status.toLowerCase()}`,
        ticketId: ticket.id,
        userId: req.user!.userId,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:updated', ticket);

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// Update ticket priority
router.put('/:id/priority', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { priority } = z.object({
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    }).parse(req.body);

    const ticket = await prisma.ticket.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: { priority },
    });

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

export { router as ticketRouter };
