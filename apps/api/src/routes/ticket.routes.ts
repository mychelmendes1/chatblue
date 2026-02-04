import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ForbiddenError } from '../middlewares/error.middleware.js';
import { generateProtocol } from '../utils/protocol.js';
import { logger } from '../config/logger.js';

const router = Router();

// List tickets
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    logger.info('GET /tickets', { 
      userId: req.user?.userId, 
      companyId: req.user?.companyId, 
      role: req.user?.role,
      query: req.query 
    });
    
    const {
      status,
      departmentId,
      assignedToId,
      priority,
      isAIHandled,
      search,
      hideResolved,
      hasMentions,
      noHumanAssigned, // Filter for inbox: tickets without human assignee (null or AI)
      page = '1',
      limit = '100',
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

    const baseWhere: any = {
      companyId: req.user!.companyId,
      ...(status && { status: status as string }),
      ...(departmentId && { departmentId: departmentId as string }),
      ...(assignedToId && { assignedToId: assignedToId as string }),
      ...(priority && { priority: priority as string }),
      ...(isAIHandled !== undefined && { isAIHandled: isAIHandled === 'true' }),
      // Hide resolved/closed tickets by default (unless specific status is requested)
      // Note: SNOOZED tickets are shown but at the bottom of the list
      ...(hideResolved === 'true' && !status && {
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      }),
    };

    // Filter by mentions - tickets where user was mentioned
    if (hasMentions === 'true') {
      baseWhere.messages = {
        some: {
          mentionedUserIds: {
            has: req.user!.userId,
          },
        },
      };
    }

    // Filter for inbox: tickets without human assignee (null or AI)
    if (noHumanAssigned === 'true') {
      baseWhere.OR = [
        { assignedToId: null },
        { assignedTo: { isAI: true } },
      ];
    }

    // Build search filter
    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(
        { protocol: { contains: search as string } },
        { contact: { name: { contains: search as string, mode: 'insensitive' } } },
        { contact: { phone: { contains: search as string } } }
      );
    }

    // Build visibility filter based on user role and filters
    const where: any = { ...baseWhere };
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role);
    
    // Determine filter mode based on query parameters
    const isMentionsFilter = hasMentions === 'true';
    const isMyTicketsFilter = assignedToId === req.user!.userId;
    const isQueueFilter = status === 'PENDING' && !assignedToId && !isMentionsFilter;
    const isAllFilter = !status && !assignedToId && !isMentionsFilter;

    if (isAdmin) {
      // Admin and Super Admin can see everything - no visibility restrictions
      if (searchConditions.length > 0) {
        where.AND = [
          baseWhere,
          {
            OR: searchConditions,
          },
        ];
      }
    } else {
      // Non-admins have visibility restrictions based on filter mode
      
      if (isMentionsFilter) {
        // @Menções: Tickets where user was mentioned (already filtered in baseWhere)
        // No additional visibility restrictions needed - mentions filter is already applied
        if (searchConditions.length > 0) {
          where.AND = [
            baseWhere,
            {
              OR: searchConditions,
            },
          ];
        }
      } else if (isMyTicketsFilter) {
        // MEUS: Tickets assigned to the user
        // No additional restrictions - already filtered by assignedToId
        if (searchConditions.length > 0) {
          where.AND = [
            baseWhere,
            {
              OR: searchConditions,
            },
          ];
        }
      } else if (isQueueFilter) {
        // FILA: Tickets from user's departments that are not assigned (PENDING and unassigned)
        // Build queue filter: status PENDING AND department in user's departments AND not assigned
        const queueFilter: any = {
          ...baseWhere, // Includes status: 'PENDING' and companyId
          assignedToId: null, // Not assigned
        };
        
        if (visibleDeptIds.size > 0) {
          // User has departments - show unassigned tickets from their departments
          queueFilter.departmentId = { in: Array.from(visibleDeptIds) };
        }
        // If user has no departments, show all unassigned PENDING tickets from company

        if (searchConditions.length > 0) {
          where.AND = [
            queueFilter,
            {
              OR: searchConditions,
            },
          ];
        } else {
          Object.assign(where, queueFilter);
        }
      } else if (isAllFilter) {
        // TODOS: Show all tickets from all departments (no visibility restrictions)
        // Just apply company filter and search if present
        if (searchConditions.length > 0) {
          where.AND = [
            baseWhere,
            {
              OR: searchConditions,
            },
          ];
        }
      } else {
        // Other filters (status, departmentId, etc.) - apply department visibility
        const visibilityConditions: any[] = [
          { assignedToId: req.user!.userId },
        ];

        if (visibleDeptIds.size > 0) {
          visibilityConditions.push({ departmentId: { in: Array.from(visibleDeptIds) } });
        } else {
          visibilityConditions.push({ assignedToId: null });
        }

        if (searchConditions.length > 0) {
          where.AND = [
            baseWhere,
            {
              OR: visibilityConditions,
            },
            {
              OR: searchConditions,
            },
          ];
        } else {
          where.AND = [
            baseWhere,
            {
              OR: visibilityConditions,
            },
          ];
        }
      }
    }

    // Fetch tickets without pagination first for proper sorting
    const allTickets = await prisma.ticket.findMany({
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
        connection: {
          select: {
            id: true,
            name: true,
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
            messages: {
              where: {
                isFromMe: false,
                readAt: null,
              },
            },
          },
        },
      },
    });

    // Custom sorting:
    // 0. Snoozed tickets that are due (snoozedUntil <= now) - HIGHEST PRIORITY
    // 1. Unread messages OR transferred from AI (needs human attention)
    // 2. AI handled tickets (being processed by AI)
    // 3. Responded but still open
    // 4. Snoozed tickets (not yet due) - go to the bottom
    // Within each group, sort by updatedAt desc
    const now = new Date();
    const sortedTickets = allTickets.sort((a, b) => {
      const aUnread = a._count?.messages || 0;
      const bUnread = b._count?.messages || 0;
      const aIsAI = a.isAIHandled;
      const bIsAI = b.isAIHandled;
      const aLastMessageFromMe = a.messages[0]?.isFromMe ?? false;
      const bLastMessageFromMe = b.messages[0]?.isFromMe ?? false;

      // Check if snoozed and if snooze time has passed
      const aIsSnoozed = a.status === 'SNOOZED';
      const bIsSnoozed = b.status === 'SNOOZED';
      const aSnoozeDue = aIsSnoozed && a.snoozedUntil && new Date(a.snoozedUntil) <= now;
      const bSnoozeDue = bIsSnoozed && b.snoozedUntil && new Date(b.snoozedUntil) <= now;
      const aStillSnoozed = aIsSnoozed && !aSnoozeDue;
      const bStillSnoozed = bIsSnoozed && !bSnoozeDue;

      // Priority 0: Snoozed tickets that are due (back from snooze) - HIGHEST PRIORITY
      if (aSnoozeDue && !bSnoozeDue) return -1;
      if (bSnoozeDue && !aSnoozeDue) return 1;
      if (aSnoozeDue && bSnoozeDue) {
        // Both are due - sort by snooze time
        return new Date(a.snoozedUntil!).getTime() - new Date(b.snoozedUntil!).getTime();
      }

      // Priority LAST: Snoozed tickets (still waiting) - go to the bottom
      if (aStillSnoozed && !bStillSnoozed) return 1;
      if (bStillSnoozed && !aStillSnoozed) return -1;
      if (aStillSnoozed && bStillSnoozed) {
        // Both snoozed - sort by when they'll be unsnoozed
        return new Date(a.snoozedUntil!).getTime() - new Date(b.snoozedUntil!).getTime();
      }

      // Check if ticket was recently transferred from AI (PENDING status, not AI handled, has humanTakeoverAt)
      const aTransferredFromAI = !aIsAI && a.status === 'PENDING' && a.humanTakeoverAt !== null;
      const bTransferredFromAI = !bIsAI && b.status === 'PENDING' && b.humanTakeoverAt !== null;

      // Priority 1: Has unread client messages OR was transferred from AI (needs human attention)
      const aNeedsAttention = aUnread > 0 || aTransferredFromAI;
      const bNeedsAttention = bUnread > 0 || bTransferredFromAI;

      if (aNeedsAttention && !bNeedsAttention) return -1;
      if (bNeedsAttention && !aNeedsAttention) return 1;

      // If both need attention, sort by: transferred first, then unread count, then updatedAt
      if (aNeedsAttention && bNeedsAttention) {
        // Transferred from AI takes priority over just unread
        if (aTransferredFromAI && !bTransferredFromAI) return -1;
        if (bTransferredFromAI && !aTransferredFromAI) return 1;

        // Both transferred or both have unread - sort by unread count then updatedAt
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }

      // Priority 2: AI handled tickets (waiting for AI response or being processed)
      if (aIsAI && !bIsAI) return -1;
      if (bIsAI && !aIsAI) return 1;

      // Priority 3: Last message is from client (waiting for response)
      if (!aLastMessageFromMe && bLastMessageFromMe) return -1;
      if (!bLastMessageFromMe && aLastMessageFromMe) return 1;

      // Finally, sort by updatedAt desc
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // Apply pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const total = sortedTickets.length;
    const tickets = sortedTickets.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    logger.info('Tickets found', { 
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      role: req.user!.role,
      total,
      returned: tickets.length,
      ticketIds: tickets.map(t => t.id)
    });

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

// Start conversation with existing contact - MUST be before /:id routes
router.post('/start-conversation', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { contactId } = z.object({
      contactId: z.string().cuid(),
    }).parse(req.body);

    // Verify contact exists and belongs to company
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        companyId: req.user!.companyId,
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    // Check if there's already an open ticket for this contact
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        contactId: contact.id,
        companyId: req.user!.companyId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
      },
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
      },
    });

    if (existingTicket) {
      // Return existing open ticket
      return res.json({ id: existingTicket.id, isNew: false });
    }

    // Find an active connection to use
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        companyId: req.user!.companyId,
        isActive: true,
        status: 'CONNECTED',
      },
    });

    if (!connection) {
      // Try to find any active connection even if not connected
      const anyConnection = await prisma.whatsAppConnection.findFirst({
        where: {
          companyId: req.user!.companyId,
          isActive: true,
        },
      });

      if (!anyConnection) {
        throw new NotFoundError('Nenhuma conexão WhatsApp ativa encontrada. Configure uma conexão primeiro.');
      }
    }

    const connectionToUse = connection || await prisma.whatsAppConnection.findFirst({
      where: {
        companyId: req.user!.companyId,
        isActive: true,
      },
    });

    if (!connectionToUse) {
      throw new NotFoundError('Nenhuma conexão WhatsApp disponível.');
    }

    // Generate protocol
    const protocol = await generateProtocol();

    // Create new ticket
    const ticket = await prisma.ticket.create({
      data: {
        protocol,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        contactId: contact.id,
        connectionId: connectionToUse.id,
        assignedToId: req.user!.userId,
        companyId: req.user!.companyId,
      },
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
        connection: {
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_CREATED',
        description: 'Conversation started from contacts page',
        ticketId: ticket.id,
        userId: req.user!.userId,
      },
    });

    // Create system message
    await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: `Atendimento iniciado por ${req.user!.name}`,
        isFromMe: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: connectionToUse.id,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:created', ticket);

    res.status(201).json({ id: ticket.id, isNew: true });
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

    // Get ticket details for notification
    const ticketWithDetails = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        contact: { select: { name: true } },
      },
    });

    // Create notification for assigned user
    if (userId && userId !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          type: 'ticket_assigned',
          title: 'Nova conversa atribuída',
          message: `Uma conversa com ${ticketWithDetails?.contact?.name || 'cliente'} foi atribuída a você`,
          userId,
          ticketId: ticket.id,
          companyId: req.user!.companyId,
          metadata: {
            protocol: ticketWithDetails?.protocol,
            contactName: ticketWithDetails?.contact?.name,
          },
        },
      });

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      io.to(`user:${userId}`).emit('notification', {
        type: 'ticket_assigned',
        title: 'Nova conversa atribuída',
        message: `Uma conversa com ${ticketWithDetails?.contact?.name || 'cliente'} foi atribuída a você`,
        ticketId: ticket.id,
        metadata: {
          protocol: ticketWithDetails?.protocol,
          contactName: ticketWithDetails?.contact?.name,
        },
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

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
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Check if ticket is in Triagem and get user's departments
    let newDepartmentId: string | undefined = undefined;
    const isInTriagem = ticket.department?.name?.toLowerCase() === 'triagem' || 
                        ticket.departmentId === 'triagem-dept' ||
                        ticket.department?.id === 'triagem-dept';

    if (isInTriagem) {
      // Get user's departments
      const userDepartments = await prisma.userDepartment.findMany({
        where: {
          userId: req.user!.userId,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              isActive: true,
              order: true,
            },
          },
        },
      });

      // Sort by order and get the first active department
      const sortedDepartments = userDepartments
        .filter(ud => ud.department.isActive)
        .sort((a, b) => a.department.order - b.department.order);

      if (sortedDepartments.length > 0) {
        newDepartmentId = sortedDepartments[0].departmentId;
        logger.info(`Moving ticket ${ticket.id} from Triagem to department ${sortedDepartments[0].department.name} (${newDepartmentId})`);
      }
    }

    // Update ticket
    const updateData: any = {
      assignedToId: req.user!.userId,
      isAIHandled: false,
      humanTakeoverAt: new Date(),
      status: 'IN_PROGRESS',
    };

    // Only update department if moving from Triagem
    if (newDepartmentId) {
      updateData.departmentId = newDepartmentId;
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: updateData,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
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
        fromDeptId: ticket.departmentId,
        toDeptId: newDepartmentId || ticket.departmentId,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'HUMAN_TAKEOVER',
        description: newDepartmentId 
          ? `Human agent took over from AI. Moved from Triagem to ${updatedTicket.department?.name || 'department'}`
          : 'Human agent took over from AI',
        ticketId: ticket.id,
        userId: req.user!.userId,
      },
    });

    // Create system message
    const systemMessageContent = newDepartmentId
      ? `Atendimento assumido por ${req.user!.name} - Movido para ${updatedTicket.department?.name || 'departamento'}`
      : `Atendimento assumido por ${req.user!.name}`;

    const systemMessage = await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: systemMessageContent,
        isFromMe: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);
    io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

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

    // Get names for system message
    let toName = '';
    if (toUserId) {
      const toUser = await prisma.user.findUnique({ where: { id: toUserId }, select: { name: true } });
      toName = toUser?.name || 'outro atendente';
    } else if (toDepartmentId) {
      const toDept = await prisma.department.findUnique({ where: { id: toDepartmentId }, select: { name: true } });
      toName = `departamento ${toDept?.name || ''}`;
    }

    // Create system message
    const systemMessage = await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: `Atendimento transferido por ${req.user!.name} para ${toName}`,
        isFromMe: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Create notification for assigned user if transferred to user
    if (toUserId && toUserId !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          type: 'ticket_assigned',
          title: 'Nova conversa atribuída',
          message: `Uma conversa com ${updatedTicket.contact?.name || 'cliente'} foi transferida para você`,
          userId: toUserId,
          ticketId: ticket.id,
          companyId: req.user!.companyId,
          metadata: {
            protocol: updatedTicket.protocol,
            contactName: updatedTicket.contact?.name,
            fromUser: req.user!.name,
          },
        },
      });

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      io.to(`user:${toUserId}`).emit('notification', {
        type: 'ticket_assigned',
        title: 'Nova conversa atribuída',
        message: `Uma conversa com ${updatedTicket.contact?.name || 'cliente'} foi transferida para você`,
        ticketId: ticket.id,
        metadata: {
          protocol: updatedTicket.protocol,
          contactName: updatedTicket.contact?.name,
          fromUser: req.user!.name,
        },
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:transferred', {
      ticketId: ticket.id,
      fromUserId: ticket.assignedToId,
      toUserId,
      toDepartmentId,
    });
    io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

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

    // Create system message for resolved/closed
    if (status === 'RESOLVED' || status === 'CLOSED') {
      const statusText = status === 'RESOLVED' ? 'Atendimento resolvido' : 'Atendimento finalizado';
      const systemMessage = await prisma.message.create({
        data: {
          type: 'SYSTEM',
          content: `${statusText} por ${req.user!.name}`,
          isFromMe: true,
          status: 'DELIVERED',
          ticketId: ticket.id,
          connectionId: ticket.connectionId,
        },
      });

      // Emit message event
      const io = req.app.get('io');
      io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

      // Send NPS survey automatically
      try {
        const { NPSService } = await import('../services/nps/nps.service.js');
        // Use setImmediate to send NPS after response is sent (non-blocking)
        setImmediate(() => {
          NPSService.sendNPSSurvey(ticket.id).catch((err) => {
            logger.error(`Error sending NPS survey for ticket ${ticket.id}:`, err);
          });
        });
      } catch (npsError) {
        logger.error('Error importing NPS service:', npsError);
      }
    }

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

// Resolve ticket with AI summary and optional resolution note
router.post('/:id/resolve', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { resolutionNote } = z.object({
      resolutionNote: z.string().optional(),
    }).parse(req.body || {});

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        contact: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Generate AI summary
    let summary = '';
    try {
      const settings = await prisma.companySettings.findUnique({
        where: { companyId: req.user!.companyId },
      });

      if (settings?.aiEnabled && settings?.aiApiKey) {
        const { AIService } = await import('../services/ai/ai.service.js');
        const aiService = new AIService(settings.aiProvider || 'openai', settings.aiApiKey);

        // Prepare conversation for summary
        const conversationText = ticket.messages
          .filter(m => m.type === 'TEXT' && !m.isInternal)
          .map(m => `${m.isFromMe ? 'Atendente' : 'Cliente'}: ${m.content}`)
          .join('\n');

        summary = await aiService.generateResponse(
          'Você é um assistente que resume atendimentos de suporte. Crie um resumo conciso de um parágrafo, indicando: 1) O motivo do contato do cliente, 2) Como foi resolvido o problema. Seja direto e objetivo.',
          `Resuma o seguinte atendimento:\n\n${conversationText}`,
          { contactName: ticket.contact?.name || 'Cliente' },
          { maxTokens: 200, temperature: 0.3 }
        );
      }
    } catch (aiError) {
      console.error('AI summary error:', aiError);
      summary = 'Atendimento resolvido.';
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNote: resolutionNote || null,
      },
    });

    // Build system message content
    let messageContent = `✅ Atendimento resolvido por ${req.user!.name}`;
    if (resolutionNote) {
      messageContent += `\n\n📝 Observação: ${resolutionNote}`;
    }
    messageContent += `\n\n📋 Resumo: ${summary}`;

    // Create system message with summary
    const systemMessage = await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: messageContent,
        isFromMe: true,
        isInternal: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_RESOLVED',
        description: `Ticket resolved by ${req.user!.name}`,
        ticketId: ticket.id,
        userId: req.user!.userId,
        metadata: { summary, resolutionNote },
      },
    });

    // Emit socket events
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);
    io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

    // Send NPS survey automatically
    try {
      const { NPSService } = await import('../services/nps/nps.service.js');
      // Use setImmediate to send NPS after response is sent (non-blocking)
      setImmediate(() => {
        NPSService.sendNPSSurvey(ticket.id).catch((err) => {
          logger.error(`Error sending NPS survey for ticket ${ticket.id}:`, err);
        });
      });
    } catch (npsError) {
      logger.error('Error importing NPS service:', npsError);
    }

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
});

// Close ticket with AI summary
router.post('/:id/close', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        contact: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Generate AI summary
    let summary = '';
    try {
      const settings = await prisma.companySettings.findUnique({
        where: { companyId: req.user!.companyId },
      });

      if (settings?.aiEnabled && settings?.aiApiKey) {
        const { AIService } = await import('../services/ai/ai.service.js');
        const aiService = new AIService(settings.aiProvider || 'openai', settings.aiApiKey);
        
        // Prepare conversation for summary
        const conversationText = ticket.messages
          .filter(m => m.type === 'TEXT' && !m.isInternal)
          .map(m => `${m.isFromMe ? 'Atendente' : 'Cliente'}: ${m.content}`)
          .join('\n');

        summary = await aiService.generateResponse(
          'Você é um assistente que resume atendimentos de suporte. Crie um resumo conciso de um parágrafo, indicando: 1) O motivo do contato do cliente, 2) O que aconteceu no atendimento, 3) Por que foi encerrado. Seja direto e objetivo.',
          `Resuma o seguinte atendimento que foi encerrado:\n\n${conversationText}`,
          { contactName: ticket.contact?.name || 'Cliente' },
          { maxTokens: 200, temperature: 0.3 }
        );
      }
    } catch (aiError) {
      console.error('AI summary error:', aiError);
      summary = 'Atendimento encerrado.';
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    // Create system message with summary
    const systemMessage = await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: `🔒 Atendimento encerrado por ${req.user!.name}\n\n📋 Resumo: ${summary}`,
        isFromMe: true,
        isInternal: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_CLOSED',
        description: `Ticket closed by ${req.user!.name}`,
        ticketId: ticket.id,
        userId: req.user!.userId,
        metadata: { summary },
      },
    });

    // Emit socket events
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);
    io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

    // Send NPS survey automatically
    try {
      const { NPSService } = await import('../services/nps/nps.service.js');
      // Use setImmediate to send NPS after response is sent (non-blocking)
      setImmediate(() => {
        NPSService.sendNPSSurvey(ticket.id).catch((err) => {
          logger.error(`Error sending NPS survey for ticket ${ticket.id}:`, err);
        });
      });
    } catch (npsError) {
      logger.error('Error importing NPS service:', npsError);
    }

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
});

// Reopen ticket
router.post('/:id/reopen', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        status: { in: ['RESOLVED', 'CLOSED'] },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found or not closed/resolved');
    }

    // Update ticket to reopen
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'IN_PROGRESS',
        resolvedAt: null,
        closedAt: null,
        assignedToId: ticket.assignedToId || req.user!.userId,
      },
      include: {
        contact: true,
        assignedTo: {
          select: { id: true, name: true, avatar: true },
        },
        department: {
          select: { id: true, name: true },
        },
        connection: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    // Create system message
    const systemMessage = await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: `🔄 Atendimento reaberto por ${req.user!.name}`,
        isFromMe: true,
        isInternal: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_REOPENED',
        description: `Ticket reopened by ${req.user!.name}`,
        ticketId: ticket.id,
        userId: req.user!.userId,
      },
    });

    // Emit socket events
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);
    io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
});

// Snooze ticket (postpone)
router.post('/:id/snooze', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { reason, snoozedUntil } = z.object({
      reason: z.string().min(1, 'Motivo é obrigatório'),
      snoozedUntil: z.string().datetime(),
    }).parse(req.body);

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
      include: {
        contact: true,
        assignedTo: {
          select: { id: true, name: true, avatar: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found or already resolved/closed');
    }

    const snoozedUntilDate = new Date(snoozedUntil);

    // Format date for display
    const formattedDate = snoozedUntilDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'SNOOZED',
        snoozedAt: new Date(),
        snoozedUntil: snoozedUntilDate,
        snoozeReason: reason,
      },
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
      },
    });

    // Create system message
    const systemMessage = await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: `⏰ Conversa adiada por ${req.user!.name}\n\n📝 Motivo: ${reason}\n\n📅 Retorno: ${formattedDate}`,
        isFromMe: true,
        isInternal: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_SNOOZED',
        description: `Ticket snoozed by ${req.user!.name} until ${formattedDate}`,
        ticketId: ticket.id,
        userId: req.user!.userId,
        metadata: { reason, snoozedUntil },
      },
    });

    // Emit socket events
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);
    io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
});

// Unsnooze ticket (bring back from snooze)
router.post('/:id/unsnooze', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        status: 'SNOOZED',
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found or not snoozed');
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'IN_PROGRESS',
        snoozedAt: null,
        snoozedUntil: null,
        snoozeReason: null,
      },
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
      },
    });

    // Create system message
    const systemMessage = await prisma.message.create({
      data: {
        type: 'SYSTEM',
        content: `🔔 Conversa retomada - adiamento encerrado`,
        isFromMe: true,
        isInternal: true,
        status: 'DELIVERED',
        ticketId: ticket.id,
        connectionId: ticket.connectionId,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_UNSNOOZED',
        description: `Ticket unsnoozed`,
        ticketId: ticket.id,
        userId: req.user!.userId,
      },
    });

    // Emit socket events
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:updated', updatedTicket);
    io.to(`company:${req.user!.companyId}`).emit('ticket:unsnoozed', {
      ticket: updatedTicket,
      assignedToId: ticket.assignedToId,
    });
    io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
});

// Create new ticket (start new conversation)
router.post('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const createTicketSchema = z.object({
      phone: z.string().min(10),
      contactName: z.string().optional(),
      contactId: z.string().cuid().optional(),
      connectionId: z.string().cuid(),
      departmentId: z.string().cuid().optional(),
      subject: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    });

    const data = createTicketSchema.parse(req.body);

    // Normalize phone number
    const normalizedPhone = data.phone.replace(/\D/g, '');

    // Verify connection exists and belongs to company
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: data.connectionId,
        companyId: req.user!.companyId,
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Find or create contact
    let contact;
    if (data.contactId) {
      contact = await prisma.contact.findFirst({
        where: {
          id: data.contactId,
          companyId: req.user!.companyId,
        },
      });

      if (!contact) {
        throw new NotFoundError('Contact not found');
      }
    } else {
      // Try to find existing contact by phone
      contact = await prisma.contact.findFirst({
        where: {
          phone: normalizedPhone,
          companyId: req.user!.companyId,
        },
      });

      // Create new contact if not found
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            phone: normalizedPhone,
            name: data.contactName,
            companyId: req.user!.companyId,
          },
        });
      }
    }

    // Check if there's already an open ticket for this contact on the SAME connection
    // This is important for Meta Cloud API because templates require specific connection
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        contactId: contact.id,
        companyId: req.user!.companyId,
        connectionId: data.connectionId, // Must be the same connection
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
      },
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
        connection: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (existingTicket) {
      // Return existing open ticket for this connection
      return res.json({ ticket: existingTicket, isExisting: true });
    }

    // Generate protocol
    const protocol = await generateProtocol();

    // Create new ticket
    const ticket = await prisma.ticket.create({
      data: {
        protocol,
        status: 'IN_PROGRESS',
        priority: data.priority,
        subject: data.subject,
        contactId: contact.id,
        connectionId: connection.id,
        departmentId: data.departmentId,
        assignedToId: req.user!.userId,
        companyId: req.user!.companyId,
      },
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
        connection: {
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'TICKET_CREATED',
        description: 'New conversation started',
        ticketId: ticket.id,
        userId: req.user!.userId,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`company:${req.user!.companyId}`).emit('ticket:created', ticket);

    res.status(201).json({ ticket, isExisting: false });
  } catch (error) {
    next(error);
  }
});

// Rate ticket
router.post('/:id/rate', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { rating, comment } = z.object({
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
    }).parse(req.body);

    const ticket = await prisma.ticket.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: {
        rating,
        ratingComment: comment,
        ratedAt: new Date(),
      },
    });

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

export { router as ticketRouter };
