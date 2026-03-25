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
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │Browser │ │ Mobile │ │WhatsApp│ │ Email  │ │Instagr.│ │  API   │        │
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘        │
└──────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┘
       │          │          │          │          │          │
       ▼          ▼          │          │          │          │
┌─────────────────────────┐  │          │          │          │
│       FRONTEND           │  │          │          │          │
│     Next.js 14           │  │          │          │          │
│                          │  │          │          │          │
│  React 18 + Tailwind     │  │          │          │          │
│  Shadcn/UI + Zustand     │  │          │          │          │
│  TanStack Query          │  │          │          │          │
│  Socket.io Client        │  │          │          │          │
└────────────┬─────────────┘  │          │          │          │
             │ HTTP/WS        │          │          │          │
             ▼                ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
│                         Express + TypeScript                                 │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   REST API   │  │  Socket.io   │  │   Webhooks   │  │  IMAP Poll   │   │
│  │   /api/*     │  │  (Realtime)  │  │  /webhooks/* │  │  (Email In)  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         └─────────────────┼─────────────────┼─────────────────┘            │
│                           ▼                 │                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         MIDDLEWARES                                  │   │
│  │     Auth  |  Tenant  |  CORS  |  Error  |  Rate Limiting           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          SERVICES                                    │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  WhatsApp    │  │     AI       │  │   Notion     │              │   │
│  │  │  Service     │  │   Service    │  │   Service    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │    SLA       │  │   Message    │  │    Email     │              │   │
│  │  │   Service    │  │  Processor   │  │   Service    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Instagram   │  │  ML Learning │  │    Blue      │              │   │
│  │  │  Service     │  │   Service    │  │  Assistant   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐                                │   │
│  │  │  Campaign    │  │  Knowledge   │                                │   │
│  │  │  Dispatch    │  │  RAG Service │                                │   │
│  │  └──────────────┘  └──────────────┘                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
└───────────────────────────┼─────────────────────────────────────────────────┘
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
│  │  - Contacts             │     │  - Embeddings Cache     │               │
│  │  - Departments          │     │                         │               │
│  │  - KnowledgeChunks      │     │                         │               │
│  │  - MLTrainingPairs      │     │                         │               │
│  └─────────────────────────┘     └─────────────────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INTEGRACOES EXTERNAS                                   │
│                                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│  │ WhatsApp  │ │  OpenAI   │ │ Anthropic │ │  Notion   │ │ Meta Graph│    │
│  │ (Baileys/ │ │  (GPT-4)  │ │ (Claude)  │ │   API     │ │ API (IG)  │    │
│  │  Meta)    │ │           │ │           │ │           │ │           │    │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
│                                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                                │
│  │   IMAP    │ │   SMTP    │ │ Campaign  │                                │
│  │ (Email In)│ │(Email Out)│ │ Platform  │                                │
│  └───────────┘ └───────────┘ └───────────┘                                │
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
- **EmailService**: Canal de email (IMAP inbound + SMTP outbound)
- **InstagramService**: Canal Instagram via Meta Graph API
- **CampaignDispatchService**: Despacho de campanhas via plataforma externa
- **MLLearningService**: Coleta de pares de treinamento e deteccao de padroes
- **BlueAssistantService**: Assistente interno para agentes (RAG sobre codigo e docs)
- **KnowledgeRAGService**: Sistema de RAG com embeddings para base de conhecimento

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
- **Meta Graph API**: Mensageria Instagram (webhook-based)
- **IMAP/SMTP**: Servidores de email para canal de email
- **Plataforma de Campanhas**: Disparo externo de mensagens com webhook de retorno

## Canais de Comunicacao

### WhatsApp

Canal principal de mensageria. Suporta duas implementacoes:

- **Baileys** (nao-oficial): conexao via QR Code, WebSocket direto
- **Meta Cloud API** (oficial): webhooks HTTP, templates pre-aprovados

### Email

Canal de email com fluxo bidirecional:

```
Inbound (IMAP):
  Job BullMQ (a cada 30s) -> IMAP polling -> novo email detectado
    -> MessageProcessor cria/busca contato e ticket
    -> Persiste mensagem com corpo do email
    -> Socket.io notifica frontend

Outbound (SMTP):
  Agente responde no ticket -> EmailService envia via SMTP
    -> Mensagem formatada como resposta ao email original
    -> Status atualizado apos confirmacao de envio
```

O job de polling IMAP roda como um cron BullMQ com intervalo de 30 segundos, verificando novas mensagens nas caixas de entrada configuradas por empresa.

### Instagram

Canal de mensagens diretas do Instagram, baseado em webhooks:

```
Inbound:
  Meta envia webhook para /webhooks/instagram
    -> Valida assinatura do webhook
    -> Normaliza dados da mensagem
    -> MessageProcessor cria/busca contato e ticket
    -> Socket.io notifica frontend

Outbound:
  Agente responde no ticket -> InstagramService envia via Meta Graph API
    -> POST para https://graph.facebook.com/v18.0/me/messages
    -> Status atualizado com confirmacao da API
```

A integracao requer configuracao de um Instagram Business Account e um Facebook App com permissoes de messaging.

### Campaign Dispatches

Sistema de disparo de campanhas via plataforma de mensageria externa:

```
1. Admin cria campanha no ChatBlue
2. Sistema envia lista de destinatarios para plataforma externa
3. Plataforma dispara mensagens
4. Respostas dos clientes chegam via webhook
5. Webhook cria tickets automaticamente para cada resposta
6. Agentes atendem normalmente pelo ChatBlue
```

## Sistemas Internos

### ML Learning

Sistema de aprendizado de maquina que coleta dados de atendimentos para treinamento:

```
Coleta:
  - Cada interacao agente-cliente gera um par de treinamento
  - Pares sao armazenados como MLTrainingPair no banco

Deteccao de Padroes:
  - Analisa frequencia de perguntas similares
  - Identifica respostas mais efetivas por tipo de pergunta
  - Sugere respostas automaticas baseadas em padroes

Treinamento:
  - Modelos fine-tuned a partir dos pares coletados
  - Avaliacao de qualidade antes de ativar em producao
```

### Blue Assistant

Assistente interno voltado para os agentes de atendimento. Utiliza RAG (Retrieval Augmented Generation) sobre o codigo-fonte e documentacao do sistema:

```
Agente faz pergunta ao Blue
  -> Busca semantica nos chunks de codigo e documentacao
  -> Monta contexto com trechos relevantes
  -> LLM gera resposta contextualizada
  -> Resposta apresentada ao agente no painel
```

O Blue Assistant ajuda agentes a encontrar informacoes sobre processos internos, funcionalidades do sistema e boas praticas sem precisar consultar colegas.

### Knowledge RAG

Sistema de Retrieval Augmented Generation para a base de conhecimento da empresa. Estrutura de dados:

```
KnowledgeContext (contexto geral)
  └── KnowledgeSource (fonte: PDF, URL, texto manual)
        └── KnowledgeChunk (trecho com embedding vetorial)
```

Fluxo de indexacao:

```
1. Admin adiciona fonte de conhecimento (PDF, URL, texto)
2. Sistema extrai texto e divide em chunks
3. Cada chunk recebe um embedding vetorial (via OpenAI)
4. Chunks armazenados no PostgreSQL com campo de embeddings
```

Fluxo de consulta:

```
1. Pergunta do cliente chega (ou agente consulta)
2. Embedding da pergunta e gerado
3. Busca por similaridade nos chunks (cosine similarity)
4. Top-K chunks relevantes montam o contexto
5. LLM gera resposta baseada nos chunks encontrados
```

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
