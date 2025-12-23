import { vi, beforeAll, afterAll, beforeEach } from "vitest";

// Mock environment variables
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = "redis://localhost:6379";

// Mock Prisma
vi.mock("../config/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ticket: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    message: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    department: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    whatsAppConnection: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    companySettings: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    sLAConfig: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      user: { findUnique: vi.fn(), update: vi.fn() },
      ticket: { findUnique: vi.fn(), update: vi.fn() },
    })),
  },
}));

// Mock Redis
vi.mock("../config/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    setex: vi.fn(),
    keys: vi.fn(),
    quit: vi.fn(),
  },
}));

// Mock Logger
vi.mock("../config/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Socket.io
vi.mock("../sockets", () => ({
  io: {
    to: vi.fn(() => ({
      emit: vi.fn(),
    })),
    emit: vi.fn(),
  },
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  password: "$2b$10$test-hashed-password",
  role: "agent" as const,
  companyId: "company-123",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockCompany = {
  id: "company-123",
  name: "Test Company",
  slug: "test-company",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockTicket = {
  id: "ticket-123",
  protocol: "2024010001",
  status: "open" as const,
  priority: "medium" as const,
  companyId: "company-123",
  contactId: "contact-123",
  assignedToId: "user-123",
  departmentId: "dept-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockContact = {
  id: "contact-123",
  phone: "5511999999999",
  name: "Test Contact",
  companyId: "company-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};
