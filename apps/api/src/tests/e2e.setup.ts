import { beforeAll, afterAll, vi } from "vitest";

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-for-e2e";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-for-e2e";
process.env.API_PORT = "3099";

// Mock external services
vi.mock("../services/whatsapp/baileys.service", () => ({
  BaileysService: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue({ key: { id: "msg-123" } }),
      disconnect: vi.fn(),
    }),
  },
}));

vi.mock("../services/whatsapp/meta-cloud.service", () => ({
  MetaCloudService: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn().mockResolvedValue({ messages: [{ id: "msg-456" }] }),
    verifyWebhook: vi.fn().mockReturnValue(true),
  })),
}));

vi.mock("../services/ai/ai.service", () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generateResponse: vi.fn().mockResolvedValue("AI generated response"),
  })),
}));

vi.mock("../services/notion/notion.service", () => ({
  NotionService: vi.fn().mockImplementation(() => ({
    searchClient: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock("../jobs/index", () => ({
  startWorkers: vi.fn().mockResolvedValue(undefined),
  stopWorkers: vi.fn().mockResolvedValue(undefined),
  addNotificationJob: vi.fn().mockResolvedValue(undefined),
  addNotionSyncJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../config/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    setex: vi.fn().mockResolvedValue("OK"),
    keys: vi.fn().mockResolvedValue([]),
    quit: vi.fn().mockResolvedValue("OK"),
  },
}));

beforeAll(async () => {
  // Any global setup
});

afterAll(async () => {
  // Cleanup
});
