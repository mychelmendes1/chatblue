---
sidebar_position: 6
title: Jobs
description: Processamento em background com BullMQ
---

# Jobs

O ChatBlue usa BullMQ para processamento de tarefas em background, aproveitando o Redis como backend.

## Configuracao

### Inicializacao

```typescript
// jobs/queues/index.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from '../../config/redis';

// Opcoes padrao
const defaultOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100, // Manter ultimos 100
    removeOnFail: 50,
  },
};

// Filas
export const notificationQueue = new Queue('notifications', defaultOptions);
export const notionSyncQueue = new Queue('notion-sync', defaultOptions);
export const slaCheckQueue = new Queue('sla-check', defaultOptions);
export const ticketCleanupQueue = new Queue('ticket-cleanup', defaultOptions);
export const emailQueue = new Queue('email', defaultOptions);

// Eventos
export const notificationEvents = new QueueEvents('notifications', { connection: redis });
export const notionSyncEvents = new QueueEvents('notion-sync', { connection: redis });
```

### Estrutura de Pastas

```
apps/api/src/jobs/
├── queues/
│   └── index.ts          # Definicao das filas
│
├── processors/
│   ├── notification.processor.ts
│   ├── notion-sync.processor.ts
│   ├── sla-check.processor.ts
│   ├── ticket-cleanup.processor.ts
│   └── email.processor.ts
│
└── index.ts              # Inicializacao dos workers
```

## Filas

### Notification Queue

Processa notificacoes push e in-app:

```typescript
// jobs/processors/notification.processor.ts
import { Job, Worker } from 'bullmq';
import { redis } from '../../config/redis';
import webpush from 'web-push';
import { prisma } from '../../config/database';

interface NotificationJob {
  type: 'push' | 'in-app';
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

const processNotification = async (job: Job<NotificationJob>) => {
  const { type, userId, title, body, data } = job.data;

  if (type === 'push') {
    // Buscar subscriptions do usuario
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          JSON.parse(sub.subscription),
          JSON.stringify({ title, body, data })
        );
      } catch (error) {
        // Se subscription invalida, remover
        if (error.statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
        }
      }
    }
  }

  if (type === 'in-app') {
    // Salvar notificacao no banco
    await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        data,
        read: false,
      },
    });
  }

  return { sent: true };
};

export const notificationWorker = new Worker(
  'notifications',
  processNotification,
  {
    connection: redis,
    concurrency: 10,
  }
);

// Handlers de eventos
notificationWorker.on('completed', (job) => {
  console.log(`Notification ${job.id} completed`);
});

notificationWorker.on('failed', (job, error) => {
  console.error(`Notification ${job?.id} failed:`, error);
});
```

### Notion Sync Queue

Sincroniza contatos com Notion:

```typescript
// jobs/processors/notion-sync.processor.ts
import { Job, Worker } from 'bullmq';
import { redis } from '../../config/redis';
import { Client } from '@notionhq/client';
import { prisma } from '../../config/database';

interface NotionSyncJob {
  contactId: string;
  companyId: string;
}

const processNotionSync = async (job: Job<NotionSyncJob>) => {
  const { contactId, companyId } = job.data;

  // Buscar configuracoes
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
  });

  if (!settings?.notionEnabled || !settings?.notionApiKey) {
    return { skipped: true, reason: 'Notion nao configurado' };
  }

  // Buscar contato
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    return { skipped: true, reason: 'Contato nao encontrado' };
  }

  // Conectar ao Notion
  const notion = new Client({ auth: settings.notionApiKey });

  // Buscar na base
  const response = await notion.databases.query({
    database_id: settings.notionDatabaseId!,
    filter: {
      or: [
        { property: 'Telefone', phone_number: { equals: contact.phone } },
        ...(contact.email
          ? [{ property: 'Email', email: { equals: contact.email } }]
          : []),
      ],
    },
  });

  if (response.results.length > 0) {
    const page = response.results[0] as any;

    // Extrair propriedades
    const clientStatus = extractProperty(page, 'Status');
    const clientSince = extractProperty(page, 'Cliente Desde');

    // Atualizar contato
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        notionPageId: page.id,
        notionClientStatus: clientStatus,
        notionClientSince: clientSince ? new Date(clientSince) : null,
      },
    });

    return { synced: true, notionId: page.id };
  }

  return { synced: false, reason: 'Contato nao encontrado no Notion' };
};

export const notionSyncWorker = new Worker(
  'notion-sync',
  processNotionSync,
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // 10 requests por segundo (limite Notion)
    },
  }
);
```

### SLA Check Queue

Verifica SLAs e dispara alertas:

```typescript
// jobs/processors/sla-check.processor.ts
import { Job, Worker } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { notificationQueue } from '../queues';

const processSLACheck = async (job: Job) => {
  const now = new Date();

  // Buscar tickets com SLA proximo de expirar (15 min)
  const warningThreshold = new Date(now.getTime() + 15 * 60 * 1000);

  const ticketsNearBreach = await prisma.ticket.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      firstResponseAt: null,
      slaDeadline: {
        gt: now,
        lte: warningThreshold,
      },
    },
    include: {
      user: true,
      company: true,
    },
  });

  // Enviar alertas
  for (const ticket of ticketsNearBreach) {
    if (ticket.user) {
      await notificationQueue.add('sla-warning', {
        type: 'push',
        userId: ticket.user.id,
        title: 'SLA Proximo de Expirar',
        body: `Ticket #${ticket.protocol} expira em 15 minutos`,
        data: { ticketId: ticket.id },
      });
    }
  }

  // Buscar tickets com SLA expirado
  const breachedTickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      firstResponseAt: null,
      slaDeadline: { lt: now },
    },
    include: {
      user: true,
      company: true,
    },
  });

  // Criar atividades de breach
  for (const ticket of breachedTickets) {
    await prisma.activity.create({
      data: {
        companyId: ticket.companyId,
        ticketId: ticket.id,
        type: 'SLA_BREACH',
        metadata: {
          deadline: ticket.slaDeadline,
          breachedAt: now,
        },
      },
    });

    // Notificar supervisores
    const supervisors = await prisma.user.findMany({
      where: {
        companies: {
          some: {
            companyId: ticket.companyId,
            status: 'APPROVED',
          },
        },
        role: { in: ['ADMIN', 'SUPERVISOR'] },
      },
    });

    for (const supervisor of supervisors) {
      await notificationQueue.add('sla-breach', {
        type: 'push',
        userId: supervisor.id,
        title: 'SLA Violado',
        body: `Ticket #${ticket.protocol} excedeu o prazo de resposta`,
        data: { ticketId: ticket.id },
      });
    }
  }

  return {
    warnings: ticketsNearBreach.length,
    breaches: breachedTickets.length,
  };
};

export const slaCheckWorker = new Worker(
  'sla-check',
  processSLACheck,
  { connection: redis }
);

// Agendar verificacao a cada 5 minutos
slaCheckQueue.add(
  'check',
  {},
  {
    repeat: {
      pattern: '*/5 * * * *', // A cada 5 minutos
    },
  }
);
```

### Ticket Cleanup Queue

Limpa tickets antigos:

```typescript
// jobs/processors/ticket-cleanup.processor.ts
import { Job, Worker } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { subDays } from 'date-fns';

interface CleanupJob {
  companyId?: string;
  daysOld?: number;
}

const processTicketCleanup = async (job: Job<CleanupJob>) => {
  const { companyId, daysOld = 90 } = job.data;

  const cutoffDate = subDays(new Date(), daysOld);

  // Arquivar tickets antigos resolvidos
  const result = await prisma.ticket.updateMany({
    where: {
      ...(companyId && { companyId }),
      status: { in: ['RESOLVED', 'CLOSED'] },
      updatedAt: { lt: cutoffDate },
    },
    data: {
      status: 'CLOSED',
    },
  });

  return { archived: result.count };
};

export const ticketCleanupWorker = new Worker(
  'ticket-cleanup',
  processTicketCleanup,
  { connection: redis }
);

// Agendar limpeza diaria
ticketCleanupQueue.add(
  'daily-cleanup',
  { daysOld: 90 },
  {
    repeat: {
      pattern: '0 3 * * *', // 3am todos os dias
    },
  }
);
```

### Email Queue

Envia emails:

```typescript
// jobs/processors/email.processor.ts
import { Job, Worker } from 'bullmq';
import { redis } from '../../config/redis';
import nodemailer from 'nodemailer';

interface EmailJob {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const processEmail = async (job: Job<EmailJob>) => {
  const { to, subject, html, text } = job.data;

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });

  return { messageId: result.messageId };
};

export const emailWorker = new Worker(
  'email',
  processEmail,
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60000, // 100 emails por minuto
    },
  }
);
```

## Adicionando Jobs

### Adicao Simples

```typescript
import { notificationQueue, emailQueue } from './jobs/queues';

// Adicionar job imediato
await notificationQueue.add('new-message', {
  type: 'push',
  userId: 'user-123',
  title: 'Nova mensagem',
  body: 'Voce recebeu uma nova mensagem',
});

// Adicionar email
await emailQueue.add('welcome', {
  to: 'user@email.com',
  subject: 'Bem-vindo ao ChatBlue',
  html: '<h1>Bem-vindo!</h1>',
});
```

### Opcoes Avancadas

```typescript
// Job com delay
await notificationQueue.add(
  'reminder',
  { userId, message },
  { delay: 5 * 60 * 1000 } // 5 minutos
);

// Job com prioridade
await notificationQueue.add(
  'urgent',
  data,
  { priority: 1 } // 1 = mais alta
);

// Job agendado
await slaCheckQueue.add(
  'scheduled-check',
  {},
  {
    repeat: {
      pattern: '0 9 * * 1-5', // 9am dias uteis
    },
  }
);

// Job com retry customizado
await emailQueue.add(
  'important-email',
  data,
  {
    attempts: 5,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  }
);
```

## Monitoramento

### Bull Board

```typescript
// Adicionar dashboard de monitoramento
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [
    new BullMQAdapter(notificationQueue),
    new BullMQAdapter(notionSyncQueue),
    new BullMQAdapter(slaCheckQueue),
    new BullMQAdapter(emailQueue),
  ],
  serverAdapter,
});

// Montar no Express
app.use('/admin/queues', serverAdapter.getRouter());
```

### Eventos

```typescript
// Monitorar eventos
notificationWorker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

notificationWorker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

notificationWorker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress:`, progress);
});

// Eventos da fila
notificationEvents.on('waiting', ({ jobId }) => {
  console.log(`Job ${jobId} waiting`);
});

notificationEvents.on('active', ({ jobId }) => {
  console.log(`Job ${jobId} active`);
});
```

### Metricas

```typescript
// Obter estatisticas da fila
const counts = await notificationQueue.getJobCounts();
console.log(counts);
// { waiting: 5, active: 2, completed: 100, failed: 3 }

// Jobs ativos
const active = await notificationQueue.getActive();

// Jobs falhos
const failed = await notificationQueue.getFailed();

// Limpar jobs completos
await notificationQueue.clean(1000, 100, 'completed');
```

## Proximos Passos

- [Utils](/backend/utils)
- [Frontend](/frontend/visao-geral)
- [Monitoramento](/deploy/monitoramento)
