import { Job } from "bullmq";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { getIO } from "../../sockets";

interface NotificationData {
  type: "sla_warning" | "sla_breach" | "new_ticket" | "ticket_assigned" | "mention";
  userId: string;
  ticketId?: string;
  message: string;
  metadata?: Record<string, any>;
}

export async function notificationProcessor(job: Job<NotificationData>) {
  const { type, userId, ticketId, message, metadata } = job.data;

  logger.info(`Processing notification for user ${userId}: ${type}`);

  try {
    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        companyId: true,
      },
    });

    if (!user) {
      logger.warn(`User ${userId} not found for notification`);
      return { success: false, reason: "user_not_found" };
    }

    // Create activity log for the notification
    // Note: Activity model doesn't have companyId, it's inferred from ticket/user relation
    await prisma.activity.create({
      data: {
        type: `NOTIFICATION_${type.toUpperCase().replace('-', '_')}` as any,
        description: message,
        userId: user.id,
        ticketId: ticketId || undefined,
        metadata: metadata || {},
      },
    });

    // Send real-time notification via Socket.io
    const io = getIO();
    io?.to(`user:${userId}`).emit("notification", {
      id: job.id,
      type,
      message,
      ticketId,
      metadata,
      createdAt: new Date().toISOString(),
      read: false,
    });

    // For critical notifications (SLA breach), also send to company admins
    if (type === "sla_breach") {
      const admins = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          role: "ADMIN",
          isActive: true,
          id: { not: userId }, // Don't duplicate for the same user
        },
        select: { id: true },
      });

      for (const admin of admins) {
        io?.to(`user:${admin.id}`).emit("notification", {
          id: `${job.id}-admin-${admin.id}`,
          type,
          message: `[Alerta Admin] ${message}`,
          ticketId,
          metadata,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }

    // Future: Send email notification
    // if (user.emailNotifications) {
    //   await sendEmail({
    //     to: user.email,
    //     subject: getEmailSubject(type),
    //     body: message,
    //   });
    // }

    // Future: Send push notification
    // if (user.pushSubscription) {
    //   await sendPushNotification(user.pushSubscription, {
    //     title: getNotificationTitle(type),
    //     body: message,
    //   });
    // }

    logger.info(`Notification sent successfully to user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error in notification processor:", error);
    throw error;
  }
}

function getNotificationTitle(type: NotificationData["type"]): string {
  switch (type) {
    case "sla_warning":
      return "Aviso de SLA";
    case "sla_breach":
      return "SLA Violado!";
    case "new_ticket":
      return "Novo Ticket";
    case "ticket_assigned":
      return "Ticket Atribuído";
    case "mention":
      return "Você foi mencionado";
    default:
      return "Notificação";
  }
}

function getEmailSubject(type: NotificationData["type"]): string {
  switch (type) {
    case "sla_warning":
      return "[ChatBlue] Aviso: SLA próximo do limite";
    case "sla_breach":
      return "[ChatBlue] URGENTE: SLA Violado";
    case "new_ticket":
      return "[ChatBlue] Novo ticket recebido";
    case "ticket_assigned":
      return "[ChatBlue] Ticket atribuído a você";
    case "mention":
      return "[ChatBlue] Você foi mencionado em um ticket";
    default:
      return "[ChatBlue] Notificação";
  }
}
