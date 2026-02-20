import { Job } from "bullmq";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { emailService } from "../../services/email/email.service";

const CONNECTION_DOWN_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 horas
const TICKETS_NO_RESPONSE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 horas
const TICKETS_NO_RESPONSE_HOURS = 12;

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.API_URL || "http://localhost:3000";
const baseUrl = FRONTEND_URL.split(",")[0].trim();

export async function emailAlertsProcessor(_job: Job): Promise<{ connectionAlerts: number; ticketAlerts: number }> {
  logger.info("Running email alerts job...");

  let connectionAlerts = 0;
  let ticketAlerts = 0;

  try {
    // 1) Conexões desconectadas ou em erro (ativas)
    const downConnections = await prisma.whatsAppConnection.findMany({
      where: {
        isActive: true,
        status: { in: ["DISCONNECTED", "ERROR"] },
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    const connectionCutoff = new Date(Date.now() - CONNECTION_DOWN_COOLDOWN_MS);

    for (const conn of downConnections) {
      const lastSent = await prisma.emailAlertLog.findFirst({
        where: {
          companyId: conn.companyId,
          alertType: "CONNECTION_DOWN",
          entityId: conn.id,
          sentAt: { gte: connectionCutoff },
        },
        orderBy: { sentAt: "desc" },
      });

      if (lastSent) continue;

      const recipients = await getCompanyAdminEmails(conn.companyId);
      if (recipients.length === 0) {
        logger.warn(`No admin emails for company ${conn.companyId}, skipping connection alert`);
        continue;
      }

      const connectionsUrl = `${baseUrl}/connections`;
      const sent = await emailService.sendConnectionDown(recipients, {
        connectionName: conn.name,
        companyName: conn.company.name,
        connectionsUrl,
        disconnectedAt: conn.updatedAt.toISOString(),
      });

      if (sent) {
        await prisma.emailAlertLog.create({
          data: {
            companyId: conn.companyId,
            alertType: "CONNECTION_DOWN",
            entityId: conn.id,
          },
        });
        connectionAlerts++;
      }
    }

    // 2) Tickets abertos há mais de 12h sem resposta (última mensagem do cliente há > 12h)
    const openStatuses: Array<'PENDING' | 'IN_PROGRESS' | 'WAITING'> = ["PENDING", "IN_PROGRESS", "WAITING"];
    const ticketsWithLastMessage = await prisma.ticket.findMany({
      where: {
        status: { in: openStatuses },
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { isFromMe: true, createdAt: true },
        },
      },
    });

    const noResponseCutoff = new Date(Date.now() - TICKETS_NO_RESPONSE_HOURS * 60 * 60 * 1000);
    const ticketsNoResponse: Array<{
      companyId: string;
      companyName: string;
      protocol: string;
      contactName: string;
      hoursOpen: number;
    }> = [];

    for (const ticket of ticketsWithLastMessage) {
      const lastMsg = ticket.messages[0];
      if (!lastMsg) continue;
      if (lastMsg.isFromMe) continue; // última mensagem foi nossa, não entra
      if (lastMsg.createdAt >= noResponseCutoff) continue;

      const hoursOpen = Math.floor((Date.now() - lastMsg.createdAt.getTime()) / (60 * 60 * 1000));
      ticketsNoResponse.push({
        companyId: ticket.companyId,
        companyName: ticket.company.name,
        protocol: ticket.protocol,
        contactName: ticket.contact?.name || "Contato",
        hoursOpen,
      });
    }

    // Agrupar por company e enviar um email por empresa (com cooldown 12h)
    const byCompany = new Map<
      string,
      { companyName: string; tickets: Array<{ protocol: string; contactName: string; hoursOpen: number }> }
    >();
    for (const t of ticketsNoResponse) {
      if (!byCompany.has(t.companyId)) {
        byCompany.set(t.companyId, { companyName: t.companyName, tickets: [] });
      }
      byCompany.get(t.companyId)!.tickets.push({
        protocol: t.protocol,
        contactName: t.contactName,
        hoursOpen: t.hoursOpen,
      });
    }

    const ticketAlertCutoff = new Date(Date.now() - TICKETS_NO_RESPONSE_COOLDOWN_MS);

    for (const [companyId, { companyName, tickets }] of byCompany) {
      const lastSent = await prisma.emailAlertLog.findFirst({
        where: {
          companyId,
          alertType: "TICKETS_NO_RESPONSE",
          entityId: null,
          sentAt: { gte: ticketAlertCutoff },
        },
        orderBy: { sentAt: "desc" },
      });

      if (lastSent) continue;

      const recipients = await getCompanyAdminEmails(companyId);
      if (recipients.length === 0) {
        logger.warn(`No admin emails for company ${companyId}, skipping tickets-no-response alert`);
        continue;
      }

      const chatUrl = `${baseUrl}/chat`;
      const sent = await emailService.sendTicketsNoResponse(recipients, {
        companyName,
        tickets,
        chatUrl,
      });

      if (sent) {
        await prisma.emailAlertLog.create({
          data: {
            companyId,
            alertType: "TICKETS_NO_RESPONSE",
            entityId: null,
          },
        });
        ticketAlerts++;
      }
    }

    logger.info(`Email alerts job done. Connection alerts: ${connectionAlerts}, Ticket alerts: ${ticketAlerts}`);
    return { connectionAlerts, ticketAlerts };
  } catch (error) {
    logger.error("Error in email alerts processor:", error);
    throw error;
  }
}

async function getCompanyAdminEmails(companyId: string): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: {
      companyId,
      role: "ADMIN",
      isActive: true,
    },
    select: { email: true },
  });

  if (admins.length > 0) {
    return admins.map((u) => u.email).filter(Boolean);
  }

  // Fallback: qualquer usuário ativo da empresa com email
  const users = await prisma.user.findMany({
    where: { companyId, isActive: true },
    select: { email: true },
    take: 5,
  });
  return users.map((u) => u.email).filter(Boolean);
}
