import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { ticketRouter } from "./ticket.routes";

vi.mock("../services/outbound-webhook.service.js", () => ({
  sendOutboundEvent: vi.fn(),
}));

vi.mock("../services/external-ai/external-ai-webhook.service.js", () => ({
  ExternalAIWebhookService: {
    isExternalAI: vi.fn(() => false),
    sendTicketUnassigned: vi.fn(),
    findExternalAIForDepartment: vi.fn(),
    sendTicketAssigned: vi.fn(),
  },
}));

vi.mock("../services/message-processor.service.js", () => ({
  MessageProcessor: { processExternalAIResponse: vi.fn() },
}));

const ticketIncludePayload = {
  id: "t1",
  protocol: "P1",
  status: "PENDING",
  companyId: "company-123",
  connectionId: "conn-1",
  assignedToId: null,
  isAIHandled: false,
  departmentId: "d1",
  contact: {
    id: "c1",
    name: "Cliente",
    phone: "5511999999999",
    avatar: null,
    isClient: true,
    email: null,
  },
  assignedTo: null,
  department: { id: "d1", name: "Suporte", color: "#ccc" },
  updatedAt: new Date(),
};

function authHeader() {
  const token = jwt.sign(
    { userId: "agent-1", companyId: "company-123", role: "ADMIN" },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  return `Bearer ${token}`;
}

describe("POST /api/tickets/:id/transfer releaseToQueue", () => {
  let app: express.Express;
  const mockIo = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo.to.mockReturnValue(mockIo);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "agent-1",
      email: "agent@test.com",
      name: "Agente Teste",
      role: "ADMIN",
      isActive: true,
      companyId: "company-123",
    } as any);

    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      id: "company-123",
      isActive: true,
    } as any);

    app = express();
    app.use(express.json());
    app.set("io", mockIo);
    app.use("/api/tickets", ticketRouter);
  });

  it("zera atribuição, define PENDING e isAIHandled false", async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
      id: "t1",
      companyId: "company-123",
      assignedToId: "u-assignee",
      departmentId: "d1",
      connectionId: "conn-1",
      protocol: "P1",
    } as any);

    vi.mocked(prisma.ticket.update).mockResolvedValue(ticketIncludePayload as any);
    vi.mocked(prisma.message.create).mockResolvedValue({ id: "m1" } as any);
    vi.mocked(prisma.ticketTransfer.create).mockResolvedValue({} as any);
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/tickets/t1/transfer")
      .set("Authorization", authHeader())
      .send({ releaseToQueue: true, reason: "test" });

    expect(res.status).toBe(200);
    expect(res.body.assignedToId).toBeNull();
    expect(res.body.status).toBe("PENDING");
    expect(res.body.isAIHandled).toBe(false);
    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: {
          assignedToId: null,
          status: "PENDING",
          isAIHandled: false,
          aiTakeoverAt: null,
        },
      })
    );
    expect(prisma.ticketTransfer.create).toHaveBeenCalled();
  });

  it("é idempotente quando já não há atendente", async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
      id: "t1",
      companyId: "company-123",
      assignedToId: null,
      departmentId: "d1",
      connectionId: "conn-1",
      protocol: "P1",
    } as any);

    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(ticketIncludePayload as any);

    const res = await request(app)
      .post("/api/tickets/t1/transfer")
      .set("Authorization", authHeader())
      .send({ releaseToQueue: true });

    expect(res.status).toBe(200);
    expect(res.body.assignedToId).toBeNull();
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it("rejeita releaseToQueue combinado com toUserId", async () => {
    const res = await request(app)
      .post("/api/tickets/t1/transfer")
      .set("Authorization", authHeader())
      .send({ releaseToQueue: true, toUserId: "user-x" });

    expect(res.status).toBe(403);
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
  });
});
