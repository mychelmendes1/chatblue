import { Job } from "bullmq";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import {
  SLAService,
  DEFAULT_FIRST_RESPONSE_MINUTES,
  DEFAULT_RESOLUTION_MINUTES,
} from "../../services/sla/sla.service";
import { addNotificationJob } from "../index";
import { getIO } from "../../sockets";

interface SLACheckResult {
  ticketId: string;
  status: "ok" | "warning" | "breached";
  slaType: "first_response" | "resolution";
  remainingMinutes?: number;
}

const OPEN_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "WAITING",
  "SNOOZED",
] as const;

export async function slaCheckProcessor(job: Job): Promise<SLACheckResult[]> {
  logger.info("Running SLA check job...");

  const results: SLACheckResult[] = [];

  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        status: { in: [...OPEN_STATUSES] },
      },
      include: {
        assignedTo: true,
        department: true,
      },
    });

    const io = getIO();
    const now = new Date();

    for (const ticket of tickets) {
      const slaConfig = await SLAService.getSLAConfig(
        ticket.companyId,
        ticket.departmentId
      );
      const firstResponseTimeMinutes =
        slaConfig?.firstResponseTime ?? DEFAULT_FIRST_RESPONSE_MINUTES;
      const resolutionTimeMinutes =
        slaConfig?.resolutionTime ?? DEFAULT_RESOLUTION_MINUTES;

      let slaBreachedInMemory = ticket.slaBreached;

      // --- First response SLA ---
      if (!ticket.firstResponse) {
        const firstDeadline = ticket.slaDeadline
          ? new Date(ticket.slaDeadline)
          : await SLAService.calculateFirstResponseDeadline(
              ticket.createdAt,
              ticket.companyId,
              ticket.departmentId
            );

        const remainingMinutes = Math.floor(
          (firstDeadline.getTime() - now.getTime()) / 60000
        );

        if (remainingMinutes <= 0) {
          results.push({
            ticketId: ticket.id,
            status: "breached",
            slaType: "first_response",
          });

          if (!slaBreachedInMemory) {
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: { slaBreached: true },
            });
            slaBreachedInMemory = true;

            await prisma.activity.create({
              data: {
                type: "SLA_BREACH",
                description: "SLA de primeira resposta violado",
                ticketId: ticket.id,
              },
            });
          }

          if (ticket.assignedToId) {
            await addNotificationJob({
              type: "sla_breach",
              userId: ticket.assignedToId,
              ticketId: ticket.id,
              message: `SLA de primeira resposta violado no ticket #${ticket.protocol}`,
            });
          }

          io?.to(`company:${ticket.companyId}`).emit("sla:breach", {
            ticketId: ticket.id,
            protocol: ticket.protocol,
            slaType: "first_response",
          });
        } else {
          const warningThreshold = Math.max(
            5,
            Math.floor(firstResponseTimeMinutes * 0.1)
          );
          if (remainingMinutes <= warningThreshold) {
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
      }

      // --- Resolution SLA (from ticket creation; same anchor as SLAService) ---
      const resolutionDeadline = await SLAService.calculateResolutionDeadline(
        ticket.createdAt,
        ticket.companyId,
        ticket.departmentId
      );

      const resolutionRemainingMinutes = Math.floor(
        (resolutionDeadline.getTime() - now.getTime()) / 60000
      );

      if (resolutionRemainingMinutes <= 0) {
        results.push({
          ticketId: ticket.id,
          status: "breached",
          slaType: "resolution",
        });

        if (!slaBreachedInMemory) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { slaBreached: true },
          });
          slaBreachedInMemory = true;
        }

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
      } else {
        const warningThreshold = Math.max(
          10,
          Math.floor(resolutionTimeMinutes * 0.1)
        );
        if (resolutionRemainingMinutes <= warningThreshold) {
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
        } else {
          results.push({
            ticketId: ticket.id,
            status: "ok",
            slaType: "resolution",
            remainingMinutes: resolutionRemainingMinutes,
          });
        }
      }
    }

    logger.info(`SLA check completed. Processed ${tickets.length} tickets`);
    return results;
  } catch (error) {
    logger.error("Error in SLA check processor:", error);
    throw error;
  }
}
