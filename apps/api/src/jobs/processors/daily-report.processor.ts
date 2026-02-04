import { Job } from "bullmq";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { emailService } from "../../services/email/email.service";

interface DailyReportResult {
  success: boolean;
  recipientCount: number;
  date: string;
}

// Helper to format duration in seconds to human readable string
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}min`;
}

export async function dailyReportProcessor(job: Job): Promise<DailyReportResult> {
  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", { 
    weekday: "long", 
    day: "numeric", 
    month: "long", 
    year: "numeric",
    timeZone: "America/Sao_Paulo"
  });

  logger.info(`Running daily report job for: ${dateStr}`);

  try {
    const recipients = emailService.getAlertRecipients();
    if (recipients.length === 0) {
      logger.warn("No alert recipients configured for daily report");
      return { success: false, recipientCount: 0, date: dateStr };
    }

    // Calculate time ranges
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // 1. Volume metrics
    const ticketsOpen = await prisma.ticket.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS", "WAITING"] },
      },
    });

    const ticketsNew24h = await prisma.ticket.count({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    const ticketsResolved24h = await prisma.ticket.count({
      where: {
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { gte: twentyFourHoursAgo },
      },
    });

    const ticketsBacklog = await prisma.ticket.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        createdAt: { lt: fortyEightHoursAgo },
      },
    });

    // 2. SLA metrics
    const ticketsWithSLA = await prisma.ticket.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"] },
        slaDeadline: { not: null },
      },
      select: {
        id: true,
        status: true,
        slaDeadline: true,
        slaBreached: true,
        firstResponse: true,
      },
    });

    const slaBreached = ticketsWithSLA.filter(t => t.slaBreached).length;
    const slaAtRisk = ticketsWithSLA.filter(t => {
      if (!t.slaDeadline || t.slaBreached || t.firstResponse) return false;
      const deadline = new Date(t.slaDeadline);
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
      return deadline <= fifteenMinutesFromNow && deadline > now;
    }).length;

    const ticketsWithSLAForCompliance = ticketsWithSLA.filter(t => 
      ["RESOLVED", "CLOSED"].includes(t.status) || t.firstResponse
    );
    const ticketsWithinSLA = ticketsWithSLAForCompliance.filter(t => !t.slaBreached).length;
    const slaCompliance = ticketsWithSLAForCompliance.length > 0 
      ? Math.round((ticketsWithinSLA / ticketsWithSLAForCompliance.length) * 100) 
      : 100;

    // 3. Time metrics
    const resolvedTicketsWithTimes = await prisma.ticket.findMany({
      where: {
        resolvedAt: { gte: twentyFourHoursAgo },
        responseTime: { not: null },
      },
      select: {
        responseTime: true,
        resolutionTime: true,
      },
    });

    const avgResponseTime = resolvedTicketsWithTimes.length > 0
      ? resolvedTicketsWithTimes.reduce((sum, t) => sum + (t.responseTime || 0), 0) / resolvedTicketsWithTimes.length
      : null;

    const avgResolutionTime = resolvedTicketsWithTimes.filter(t => t.resolutionTime).length > 0
      ? resolvedTicketsWithTimes.filter(t => t.resolutionTime).reduce((sum, t) => sum + (t.resolutionTime || 0), 0) / resolvedTicketsWithTimes.filter(t => t.resolutionTime).length
      : null;

    // Tickets without response in last 2 hours
    const ticketsNoResponse2h = await prisma.ticket.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        firstResponse: null,
        createdAt: { lt: twoHoursAgo },
      },
    });

    // 4. Agent stats
    const agents = await prisma.user.findMany({
      where: {
        isAI: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const agentStats = await Promise.all(
      agents.map(async (agent) => {
        const active = await prisma.ticket.count({
          where: {
            assignedToId: agent.id,
            status: { in: ["PENDING", "IN_PROGRESS", "WAITING"] },
          },
        });

        const resolved24h = await prisma.ticket.count({
          where: {
            assignedToId: agent.id,
            resolvedAt: { gte: twentyFourHoursAgo },
          },
        });

        return {
          name: agent.name,
          active,
          resolved24h,
        };
      })
    );

    // Filter agents with activity
    const activeAgentStats = agentStats.filter(a => a.active > 0 || a.resolved24h > 0);

    const ticketsUnassigned = await prisma.ticket.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        assignedToId: null,
      },
    });

    // 5. AI metrics
    const aiTickets = await prisma.ticket.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS", "WAITING"] },
        isAIHandled: true,
      },
    });

    const aiRate = ticketsOpen > 0 ? Math.round((aiTickets / ticketsOpen) * 100) : 0;

    const aiTransferred = await prisma.ticket.count({
      where: {
        humanTakeoverAt: { gte: twentyFourHoursAgo },
      },
    });

    // 6. Quality metrics
    const ratingsLast24h = await prisma.ticket.findMany({
      where: {
        ratedAt: { gte: twentyFourHoursAgo },
        rating: { not: null },
      },
      select: {
        rating: true,
        npsScore: true,
      },
    });

    const avgCsat = ratingsLast24h.length > 0
      ? ratingsLast24h.reduce((sum, t) => sum + (t.rating || 0), 0) / ratingsLast24h.length
      : null;

    const npsRatings = ratingsLast24h.filter(t => t.npsScore !== null);
    const avgNps = npsRatings.length > 0
      ? npsRatings.reduce((sum, t) => sum + (t.npsScore || 0), 0) / npsRatings.length
      : null;

    // 7. Connections status
    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        isActive: true,
      },
      include: {
        company: { select: { name: true } },
      },
    });

    const connectionsList = connections.map(c => ({
      name: c.name,
      status: c.status,
      company: c.company?.name || "Sem empresa",
    }));

    // Prepare data for email
    const frontendUrl = process.env.FRONTEND_URL || "https://app.chatblue.com.br";

    const reportData = {
      date: dateStr,
      ticketsOpen,
      ticketsNew24h,
      ticketsResolved24h,
      ticketsBacklog,
      slaCompliance,
      slaAtRisk,
      slaBreached,
      avgResponseTime: formatDuration(avgResponseTime ? Math.round(avgResponseTime) : null),
      avgResolutionTime: formatDuration(avgResolutionTime ? Math.round(avgResolutionTime) : null),
      ticketsNoResponse2h,
      agentStats: activeAgentStats,
      ticketsUnassigned,
      aiRate,
      aiTransferred,
      avgNps,
      avgCsat,
      connections: connectionsList,
      dashboardUrl: `${frontendUrl}/metrics`,
    };

    // Send email
    const sent = await emailService.sendDailyReport(recipients, reportData);

    if (sent) {
      logger.info(`Daily report sent successfully to ${recipients.length} recipients`);
    } else {
      logger.error("Failed to send daily report email");
    }

    return { 
      success: sent, 
      recipientCount: recipients.length, 
      date: dateStr 
    };
  } catch (error) {
    logger.error("Error generating daily report:", error);
    throw error;
  }
}
