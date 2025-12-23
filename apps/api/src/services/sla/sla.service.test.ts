import { describe, it, expect, vi, beforeEach } from "vitest";
import { SLAService } from "./sla.service";
import { prisma } from "../../config/database";

describe("SLAService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateBusinessHoursDeadline", () => {
    const businessHours = {
      start: "09:00",
      end: "18:00",
      days: [1, 2, 3, 4, 5], // Mon-Fri
    };

    it("should calculate deadline correctly during business hours", () => {
      // Monday 10:00 AM + 60 minutes = Monday 11:00 AM
      const startTime = new Date("2024-01-15T10:00:00");
      const deadline = SLAService.calculateBusinessHoursDeadline(
        startTime,
        60,
        businessHours
      );

      expect(deadline.getHours()).toBe(11);
      expect(deadline.getMinutes()).toBe(0);
    });

    it("should move to next business day when starting on weekend", () => {
      // Saturday 10:00 AM should move to Monday
      const startTime = new Date("2024-01-13T10:00:00"); // Saturday
      const deadline = SLAService.calculateBusinessHoursDeadline(
        startTime,
        60,
        businessHours
      );

      // Should be Monday (day 1)
      expect(deadline.getDay()).toBe(1);
    });

    it("should handle overnight calculations", () => {
      // Monday 5:00 PM + 120 minutes should span to next day
      const startTime = new Date("2024-01-15T17:00:00"); // Monday 5 PM
      const deadline = SLAService.calculateBusinessHoursDeadline(
        startTime,
        120,
        businessHours
      );

      // Only 60 min left today, need 60 more min = 10 AM next day
      expect(deadline.getDay()).toBe(2); // Tuesday
      expect(deadline.getHours()).toBe(10);
    });

    it("should start at business hours if before them", () => {
      // Monday 7:00 AM (before business hours) + 30 minutes = 9:30 AM
      const startTime = new Date("2024-01-15T07:00:00");
      const deadline = SLAService.calculateBusinessHoursDeadline(
        startTime,
        30,
        businessHours
      );

      expect(deadline.getHours()).toBe(9);
      expect(deadline.getMinutes()).toBe(30);
    });

    it("should skip to next day if after business hours", () => {
      // Monday 7:00 PM (after business hours) + 30 minutes = next day 9:30 AM
      const startTime = new Date("2024-01-15T19:00:00");
      const deadline = SLAService.calculateBusinessHoursDeadline(
        startTime,
        30,
        businessHours
      );

      expect(deadline.getDay()).toBe(2); // Tuesday
      expect(deadline.getHours()).toBe(9);
      expect(deadline.getMinutes()).toBe(30);
    });
  });

  describe("calculateDeadline", () => {
    it("should use default 15 minutes when no SLA config exists", async () => {
      vi.mocked(prisma.sLAConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.sLAConfig.findFirst).mockResolvedValue(null);

      const beforeCall = new Date();
      const deadline = await SLAService.calculateDeadline("company-123");
      const afterCall = new Date();

      // Should be approximately 15 minutes from now
      const expectedMin = beforeCall.getTime() + 15 * 60 * 1000;
      const expectedMax = afterCall.getTime() + 15 * 60 * 1000;

      expect(deadline.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000);
      expect(deadline.getTime()).toBeLessThanOrEqual(expectedMax + 1000);
    });

    it("should use department-specific SLA config when available", async () => {
      vi.mocked(prisma.sLAConfig.findUnique).mockResolvedValue({
        id: "sla-1",
        companyId: "company-123",
        departmentId: "dept-123",
        name: "Department SLA",
        firstResponseTime: 30,
        resolutionTime: 240,
        isDefault: false,
        isActive: true,
        businessHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const beforeCall = new Date();
      const deadline = await SLAService.calculateDeadline("company-123", "dept-123");

      // Should be approximately 30 minutes from now
      const expected = beforeCall.getTime() + 30 * 60 * 1000;
      expect(deadline.getTime()).toBeGreaterThanOrEqual(expected - 1000);
      expect(deadline.getTime()).toBeLessThanOrEqual(expected + 2000);
    });
  });

  describe("checkSLABreaches", () => {
    it("should mark breached tickets and create activity", async () => {
      const mockTicket = {
        id: "ticket-1",
        protocol: "2024010001",
        slaBreached: false,
        slaDeadline: new Date(Date.now() - 60000), // 1 minute ago
      };

      vi.mocked(prisma.ticket.findMany).mockResolvedValue([mockTicket] as any);
      vi.mocked(prisma.ticket.update).mockResolvedValue({} as any);
      vi.mocked(prisma.activity.create).mockResolvedValue({} as any);

      await SLAService.checkSLABreaches();

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "ticket-1" },
        data: { slaBreached: true },
      });

      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: {
          type: "SLA_BREACH",
          description: "SLA deadline breached",
          ticketId: "ticket-1",
        },
      });
    });

    it("should not update tickets that have not breached", async () => {
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([]);

      await SLAService.checkSLABreaches();

      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });
  });

  describe("calculateMetrics", () => {
    it("should calculate correct metrics", async () => {
      const mockTickets = [
        { slaBreached: false, responseTime: 10, resolutionTime: 60 },
        { slaBreached: false, responseTime: 15, resolutionTime: 90 },
        { slaBreached: true, responseTime: 20, resolutionTime: 120 },
        { slaBreached: false, responseTime: 5, resolutionTime: 30 },
      ];

      vi.mocked(prisma.ticket.findMany).mockResolvedValue(mockTickets as any);

      const metrics = await SLAService.calculateMetrics(
        "company-123",
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(metrics.totalTickets).toBe(4);
      expect(metrics.breached).toBe(1);
      expect(metrics.compliance).toBe(75); // 3/4 = 75%
      expect(metrics.avgResponseTime).toBe(13); // (10+15+20+5)/4 = 12.5 rounded
      expect(metrics.avgResolutionTime).toBe(75); // (60+90+120+30)/4 = 75
    });

    it("should return 100% compliance when no tickets", async () => {
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([]);

      const metrics = await SLAService.calculateMetrics(
        "company-123",
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(metrics.compliance).toBe(100);
      expect(metrics.totalTickets).toBe(0);
    });
  });
});
