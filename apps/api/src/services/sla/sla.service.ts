import { prisma } from '../../config/database.js';
import { addMinutes, isWithinInterval, getDay, setHours, setMinutes } from 'date-fns';
import { logger } from '../../config/logger.js';

interface BusinessHours {
  start: string; // "09:00"
  end: string; // "18:00"
  days: number[]; // [1, 2, 3, 4, 5] for Mon-Fri
}

export class SLAService {
  /**
   * Calculate SLA deadline based on company/department config
   */
  static async calculateDeadline(
    companyId: string,
    departmentId?: string | null
  ): Promise<Date> {
    // Get SLA config (department-specific or default)
    let slaConfig = null;

    if (departmentId) {
      slaConfig = await prisma.sLAConfig.findUnique({
        where: { departmentId },
      });
    }

    if (!slaConfig) {
      slaConfig = await prisma.sLAConfig.findFirst({
        where: {
          companyId,
          isDefault: true,
          isActive: true,
        },
      });
    }

    // Default to 15 minutes if no config
    const firstResponseTime = slaConfig?.firstResponseTime || 15;
    const businessHours = slaConfig?.businessHours as BusinessHours | null;

    const now = new Date();

    if (businessHours) {
      return this.calculateBusinessHoursDeadline(now, firstResponseTime, businessHours);
    }

    return addMinutes(now, firstResponseTime);
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
   * Check and update SLA status for all open tickets
   */
  static async checkSLABreaches(): Promise<void> {
    const now = new Date();

    // Find tickets that have breached SLA
    const breachedTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] },
        slaBreached: false,
        slaDeadline: { lt: now },
      },
    });

    for (const ticket of breachedTickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { slaBreached: true },
      });

      await prisma.activity.create({
        data: {
          type: 'SLA_BREACH',
          description: 'SLA deadline breached',
          ticketId: ticket.id,
        },
      });

      logger.warn(`SLA breached for ticket ${ticket.protocol}`);
    }
  }

  /**
   * Get tickets that are close to breaching SLA
   */
  static async getAtRiskTickets(
    companyId: string,
    thresholdMinutes: number = 15
  ): Promise<any[]> {
    const threshold = addMinutes(new Date(), thresholdMinutes);

    return prisma.ticket.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        slaBreached: false,
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
   * Calculate SLA metrics for a period
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
