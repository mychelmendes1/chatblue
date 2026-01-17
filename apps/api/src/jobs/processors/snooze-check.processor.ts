import { Job } from 'bullmq';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { getGlobalIo } from '../../server.js';

interface SnoozeCheckJobData {
  // Empty for recurring check-all job
}

export async function snoozeCheckProcessor(job: Job<SnoozeCheckJobData>) {
  logger.debug('Running snooze check job', { jobId: job.id });

  const now = new Date();

  // Find all snoozed tickets that are due (snoozedUntil <= now)
  const dueTickets = await prisma.ticket.findMany({
    where: {
      status: 'SNOOZED',
      snoozedUntil: {
        lte: now,
      },
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (dueTickets.length > 0) {
    logger.info(`Found ${dueTickets.length} snoozed tickets that are due`);
  }

  // Get io instance from server
  const io = getGlobalIo();

  for (const ticket of dueTickets) {
    try {
      // Update ticket status to IN_PROGRESS
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'IN_PROGRESS',
          snoozedAt: null,
          snoozedUntil: null,
          // Keep snoozeReason for reference
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
          content: `🔔 Conversa retomada automaticamente - período de adiamento encerrado${ticket.snoozeReason ? `\n\n📝 Motivo original: ${ticket.snoozeReason}` : ''}`,
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
          description: `Ticket automatically unsnoozed after scheduled time`,
          ticketId: ticket.id,
        },
      });

      logger.info(`Unsnoozed ticket ${ticket.id} for contact ${ticket.contact?.name || ticket.contact?.phone}`);

      // Emit socket events if io is available
      if (io) {
        // Emit ticket updated to company room
        io.to(`company:${ticket.companyId}`).emit('ticket:updated', updatedTicket);

        // Emit unsnoozed notification to company room (for toast notifications)
        io.to(`company:${ticket.companyId}`).emit('ticket:unsnoozed', {
          ticket: updatedTicket,
          assignedToId: ticket.assignedToId,
          contactName: ticket.contact?.name || ticket.contact?.phone,
        });

        // Emit message to ticket room
        io.to(`ticket:${ticket.id}`).emit('message:received', { message: systemMessage });

        logger.debug(`Emitted socket events for unsnoozed ticket ${ticket.id}`);
      } else {
        logger.warn('Socket.io not available for emitting snooze notifications');
      }
    } catch (error) {
      logger.error(`Failed to unsnooze ticket ${ticket.id}:`, error);
    }
  }

  return { processed: dueTickets.length };
}
