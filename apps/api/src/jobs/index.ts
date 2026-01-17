import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { slaCheckProcessor } from "./processors/sla-check.processor";
import { notificationProcessor } from "./processors/notification.processor";
import { notionSyncProcessor } from "./processors/notion-sync.processor";
import { ticketCleanupProcessor } from "./processors/ticket-cleanup.processor";
import {
  processAISync,
  processSentimentAnalysis,
  processAutoSuggestion,
  processDocumentIndexing,
  processKnowledgeGapAnalysis,
} from "./processors/ai-sync.processor";

// Queue definitions
export const slaCheckQueue = new Queue("sla-check", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 1000,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const notificationQueue = new Queue("notifications", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
  },
});

export const notionSyncQueue = new Queue("notion-sync", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 2,
  },
});

export const ticketCleanupQueue = new Queue("ticket-cleanup", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

// AI Assistant Queues
export const aiSyncQueue = new Queue("ai-sync", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export const aiSentimentQueue = new Queue("ai-sentiment", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 2,
  },
});

export const aiAutoSuggestionQueue = new Queue("ai-auto-suggestion", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 1,
  },
});

export const aiDocumentIndexQueue = new Queue("ai-document-index", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export const aiKnowledgeGapQueue = new Queue("ai-knowledge-gap", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

// Workers
let slaWorker: Worker | null = null;
let notificationWorker: Worker | null = null;
let notionSyncWorker: Worker | null = null;
let ticketCleanupWorker: Worker | null = null;
let aiSyncWorker: Worker | null = null;
let aiSentimentWorker: Worker | null = null;
let aiAutoSuggestionWorker: Worker | null = null;
let aiDocumentIndexWorker: Worker | null = null;
let aiKnowledgeGapWorker: Worker | null = null;

export async function startWorkers() {
  logger.info("Starting background job workers...");

  // SLA Check Worker
  slaWorker = new Worker("sla-check", slaCheckProcessor, {
    connection: redis,
    concurrency: 5,
  });

  slaWorker.on("completed", (job: Job) => {
    logger.debug(`SLA check job ${job.id} completed`);
  });

  slaWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`SLA check job ${job?.id} failed:`, error);
  });

  // Notification Worker
  notificationWorker = new Worker("notifications", notificationProcessor, {
    connection: redis,
    concurrency: 10,
  });

  notificationWorker.on("completed", (job: Job) => {
    logger.debug(`Notification job ${job.id} completed`);
  });

  notificationWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Notification job ${job?.id} failed:`, error);
  });

  // Notion Sync Worker
  notionSyncWorker = new Worker("notion-sync", notionSyncProcessor, {
    connection: redis,
    concurrency: 3,
  });

  notionSyncWorker.on("completed", (job: Job) => {
    logger.debug(`Notion sync job ${job.id} completed`);
  });

  notionSyncWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Notion sync job ${job?.id} failed:`, error);
  });

  // Ticket Cleanup Worker
  ticketCleanupWorker = new Worker("ticket-cleanup", ticketCleanupProcessor, {
    connection: redis,
    concurrency: 1,
  });

  ticketCleanupWorker.on("completed", (job: Job) => {
    logger.debug(`Ticket cleanup job ${job.id} completed`);
  });

  ticketCleanupWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Ticket cleanup job ${job?.id} failed:`, error);
  });

  // AI Sync Worker
  aiSyncWorker = new Worker("ai-sync", processAISync, {
    connection: redis,
    concurrency: 2,
  });

  aiSyncWorker.on("completed", (job: Job) => {
    logger.debug(`AI sync job ${job.id} completed`);
  });

  aiSyncWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`AI sync job ${job?.id} failed:`, error);
  });

  // AI Sentiment Worker
  aiSentimentWorker = new Worker("ai-sentiment", processSentimentAnalysis, {
    connection: redis,
    concurrency: 5,
  });

  aiSentimentWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`AI sentiment job ${job?.id} failed:`, error);
  });

  // AI Auto-Suggestion Worker
  aiAutoSuggestionWorker = new Worker("ai-auto-suggestion", processAutoSuggestion, {
    connection: redis,
    concurrency: 3,
  });

  aiAutoSuggestionWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`AI auto-suggestion job ${job?.id} failed:`, error);
  });

  // AI Document Index Worker
  aiDocumentIndexWorker = new Worker("ai-document-index", processDocumentIndexing, {
    connection: redis,
    concurrency: 2,
  });

  aiDocumentIndexWorker.on("completed", (job: Job) => {
    logger.debug(`AI document index job ${job.id} completed`);
  });

  aiDocumentIndexWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`AI document index job ${job?.id} failed:`, error);
  });

  // AI Knowledge Gap Worker
  aiKnowledgeGapWorker = new Worker("ai-knowledge-gap", processKnowledgeGapAnalysis, {
    connection: redis,
    concurrency: 1,
  });

  aiKnowledgeGapWorker.on("completed", (job: Job) => {
    logger.debug(`AI knowledge gap job ${job.id} completed`);
  });

  aiKnowledgeGapWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`AI knowledge gap job ${job?.id} failed:`, error);
  });

  // Schedule recurring jobs
  await scheduleRecurringJobs();

  logger.info("All background job workers started");
}

async function scheduleRecurringJobs() {
  // Check SLA every minute
  await slaCheckQueue.add(
    "check-all-sla",
    {},
    {
      repeat: {
        every: 60000, // Every minute
      },
    }
  );

  // Cleanup old closed tickets every day at 3 AM
  await ticketCleanupQueue.add(
    "cleanup-old-tickets",
    {},
    {
      repeat: {
        pattern: "0 3 * * *", // 3 AM daily
      },
    }
  );

  // AI data source sync every hour
  await aiSyncQueue.add(
    "sync-all-data-sources",
    {},
    {
      repeat: {
        every: 60 * 60 * 1000, // Every hour
      },
    }
  );

  // Knowledge gap analysis every 6 hours
  await aiKnowledgeGapQueue.add(
    "analyze-all-knowledge-gaps",
    {},
    {
      repeat: {
        every: 6 * 60 * 60 * 1000, // Every 6 hours
      },
    }
  );

  logger.info("Recurring jobs scheduled");
}

export async function stopWorkers() {
  logger.info("Stopping background job workers...");

  const workers = [
    slaWorker,
    notificationWorker,
    notionSyncWorker,
    ticketCleanupWorker,
    aiSyncWorker,
    aiSentimentWorker,
    aiAutoSuggestionWorker,
    aiDocumentIndexWorker,
    aiKnowledgeGapWorker,
  ];

  await Promise.all(
    workers.filter(Boolean).map((worker) => worker?.close())
  );

  logger.info("All background job workers stopped");
}

// Helper functions to add jobs
export async function addNotificationJob(data: {
  type: "sla_warning" | "sla_breach" | "new_ticket" | "ticket_assigned" | "mention";
  userId: string;
  ticketId?: string;
  message: string;
  metadata?: Record<string, any>;
}) {
  return notificationQueue.add("send-notification", data);
}

export async function addNotionSyncJob(data: {
  companyId: string;
  contactPhone: string;
  contactId: string;
}) {
  return notionSyncQueue.add("sync-contact", data);
}

// AI Assistant job helpers
export async function addAISyncJob(data: {
  dataSourceId?: string;
  companyId?: string;
}) {
  return aiSyncQueue.add("sync-data-source", data);
}

export async function addSentimentAnalysisJob(data: {
  messageId: string;
  ticketId: string;
  companyId: string;
  content: string;
}) {
  return aiSentimentQueue.add("analyze-sentiment", data);
}

export async function addAutoSuggestionJob(data: {
  message: string;
  ticketId: string;
  userId: string;
  companyId: string;
}) {
  return aiAutoSuggestionQueue.add("generate-suggestion", data);
}

export async function addDocumentIndexJob(data: { documentId: string }) {
  return aiDocumentIndexQueue.add("index-document", data);
}

export async function addKnowledgeGapAnalysisJob(data: { companyId: string }) {
  return aiKnowledgeGapQueue.add("analyze-gaps", data);
}
