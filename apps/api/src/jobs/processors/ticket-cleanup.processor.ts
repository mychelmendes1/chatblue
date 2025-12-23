import { Job } from "bullmq";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";

interface CleanupResult {
  archivedTickets: number;
  deletedMessages: number;
  deletedActivities: number;
}

export async function ticketCleanupProcessor(job: Job): Promise<CleanupResult> {
  logger.info("Running ticket cleanup job...");

  const result: CleanupResult = {
    archivedTickets: 0,
    deletedMessages: 0,
    deletedActivities: 0,
  };

  try {
    // Get all companies with their retention settings
    const companies = await prisma.company.findMany({
      include: {
        settings: true,
      },
    });

    for (const company of companies) {
      // Default retention: 90 days for closed tickets
      const retentionDays = 90;
      const archiveAfterDays = 30;

      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - archiveAfterDays);

      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - retentionDays);

      // Archive old closed tickets (mark as archived after 30 days)
      const archivedResult = await prisma.ticket.updateMany({
        where: {
          companyId: company.id,
          status: "closed",
          closedAt: {
            lt: archiveDate,
          },
          isArchived: false,
        },
        data: {
          isArchived: true,
        },
      });

      result.archivedTickets += archivedResult.count;

      // Delete old activities (older than retention period)
      const deletedActivities = await prisma.activity.deleteMany({
        where: {
          companyId: company.id,
          createdAt: {
            lt: deleteDate,
          },
        },
      });

      result.deletedActivities += deletedActivities.count;

      // Note: Messages are kept for compliance, but could be archived
      // For now, we just log the count of old messages
      const oldMessagesCount = await prisma.message.count({
        where: {
          ticket: {
            companyId: company.id,
            closedAt: {
              lt: deleteDate,
            },
          },
        },
      });

      if (oldMessagesCount > 0) {
        logger.info(
          `Company ${company.id} has ${oldMessagesCount} messages older than ${retentionDays} days`
        );
      }
    }

    // Clean up orphaned data
    // Delete messages without tickets (shouldn't happen, but cleanup just in case)
    const orphanedMessages = await prisma.message.deleteMany({
      where: {
        ticket: null,
      },
    });

    if (orphanedMessages.count > 0) {
      logger.warn(`Deleted ${orphanedMessages.count} orphaned messages`);
      result.deletedMessages += orphanedMessages.count;
    }

    // Auto-close abandoned tickets (no activity for 7 days)
    const abandonedDate = new Date();
    abandonedDate.setDate(abandonedDate.getDate() - 7);

    const abandonedTickets = await prisma.ticket.findMany({
      where: {
        status: {
          in: ["open", "pending"],
        },
        updatedAt: {
          lt: abandonedDate,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    for (const ticket of abandonedTickets) {
      const lastMessage = ticket.messages[0];

      // Only auto-close if last message was from client or no messages
      if (!lastMessage || lastMessage.fromMe === false) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "closed",
            closedAt: new Date(),
          },
        });

        await prisma.activity.create({
          data: {
            type: "ticket_auto_closed",
            description: "Ticket fechado automaticamente por inatividade",
            companyId: ticket.companyId,
            ticketId: ticket.id,
          },
        });

        logger.info(`Auto-closed abandoned ticket ${ticket.id}`);
      }
    }

    logger.info(
      `Cleanup completed: ${result.archivedTickets} archived, ${result.deletedActivities} activities deleted`
    );

    return result;
  } catch (error) {
    logger.error("Error in ticket cleanup processor:", error);
    throw error;
  }
}
