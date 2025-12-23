import { Job } from "bullmq";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { SLAService } from "../../services/sla/sla.service";
import { addNotificationJob } from "../index";
import { io } from "../../sockets";

interface SLACheckResult {
  ticketId: string;
  status: "ok" | "warning" | "breached";
  slaType: "first_response" | "resolution";
  remainingMinutes?: number;
}

export async function slaCheckProcessor(job: Job): Promise<SLACheckResult[]> {
  logger.info("Running SLA check job...");

  const results: SLACheckResult[] = [];

  try {
    // Get all open tickets with SLA config
    const tickets = await prisma.ticket.findMany({
      where: {
        status: {
          in: ["open", "pending"],
        },
      },
      include: {
        company: {
          include: {
            slaConfigs: true,
          },
        },
        assignedTo: true,
        department: true,
      },
    });

    for (const ticket of tickets) {
      const slaConfig = ticket.company.slaConfigs.find(
        (sla) =>
          sla.priority === ticket.priority &&
          (!sla.departmentId || sla.departmentId === ticket.departmentId)
      );

      if (!slaConfig) continue;

      // Check first response SLA
      if (!ticket.firstResponseAt) {
        const firstResponseDeadline = SLAService.calculateDeadline(
          ticket.createdAt,
          slaConfig.firstResponseMinutes
        );

        const now = new Date();
        const remainingMinutes = Math.floor(
          (firstResponseDeadline.getTime() - now.getTime()) / 60000
        );

        if (remainingMinutes <= 0) {
          // SLA breached
          results.push({
            ticketId: ticket.id,
            status: "breached",
            slaType: "first_response",
          });

          // Notify assigned agent or all agents in department
          if (ticket.assignedToId) {
            await addNotificationJob({
              type: "sla_breach",
              userId: ticket.assignedToId,
              ticketId: ticket.id,
              message: `SLA de primeira resposta violado no ticket #${ticket.protocol}`,
            });
          }

          // Emit socket event
          io?.to(`company:${ticket.companyId}`).emit("sla:breach", {
            ticketId: ticket.id,
            protocol: ticket.protocol,
            slaType: "first_response",
          });
        } else if (remainingMinutes <= slaConfig.warningThresholdMinutes) {
          // SLA warning
          results.push({
            ticketId: ticket.id,
            status: "warning",
            slaType: "first_response",
            remainingMinutes,
          });

          if (ticket.assignedToId) {
            await addNotificationJob({
              type: "sla_warning",
              userId: ticket.assignedToId,
              ticketId: ticket.id,
              message: `Atenção: ${remainingMinutes} minutos restantes para primeira resposta no ticket #${ticket.protocol}`,
            });
          }

          io?.to(`company:${ticket.companyId}`).emit("sla:warning", {
            ticketId: ticket.id,
            protocol: ticket.protocol,
            slaType: "first_response",
            remainingMinutes,
          });
        } else {
          results.push({
            ticketId: ticket.id,
            status: "ok",
            slaType: "first_response",
            remainingMinutes,
          });
        }
      }

      // Check resolution SLA
      const resolutionDeadline = SLAService.calculateDeadline(
        ticket.createdAt,
        slaConfig.resolutionMinutes
      );

      const now = new Date();
      const resolutionRemainingMinutes = Math.floor(
        (resolutionDeadline.getTime() - now.getTime()) / 60000
      );

      if (resolutionRemainingMinutes <= 0) {
        // Resolution SLA breached
        results.push({
          ticketId: ticket.id,
          status: "breached",
          slaType: "resolution",
        });

        if (ticket.assignedToId) {
          await addNotificationJob({
            type: "sla_breach",
            userId: ticket.assignedToId,
            ticketId: ticket.id,
            message: `SLA de resolução violado no ticket #${ticket.protocol}`,
          });
        }

        io?.to(`company:${ticket.companyId}`).emit("sla:breach", {
          ticketId: ticket.id,
          protocol: ticket.protocol,
          slaType: "resolution",
        });

        // Update ticket SLA status
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { slaBreached: true },
        });
      } else if (resolutionRemainingMinutes <= slaConfig.warningThresholdMinutes) {
        results.push({
          ticketId: ticket.id,
          status: "warning",
          slaType: "resolution",
          remainingMinutes: resolutionRemainingMinutes,
        });

        if (ticket.assignedToId) {
          await addNotificationJob({
            type: "sla_warning",
            userId: ticket.assignedToId,
            ticketId: ticket.id,
            message: `Atenção: ${resolutionRemainingMinutes} minutos restantes para resolver o ticket #${ticket.protocol}`,
          });
        }

        io?.to(`company:${ticket.companyId}`).emit("sla:warning", {
          ticketId: ticket.id,
          protocol: ticket.protocol,
          slaType: "resolution",
          remainingMinutes: resolutionRemainingMinutes,
        });
      }
    }

    logger.info(`SLA check completed. Processed ${tickets.length} tickets`);
    return results;
  } catch (error) {
    logger.error("Error in SLA check processor:", error);
    throw error;
  }
}
