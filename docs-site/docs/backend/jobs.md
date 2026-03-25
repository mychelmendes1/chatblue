---
sidebar_position: 6
title: Jobs
description: Processamento em background com BullMQ
---

# Jobs

O ChatBlue usa BullMQ para processamento de tarefas em background, aproveitando o Redis como backend. Todas as filas, workers e agendamentos sao definidos em um unico arquivo centralizado.

## Estrutura de Pastas

```
apps/api/src/jobs/
├── index.ts                              # Filas, workers e agendamentos
└── processors/
    ├── sla-check.processor.ts
    ├── ticket-cleanup.processor.ts
    ├── snooze-check.processor.ts
    ├── email-alerts.processor.ts
    ├── email-poll.processor.ts
    ├── daily-report.processor.ts
    ├── notification.processor.ts
    ├── notion-sync.processor.ts
    ├── ai-sync.processor.ts
    ├── ml-training-collector.processor.ts
    ├── ml-quality-scorer.processor.ts
    ├── ml-pattern-detector.processor.ts
    └── ml-metrics.processor.ts
```

Nao existe um subdiretorio `queues/`. Tudo e definido diretamente em `jobs/index.ts`: as filas (`Queue`), os workers (`Worker`), os agendamentos recorrentes e as funcoes helper para adicionar jobs.

## Configuracao

O arquivo `jobs/index.ts` importa cada processador e cria as filas com opcoes especificas:

```typescript
// jobs/index.ts
import { Queue, Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { slaCheckProcessor } from "./processors/sla-check.processor";
import { ticketCleanupProcessor } from "./processors/ticket-cleanup.processor";
import { snoozeCheckProcessor } from "./processors/snooze-check.processor";
import { emailAlertsProcessor } from "./processors/email-alerts.processor";
import { emailPollProcessor } from "./processors/email-poll.processor";
import { dailyReportProcessor } from "./processors/daily-report.processor";
import { notificationProcessor } from "./processors/notification.processor";
import { notionSyncProcessor } from "./processors/notion-sync.processor";
import { mlTrainingCollectorProcessor } from "./processors/ml-training-collector.processor";
import { mlQualityScorerProcessor } from "./processors/ml-quality-scorer.processor";
import { mlPatternDetectorProcessor } from "./processors/ml-pattern-detector.processor";
import { mlMetricsProcessor } from "./processors/ml-metrics.processor";
```

Cada fila recebe `connection: redis` e opcoes como `removeOnComplete`, `removeOnFail`, `attempts` e `backoff` conforme a necessidade.

## Filas

### Operacionais

| Fila | Descricao | Agendamento | Concorrencia |
|------|-----------|-------------|--------------|
| `sla-check` | Verifica SLAs e dispara alertas | `every: 60000` (1 minuto) | 5 |
| `ticket-cleanup` | Arquiva tickets antigos fechados | `cron: 0 3 * * *` (3h diario) | 1 |
| `snooze-check` | Reativa tickets com snooze expirado | `every: 60000` (1 minuto) | 1 |
| `email-alerts` | Alerta sobre conexoes caidas e tickets sem resposta | `every: 900000` (15 minutos) | 1 |
| `email-poll` | Polling IMAP para canais de email | `every: 30000` (30 segundos) | 1 |
| `daily-report` | Envia relatorio diario por empresa | `cron: 0 11 * * *` (11h UTC / 8h Brasil) | 1 |
| `notifications` | Notificacoes push e in-app | Sob demanda | 10 |
| `notion-sync` | Sincroniza contatos com Notion | Sob demanda | 3 |

### Machine Learning

| Fila | Descricao | Agendamento | Concorrencia |
|------|-----------|-------------|--------------|
| `ml-training-collector` | Coleta dados de treinamento | `cron: 0 * * * *` (a cada hora) + `cron: 0 */2 * * *` (a cada 2h para transfers) | 2 |
| `ml-quality-scorer` | Avalia qualidade dos dados coletados | `cron: */30 * * * *` (a cada 30 min) | 2 |
| `ml-pattern-detector` | Detecta padroes e treina intents | `cron: 0 2 * * *` (2h diario) + `cron: 0 3 * * 0` (3h domingos, full training) | 1 |
| `ml-metrics` | Calcula metricas diarias de ML | `cron: 0 0 * * *` (meia-noite) | 1 |

## Definicao das Filas

Cada fila e criada com opcoes especificas. Exemplo da fila de SLA:

```typescript
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
```

Exemplo de fila com menos retentativas e backoff maior (email-alerts):

```typescript
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
```

## Workers

Os workers sao inicializados pela funcao `startWorkers()`, chamada ao subir a aplicacao. Cada worker recebe o nome da fila, o processador importado e opcoes de concorrencia:

```typescript
export async function startWorkers() {
  logger.info("Starting background job workers...");

  slaWorker = new Worker("sla-check", slaCheckProcessor, {
    connection: redis,
    concurrency: 5,
  });

  notificationWorker = new Worker("notifications", notificationProcessor, {
    connection: redis,
    concurrency: 10,
  });

  notionSyncWorker = new Worker("notion-sync", notionSyncProcessor, {
    connection: redis,
    concurrency: 3,
  });

  ticketCleanupWorker = new Worker("ticket-cleanup", ticketCleanupProcessor, {
    connection: redis,
    concurrency: 1,
  });

  snoozeCheckWorker = new Worker("snooze-check", snoozeCheckProcessor, {
    connection: redis,
    concurrency: 1,
  });

  emailAlertsWorker = new Worker("email-alerts", emailAlertsProcessor, {
    connection: redis,
    concurrency: 1,
  });

  // ML Workers
  mlTrainingCollectorWorker = new Worker("ml-training-collector", mlTrainingCollectorProcessor, {
    connection: redis,
    concurrency: 2,
  });

  mlQualityScorerWorker = new Worker("ml-quality-scorer", mlQualityScorerProcessor, {
    connection: redis,
    concurrency: 2,
  });

  mlPatternDetectorWorker = new Worker("ml-pattern-detector", mlPatternDetectorProcessor, {
    connection: redis,
    concurrency: 1,
  });

  mlMetricsWorker = new Worker("ml-metrics", mlMetricsProcessor, {
    connection: redis,
    concurrency: 1,
  });

  dailyReportWorker = new Worker("daily-report", dailyReportProcessor, {
    connection: redis,
    concurrency: 1,
  });

  await scheduleRecurringJobs();
  logger.info("All background job workers started");
}
```

Todos os workers registram eventos `completed` e `failed` via `logger`.

O worker de `email-poll` e criado dentro de `scheduleRecurringJobs()` junto com seu agendamento.

## Agendamentos Recorrentes

A funcao `scheduleRecurringJobs()` registra todos os jobs recorrentes. Existem dois tipos de agendamento:

- **`every`** - intervalo fixo em milissegundos
- **`pattern`** - expressao cron

```typescript
async function scheduleRecurringJobs() {
  // SLA check a cada 1 minuto
  await slaCheckQueue.add("check-all-sla", {}, {
    repeat: { every: 60000 },
  });

  // Limpeza de tickets antigos - 3h diario
  await ticketCleanupQueue.add("cleanup-old-tickets", {}, {
    repeat: { pattern: "0 3 * * *" },
  });

  // Snooze check a cada 1 minuto
  await snoozeCheckQueue.add("check-snoozed-tickets", {}, {
    repeat: { every: 60000 },
  });

  // Email alerts a cada 15 minutos
  await emailAlertsQueue.add("check-email-alerts", {}, {
    repeat: { every: 15 * 60000 },
  });

  // ML: coleta recente a cada hora
  await mlTrainingCollectorQueue.add("collect-recent",
    { type: "collect-recent", hoursBack: 2 },
    { repeat: { pattern: "0 * * * *" } }
  );

  // ML: coleta de transfers a cada 2 horas
  await mlTrainingCollectorQueue.add("collect-transfers",
    { type: "collect-transfers", hoursBack: 4 },
    { repeat: { pattern: "0 */2 * * *" } }
  );

  // ML: scoring a cada 30 minutos
  await mlQualityScorerQueue.add("score-pending",
    { type: "score-pending", limit: 50 },
    { repeat: { pattern: "*/30 * * * *" } }
  );

  // ML: deteccao de padroes - 2h diario
  await mlPatternDetectorQueue.add("detect-patterns",
    { type: "detect-patterns", minOccurrences: 3, minQualityScore: 60 },
    { repeat: { pattern: "0 2 * * *" } }
  );

  // ML: full training - domingos 3h
  await mlPatternDetectorQueue.add("full-training",
    { type: "full-training", minOccurrences: 5, minQualityScore: 70, autoApprove: false },
    { repeat: { pattern: "0 3 * * 0" } }
  );

  // ML: metricas diarias - meia-noite
  await mlMetricsQueue.add("calculate-daily",
    { type: "calculate-daily" },
    { repeat: { pattern: "0 0 * * *" } }
  );

  // Daily report - 11h UTC (8h Brasil)
  await dailyReportQueue.add("send-daily-report", {}, {
    repeat: { pattern: "0 11 * * *" },
  });

  // Email poll - IMAP a cada 30 segundos
  await emailPollQueue.add("poll-email-connections", {}, {
    repeat: { every: 30000 },
  });
}
```

## Funcoes Helper

O arquivo exporta funcoes helper para adicionar jobs sob demanda a partir de qualquer parte da aplicacao:

```typescript
// Notificacoes
await addNotificationJob({
  type: "sla_warning", // "sla_warning" | "sla_breach" | "new_ticket" | "ticket_assigned" | "mention"
  userId: "user-123",
  message: "Ticket #1234 proximo do prazo",
  ticketId: "ticket-456",
});

// Sincronizacao com Notion
await addNotionSyncJob({
  companyId: "company-123",
  contactPhone: "+5511999999999",
  contactId: "contact-456",
});

// ML: coleta de dados
await addMLTrainingCollectorJob({
  type: "collect-single-ticket", // "collect-recent" | "collect-transfers" | "collect-single-ticket"
  ticketId: "ticket-789",
});

// ML: scoring
await addMLQualityScorerJob({
  type: "score-pending", // "score-pending" | "score-batch"
  limit: 50,
});

// ML: deteccao de padroes
await addMLPatternDetectorJob({
  type: "detect-patterns", // "detect-patterns" | "train-intents" | "full-training"
  companyId: "company-123",
  minOccurrences: 3,
  minQualityScore: 60,
});

// ML: metricas
await addMLMetricsJob({
  type: "calculate-daily", // "calculate-daily" | "calculate-resolution-rate"
  date: "2025-01-15",
});
```

## Lifecycle

### Inicializacao

```typescript
import { startWorkers } from "./jobs";

await startWorkers();
```

### Encerramento

A funcao `stopWorkers()` fecha todos os workers de forma graceful:

```typescript
import { stopWorkers } from "./jobs";

await stopWorkers();
```

Internamente, ela coleta todos os workers ativos e chama `worker.close()` em paralelo.

## Opcoes dos Jobs

Cada fila define opcoes padrao, mas jobs individuais podem sobrescrever:

```typescript
// Job com delay
await slaCheckQueue.add("delayed-check", {}, {
  delay: 5 * 60 * 1000, // 5 minutos
});

// Job com prioridade
await notificationQueue.add("urgent", data, {
  priority: 1, // 1 = mais alta
});

// Job com retry customizado
await emailAlertsQueue.add("custom-retry", data, {
  attempts: 5,
  backoff: {
    type: "fixed",
    delay: 5000,
  },
});
```

## Resumo das Opcoes por Fila

| Fila | removeOnComplete | removeOnFail | attempts | backoff |
|------|-----------------|-------------|----------|---------|
| `sla-check` | 100 | 1000 | 3 | exponential 1s |
| `notifications` | 100 | 500 | 3 | -- |
| `notion-sync` | 50 | 100 | 2 | -- |
| `ticket-cleanup` | 10 | 50 | -- | -- |
| `snooze-check` | 100 | 500 | 3 | exponential 1s |
| `email-alerts` | 100 | 500 | 2 | exponential 5s |
| `email-poll` | 50 | 100 | 1 | -- |
| `daily-report` | 30 | 30 | 3 | exponential 5s |
| `ml-training-collector` | 100 | 50 | 2 | exponential 2s |
| `ml-quality-scorer` | 50 | 50 | 2 | exponential 1s |
| `ml-pattern-detector` | 20 | 50 | 2 | -- |
| `ml-metrics` | 50 | 50 | 3 | -- |

## Proximos Passos

- [Utils](/backend/utils)
- [Frontend](/frontend/visao-geral)
- [Monitoramento](/deploy/monitoramento)
