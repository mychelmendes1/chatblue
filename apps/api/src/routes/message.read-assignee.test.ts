import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";

vi.mock("../services/outbound-webhook.service.js", () => ({
  sendOutboundEvent: vi.fn(),
}));

import { messageRouter } from "./message.routes";

function authHeader(userId: string) {
  const token = jwt.sign(
    { userId, companyId: "company-123", role: "ADMIN" },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  return `Bearer ${token}`;
}

function mockAuthUser(id: string) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id,
    email: `${id}@test.com`,
    name: `User ${id}`,
    role: "ADMIN",
    isActive: true,
    companyId: "company-123",
  } as any);
}

describe("POST /api/messages/ticket/:ticketId/read assignee guard", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      id: "company-123",
      isActive: true,
    } as any);

    vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 2 } as any);

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.app.set("io", { to: () => ({ emit: vi.fn() }) });
      next();
    });
    app.use("/api/messages", messageRouter);
  });

  it("não aplica read quando outro usuário abre ticket de atendente humano", async () => {
    mockAuthUser("user-b");
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
      id: "t1",
      assignedToId: "user-a",
      assignedTo: { id: "user-a", isAI: false },
    } as any);

    const res = await request(app)
      .post("/api/messages/ticket/t1/read")
      .set("Authorization", authHeader("user-b"));

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
    expect(res.body.message).toBe("Not assignee");
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
  });

  it("aplica read quando o atendente atribuído (humano) chama", async () => {
    mockAuthUser("user-a");
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
      id: "t1",
      assignedToId: "user-a",
      assignedTo: { id: "user-a", isAI: false },
    } as any);

    const res = await request(app)
      .post("/api/messages/ticket/t1/read")
      .set("Authorization", authHeader("user-a"));

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(true);
    expect(prisma.message.updateMany).toHaveBeenCalledTimes(1);
  });

  it("aplica read na fila (sem assignee) para qualquer usuário", async () => {
    mockAuthUser("user-b");
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
      id: "t1",
      assignedToId: null,
      assignedTo: null,
    } as any);

    const res = await request(app)
      .post("/api/messages/ticket/t1/read")
      .set("Authorization", authHeader("user-b"));

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(true);
    expect(prisma.message.updateMany).toHaveBeenCalled();
  });

  it("aplica read quando assignee é IA (qualquer humano pode marcar)", async () => {
    mockAuthUser("user-b");
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
      id: "t1",
      assignedToId: "ai-1",
      assignedTo: { id: "ai-1", isAI: true },
    } as any);

    const res = await request(app)
      .post("/api/messages/ticket/t1/read")
      .set("Authorization", authHeader("user-b"));

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(true);
    expect(prisma.message.updateMany).toHaveBeenCalled();
  });

  it("retorna 404 se ticket não existe", async () => {
    mockAuthUser("user-a");
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/messages/ticket/t1/read")
      .set("Authorization", authHeader("user-a"));

    expect(res.status).toBe(404);
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
  });
});
