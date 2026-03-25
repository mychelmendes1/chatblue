---
sidebar_position: 2
title: Banco de Dados
description: Schema e modelos do banco de dados do ChatBlue
---

# Banco de Dados

O ChatBlue utiliza PostgreSQL como banco de dados principal, gerenciado pelo Prisma ORM.

## Visao Geral

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DIAGRAMA DE ENTIDADES                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                ┌────────────┐
                                │  Company   │
                                │ (Empresa)  │
                                └─────┬──────┘
                                      │
       ┌──────────┬──────────┬────────┼────────┬──────────┬──────────┐
       │          │          │        │        │          │          │
       ▼          ▼          ▼        ▼        ▼          ▼          ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────┐ ┌───────┐ ┌────────┐ ┌────────────┐
  │  User  │ │  Dept  │ │WhatsApp│ │Email│ │Contact│ │SLAConf │ │CompanySetng│
  └───┬────┘ └───┬────┘ │  Conn  │ │Conn │ └──┬────┘ └────────┘ └────────────┘
      │          │      └────────┘ └─────┘    │
      │          │                             │
      ▼          ▼                             ▼
  ┌─────────────────────────────────────────────────┐
  │                   Ticket                         │
  │  (canal: WHATSAPP | INSTAGRAM | EMAIL)           │
  └────────────┬────────────────────────────────────┘
               │
       ┌───────┼───────┬──────────┐
       ▼       ▼       ▼          ▼
   ┌───────┐┌──────┐┌────────┐┌──────────────┐
   │Message││Activ.││Transfer││  AI Queries  │
   └───────┘└──────┘└────────┘└──────────────┘

  ┌─────────── AI & ML ───────────┐    ┌─── Notificacoes ───┐
  │ AIDataSource -> AIDocument    │    │ Notification       │
  │ AIAgentConfig (por categoria) │    │ PredefinedMessage  │
  │ AIAssistantQuery -> Sources   │    │ EmailAlertLog      │
  │ AIKnowledgeGap               │    └────────────────────┘
  │ MLTrainingPair               │
  │ MLIntentPattern              │    ┌─── Metricas ────────┐
  │ MLResponseTemplate           │    │ MetricGoal          │
  │ MLModelVersion               │    │ MetricAlert         │
  │ MLTrainingBatch              │    └─────────────────────┘
  └──────────────────────────────┘
```

## Enums

O schema define os seguintes enums:

### Enums Principais

```prisma
enum Plan {
  BASIC
  PRO
  ENTERPRISE
}

enum UserRole {
  SUPER_ADMIN
  ADMIN
  SUPERVISOR
  AGENT
}

enum ConnectionType {
  BAILEYS
  META_CLOUD
  INSTAGRAM
}

enum TicketChannel {
  WHATSAPP
  INSTAGRAM
  EMAIL
}

enum ConnectionStatus {
  DISCONNECTED
  CONNECTING
  CONNECTED
  BANNED
  ERROR
}

enum EmailConnectionStatus {
  DISCONNECTED
  CONNECTING
  CONNECTED
  ERROR
}

enum EmailAuthType {
  PLAIN
  OAUTH2
}

enum TicketStatus {
  PENDING
  IN_PROGRESS
  WAITING
  SNOOZED
  RESOLVED
  CLOSED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TransferType {
  USER_TO_USER
  DEPT_TO_DEPT
  AI_TO_HUMAN
  HUMAN_TO_AI
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
  SYSTEM
  REACTION
}

enum MessageStatus {
  PENDING
  SENT
  DELIVERED
  READ
  FAILED
  RECEIVED
}

enum UserCompanyStatus {
  PENDING
  APPROVED
  REJECTED
}

enum UserCompanyRole {
  ADMIN
  USER
}
```

### Enums de Atividade

```prisma
enum ActivityType {
  TICKET_CREATED
  TICKET_ASSIGNED
  TICKET_TRANSFERRED
  TICKET_RESOLVED
  TICKET_CLOSED
  TICKET_REOPENED
  TICKET_SNOOZED
  TICKET_UNSNOOZED
  MESSAGE_SENT
  MESSAGE_RECEIVED
  AI_TAKEOVER
  HUMAN_TAKEOVER
  SLA_BREACH
  CONTACT_UPDATED
  NOTE_ADDED
  AI_ASSISTANT_QUERY
  AI_SUGGESTION_USED
  AI_SUGGESTION_EDITED
  AI_SUGGESTION_DISCARDED
  NOTIFICATION_MENTION
  NOTIFICATION_TICKET_ASSIGNED
  NOTIFICATION_SLA_WARNING
  NOTIFICATION_SLA_BREACH
  NOTIFICATION_NEW_TICKET
  NOTION_SYNC
  TICKET_AUTO_CLOSED
}
```

### Enums de IA e ML

```prisma
enum AIDataSourceType {
  INTERNAL
  NOTION
  GOOGLE_DRIVE
  CONFLUENCE
  SHAREPOINT
  EXTERNAL_API
  WEBSITE
}

enum AIQueryStatus {
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum AIDocumentStatus {
  PENDING
  INDEXING
  INDEXED
  FAILED
  OUTDATED
}

enum MLComplexity {
  SIMPLE
  MEDIUM
  COMPLEX
}

enum MLTemplateSourceType {
  MANUAL
  LEARNED
  GENERATED
}

enum MLModelStatus {
  TRAINING
  READY
  DEPLOYED
  DEPRECATED
}
```

---

## Modelos Principais

### Company (Empresa / Tenant)

```prisma
model Company {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  logo      String?
  plan      Plan     @default(BASIC)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users              User[]
  userAccess         UserCompany[]
  departments        Department[]
  connections        WhatsAppConnection[]
  emailConnections   EmailConnection[]
  contacts           Contact[]
  tickets            Ticket[]
  settings           CompanySettings?
  slaConfigs         SLAConfig[]
  knowledgeBase      KnowledgeBase[]
  faqs               FAQ[]
  metricGoals        MetricGoal[]
  metricAlerts       MetricAlert[]
  blueInteractions   BlueInteraction[]
  notifications      Notification[]
  knowledgeContexts  KnowledgeContext[]
  knowledgeSources   KnowledgeSource[]
  emailAlertLogs     EmailAlertLog[]
  predefinedMessages PredefinedMessage[]
  aiDataSources      AIDataSource[]
  campaignDispatches CampaignDispatch[]
  aiAgentConfigs     AIAgentConfig[]

  // ML Learning System
  mlTrainingPairs     MLTrainingPair[]
  mlIntentPatterns    MLIntentPattern[]
  mlResponseTemplates MLResponseTemplate[]
  mlModelVersions     MLModelVersion[]
  mlLearningMetrics   MLLearningMetric[]
  mlAIDecisionLogs    MLAIDecisionLog[]
  mlTrainingBatches   MLTrainingBatch[]
}
```

### User (Usuario)

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String
  avatar    String?
  role      UserRole  @default(AGENT)
  isAI      Boolean   @default(false)
  aiConfig  Json?
  isActive  Boolean   @default(true)
  isOnline  Boolean   @default(false)
  lastSeen  DateTime?

  pushSubscription     Json?
  passwordResetToken   String?   @unique
  passwordResetExpires DateTime?

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  companyId String
  company   Company @relation(fields: [companyId], references: [id])

  departments        UserDepartment[]
  companyAccess      UserCompany[]     @relation("UserAccess")
  approvedAccess     UserCompany[]     @relation("ApprovedBy")
  tickets            Ticket[]          @relation("AssignedTickets")
  messages           Message[]
  activities         Activity[]
  metricGoals        MetricGoal[]
  blueInteractions   BlueInteraction[]
  notifications      Notification[]
  aiQueries          AIAssistantQuery[]
  defaultConnections WhatsAppConnection[] @relation("ConnectionDefaultUser")
}
```

Campos relevantes:
- `isAI` / `aiConfig`: Permite que um User seja um "Atendente IA" com configuracao JSON
- `pushSubscription`: Armazena a subscription de web push para notificacoes
- `passwordResetToken` / `passwordResetExpires`: Fluxo de recuperacao de senha
- `companyId`: Empresa principal do usuario (obrigatorio)

### UserCompany (Acesso Multi-empresa)

```prisma
model UserCompany {
  id        String            @id @default(cuid())
  userId    String
  user      User              @relation("UserAccess", ...)
  companyId String
  company   Company           @relation(...)

  role      UserCompanyRole   @default(USER)
  status    UserCompanyStatus @default(PENDING)

  approvedById String?
  approvedBy   User?   @relation("ApprovedBy", ...)
  approvedAt   DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, companyId])
}
```

### Department (Departamento)

```prisma
model Department {
  id          String       @id @default(cuid())
  name        String
  description String?
  color       String?
  order       Int          @default(0)
  parentId    String?
  parent      Department?  @relation("DepartmentHierarchy", ...)
  children    Department[] @relation("DepartmentHierarchy")
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  companyId String
  company   Company @relation(...)

  users         UserDepartment[]
  tickets       Ticket[]
  slaConfig     SLAConfig?
  knowledgeBase KnowledgeBase[]
  faqs          FAQ[]
  metricGoals   MetricGoal[]
  aiDocuments   AIDocument[]
}
```

Suporta hierarquia (pai/filhos) via `parentId` / relacao `DepartmentHierarchy`.

### UserDepartment

```prisma
model UserDepartment {
  id           String     @id @default(cuid())
  userId       String
  departmentId String
  isManager    Boolean    @default(false)

  @@unique([userId, departmentId])
}
```

---

## Modelos de Conexao

### WhatsAppConnection

```prisma
model WhatsAppConnection {
  id     String           @id @default(cuid())
  name   String
  type   ConnectionType   // BAILEYS | META_CLOUD | INSTAGRAM
  phone  String?
  status ConnectionStatus @default(DISCONNECTED)

  // Baileys
  qrCode      String?
  sessionData Json?

  // Meta Cloud API (WhatsApp)
  accessToken   String?
  phoneNumberId String?
  businessId    String?
  webhookToken  String?

  // Instagram
  instagramAccountId String?
  instagramUsername   String?

  // IA por conexao
  aiEnabled     Boolean @default(true)
  defaultUserId String?
  defaultUser   User?   @relation("ConnectionDefaultUser", ...)

  isDefault     Boolean   @default(false)
  isActive      Boolean   @default(true)
  lastConnected DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  companyId String
  company   Company @relation(...)

  messages Message[]
  tickets  Ticket[]
}
```

### EmailConnection

```prisma
model EmailConnection {
  id       String                @id @default(cuid())
  name     String
  status   EmailConnectionStatus @default(DISCONNECTED)
  email    String
  authType EmailAuthType         @default(PLAIN)

  // IMAP (receber)
  imapHost     String  @default("")
  imapPort     Int     @default(993)
  imapUser     String  @default("")
  imapPassword String  @default("")
  imapTls      Boolean @default(true)

  // SMTP (enviar)
  smtpHost     String  @default("")
  smtpPort     Int     @default(587)
  smtpUser     String  @default("")
  smtpPassword String  @default("")
  smtpTls      Boolean @default(true)

  // OAuth2 (Google Workspace / Gmail)
  oauthRefreshToken String?
  oauthAccessToken  String?
  oauthTokenExpiry  DateTime?
  oauthProvider     String?     // "google"

  // Config
  fromName        String?
  pollIntervalSec Int       @default(60)
  lastPollAt      DateTime?
  lastError       String?

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  companyId String
  company   Company @relation(...)

  messages Message[]
  tickets  Ticket[]

  @@unique([email, companyId])
}
```

---

## Modelos de Contato e Ticket

### Contact

```prisma
model Contact {
  id     String  @id @default(cuid())
  phone  String?   // Opcional (pode ser contato de Instagram ou Email)
  name   String?
  email  String?
  avatar String?

  lidId          String?  // WhatsApp Linked ID (privacidade)
  instagramId    String?  // Instagram Scoped ID (IGSID)
  canonicalPhone String?  // Telefone canonico para unificar contatos

  // Dados do Notion
  notionPageId String?
  isClient     Boolean   @default(false)
  isExClient   Boolean   @default(false)
  clientSince  DateTime?

  tags         String[]
  notes        String?
  customFields Json?

  isActive      Boolean  @default(true)
  lastMessageAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  companyId String
  company   Company @relation(...)

  tickets Ticket[]

  @@unique([phone, companyId])
  @@index([companyId, canonicalPhone])
}
```

### Ticket

```prisma
model Ticket {
  id       String       @id @default(cuid())
  protocol String       @unique
  status   TicketStatus @default(PENDING)
  priority Priority     @default(MEDIUM)
  subject  String?

  // SLA
  slaDeadline   DateTime?
  firstResponse DateTime?   // Data/hora da primeira resposta
  resolvedAt    DateTime?
  slaBreached   Boolean   @default(false)

  // Metricas (armazenadas em segundos)
  waitingTime    Int?
  responseTime   Int?
  resolutionTime Int?

  // Avaliacao
  rating        Int?       // 1-5 estrelas
  ratingComment String?
  ratedAt       DateTime?
  ratingToken   String?    @unique

  // NPS (Net Promoter Score)
  npsScore   Int?       // 0-10
  npsComment String?
  npsRatedAt DateTime?
  npsToken   String?    @unique

  // Metricas de qualidade
  isFirstContactResolution Boolean @default(false)
  reopenCount              Int     @default(0)
  reopenedAt               DateTime?
  abandonedAt              DateTime?
  wasAbandoned             Boolean @default(false)

  // IA
  isAIHandled     Boolean   @default(false)
  aiTakeoverAt    DateTime?
  humanTakeoverAt DateTime?

  resolutionNote String?

  // Snooze
  snoozedAt    DateTime?
  snoozedUntil DateTime?
  snoozeReason String?

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  closedAt  DateTime?

  contactId    String
  assignedToId String?    // Usuario atribuido
  departmentId String?

  // Canal de origem
  channel           TicketChannel @default(WHATSAPP)
  connectionId      String?       // WhatsApp/Instagram connection
  emailConnectionId String?       // Email connection

  companyId String

  // Campanha que originou o ticket
  campaignId           Int?
  campaignDispatchedAt DateTime?

  // Historico: referencia ao ticket anterior do mesmo contato
  previousTicketId String?

  messages      Message[]
  transfers     TicketTransfer[]
  activities    Activity[]
  notifications Notification[]
  aiQueries     AIAssistantQuery[]

  @@index([companyId, status])
  @@index([assignedToId, status])
  @@index([departmentId, status])
  @@index([contactId, status])
  @@index([status, snoozedUntil])
  @@index([companyId, campaignId])
}
```

### CampaignDispatch

Idempotencia de webhook `campaign.dispatched` (integracao com plataforma de mensageria):

```prisma
model CampaignDispatch {
  id           String   @id @default(cuid())
  companyId    String
  campaignId   Int
  dispatchedAt DateTime
  processedAt  DateTime @default(now())

  @@unique([companyId, campaignId, dispatchedAt])
}
```

### TicketTransfer

```prisma
model TicketTransfer {
  id       String @id @default(cuid())
  ticketId String

  fromUserId String?
  toUserId   String?
  fromDeptId String?
  toDeptId   String?

  reason       String?
  transferType TransferType
  createdAt    DateTime @default(now())
}
```

---

## Modelos de Mensagem e Atividade

### Message

```prisma
model Message {
  id        String      @id @default(cuid())
  wamid     String?     // WhatsApp Message ID
  type      MessageType @default(TEXT)
  content   String?
  mediaUrl  String?
  mediaType String?
  caption   String?
  transcription String?  // Transcricao de audio/video

  isFromMe         Boolean  @default(false)
  isAIGenerated    Boolean  @default(false)
  isInternal       Boolean  @default(false)
  mentionedUserIds String[]

  status      MessageStatus @default(PENDING)
  sentAt      DateTime?
  deliveredAt DateTime?
  readAt      DateTime?

  reactions    Json?  @default("[]")
  metadata     Json?  @default("{}")
  failedReason String?

  deletedAt DateTime?
  deletedBy String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ticketId String

  senderId          String?  // Usuario que enviou
  connectionId      String?  // WhatsApp/Instagram connection
  emailConnectionId String?  // Email connection
  htmlContent       String?  // HTML original (canal EMAIL)

  quotedId String?           // Mensagem citada (reply)
  quoted   Message? @relation("QuotedMessage", ...)
  replies  Message[] @relation("QuotedMessage")

  @@index([ticketId, createdAt])
}
```

### Activity

```prisma
model Activity {
  id          String       @id @default(cuid())
  type        ActivityType
  description String
  metadata    Json?
  createdAt   DateTime     @default(now())

  ticketId String?
  userId   String?

  @@index([ticketId, createdAt])
}
```

---

## Modelos de Configuracao

### SLAConfig

```prisma
model SLAConfig {
  id   String @id @default(cuid())
  name String

  firstResponseTime Int  @default(15)   // minutos
  resolutionTime    Int  @default(240)  // minutos
  businessHours     Json?              // { start, end, days[] }

  isDefault    Boolean  @default(false)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  companyId    String
  departmentId String?  @unique  // SLA especifico por departamento
}
```

O campo `businessHours` armazena um JSON com o formato:

```json
{
  "start": "09:00",
  "end": "18:00",
  "days": [1, 2, 3, 4, 5]
}
```

Onde `days` usa 0=Domingo, 1=Segunda, ..., 6=Sabado.

### CompanySettings

```prisma
model CompanySettings {
  id        String @id @default(cuid())
  companyId String @unique

  // Notion
  notionApiKey      String?
  notionDatabaseId  String?
  notionSyncEnabled Boolean @default(false)

  // IA
  aiEnabled          Boolean @default(false)
  aiProvider         String?   // "openai" | "anthropic"
  aiApiKey           String?
  aiDefaultModel     String?
  aiSystemPrompt     String?
  whisperApiKey      String?

  // Personalidade da IA
  aiPersonalityTone    String?  // friendly, formal, technical, empathetic
  aiPersonalityStyle   String?  // concise, detailed, conversational
  aiUseEmojis          Boolean @default(true)
  aiUseClientName      Boolean @default(true)
  aiGuardrailsEnabled  Boolean @default(true)

  // Atendimento
  autoAssign         Boolean @default(true)
  maxTicketsPerAgent Int     @default(10)
  welcomeMessage     String?
  awayMessage        String?

  // Horario de funcionamento
  businessHoursEnabled   Boolean @default(false)
  businessHoursTimezone  String?  // ex: "America/Sao_Paulo"
  businessHoursDays      String?  // ex: "1,2,3,4,5"
  businessHoursStartTime String?  // ex: "09:00"
  businessHoursEndTime   String?  // ex: "18:00"
  outOfHoursMessage      String?

  defaultTransferDepartmentId String?

  // Integracao externa
  outboundWebhookUrl        String?
  outboundWebhookSecret     String?
  externalIntegrationApiKey String?

  // Blue Assistant
  blueEnabled Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Modelos de Conhecimento e FAQ

### KnowledgeBase

```prisma
model KnowledgeBase {
  id           String   @id @default(cuid())
  title        String
  content      String   @db.Text
  category     String?
  tags         String[]
  order        Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  departmentId String?
  companyId    String

  @@index([companyId, isActive])
  @@index([departmentId, isActive])
}
```

### FAQ

```prisma
model FAQ {
  id       String   @id @default(cuid())
  question String
  answer   String   @db.Text
  keywords String[]
  category String?
  order    Int      @default(0)

  useCount  Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  departmentId String?
  companyId    String

  @@index([companyId, isActive])
}
```

---

## Modelos do AI Assistant

### AIDataSource (Fonte de Dados)

```prisma
model AIDataSource {
  id          String           @id @default(cuid())
  name        String
  type        AIDataSourceType
  description String?
  config      Json    @default("{}")
  category    String?
  tags        String[]
  priority    Int     @default(0)
  icon        String?
  color       String?

  syncEnabled   Boolean   @default(true)
  syncInterval  Int       @default(60)   // minutos
  lastSyncAt    DateTime?
  lastSyncError String?

  isActive  Boolean  @default(true)
  companyId String

  documents    AIDocument[]
  agentConfigs AIAgentDataSource[]
}
```

### AIDocument (Documento Indexado)

```prisma
model AIDocument {
  id      String  @id @default(cuid())
  title   String
  content String  @db.Text
  summary String? @db.Text

  category   String?
  tags       String[]
  keywords   String[]
  externalId String?
  externalUrl String?
  checksum    String?

  embedding      Float[]
  embeddingModel String?
  status         AIDocumentStatus @default(PENDING)
  indexedAt       DateTime?
  indexError      String?
  tokensCount    Int?

  dataSourceId String
  departmentId String?
  companyId    String
  isActive     Boolean @default(true)

  queryReferences AIQuerySource[]
}
```

### AIAgentConfig (Configuracao de IA por Categoria)

```prisma
model AIAgentConfig {
  id       String @id @default(cuid())
  name     String
  category String   // "vendas", "suporte", "financeiro", etc.
  description String?

  systemPrompt String @db.Text
  provider     String // "openai" | "anthropic"
  model        String // "gpt-4o", "claude-sonnet-4", etc.
  temperature  Float  @default(0.7)
  maxTokens    Int    @default(1500)
  tone         String?
  style        String?
  rules        Json   @default("{}")

  triggerKeywords String[]
  priority        Int     @default(0)
  icon            String?
  color           String?

  isActive  Boolean @default(true)
  isDefault Boolean @default(false)
  companyId String

  dataSources AIAgentDataSource[]
  queries     AIAssistantQuery[]

  @@unique([companyId, category])
}
```

### AIAssistantQuery (Historico de Consultas @ia)

```prisma
model AIAssistantQuery {
  id       String @id @default(cuid())
  query    String @db.Text
  context  String? @db.Text
  response String @db.Text
  editedResponse String? @db.Text

  detectedCategory   String?
  categoryConfidence  Float?
  status              AIQueryStatus @default(PROCESSING)

  processingTime Int?
  tokensInput    Int?
  tokensOutput   Int?

  wasUsed   Boolean   @default(false)
  wasEdited Boolean   @default(false)
  rating    Int?
  hasKnowledgeGap Boolean @default(false)

  ticketId      String
  userId        String
  agentConfigId String?
  companyId     String

  sourcesUsed AIQuerySource[]
}
```

### Outros Modelos de IA

| Modelo | Descricao |
|--------|-----------|
| `AIAgentDataSource` | Relacao N:N entre AIAgentConfig e AIDataSource (com peso/prioridade) |
| `AIQuerySource` | Fontes usadas em uma query (documento + score de relevancia + trecho) |
| `AIKnowledgeGap` | Gaps de conhecimento detectados (topico, frequencia, status) |
| `AIAutoSuggestion` | Sugestoes automaticas sem @ia (trigger, sugestao, aceite) |
| `AISentimentAnalysis` | Analise de sentimento por mensagem (score, emocoes, urgencia, intent) |

---

## Modelos do Blue Assistant

### BlueInteraction

```prisma
model BlueInteraction {
  id        String  @id @default(cuid())
  userId    String
  companyId String
  type      String  // "tip" | "chat"
  page      String? // Rota onde ocorreu
  context   Json    // Contexto da pagina
  message   String? // Mensagem do usuario (tipo "chat")
  response  String  // Resposta do Blue
  createdAt DateTime @default(now())
}
```

---

## Modelos de Metricas

### MetricGoal (Metas)

```prisma
model MetricGoal {
  id       String  @id @default(cuid())
  name     String
  metric   String  // nps, slaCompliance, avgResponseTime, fcr, etc.
  target   Float
  period   String  @default("monthly") // daily, weekly, monthly, quarterly
  isActive Boolean @default(true)

  companyId    String
  departmentId String?
  userId       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### MetricAlert (Alertas de Metricas)

```prisma
model MetricAlert {
  id        String  @id @default(cuid())
  name      String
  metric    String
  condition String  // below, above, equals
  threshold Float
  isActive  Boolean @default(true)

  notifyEmail   Boolean @default(true)
  notifyInApp   Boolean @default(true)
  notifyWebhook String?

  lastTriggeredAt DateTime?
  triggerCount    Int @default(0)

  companyId String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Modelos de Notificacao

### Notification

```prisma
model Notification {
  id       String  @id @default(cuid())
  type     String  // notification_mention, notification_ticket_assigned, etc.
  title    String
  message  String
  read     Boolean @default(false)
  readAt   DateTime?
  metadata Json?

  userId    String
  ticketId  String?
  companyId String
  createdAt DateTime @default(now())

  @@index([userId, read])
}
```

### EmailAlertLog

Log de alertas enviados por email (cooldown para evitar spam):

```prisma
model EmailAlertLog {
  id        String   @id @default(cuid())
  companyId String
  alertType String   // CONNECTION_DOWN | TICKETS_NO_RESPONSE
  entityId  String?
  sentAt    DateTime @default(now())

  @@index([companyId, alertType, entityId])
}
```

### PredefinedMessage

Atalhos de mensagem (`/xxx`) para atendentes:

```prisma
model PredefinedMessage {
  id        String @id @default(cuid())
  companyId String
  shortcut  String   // ex: "ola"
  name      String?
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([companyId, shortcut])
}
```

---

## Modelos do Knowledge RAG

Sistema de busca semantica com chunks vetoriais:

### KnowledgeContext

```prisma
model KnowledgeContext {
  id           String   @id @default(cuid())
  name         String
  description  String?
  slug         String
  systemPrompt String?  @db.Text
  keywords     String[]
  priority     Int      @default(0)
  companyId    String

  sources KnowledgeSource[]

  @@unique([companyId, slug])
}
```

### KnowledgeSource

```prisma
model KnowledgeSource {
  id        String  @id @default(cuid())
  name      String
  type      String  // TEXT, PDF, NOTION, URL, DOCX, CSV, JSON
  sourceUrl String?
  filePath  String?
  content   String? @db.Text
  status    String  @default("PENDING")
  error     String? @db.Text
  metadata  Json?

  contextId String
  companyId String

  chunks KnowledgeChunk[]
}
```

### KnowledgeChunk

```prisma
model KnowledgeChunk {
  id        String  @id @default(cuid())
  content   String  @db.Text
  embedding String? // JSON array de floats
  metadata  Json?

  sourceId  String
  createdAt DateTime @default(now())
}
```

---

## Modelos do ML Learning System

Sistema de aprendizado de maquina baseado em interacoes reais:

| Modelo | Descricao |
|--------|-----------|
| `MLTrainingPair` | Par pergunta-do-cliente + resposta-do-atendente com metricas de qualidade, embedding, classificacao de intent/categoria/sentimento |
| `MLIntentPattern` | Padrao de intencao aprendido (ex: `PRICE_INQUIRY`), com centroide de embedding, exemplos, taxa de sucesso |
| `MLResponseTemplate` | Template de resposta com placeholders, vinculado a intent pattern, com metricas de uso |
| `MLModelVersion` | Versao de modelo treinado (INTENT_CLASSIFIER, RESPONSE_RANKER, QUALITY_SCORER) com metricas de accuracy/precision/recall |
| `MLLearningMetric` | Metricas diarias de aprendizado por empresa (pares coletados, padroes, resolucao IA, etc.) |
| `MLAIDecisionLog` | Log de decisoes da IA (intent detectado, decisao tomada, outcome) para auditoria |
| `MLTrainingBatch` | Batch de treinamento com contagem de pares, padroes e templates criados |

---

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

## Indices

Os indices mais importantes para performance:

```prisma
// Ticket: consultas frequentes por empresa/status/atendente
@@index([companyId, status])
@@index([assignedToId, status])
@@index([departmentId, status])
@@index([contactId, status])
@@index([status, snoozedUntil])

// Message: consulta por ticket ordenada por data
@@index([ticketId, createdAt])

// Contact: busca por telefone canonico
@@index([companyId, canonicalPhone])

// Notification: lista por usuario filtrada por leitura
@@index([userId, read])

// AI: queries por empresa e data
@@index([companyId, createdAt])
@@index([companyId, hasKnowledgeGap])
```

## Proximos Passos

- [Services](/backend/services)
- [Middlewares](/backend/middlewares)
- [WebSocket](/backend/websocket)
- [Jobs](/backend/jobs)
