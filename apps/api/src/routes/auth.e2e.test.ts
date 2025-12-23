import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { authRouter } from "./auth.routes";
import { prisma } from "../config/database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Create test app
const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

// Mock prisma
vi.mock("../config/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    companySettings: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Auth Routes E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: hashedPassword,
        name: "Test User",
        role: "agent",
        companyId: "company-123",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toHaveProperty("id", "user-123");
      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should return 401 for invalid password", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: hashedPassword,
        name: "Test User",
        role: "agent",
        companyId: "company-123",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 401 for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        });

      expect(response.status).toBe(401);
    });

    it("should return 401 for inactive user", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: hashedPassword,
        name: "Test User",
        role: "agent",
        companyId: "company-123",
        isActive: false, // Inactive
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        });

      expect(response.status).toBe(401);
    });

    it("should return 400 for missing fields", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          // missing password
        });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh token successfully", async () => {
      const refreshToken = jwt.sign(
        { userId: "user-123", companyId: "company-123", type: "refresh" },
        process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret-for-e2e",
        { expiresIn: "7d" }
      );

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "agent",
        companyId: "company-123",
        isActive: true,
        refreshToken: refreshToken,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
    });

    it("should return 401 for invalid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/auth/register", () => {
    it("should register new company and admin user", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          company: {
            create: vi.fn().mockResolvedValue({
              id: "company-new",
              name: "New Company",
              slug: "new-company",
            }),
          },
          user: {
            create: vi.fn().mockResolvedValue({
              id: "user-new",
              email: "admin@newcompany.com",
              name: "Admin User",
              role: "admin",
              companyId: "company-new",
            }),
          },
          companySettings: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          companyName: "New Company",
          name: "Admin User",
          email: "admin@newcompany.com",
          password: "securePassword123",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("company");
      expect(response.body).toHaveProperty("user");
    });

    it("should return 400 if company already exists", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValue({
        id: "existing-company",
        name: "Existing Company",
        slug: "existing-company",
      } as any);

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          companyName: "Existing Company",
          name: "Admin User",
          email: "admin@existing.com",
          password: "securePassword123",
        });

      expect(response.status).toBe(400);
    });
  });
});
