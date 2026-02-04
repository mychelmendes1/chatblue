import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { slaCheckProcessor } from "./processors/sla-check.processor";
import { notificationProcessor } from "./processors/notification.processor";
import { notionSyncProcessor } from "./processors/notion-sync.processor";
import { ticketCleanupProcessor } from "./processors/ticket-cleanup.processor";
import { snoozeCheckProcessor } from "./processors/snooze-check.processor";
import { emailAlertsProcessor } from "./processors/email-alerts.processor";
import { mlTrainingCollectorProcessor } from "./processors/ml-training-collector.processor";
import { mlQualityScorerProcessor } from "./processors/ml-quality-scorer.processor";
import { mlPatternDetectorProcessor } from "./processors/ml-pattern-detector.processor";
import { mlMetricsProcessor } from "./processors/ml-metrics.processor";
import { dailyReportProcessor } from "./processors/daily-report.processor";

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

export const snoozeCheckQueue = new Queue("snooze-check", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const emailAlertsQueue = new Queue("email-alerts", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

// ML Learning System Queues
export const mlTrainingCollectorQueue = new Queue("ml-training-collector", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export const mlQualityScorerQueue = new Queue("ml-quality-scorer", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const mlPatternDetectorQueue = new Queue("ml-pattern-detector", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 50,
    attempts: 2,
  },
});

export const mlMetricsQueue = new Queue("ml-metrics", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    attempts: 3,
  },
});

export const dailyReportQueue = new Queue("daily-report", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 30,
    removeOnFail: 30,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

// Workers
let slaWorker: Worker | null = null;
let notificationWorker: Worker | null = null;
let notionSyncWorker: Worker | null = null;
let ticketCleanupWorker: Worker | null = null;
let snoozeCheckWorker: Worker | null = null;
let emailAlertsWorker: Worker | null = null;

// ML Workers
let mlTrainingCollectorWorker: Worker | null = null;
let mlQualityScorerWorker: Worker | null = null;
let mlPatternDetectorWorker: Worker | null = null;
let mlMetricsWorker: Worker | null = null;

// Daily Report Worker
let dailyReportWorker: Worker | null = null;

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

  // Snooze Check Worker
  snoozeCheckWorker = new Worker("snooze-check", snoozeCheckProcessor, {
    connection: redis,
    concurrency: 1,
  });

  snoozeCheckWorker.on("completed", (job: Job) => {
    logger.debug(`Snooze check job ${job.id} completed`);
  });

  snoozeCheckWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Snooze check job ${job?.id} failed:`, error);
  });

  // Email Alerts Worker
  emailAlertsWorker = new Worker("email-alerts", emailAlertsProcessor, {
    connection: redis,
    concurrency: 1,
  });

  emailAlertsWorker.on("completed", (job: Job) => {
    logger.debug(`Email alerts job ${job.id} completed`);
  });

  emailAlertsWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Email alerts job ${job?.id} failed:`, error);
  });

  // ML Training Collector Worker
  mlTrainingCollectorWorker = new Worker("ml-training-collector", mlTrainingCollectorProcessor, {
    connection: redis,
    concurrency: 2,
  });

  mlTrainingCollectorWorker.on("completed", (job: Job) => {
    logger.debug(`ML training collector job ${job.id} completed`);
  });

  mlTrainingCollectorWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`ML training collector job ${job?.id} failed:`, error);
  });

  // ML Quality Scorer Worker
  mlQualityScorerWorker = new Worker("ml-quality-scorer", mlQualityScorerProcessor, {
    connection: redis,
    concurrency: 2,
  });

  mlQualityScorerWorker.on("completed", (job: Job) => {
    logger.debug(`ML quality scorer job ${job.id} completed`);
  });

  mlQualityScorerWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`ML quality scorer job ${job?.id} failed:`, error);
  });

  // ML Pattern Detector Worker
  mlPatternDetectorWorker = new Worker("ml-pattern-detector", mlPatternDetectorProcessor, {
    connection: redis,
    concurrency: 1,
  });

  mlPatternDetectorWorker.on("completed", (job: Job) => {
    logger.debug(`ML pattern detector job ${job.id} completed`);
  });

  mlPatternDetectorWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`ML pattern detector job ${job?.id} failed:`, error);
  });

  // ML Metrics Worker
  mlMetricsWorker = new Worker("ml-metrics", mlMetricsProcessor, {
    connection: redis,
    concurrency: 1,
  });

  mlMetricsWorker.on("completed", (job: Job) => {
    logger.debug(`ML metrics job ${job.id} completed`);
  });

  mlMetricsWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`ML metrics job ${job?.id} failed:`, error);
  });

  // Daily Report Worker
  dailyReportWorker = new Worker("daily-report", dailyReportProcessor, {
    connection: redis,
    concurrency: 1,
  });

  dailyReportWorker.on("completed", (job: Job) => {
    logger.info(`Daily report job ${job.id} completed`);
  });

  dailyReportWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Daily report job ${job?.id} failed:`, error);
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

  // Check snoozed tickets every minute
  await snoozeCheckQueue.add(
    "check-snoozed-tickets",
    {},
    {
      repeat: {
        every: 60000, // Every minute
      },
    }
  );

  // Email alerts (conexão caída, tickets sem resposta > 12h) a cada 15 minutos
  await emailAlertsQueue.add(
    "check-email-alerts",
    {},
    {
      repeat: {
        every: 15 * 60000, // 15 minutes
      },
    }
  );

  // ML Jobs
  await mlTrainingCollectorQueue.add(
    "collect-recent",
    { type: "collect-recent", hoursBack: 2 },
    {
      repeat: {
        pattern: "0 * * * *", // Every hour
      },
    }
  );

  await mlTrainingCollectorQueue.add(
    "collect-transfers",
    { type: "collect-transfers", hoursBack: 4 },
    {
      repeat: {
        pattern: "0 */2 * * *", // Every 2 hours
      },
    }
  );

  await mlQualityScorerQueue.add(
    "score-pending",
    { type: "score-pending", limit: 50 },
    {
      repeat: {
        pattern: "*/30 * * * *", // Every 30 minutes
      },
    }
  );

  await mlPatternDetectorQueue.add(
    "detect-patterns",
    { type: "detect-patterns", minOccurrences: 3, minQualityScore: 60 },
    {
      repeat: {
        pattern: "0 2 * * *", // 2 AM daily
      },
    }
  );

  await mlPatternDetectorQueue.add(
    "full-training",
    { type: "full-training", minOccurrences: 5, minQualityScore: 70, autoApprove: false },
    {
      repeat: {
        pattern: "0 3 * * 0", // 3 AM on Sundays
      },
    }
  );

  await mlMetricsQueue.add(
    "calculate-daily",
    { type: "calculate-daily" },
    {
      repeat: {
        pattern: "0 0 * * *", // Midnight daily
      },
    }
  );

  // Daily Report - 8 AM every day (Brazil timezone: UTC-3, so 11 AM UTC)
  await dailyReportQueue.add(
    "send-daily-report",
    {},
    {
      repeat: {
        pattern: "0 11 * * *", // 11 AM UTC = 8 AM Brazil
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
    snoozeCheckWorker,
    emailAlertsWorker,
    mlTrainingCollectorWorker,
    mlQualityScorerWorker,
    mlPatternDetectorWorker,
    mlMetricsWorker,
    dailyReportWorker,
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

// ML Learning System helper functions
export async function addMLTrainingCollectorJob(data: {
  type: "collect-recent" | "collect-transfers" | "collect-single-ticket";
  companyId?: string;
  ticketId?: string;
  hoursBack?: number;
}) {
  return mlTrainingCollectorQueue.add(`ml-collect-${data.type}`, data);
}

export async function addMLQualityScorerJob(data: {
  type: "score-pending" | "score-batch";
  companyId?: string;
  limit?: number;
}) {
  return mlQualityScorerQueue.add(`ml-score-${data.type}`, data);
}

export async function addMLPatternDetectorJob(data: {
  type: "detect-patterns" | "train-intents" | "full-training";
  companyId?: string;
  minOccurrences?: number;
  minQualityScore?: number;
  autoApprove?: boolean;
}) {
  return mlPatternDetectorQueue.add(`ml-${data.type}`, data);
}

export async function addMLMetricsJob(data: {
  type: "calculate-daily" | "calculate-resolution-rate";
  companyId?: string;
  date?: string;
}) {
  return mlMetricsQueue.add(`ml-metrics-${data.type}`, data);
}
