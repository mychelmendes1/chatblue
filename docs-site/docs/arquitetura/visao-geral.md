---
sidebar_position: 1
title: Visao Geral da Arquitetura
description: Entenda a arquitetura do ChatBlue
---

# Visao Geral da Arquitetura

O ChatBlue e uma plataforma multi-tenant de atendimento ao cliente construida com uma arquitetura moderna e escalavel.

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTES                                        │
│                                                                              │
│     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐        │
│     │  Browser │     │  Mobile  │     │ WhatsApp │     │   API    │        │
│     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘        │
└──────────┼────────────────┼────────────────┼────────────────┼───────────────┘
           │                │                │                │
           ▼                ▼                │                │
┌─────────────────────────────────────┐     │                │
│           FRONTEND                   │     │                │
│         Next.js 14                   │     │                │
│                                      │     │                │
│  ┌─────────────────────────────┐    │     │                │
│  │        React 18             │    │     │                │
│  │    + Tailwind CSS           │    │     │                │
│  │    + Shadcn/UI              │    │     │                │
│  └─────────────────────────────┘    │     │                │
│                                      │     │                │
│  ┌─────────────────────────────┐    │     │                │
│  │        Zustand              │    │     │                │
│  │   (State Management)        │    │     │                │
│  └─────────────────────────────┘    │     │                │
│                                      │     │                │
│  ┌─────────────────────────────┐    │     │                │
│  │     TanStack Query          │    │     │                │
│  │   (Data Fetching)           │    │     │                │
│  └─────────────────────────────┘    │     │                │
│                                      │     │                │
│  ┌─────────────────────────────┐    │     │                │
│  │      Socket.io Client       │◄───┼─────┼────────────────┤
│  │      (Real-time)            │    │     │                │
│  └─────────────────────────────┘    │     │                │
│                                      │     │                │
└──────────────┬──────────────────────┘     │                │
               │ HTTP/WebSocket              │                │
               ▼                             ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
│                         Express + TypeScript                                 │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │
│  │    REST API        │  │    Socket.io       │  │    Webhooks        │    │
│  │    /api/*          │  │    (Real-time)     │  │  /webhooks/meta    │    │
│  └────────┬───────────┘  └────────┬───────────┘  └────────┬───────────┘    │
│           │                       │                        │                 │
│           └───────────────────────┼────────────────────────┘                │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         MIDDLEWARES                                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │   Auth   │  │  Tenant  │  │   CORS   │  │  Error   │            │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          SERVICES                                    │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │  WhatsApp    │  │     AI       │  │   Notion     │              │    │
│  │  │  Service     │  │   Service    │  │   Service    │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │    SLA       │  │   Message    │  │    Email     │              │    │
│  │  │   Service    │  │  Processor   │  │   Service    │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
└───────────────────────────────────┼──────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCIA                                        │
│                                                                              │
│  ┌─────────────────────────┐     ┌─────────────────────────┐               │
│  │      PostgreSQL         │     │         Redis           │               │
│  │    (Prisma ORM)         │     │   (Cache + BullMQ)      │               │
│  │                         │     │                         │               │
│  │  - Users                │     │  - Sessions             │               │
│  │  - Companies            │     │  - Job Queues           │               │
│  │  - Tickets              │     │  - Real-time State      │               │
│  │  - Messages             │     │  - Rate Limiting        │               │
│  │  - Contacts             │     │                         │               │
│  │  - Departments          │     │                         │               │
│  └─────────────────────────┘     └─────────────────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INTEGRACOES EXTERNAS                                   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  WhatsApp   │  │   OpenAI    │  │  Anthropic  │  │   Notion    │        │
│  │  (Baileys/  │  │   (GPT-4)   │  │  (Claude)   │  │    API      │        │
│  │   Meta)     │  │             │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Camadas da Aplicacao

### 1. Camada de Apresentacao (Frontend)

Responsavel pela interface do usuario:

- **Next.js 14**: Framework React com App Router
- **React 18**: Biblioteca de UI
- **Tailwind CSS**: Estilizacao utilitaria
- **Shadcn/UI**: Componentes acessiveis
- **Zustand**: Gerenciamento de estado
- **Socket.io Client**: Comunicacao em tempo real
- **TanStack Query**: Cache e fetching de dados

### 2. Camada de API (Backend)

Responsavel pela logica de negocio:

- **Express.js**: Framework HTTP
- **TypeScript**: Tipagem estatica
- **Socket.io**: WebSocket para tempo real
- **Middlewares**: Auth, Tenant, CORS, Error handling
- **Routes**: Endpoints REST organizados por dominio

### 3. Camada de Servicos

Implementa a logica de negocio:

- **WhatsAppService**: Conexao e mensageria WhatsApp
- **AIService**: Integracao com LLMs
- **NotionService**: Sincronizacao com Notion
- **SLAService**: Calculo e monitoramento de SLA
- **MessageProcessor**: Processamento de mensagens

### 4. Camada de Persistencia

Responsavel pelo armazenamento:

- **PostgreSQL**: Banco de dados relacional
- **Prisma**: ORM type-safe
- **Redis**: Cache, filas e estado real-time
- **BullMQ**: Processamento de jobs em background

### 5. Camada de Integracoes

Conexoes com servicos externos:

- **WhatsApp**: Baileys (nao-oficial) e Meta Cloud API
- **OpenAI**: GPT-4 para IA
- **Anthropic**: Claude para IA
- **Notion**: CRM e base de clientes

## Fluxo de Dados

### Mensagem Recebida (WhatsApp -> Sistema)

```
1. WhatsApp envia webhook
2. BaileysService/MetaCloudService recebe
3. MessageProcessor processa:
   - Normaliza dados
   - Cria/busca contato
   - Cria/busca ticket
   - Persiste mensagem
4. Se AI ativo:
   - AIService gera resposta
   - Envia resposta ao contato
5. Socket.io notifica frontend
6. Frontend atualiza UI
```

### Mensagem Enviada (Sistema -> WhatsApp)

```
1. Usuario envia mensagem no frontend
2. API recebe requisicao POST
3. Valida permissoes e dados
4. Persiste mensagem no banco
5. WhatsAppService envia ao WhatsApp
6. Atualiza status da mensagem
7. Socket.io notifica outros usuarios
```

## Componentes Principais

### Backend

| Componente | Responsabilidade |
|------------|------------------|
| `server.ts` | Entry point, configuracao Express |
| `routes/` | Definicao de endpoints |
| `services/` | Logica de negocio |
| `middlewares/` | Interceptadores de requisicao |
| `sockets/` | Handlers Socket.io |
| `jobs/` | Processadores BullMQ |

### Frontend

| Componente | Responsabilidade |
|------------|------------------|
| `app/` | Paginas e rotas (App Router) |
| `components/` | Componentes React |
| `stores/` | Estado global (Zustand) |
| `lib/` | Utilitarios e configuracoes |
| `hooks/` | Custom hooks |

## Comunicacao entre Componentes

### REST API

```typescript
// Frontend -> Backend
const response = await fetch('/api/tickets', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### WebSocket (Socket.io)

```typescript
// Evento de mensagem recebida
socket.on('message:received', (message) => {
  // Atualizar UI
});

// Enviar mensagem
socket.emit('message:send', {
  ticketId,
  content
});
```

### BullMQ (Jobs)

```typescript
// Adicionar job
await notificationQueue.add('send-notification', {
  userId,
  message
});

// Processar job
notificationQueue.process(async (job) => {
  await sendNotification(job.data);
});
```

## Escalabilidade

### Horizontal

- **API**: Multiplas instancias atras de load balancer
- **Workers**: Processamento distribuido de jobs
- **Database**: Read replicas para consultas

### Vertical

- **PostgreSQL**: Aumento de recursos
- **Redis**: Cluster mode
- **Node.js**: Cluster module

## Seguranca

- **JWT**: Autenticacao stateless
- **CORS**: Restricao de origens
- **Helmet**: Headers de seguranca
- **Rate Limiting**: Protecao contra abusos
- **Multi-tenancy**: Isolamento de dados
- **Bcrypt**: Hash de senhas
- **HTTPS**: Criptografia em transito

## Proximos Passos

- [Estrutura do Projeto](/arquitetura/estrutura-projeto)
- [Fluxo de Dados](/arquitetura/fluxo-dados)
- [Multi-tenancy](/arquitetura/multi-tenancy)
- [Seguranca](/arquitetura/seguranca)
