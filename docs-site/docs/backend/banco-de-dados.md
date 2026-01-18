---
sidebar_position: 2
title: Banco de Dados
description: Schema e modelos do banco de dados do ChatBlue
---

# Banco de Dados

O ChatBlue utiliza PostgreSQL como banco de dados principal, gerenciado pelo Prisma ORM.

## Visao Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DIAGRAMA DE ENTIDADES                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Company   │
                              │  (Empresa)  │
                              └──────┬──────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
   ┌───────────┐            ┌────────────────┐           ┌─────────────┐
   │   User    │◄──────────►│   Department   │           │  Connection │
   │ (Usuario) │            │(Departamento)  │           │ (WhatsApp)  │
   └─────┬─────┘            └───────┬────────┘           └─────────────┘
         │                          │
         │    ┌─────────────────────┼─────────────────────┐
         │    │                     │                     │
         ▼    ▼                     ▼                     ▼
   ┌───────────┐            ┌─────────────┐       ┌─────────────┐
   │  Ticket   │◄──────────►│  Activity   │       │ KnowledgeBase│
   │ (Ticket)  │            │ (Atividade) │       │    / FAQ    │
   └─────┬─────┘            └─────────────┘       └─────────────┘
         │
         ▼
   ┌───────────┐            ┌─────────────┐
   │  Message  │◄──────────►│  Contact    │
   │(Mensagem) │            │ (Contato)   │
   └───────────┘            └─────────────┘
```

## Modelos Principais

### Company (Empresa)

```prisma
model Company {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  logo      String?
  plan      CompanyPlan @default(BASIC)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relacionamentos
  users          User[]
  userCompanies  UserCompany[]
  departments    Department[]
  connections    WhatsAppConnection[]
  contacts       Contact[]
  tickets        Ticket[]
  messages       Message[]
  settings       CompanySettings?
  slaConfigs     SLAConfig[]
  knowledgeBases KnowledgeBase[]
  faqs           FAQ[]
  activities     Activity[]
}

enum CompanyPlan {
  BASIC
  PRO
  ENTERPRISE
}
```

### User (Usuario)

```prisma
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  password       String
  name           String
  avatar         String?
  role           Role     @default(AGENT)
  isActive       Boolean  @default(true)
  isAI           Boolean  @default(false)
  isOnline       Boolean  @default(false)
  lastSeenAt     DateTime?
  primaryCompanyId String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relacionamentos
  primaryCompany  Company?         @relation(fields: [primaryCompanyId], references: [id])
  companies       UserCompany[]
  departments     UserDepartment[]
  tickets         Ticket[]
  messages        Message[]
  activities      Activity[]
  aiConfig        AIUserConfig?
}

enum Role {
  SUPER_ADMIN
  ADMIN
  SUPERVISOR
  AGENT
}
```

### UserCompany (Acesso Multi-empresa)

```prisma
model UserCompany {
  id         String       @id @default(uuid())
  userId     String
  companyId  String
  role       CompanyRole  @default(USER)
  status     AccessStatus @default(PENDING)
  approvedAt DateTime?
  approvedBy String?
  createdAt  DateTime     @default(now())

  user    User    @relation(fields: [userId], references: [id])
  company Company @relation(fields: [companyId], references: [id])

  @@unique([userId, companyId])
}

enum CompanyRole {
  ADMIN
  USER
}

enum AccessStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### Department (Departamento)

```prisma
model Department {
  id        String   @id @default(uuid())
  companyId String
  parentId  String?
  name      String
  color     String   @default("#6366f1")
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company        Company          @relation(fields: [companyId], references: [id])
  parent         Department?      @relation("DepartmentHierarchy", fields: [parentId], references: [id])
  children       Department[]     @relation("DepartmentHierarchy")
  users          UserDepartment[]
  tickets        Ticket[]
  slaConfig      SLAConfig?
  knowledgeBases KnowledgeBase[]
  faqs           FAQ[]
}
```

### WhatsAppConnection (Conexao)

```prisma
model WhatsAppConnection {
  id            String           @id @default(uuid())
  companyId     String
  name          String
  type          ConnectionType
  status        ConnectionStatus @default(DISCONNECTED)
  isDefault     Boolean          @default(false)
  lastConnectedAt DateTime?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  // Baileys
  phoneNumber   String?
  qrCode        String?
  sessionData   Json?

  // Meta Cloud API
  accessToken      String?
  phoneNumberId    String?
  businessAccountId String?
  webhookVerifyToken String?

  company Company @relation(fields: [companyId], references: [id])
}

enum ConnectionType {
  BAILEYS
  META_CLOUD
}

enum ConnectionStatus {
  DISCONNECTED
  CONNECTING
  CONNECTED
  BANNED
  ERROR
}
```

### Contact (Contato)

```prisma
model Contact {
  id          String   @id @default(uuid())
  companyId   String
  phone       String
  name        String?
  email       String?
  avatarUrl   String?
  tags        String[] @default([])
  notes       String?
  customFields Json?
  lastMessageAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Notion
  notionPageId     String?
  notionClientStatus String?
  notionClientSince DateTime?

  company Company  @relation(fields: [companyId], references: [id])
  tickets Ticket[]

  @@unique([companyId, phone])
}
```

### Ticket

```prisma
model Ticket {
  id           String       @id @default(uuid())
  companyId    String
  contactId    String
  userId       String?
  departmentId String?
  protocol     String       @unique
  status       TicketStatus @default(PENDING)
  priority     Priority     @default(MEDIUM)
  isAIHandled  Boolean      @default(false)
  slaDeadline  DateTime?
  firstResponseAt DateTime?
  resolvedAt   DateTime?
  resolutionTime Int?
  waitingTime  Int?
  responseTime Int?
  rating       Int?
  ratingComment String?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  contact    Contact     @relation(fields: [contactId], references: [id])
  user       User?       @relation(fields: [userId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
  messages   Message[]
  transfers  TicketTransfer[]
  activities Activity[]
}

enum TicketStatus {
  PENDING
  IN_PROGRESS
  WAITING
  RESOLVED
  CLOSED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

### Message (Mensagem)

```prisma
model Message {
  id          String        @id @default(uuid())
  companyId   String
  ticketId    String
  userId      String?
  wamid       String?       @unique  // WhatsApp Message ID
  type        MessageType   @default(TEXT)
  content     String?
  mediaUrl    String?
  mediaType   String?
  status      MessageStatus @default(PENDING)
  isInternal  Boolean       @default(false)
  isAIGenerated Boolean     @default(false)
  transcription String?
  reactions   Json?
  metadata    Json?
  quotedMessageId String?
  sentAt      DateTime?
  deliveredAt DateTime?
  readAt      DateTime?
  deletedAt   DateTime?
  deletedBy   String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  company Company @relation(fields: [companyId], references: [id])
  ticket  Ticket  @relation(fields: [ticketId], references: [id])
  user    User?   @relation(fields: [userId], references: [id])
  quotedMessage Message? @relation("MessageQuotes", fields: [quotedMessageId], references: [id])
  quotes  Message[] @relation("MessageQuotes")
}

enum MessageType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
  STICKER
  LOCATION
  CONTACT
  TEMPLATE
  INTERACTIVE
  REACTION
}

enum MessageStatus {
  PENDING
  SENT
  DELIVERED
  READ
  FAILED
}
```

### Activity (Atividade)

```prisma
model Activity {
  id         String   @id @default(uuid())
  companyId  String
  ticketId   String?
  userId     String?
  type       String
  metadata   Json?
  createdAt  DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])
  ticket  Ticket? @relation(fields: [ticketId], references: [id])
  user    User?   @relation(fields: [userId], references: [id])
}
```

### SLAConfig

```prisma
model SLAConfig {
  id               String   @id @default(uuid())
  companyId        String
  departmentId     String?  @unique
  firstResponseTime Int     @default(15)   // minutos
  resolutionTime   Int      @default(240)  // minutos
  businessHours    Json?
  isDefault        Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
}
```

### CompanySettings

```prisma
model CompanySettings {
  id        String @id @default(uuid())
  companyId String @unique

  // Notion
  notionApiKey    String?
  notionDatabaseId String?
  notionEnabled   Boolean @default(false)

  // AI
  aiProvider      String?  // openai, anthropic
  aiApiKey        String?
  aiModel         String?
  aiSystemPrompt  String?
  aiTone          String?  // friendly, formal, technical
  aiStyle         String?  // concise, detailed
  aiUseEmoji      Boolean  @default(false)
  aiUseClientName Boolean  @default(true)
  aiGuardrails    Boolean  @default(true)

  // Whisper
  whisperApiKey   String?

  // Atendimento
  autoAssign       Boolean @default(false)
  maxTicketsPerAgent Int   @default(5)
  welcomeMessage   String?
  awayMessage      String?
  defaultDepartmentId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])
}
```

### KnowledgeBase e FAQ

```prisma
model KnowledgeBase {
  id           String   @id @default(uuid())
  companyId    String
  departmentId String?
  title        String
  content      String
  category     String?
  tags         String[] @default([])
  order        Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
}

model FAQ {
  id           String   @id @default(uuid())
  companyId    String
  departmentId String?
  question     String
  answer       String
  keywords     String[] @default([])
  category     String?
  usageCount   Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
}
```

## Migrations

### Comandos

```bash
# Criar nova migration
pnpm --filter api prisma migrate dev --name nome_da_migration

# Aplicar migrations em producao
pnpm --filter api prisma migrate deploy

# Ver status das migrations
pnpm --filter api prisma migrate status

# Reset do banco (CUIDADO!)
pnpm --filter api prisma migrate reset
```

### Exemplo de Migration

```sql
-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_protocol_key" ON "Ticket"("protocol");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

## Indices

```prisma
model Ticket {
  // ... campos

  @@index([companyId])
  @@index([contactId])
  @@index([status])
  @@index([createdAt])
  @@index([companyId, status])
}

model Message {
  // ... campos

  @@index([ticketId])
  @@index([companyId])
  @@index([createdAt])
}

model Contact {
  // ... campos

  @@index([companyId])
  @@index([phone])
}
```

## Seed

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Criar empresa demo
  const company = await prisma.company.create({
    data: {
      name: 'Demo Company',
      slug: 'demo',
      plan: 'PRO',
    },
  });

  // Criar admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@chatblue.com',
      password: await bcrypt.hash('123456', 10),
      name: 'Administrador',
      role: 'ADMIN',
      primaryCompanyId: company.id,
    },
  });

  // Associar admin a empresa
  await prisma.userCompany.create({
    data: {
      userId: admin.id,
      companyId: company.id,
      role: 'ADMIN',
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  // Criar departamentos
  const triagem = await prisma.department.create({
    data: {
      companyId: company.id,
      name: 'Triagem',
      color: '#6366f1',
    },
  });

  await prisma.department.createMany({
    data: [
      { companyId: company.id, name: 'Comercial', parentId: triagem.id, color: '#22c55e' },
      { companyId: company.id, name: 'Suporte', parentId: triagem.id, color: '#f59e0b' },
    ],
  });

  console.log('Seed completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Proximos Passos

- [Services](/backend/services)
- [Middlewares](/backend/middlewares)
- [WebSocket](/backend/websocket)
