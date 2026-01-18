---
sidebar_position: 1
title: Visao Geral do Backend
description: Arquitetura e componentes do backend do ChatBlue
---

# Visao Geral do Backend

O backend do ChatBlue e construido com Express.js e TypeScript, seguindo uma arquitetura em camadas.

## Stack Tecnologico

| Tecnologia | Versao | Proposito |
|------------|--------|-----------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | Framework HTTP |
| TypeScript | 5.x | Tipagem estatica |
| Prisma | 5.x | ORM |
| PostgreSQL | 16.x | Banco de dados |
| Redis | 7.x | Cache e filas |
| Socket.io | 4.x | Tempo real |
| BullMQ | 4.x | Filas de jobs |

## Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CAMADAS DO BACKEND                                │
└─────────────────────────────────────────────────────────────────────────────┘

    HTTP Request
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROUTES                                          │
│                                                                              │
│  - Define endpoints                                                          │
│  - Valida entrada                                                            │
│  - Chama services                                                            │
│  - Retorna resposta                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MIDDLEWARES                                       │
│                                                                              │
│  - Autenticacao (JWT)                                                        │
│  - Multi-tenancy                                                             │
│  - Error handling                                                            │
│  - Rate limiting                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SERVICES                                         │
│                                                                              │
│  - Logica de negocio                                                         │
│  - Orquestracao                                                              │
│  - Validacoes complexas                                                      │
│  - Integracoes externas                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRISMA ORM                                        │
│                                                                              │
│  - Queries tipadas                                                           │
│  - Migrations                                                                │
│  - Relacionamentos                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE                                          │
│                                                                              │
│  PostgreSQL + Redis                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Estrutura de Pastas

```
apps/api/src/
├── config/                 # Configuracoes
│   ├── database.ts        # Prisma client
│   ├── redis.ts           # Conexao Redis
│   └── logger.ts          # Pino logger
│
├── middlewares/           # Middlewares Express
│   ├── auth.middleware.ts
│   ├── tenant.middleware.ts
│   ├── error.middleware.ts
│   └── upload.middleware.ts
│
├── routes/                # Endpoints da API
│   ├── index.ts
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   └── ... (15+ arquivos)
│
├── services/              # Logica de negocio
│   ├── ai/
│   ├── whatsapp/
│   └── ... (10+ servicos)
│
├── sockets/               # Handlers Socket.io
│   └── index.ts
│
├── jobs/                  # Processadores BullMQ
│   ├── queues/
│   └── processors/
│
├── utils/                 # Utilitarios
│
└── server.ts              # Entry point
```

## Entry Point (server.ts)

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { setupSockets } from './sockets';
import { logger } from './config/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Middlewares globais
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api', routes);

// WebSocket
setupSockets(io);

// Error handler
app.use(errorMiddleware);

// Start server
const PORT = process.env.API_PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

## Rotas da API

### Prefixo Base

Todas as rotas usam o prefixo `/api`:

| Prefixo | Arquivo | Descricao |
|---------|---------|-----------|
| `/api/auth` | auth.routes.ts | Autenticacao |
| `/api/users` | users.routes.ts | Usuarios |
| `/api/companies` | companies.routes.ts | Empresas |
| `/api/departments` | departments.routes.ts | Departamentos |
| `/api/connections` | connections.routes.ts | Conexoes WhatsApp |
| `/api/tickets` | tickets.routes.ts | Tickets |
| `/api/messages` | messages.routes.ts | Mensagens |
| `/api/contacts` | contacts.routes.ts | Contatos |
| `/api/metrics` | metrics.routes.ts | Metricas |
| `/api/settings` | settings.routes.ts | Configuracoes |
| `/api/knowledge` | knowledge.routes.ts | Base de conhecimento |
| `/api/faq` | faq.routes.ts | FAQ |
| `/api/upload` | upload.routes.ts | Upload |
| `/api/push` | push.routes.ts | Push notifications |

### Exemplo de Rota

```typescript
// routes/tickets.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// Aplicar middlewares a todas as rotas
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/tickets
router.get('/', async (req, res, next) => {
  try {
    const tickets = await ticketService.findAll(
      req.tenantId,
      req.query
    );
    res.json(tickets);
  } catch (error) {
    next(error);
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await ticketService.findById(
      req.tenantId,
      req.params.id
    );
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets
router.post('/', async (req, res, next) => {
  try {
    const ticket = await ticketService.create(
      req.tenantId,
      req.body
    );
    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
});

export default router;
```

## Services

### Padrao de Service

```typescript
// services/ticket.service.ts
import { prisma } from '../config/database';

class TicketService {
  async findAll(companyId: string, filters: TicketFilters) {
    const { status, departmentId, userId, page = 1, limit = 20 } = filters;

    return prisma.ticket.findMany({
      where: {
        companyId,
        ...(status && { status }),
        ...(departmentId && { departmentId }),
        ...(userId && { userId }),
      },
      include: {
        contact: true,
        user: true,
        department: true,
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findById(companyId: string, id: string) {
    const ticket = await prisma.ticket.findFirst({
      where: { id, companyId },
      include: {
        contact: true,
        user: true,
        department: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket nao encontrado');
    }

    return ticket;
  }

  async create(companyId: string, data: CreateTicketDto) {
    return prisma.ticket.create({
      data: {
        ...data,
        companyId,
        protocol: generateProtocol(),
      },
      include: {
        contact: true,
      },
    });
  }
}

export const ticketService = new TicketService();
```

## Configuracoes

### Database (Prisma)

```typescript
// config/database.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Redis

```typescript
// config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (error) => {
  console.error('Redis error:', error);
});

redis.on('connect', () => {
  console.log('Redis connected');
});
```

### Logger

```typescript
// config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }
    : undefined,
});
```

## Health Check

```typescript
// Endpoint de saude
app.get('/health', async (req, res) => {
  try {
    // Verificar banco de dados
    await prisma.$queryRaw`SELECT 1`;

    // Verificar Redis
    await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

## Graceful Shutdown

```typescript
// Encerramento graceful
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  // Parar de aceitar novas conexoes
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Fechar conexoes existentes
  await prisma.$disconnect();
  await redis.quit();

  logger.info('All connections closed');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

## Proximos Passos

- [Banco de Dados](/backend/banco-de-dados)
- [Services](/backend/services)
- [Middlewares](/backend/middlewares)
- [WebSocket](/backend/websocket)
