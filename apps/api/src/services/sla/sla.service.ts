import { prisma } from '../../config/database.js';
import { addMinutes, getDay, setHours, setMinutes } from 'date-fns';
import type { SLAConfig } from '@prisma/client';

export interface BusinessHours {
  start: string; // "09:00"
  end: string; // "18:00"
  days: number[]; // [1, 2, 3, 4, 5] for Mon-Fri
}

/** Default first-response window when no SLAConfig exists (minutes). */
export const DEFAULT_FIRST_RESPONSE_MINUTES = 15;
/** Matches Prisma SLAConfig.resolutionTime @default(240). */
export const DEFAULT_RESOLUTION_MINUTES = 240;

export class SLAService {
  /**
   * Resolve SLA config: department-specific row first, then company default (isDefault + active).
   */
  static async getSLAConfig(
    companyId: string,
    departmentId?: string | null
  ): Promise<SLAConfig | null> {
    if (departmentId) {
      const byDept = await prisma.sLAConfig.findUnique({
        where: { departmentId },
      });
      if (byDept) return byDept;
    }

    return prisma.sLAConfig.findFirst({
      where: {
        companyId,
        isDefault: true,
        isActive: true,
      },
    });
  }

  /**
   * First-response deadline from a fixed anchor (e.g. ticket.createdAt).
   * Uses business hours when configured on the resolved SLAConfig.
   */
  static async calculateFirstResponseDeadline(
    anchor: Date,
    companyId: string,
    departmentId?: string | null
  ): Promise<Date> {
    const slaConfig = await this.getSLAConfig(companyId, departmentId);
    const firstResponseTime =
      slaConfig?.firstResponseTime ?? DEFAULT_FIRST_RESPONSE_MINUTES;
    const businessHours = slaConfig?.businessHours as unknown as BusinessHours | null;

    if (businessHours) {
      return this.calculateBusinessHoursDeadline(
        anchor,
        firstResponseTime,
        businessHours
      );
    }

    return addMinutes(anchor, firstResponseTime);
  }

  /**
   * Resolution deadline from anchor (minutes from config; default 240 like schema).
   * Uses the same businessHours rules as first-response when configured.
   */
  static async calculateResolutionDeadline(
    anchor: Date,
    companyId: string,
    departmentId?: string | null
  ): Promise<Date> {
    const slaConfig = await this.getSLAConfig(companyId, departmentId);
    const resolutionTime =
      slaConfig?.resolutionTime ?? DEFAULT_RESOLUTION_MINUTES;
    const businessHours = slaConfig?.businessHours as unknown as BusinessHours | null;

    if (businessHours) {
      return this.calculateBusinessHoursDeadline(
        anchor,
        resolutionTime,
        businessHours
      );
    }

    return addMinutes(anchor, resolutionTime);
  }

  /**
   * @deprecated Prefer calculateFirstResponseDeadline(anchor, ...) for ticket-relative deadlines.
   * Calculates first-response deadline from "now" (e.g. quick preview).
   */
  static async calculateDeadline(
    companyId: string,
    departmentId?: string | null,
    anchor: Date = new Date()
  ): Promise<Date> {
    return this.calculateFirstResponseDeadline(anchor, companyId, departmentId);
  }

  /**
   * Calculate deadline considering business hours
   */
  static calculateBusinessHoursDeadline(
    startTime: Date,
    minutes: number,
    businessHours: BusinessHours
  ): Date {
    let deadline = new Date(startTime);
    let remainingMinutes = minutes;

    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const [endHour, endMin] = businessHours.end.split(':').map(Number);

    while (remainingMinutes > 0) {
      const dayOfWeek = getDay(deadline);

      // If not a business day, move to next day
      if (!businessHours.days.includes(dayOfWeek)) {
        deadline = setHours(setMinutes(deadline, startMin), startHour);
        deadline.setDate(deadline.getDate() + 1);
        continue;
      }

      const dayStart = setHours(setMinutes(new Date(deadline), startMin), startHour);
      const dayEnd = setHours(setMinutes(new Date(deadline), endMin), endHour);

      // If before business hours, move to start
      if (deadline < dayStart) {
        deadline = dayStart;
      }

      // If after business hours, move to next day
      if (deadline >= dayEnd) {
        deadline = setHours(setMinutes(deadline, startMin), startHour);
        deadline.setDate(deadline.getDate() + 1);
        continue;
      }

      // Calculate remaining time today
      const minutesUntilEnd = (dayEnd.getTime() - deadline.getTime()) / 60000;

      if (remainingMinutes <= minutesUntilEnd) {
        deadline = addMinutes(deadline, remainingMinutes);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= minutesUntilEnd;
        deadline = setHours(setMinutes(deadline, startMin), startHour);
        deadline.setDate(deadline.getDate() + 1);
      }
    }

    return deadline;
  }

  /**
   * Get tickets that are close to breaching SLA (first-response deadline).
   */
  static async getAtRiskTickets(
    companyId: string,
    thresholdMinutes: number = 15
  ): Promise<any[]> {
    const threshold = addMinutes(new Date(), thresholdMinutes);

    return prisma.ticket.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
        slaBreached: false,
        firstResponse: null,
        slaDeadline: {
          gte: new Date(),
          lte: threshold,
        },
      },
      include: {
        contact: {
          select: { name: true, phone: true },
        },
        assignedTo: {
          select: { name: true },
        },
      },
      orderBy: { slaDeadline: 'asc' },
    });
  }

  /**
   * Calculate SLA metrics for a period.
   * Note: responseTime and resolutionTime on Ticket are stored in seconds.
   */
  static async calculateMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTickets: number;
    breached: number;
    compliance: number;
    avgResponseTime: number;
    avgResolutionTime: number;
  }> {
    const tickets = await prisma.ticket.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        slaBreached: true,
        responseTime: true,
        resolutionTime: true,
      },
    });

    const totalTickets = tickets.length;
    const breached = tickets.filter((t) => t.slaBreached).length;
    const compliance = totalTickets > 0 ? ((totalTickets - breached) / totalTickets) * 100 : 100;

    const responseTimes = tickets.filter((t) => t.responseTime).map((t) => t.responseTime!);
    const resolutionTimes = tickets.filter((t) => t.resolutionTime).map((t) => t.resolutionTime!);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    return {
      totalTickets,
      breached,
      compliance: Math.round(compliance * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      avgResolutionTime: Math.round(avgResolutionTime),
    };
  }
}
