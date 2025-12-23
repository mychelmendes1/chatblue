# ChatBlue - Sistema de Atendimento Multi-Empresa

## 📋 Visão Geral

Sistema de atendimento via WhatsApp similar ao WhatsApp Web, com suporte a múltiplas empresas, múltiplos atendentes, conexões via Baileys e API Oficial Meta, atendente de IA, SLA, métricas e integração com Notion.

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 14 (App Router) + TypeScript + Tailwind CSS            │
│  Shadcn/UI + Socket.io-client + Zustand                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
│  Node.js + Express + TypeScript + Socket.io                     │
│  Prisma ORM + Bull (Filas) + Redis                              │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Redis       │  │  WhatsApp       │
│   (Database)    │  │  (Cache/Queue)  │  │  Connections    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                                   │
                              ┌────────────────────┴────────────────────┐
                              ▼                                         ▼
                     ┌─────────────────┐                       ┌─────────────────┐
                     │    Baileys      │                       │  Meta Cloud API │
                     │  (Não-Oficial)  │                       │    (Oficial)    │
                     └─────────────────┘                       └─────────────────┘
```

---

## 📁 Estrutura de Pastas

```
chatblue/
├── apps/
│   ├── web/                          # Frontend Next.js
│   │   ├── app/
│   │   │   ├── (auth)/               # Rotas de autenticação
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/          # Rotas autenticadas
│   │   │   │   ├── chat/             # Interface principal de chat
│   │   │   │   ├── contacts/         # Gestão de contatos
│   │   │   │   ├── metrics/          # Métricas e SLA
│   │   │   │   ├── settings/         # Configurações
│   │   │   │   └── admin/            # Painel administrativo
│   │   │   ├── api/                  # API Routes Next.js
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── chat/                 # Componentes do chat
│   │   │   │   ├── ChatSidebar.tsx   # Lista de conversas
│   │   │   │   ├── ChatWindow.tsx    # Janela de conversa
│   │   │   │   ├── MessageBubble.tsx # Balão de mensagem
│   │   │   │   ├── ChatInput.tsx     # Input de mensagem
│   │   │   │   └── ContactInfo.tsx   # Info do contato
│   │   │   ├── ui/                   # Componentes Shadcn
│   │   │   └── shared/               # Componentes compartilhados
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/                   # Zustand stores
│   │   └── types/
│   │
│   └── api/                          # Backend Express
│       ├── src/
│       │   ├── config/               # Configurações
│       │   ├── controllers/          # Controllers
│       │   ├── middlewares/          # Middlewares
│       │   ├── models/               # Modelos Prisma
│       │   ├── routes/               # Rotas da API
│       │   ├── services/             # Serviços de negócio
│       │   │   ├── whatsapp/         # Serviços WhatsApp
│       │   │   │   ├── baileys.service.ts
│       │   │   │   └── meta-cloud.service.ts
│       │   │   ├── ai/               # Serviço de IA
│       │   │   ├── notion/           # Integração Notion
│       │   │   ├── sla/              # Serviço de SLA
│       │   │   └── queue/            # Filas de processamento
│       │   ├── sockets/              # Socket.io handlers
│       │   ├── jobs/                 # Bull jobs
│       │   └── utils/
│       └── prisma/
│           └── schema.prisma
│
├── packages/
│   ├── shared/                       # Tipos e utilitários compartilhados
│   │   ├── types/
│   │   └── utils/
│   └── ai-agent/                     # Pacote do agente de IA
│       ├── prompts/
│       └── handlers/
│
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile
│
└── docs/
    ├── ARCHITECTURE.md
    └── API.md
```

---

## 🗄️ Modelo de Dados (Prisma Schema)

```prisma
// Empresa (Tenant)
model Company {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  plan        Plan     @default(BASIC)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  departments Department[]
  connections WhatsAppConnection[]
  contacts    Contact[]
  tickets     Ticket[]
  settings    CompanySettings?
  slaConfigs  SLAConfig[]
}

enum Plan {
  BASIC
  PRO
  ENTERPRISE
}

// Usuário (Atendente ou Admin)
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  password     String
  name         String
  avatar       String?
  role         UserRole   @default(AGENT)
  isAI         Boolean    @default(false)  // Se é um atendente de IA
  aiConfig     Json?      // Configurações do AI (prompt, temperatura, etc)
  isActive     Boolean    @default(true)
  isOnline     Boolean    @default(false)
  lastSeen     DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  companyId    String
  company      Company    @relation(fields: [companyId], references: [id])

  departments  UserDepartment[]
  tickets      Ticket[]   @relation("AssignedTickets")
  messages     Message[]
  activities   Activity[]
}

enum UserRole {
  SUPER_ADMIN  // Admin do sistema (multi-empresa)
  ADMIN        // Admin da empresa
  SUPERVISOR   // Supervisor de departamento
  AGENT        // Atendente
}

// Departamento/Setor
model Department {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String?
  order       Int      @default(0)  // Ordem hierárquica
  parentId    String?  // Departamento pai (para hierarquia)
  parent      Department?  @relation("DepartmentHierarchy", fields: [parentId], references: [id])
  children    Department[] @relation("DepartmentHierarchy")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])

  users       UserDepartment[]
  tickets     Ticket[]
  slaConfig   SLAConfig?
}

// Relação Usuário-Departamento
model UserDepartment {
  id           String     @id @default(cuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id])
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id])
  isManager    Boolean    @default(false)

  @@unique([userId, departmentId])
}

// Conexão WhatsApp
model WhatsAppConnection {
  id           String           @id @default(cuid())
  name         String
  type         ConnectionType
  phone        String?
  status       ConnectionStatus @default(DISCONNECTED)

  // Baileys specific
  qrCode       String?
  sessionData  Json?

  // Meta Cloud API specific
  accessToken  String?
  phoneNumberId String?
  businessId   String?
  webhookToken String?

  isDefault    Boolean  @default(false)
  isActive     Boolean  @default(true)
  lastConnected DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  companyId    String
  company      Company  @relation(fields: [companyId], references: [id])

  messages     Message[]
  tickets      Ticket[]
}

enum ConnectionType {
  BAILEYS      // Conexão não-oficial via Baileys
  META_CLOUD   // API Oficial Meta Cloud
}

enum ConnectionStatus {
  DISCONNECTED
  CONNECTING
  CONNECTED
  BANNED
  ERROR
}

// Contato
model Contact {
  id            String   @id @default(cuid())
  phone         String
  name          String?
  email         String?
  avatar        String?

  // Dados do Notion
  notionPageId  String?
  isClient      Boolean  @default(false)
  isExClient    Boolean  @default(false)
  clientSince   DateTime?

  tags          String[]
  notes         String?
  customFields  Json?

  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])

  tickets       Ticket[]

  @@unique([phone, companyId])
}

// Ticket (Conversa/Atendimento)
model Ticket {
  id            String       @id @default(cuid())
  protocol      String       @unique  // Número de protocolo único
  status        TicketStatus @default(PENDING)
  priority      Priority     @default(MEDIUM)
  subject       String?

  // SLA
  slaDeadline   DateTime?
  firstResponse DateTime?
  resolvedAt    DateTime?
  slaBreached   Boolean      @default(false)

  // Métricas
  waitingTime   Int?         // Tempo de espera em segundos
  responseTime  Int?         // Tempo de primeira resposta
  resolutionTime Int?        // Tempo de resolução

  isAIHandled   Boolean      @default(false)  // Se está sendo atendido por IA
  aiTakeoverAt  DateTime?    // Quando a IA assumiu
  humanTakeoverAt DateTime?  // Quando humano assumiu

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  closedAt      DateTime?

  contactId     String
  contact       Contact  @relation(fields: [contactId], references: [id])

  assignedToId  String?
  assignedTo    User?    @relation("AssignedTickets", fields: [assignedToId], references: [id])

  departmentId  String?
  department    Department? @relation(fields: [departmentId], references: [id])

  connectionId  String
  connection    WhatsAppConnection @relation(fields: [connectionId], references: [id])

  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])

  messages      Message[]
  transfers     TicketTransfer[]
  activities    Activity[]
}

enum TicketStatus {
  PENDING      // Aguardando atendimento
  IN_PROGRESS  // Em atendimento
  WAITING      // Aguardando resposta do cliente
  RESOLVED     // Resolvido
  CLOSED       // Fechado
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// Transferência de Ticket
model TicketTransfer {
  id           String   @id @default(cuid())
  ticketId     String
  ticket       Ticket   @relation(fields: [ticketId], references: [id])

  fromUserId   String?
  toUserId     String?
  fromDeptId   String?
  toDeptId     String?

  reason       String?
  transferType TransferType
  createdAt    DateTime @default(now())
}

enum TransferType {
  USER_TO_USER
  DEPT_TO_DEPT
  AI_TO_HUMAN
  HUMAN_TO_AI
}

// Mensagem
model Message {
  id           String      @id @default(cuid())
  wamid        String?     // ID da mensagem no WhatsApp
  type         MessageType @default(TEXT)
  content      String?     // Conteúdo texto
  mediaUrl     String?     // URL da mídia
  mediaType    String?     // Tipo MIME
  caption      String?     // Legenda de mídia

  isFromMe     Boolean     @default(false)
  isAIGenerated Boolean    @default(false)

  status       MessageStatus @default(PENDING)
  sentAt       DateTime?
  deliveredAt  DateTime?
  readAt       DateTime?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  ticketId     String
  ticket       Ticket   @relation(fields: [ticketId], references: [id])

  senderId     String?
  sender       User?    @relation(fields: [senderId], references: [id])

  connectionId String
  connection   WhatsAppConnection @relation(fields: [connectionId], references: [id])

  // Referência a mensagem citada
  quotedId     String?
  quoted       Message? @relation("QuotedMessage", fields: [quotedId], references: [id])
  replies      Message[] @relation("QuotedMessage")
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

// Configuração de SLA
model SLAConfig {
  id              String   @id @default(cuid())
  name            String

  // Tempos em minutos
  firstResponseTime Int    @default(15)   // Primeira resposta
  resolutionTime    Int    @default(240)  // Resolução (4h default)

  // Horário de funcionamento
  businessHours   Json?    // {start: "09:00", end: "18:00", days: [1,2,3,4,5]}

  isDefault       Boolean  @default(false)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  departmentId    String?  @unique
  department      Department? @relation(fields: [departmentId], references: [id])
}

// Atividade/Log
model Activity {
  id          String       @id @default(cuid())
  type        ActivityType
  description String
  metadata    Json?
  createdAt   DateTime     @default(now())

  ticketId    String?
  ticket      Ticket?      @relation(fields: [ticketId], references: [id])

  userId      String?
  user        User?        @relation(fields: [userId], references: [id])
}

enum ActivityType {
  TICKET_CREATED
  TICKET_ASSIGNED
  TICKET_TRANSFERRED
  TICKET_RESOLVED
  TICKET_CLOSED
  TICKET_REOPENED
  MESSAGE_SENT
  MESSAGE_RECEIVED
  AI_TAKEOVER
  HUMAN_TAKEOVER
  SLA_BREACH
  CONTACT_UPDATED
  NOTE_ADDED
}

// Configurações da Empresa
model CompanySettings {
  id                String   @id @default(cuid())

  // Notion Integration
  notionApiKey      String?
  notionDatabaseId  String?
  notionSyncEnabled Boolean  @default(false)

  // AI Settings
  aiEnabled         Boolean  @default(false)
  aiProvider        String?  // openai, anthropic, etc
  aiApiKey          String?
  aiDefaultModel    String?
  aiSystemPrompt    String?

  // Outras configurações
  autoAssign        Boolean  @default(true)
  maxTicketsPerAgent Int     @default(10)
  welcomeMessage    String?
  awayMessage       String?

  companyId         String   @unique
  company           Company  @relation(fields: [companyId], references: [id])

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## 🔌 Principais APIs

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro (apenas admin)
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Empresas (Admin)
- `GET /api/companies` - Listar empresas
- `POST /api/companies` - Criar empresa
- `GET /api/companies/:id` - Detalhes empresa
- `PUT /api/companies/:id` - Atualizar empresa
- `DELETE /api/companies/:id` - Desativar empresa

### Usuários
- `GET /api/users` - Listar usuários da empresa
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Desativar usuário
- `PUT /api/users/:id/ai-config` - Configurar IA do usuário

### Departamentos
- `GET /api/departments` - Listar departamentos
- `POST /api/departments` - Criar departamento
- `PUT /api/departments/:id` - Atualizar
- `DELETE /api/departments/:id` - Remover

### Conexões WhatsApp
- `GET /api/connections` - Listar conexões
- `POST /api/connections` - Criar conexão
- `GET /api/connections/:id/qr` - Obter QR Code (Baileys)
- `POST /api/connections/:id/connect` - Conectar
- `POST /api/connections/:id/disconnect` - Desconectar
- `DELETE /api/connections/:id` - Remover

### Tickets (Conversas)
- `GET /api/tickets` - Listar tickets (com filtros)
- `GET /api/tickets/:id` - Detalhes do ticket
- `POST /api/tickets/:id/assign` - Atribuir ticket
- `POST /api/tickets/:id/transfer` - Transferir ticket
- `POST /api/tickets/:id/takeover` - Assumir ticket (da IA)
- `PUT /api/tickets/:id/status` - Atualizar status
- `PUT /api/tickets/:id/priority` - Atualizar prioridade

### Mensagens
- `GET /api/tickets/:id/messages` - Listar mensagens
- `POST /api/tickets/:id/messages` - Enviar mensagem
- `POST /api/tickets/:id/messages/media` - Enviar mídia

### Contatos
- `GET /api/contacts` - Listar contatos
- `GET /api/contacts/:id` - Detalhes contato
- `PUT /api/contacts/:id` - Atualizar (nome, email)
- `POST /api/contacts/:id/sync-notion` - Sincronizar com Notion

### Métricas
- `GET /api/metrics/dashboard` - Dashboard geral
- `GET /api/metrics/sla` - Métricas de SLA
- `GET /api/metrics/agents` - Performance por atendente
- `GET /api/metrics/departments` - Performance por departamento

### Configurações
- `GET /api/settings` - Obter configurações
- `PUT /api/settings` - Atualizar configurações
- `POST /api/settings/notion/test` - Testar conexão Notion
- `PUT /api/settings/ai` - Configurar IA

---

## 🔄 Eventos Socket.io

### Conexão
```typescript
// Cliente conecta
socket.on('connect')

// Autenticar socket
socket.emit('auth', { token })

// Entrar na sala da empresa
socket.emit('join:company', { companyId })
```

### Tickets
```typescript
// Novo ticket criado
socket.on('ticket:created', (ticket) => {})

// Ticket atualizado
socket.on('ticket:updated', (ticket) => {})

// Ticket atribuído
socket.on('ticket:assigned', ({ ticketId, userId }) => {})

// Ticket transferido
socket.on('ticket:transferred', (transfer) => {})
```

### Mensagens
```typescript
// Nova mensagem recebida
socket.on('message:received', (message) => {})

// Mensagem enviada confirmada
socket.on('message:sent', (message) => {})

// Status da mensagem atualizado
socket.on('message:status', ({ messageId, status }) => {})

// Enviar mensagem
socket.emit('message:send', { ticketId, content, type })
```

### Presença
```typescript
// Usuário online
socket.on('user:online', ({ userId }) => {})

// Usuário offline
socket.on('user:offline', ({ userId }) => {})

// Usuário digitando
socket.on('user:typing', ({ ticketId, userId }) => {})
```

---

## 🤖 Fluxo do Atendente IA

```
┌──────────────────┐
│ Mensagem Recebida│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────────┐
│ Ticket Existente?├─No──► Criar Novo Ticket   │
└────────┬─────────┘     │ Atribuir para IA    │
         │Yes            └──────────┬──────────┘
         │                          │
         ▼                          ▼
┌──────────────────────────────────────────────┐
│          Processar com IA                     │
│  1. Buscar contexto (contato, histórico)     │
│  2. Verificar no Notion (cliente/ex-cliente) │
│  3. Gerar resposta com LLM                   │
│  4. Enviar resposta                          │
└────────────────────┬─────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│      Verificar Necessidade de Humano         │
│  - Palavra-chave detectada?                  │
│  - Sentimento negativo?                      │
│  - Cliente VIP?                              │
│  - Limite de interações IA atingido?         │
└────────────────────┬─────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Continuar com   │    │ Transferir para │
│ Atendimento IA  │    │ Fila Humana     │
└─────────────────┘    └─────────────────┘
```

---

## 📊 Métricas e SLA

### KPIs Principais
- **Tempo Médio de Primeira Resposta** (TMR)
- **Tempo Médio de Resolução** (TMRes)
- **Taxa de Resolução no Primeiro Contato** (FCR)
- **Taxa de Transferência IA → Humano**
- **Tickets por Período** (hora, dia, semana, mês)
- **Taxa de SLA Cumprido**
- **NPS/CSAT** (se implementado)

### Alertas
- SLA prestes a expirar (80% do tempo)
- SLA violado
- Fila de espera muito grande
- Atendente com muitos tickets

---

## 🔐 Segurança

### Autenticação
- JWT com access token (15min) + refresh token (7 dias)
- Senhas hasheadas com bcrypt
- Rate limiting nas rotas de auth

### Autorização
- RBAC (Role-Based Access Control)
- Middleware de verificação de empresa (tenant isolation)
- Permissões por departamento

### Multi-Tenancy
- Isolamento completo por `companyId`
- Middleware global de tenant
- Logs de auditoria

---

## 📦 Pacotes Principais

### Frontend
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "typescript": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "socket.io-client": "^4.7.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "lucide-react": "^0.300.0",
    "date-fns": "^3.0.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0"
  }
}
```

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "typescript": "^5.0.0",
    "@prisma/client": "^5.7.0",
    "socket.io": "^4.7.0",
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "@whiskeysockets/baileys": "^6.6.0",
    "@notionhq/client": "^2.2.0",
    "openai": "^4.20.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "multer": "^1.4.0",
    "winston": "^3.11.0"
  }
}
```

---

## 🚀 Fases de Implementação

### Fase 1 - Fundação (MVP)
1. Setup do monorepo com Turborepo
2. Configuração do banco de dados e Prisma
3. Sistema de autenticação
4. CRUD de empresas, usuários, departamentos
5. Interface básica de chat (visual WhatsApp)

### Fase 2 - WhatsApp
1. Integração Baileys (conexão, QR code)
2. Recebimento e envio de mensagens
3. Suporte a mídia
4. Integração Meta Cloud API

### Fase 3 - Atendimento
1. Sistema de tickets
2. Fila de atendimento
3. Transferências
4. Hierarquia de departamentos

### Fase 4 - IA e Integrações
1. Atendente de IA
2. Integração com Notion
3. Configurações de IA

### Fase 5 - Métricas e Polish
1. Dashboard de métricas
2. Sistema de SLA
3. Relatórios
4. Refinamentos de UX

---

## 🐳 Docker Compose (Desenvolvimento)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: chatblue
      POSTGRES_PASSWORD: chatblue123
      POSTGRES_DB: chatblue
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Backend API
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://chatblue:chatblue123@postgres:5432/chatblue
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  # Frontend
  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```
