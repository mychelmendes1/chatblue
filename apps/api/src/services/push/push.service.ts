import webPush from "web-push";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class PushService {
  private isConfigured: boolean = false;

  constructor() {
    this.configure();
  }

  private configure(): void {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@chatblue.com";

    if (vapidPublicKey && vapidPrivateKey) {
      try {
        webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        this.isConfigured = true;
        logger.info("Push notification service configured");
      } catch (error) {
        logger.error("Failed to configure push notifications:", error);
      }
    } else {
      logger.warn("VAPID keys not configured. Push notifications disabled.");
    }
  }

  /**
   * Generate VAPID keys for initial setup
   */
  static generateVapidKeys(): { publicKey: string; privateKey: string } {
    return webPush.generateVAPIDKeys();
  }

  /**
   * Get public VAPID key for client subscription
   */
  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  /**
   * Save user's push subscription
   */
  async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          pushSubscription: subscription as any,
        },
      });
      logger.info(`Push subscription saved for user ${userId}`);
    } catch (error) {
      logger.error("Failed to save push subscription:", error);
      throw error;
    }
  }

  /**
   * Remove user's push subscription
   */
  async removeSubscription(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          pushSubscription: null,
        },
      });
      logger.info(`Push subscription removed for user ${userId}`);
    } catch (error) {
      logger.error("Failed to remove push subscription:", error);
      throw error;
    }
  }

  /**
   * Send push notification to a user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn("Push notifications not configured");
      return false;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushSubscription: true },
      });

      if (!user?.pushSubscription) {
        logger.debug(`No push subscription for user ${userId}`);
        return false;
      }

      const subscription = user.pushSubscription as unknown as PushSubscription;

      await webPush.sendNotification(
        subscription,
        JSON.stringify({
          ...payload,
          icon: payload.icon || "/icons/icon-192x192.png",
          badge: payload.badge || "/icons/badge-72x72.png",
        })
      );

      logger.info(`Push notification sent to user ${userId}`);
      return true;
    } catch (error: any) {
      // Handle expired subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        logger.info(`Removing expired subscription for user ${userId}`);
        await this.removeSubscription(userId);
      } else {
        logger.error("Failed to send push notification:", error);
      }
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<number> {
    let successCount = 0;

    await Promise.all(
      userIds.map(async (userId) => {
        const success = await this.sendToUser(userId, payload);
        if (success) successCount++;
      })
    );

    return successCount;
  }

  /**
   * Send push notification to all users in a company
   */
  async sendToCompany(companyId: string, payload: NotificationPayload): Promise<number> {
    if (!this.isConfigured) {
      return 0;
    }

    const users = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        pushSubscription: { not: null },
      },
      select: { id: true },
    });

    return this.sendToUsers(
      users.map((u) => u.id),
      payload
    );
  }

  // Notification type helpers
  async notifySLAWarning(
    userId: string,
    ticketProtocol: string,
    remainingMinutes: number
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: "⚠️ Aviso de SLA",
      body: `Ticket #${ticketProtocol} - ${remainingMinutes} minutos restantes`,
      tag: `sla-warning-${ticketProtocol}`,
      data: {
        type: "sla_warning",
        ticketProtocol,
        url: `/chat?ticket=${ticketProtocol}`,
      },
      actions: [
        { action: "view", title: "Ver Ticket" },
        { action: "dismiss", title: "Dispensar" },
      ],
    });
  }

  async notifySLABreach(userId: string, ticketProtocol: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: "🚨 SLA Violado!",
      body: `Ticket #${ticketProtocol} violou o SLA`,
      tag: `sla-breach-${ticketProtocol}`,
      data: {
        type: "sla_breach",
        ticketProtocol,
        url: `/chat?ticket=${ticketProtocol}`,
      },
      actions: [{ action: "view", title: "Ver Ticket" }],
    });
  }

  async notifyNewTicket(
    userId: string,
    ticketProtocol: string,
    contactName: string
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: "📩 Novo Ticket",
      body: `#${ticketProtocol} - ${contactName}`,
      tag: `new-ticket-${ticketProtocol}`,
      data: {
        type: "new_ticket",
        ticketProtocol,
        url: `/chat?ticket=${ticketProtocol}`,
      },
      actions: [
        { action: "view", title: "Ver" },
        { action: "accept", title: "Aceitar" },
      ],
    });
  }

  async notifyTicketAssigned(userId: string, ticketProtocol: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: "✅ Ticket Atribuído",
      body: `Ticket #${ticketProtocol} foi atribuído a você`,
      tag: `assigned-${ticketProtocol}`,
      data: {
        type: "ticket_assigned",
        ticketProtocol,
        url: `/chat?ticket=${ticketProtocol}`,
      },
      actions: [{ action: "view", title: "Ver Ticket" }],
    });
  }

  async notifyNewMessage(
    userId: string,
    contactName: string,
    messagePreview: string,
    ticketProtocol: string
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: contactName,
      body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? "..." : ""),
      tag: `message-${ticketProtocol}`,
      data: {
        type: "new_message",
        ticketProtocol,
        url: `/chat?ticket=${ticketProtocol}`,
      },
      actions: [
        { action: "view", title: "Ver" },
        { action: "reply", title: "Responder" },
      ],
    });
  }

  async notifyMention(
    userId: string,
    mentionedBy: string,
    ticketProtocol: string
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: "👋 Você foi mencionado",
      body: `${mentionedBy} mencionou você no ticket #${ticketProtocol}`,
      tag: `mention-${ticketProtocol}-${Date.now()}`,
      data: {
        type: "mention",
        ticketProtocol,
        url: `/chat?ticket=${ticketProtocol}`,
      },
      actions: [{ action: "view", title: "Ver" }],
    });
  }
}

// Export singleton instance
export const pushService = new PushService();
