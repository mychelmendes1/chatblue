import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { slaCheckProcessor } from "./processors/sla-check.processor";
import { notificationProcessor } from "./processors/notification.processor";
import { notionSyncProcessor } from "./processors/notion-sync.processor";
import { ticketCleanupProcessor } from "./processors/ticket-cleanup.processor";

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

// Workers
let slaWorker: Worker | null = null;
let notificationWorker: Worker | null = null;
let notionSyncWorker: Worker | null = null;
let ticketCleanupWorker: Worker | null = null;

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

  logger.info("Recurring jobs scheduled");
}

export async function stopWorkers() {
  logger.info("Stopping background job workers...");

  const workers = [slaWorker, notificationWorker, notionSyncWorker, ticketCleanupWorker];

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
