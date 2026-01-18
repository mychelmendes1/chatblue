---
sidebar_position: 2
title: Estrutura do Projeto
description: Organizacao de pastas e arquivos do ChatBlue
---

# Estrutura do Projeto

O ChatBlue e organizado como um monorepo usando Turborepo e pnpm workspaces.

## Visao Geral

```
chatblue/
├── apps/
│   ├── api/                    # Backend Express
│   └── web/                    # Frontend Next.js
├── packages/                   # Pacotes compartilhados
├── docker/                     # Configuracoes Docker
├── docs/                       # Documentacao legada
├── docs-site/                  # Documentacao Docusaurus
├── deploy/                     # Scripts de deploy
├── .env.example                # Template de variaveis
├── docker-compose.yml          # Docker Compose dev
├── turbo.json                  # Configuracao Turborepo
├── pnpm-workspace.yaml         # Configuracao workspaces
└── package.json                # Package raiz
```

## Backend (apps/api)

```
apps/api/
├── src/
│   ├── config/
│   │   ├── database.ts         # Configuracao Prisma
│   │   ├── redis.ts            # Configuracao Redis
│   │   └── logger.ts           # Configuracao Pino
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # Autenticacao JWT
│   │   ├── tenant.middleware.ts # Isolamento multi-tenant
│   │   ├── error.middleware.ts # Tratamento de erros
│   │   └── upload.middleware.ts # Upload de arquivos
│   │
│   ├── routes/
│   │   ├── index.ts            # Router principal
│   │   ├── auth.routes.ts      # /api/auth
│   │   ├── users.routes.ts     # /api/users
│   │   ├── companies.routes.ts # /api/companies
│   │   ├── departments.routes.ts # /api/departments
│   │   ├── connections.routes.ts # /api/connections
│   │   ├── tickets.routes.ts   # /api/tickets
│   │   ├── messages.routes.ts  # /api/messages
│   │   ├── contacts.routes.ts  # /api/contacts
│   │   ├── metrics.routes.ts   # /api/metrics
│   │   ├── settings.routes.ts  # /api/settings
│   │   ├── knowledge.routes.ts # /api/knowledge
│   │   ├── faq.routes.ts       # /api/faq
│   │   ├── upload.routes.ts    # /api/upload
│   │   └── push.routes.ts      # /api/push
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── ai.service.ts           # Servico principal IA
│   │   │   ├── context-builder.service.ts # Construcao de contexto
│   │   │   ├── personality.service.ts   # Personalidade da IA
│   │   │   ├── transcription.service.ts # Transcricao de audio
│   │   │   ├── transfer-analyzer.service.ts # Analise de transferencia
│   │   │   └── guardrails.service.ts   # Regras de seguranca
│   │   │
│   │   ├── whatsapp/
│   │   │   ├── whatsapp.service.ts     # Servico principal
│   │   │   ├── baileys.service.ts      # Cliente Baileys
│   │   │   └── meta-cloud.service.ts   # Cliente Meta Cloud API
│   │   │
│   │   ├── message-processor.service.ts # Processador de mensagens
│   │   ├── notion.service.ts           # Integracao Notion
│   │   ├── sla.service.ts              # Calculo de SLA
│   │   ├── email.service.ts            # Envio de emails
│   │   ├── push.service.ts             # Push notifications
│   │   └── upload.service.ts           # Upload de arquivos
│   │
│   ├── sockets/
│   │   ├── index.ts            # Configuracao Socket.io
│   │   └── handlers/           # Handlers de eventos
│   │
│   ├── jobs/
│   │   ├── queues/             # Definicao de filas
│   │   └── processors/         # Processadores de jobs
│   │       ├── notification.processor.ts
│   │       ├── notion-sync.processor.ts
│   │       ├── sla-check.processor.ts
│   │       └── ticket-cleanup.processor.ts
│   │
│   ├── utils/
│   │   ├── protocol.ts         # Geracao de protocolo
│   │   ├── media-url.util.ts   # Normalizacao de URLs
│   │   └── helpers.ts          # Utilitarios gerais
│   │
│   └── server.ts               # Entry point
│
├── prisma/
│   ├── schema.prisma           # Schema do banco
│   ├── seed.ts                 # Script de seed
│   └── migrations/             # Migrations
│
├── tests/
│   ├── unit/                   # Testes unitarios
│   └── e2e/                    # Testes end-to-end
│
└── package.json
```

## Frontend (apps/web)

```
apps/web/
├── app/
│   ├── (auth)/                 # Grupo de autenticacao
│   │   ├── login/
│   │   │   └── page.tsx        # Pagina de login
│   │   └── layout.tsx          # Layout de auth
│   │
│   ├── (dashboard)/            # Grupo do dashboard
│   │   ├── chat/
│   │   │   └── page.tsx        # Pagina de chat
│   │   ├── contacts/
│   │   │   └── page.tsx        # Pagina de contatos
│   │   ├── users/
│   │   │   └── page.tsx        # Pagina de usuarios
│   │   ├── connections/
│   │   │   └── page.tsx        # Pagina de conexoes
│   │   ├── metrics/
│   │   │   └── page.tsx        # Pagina de metricas
│   │   ├── settings/
│   │   │   └── page.tsx        # Pagina de configuracoes
│   │   ├── ai-agent/
│   │   │   └── page.tsx        # Pagina do agente IA
│   │   ├── knowledge-base/
│   │   │   └── page.tsx        # Base de conhecimento
│   │   ├── faq/
│   │   │   └── page.tsx        # FAQ
│   │   └── layout.tsx          # Layout do dashboard
│   │
│   ├── layout.tsx              # Layout raiz
│   ├── providers.tsx           # Providers React
│   └── globals.css             # Estilos globais
│
├── components/
│   ├── chat/
│   │   ├── ChatSidebar.tsx     # Sidebar de conversas
│   │   ├── ChatWindow.tsx      # Janela de mensagens
│   │   ├── ChatInput.tsx       # Input de mensagem
│   │   ├── MessageBubble.tsx   # Bolha de mensagem
│   │   ├── ContactInfo.tsx     # Info do contato
│   │   └── TypingIndicator.tsx # Indicador de digitacao
│   │
│   ├── ui/                     # Componentes Shadcn/UI
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── avatar.tsx
│   │   ├── scroll-area.tsx
│   │   └── ... (20+ componentes)
│   │
│   ├── layout/
│   │   ├── Header.tsx          # Cabecalho
│   │   ├── Sidebar.tsx         # Menu lateral
│   │   └── DashboardLayout.tsx # Layout principal
│   │
│   └── providers/
│       ├── SocketProvider.tsx  # Provider Socket.io
│       ├── QueryProvider.tsx   # Provider TanStack Query
│       └── ThemeProvider.tsx   # Provider de tema
│
├── stores/
│   ├── auth.store.ts           # Estado de autenticacao
│   ├── chat.store.ts           # Estado do chat
│   └── ui.store.ts             # Estado da UI
│
├── lib/
│   ├── api.ts                  # Cliente HTTP
│   ├── socket.ts               # Cliente Socket.io
│   ├── utils.ts                # Utilitarios
│   └── constants.ts            # Constantes
│
├── hooks/
│   ├── useAuth.ts              # Hook de autenticacao
│   ├── useSocket.ts            # Hook de socket
│   ├── useTickets.ts           # Hook de tickets
│   └── useMessages.ts          # Hook de mensagens
│
├── types/
│   └── index.ts                # Tipos TypeScript
│
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│
└── package.json
```

## Docker

```
docker/
├── docker-compose.yml          # Desenvolvimento
├── docker-compose.prod.yml     # Producao
├── Dockerfile.api              # Imagem da API
├── Dockerfile.web              # Imagem do Frontend
└── nginx/
    └── default.conf            # Config Nginx
```

## Configuracoes Raiz

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### package.json (raiz)

```json
{
  "name": "chatblue",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^1.11.0"
  }
}
```

## Convencoes de Nomenclatura

### Arquivos

| Tipo | Padrao | Exemplo |
|------|--------|---------|
| Componentes React | PascalCase | `ChatWindow.tsx` |
| Hooks | camelCase com "use" | `useAuth.ts` |
| Services | kebab-case + .service | `ai.service.ts` |
| Routes | kebab-case + .routes | `auth.routes.ts` |
| Stores | kebab-case + .store | `auth.store.ts` |
| Utils | kebab-case | `media-url.util.ts` |

### Pastas

| Tipo | Padrao | Exemplo |
|------|--------|---------|
| Grupos Next.js | (nome) | `(auth)`, `(dashboard)` |
| Dominios | kebab-case | `knowledge-base` |
| Componentes | kebab-case | `ui`, `chat`, `layout` |

### Codigo

| Tipo | Padrao | Exemplo |
|------|--------|---------|
| Variaveis | camelCase | `userId` |
| Constantes | SCREAMING_SNAKE | `MAX_FILE_SIZE` |
| Classes | PascalCase | `AIService` |
| Interfaces | PascalCase com I | `IUser` |
| Types | PascalCase | `MessageType` |
| Enums | PascalCase | `TicketStatus` |

## Proximos Passos

- [Fluxo de Dados](/arquitetura/fluxo-dados)
- [Multi-tenancy](/arquitetura/multi-tenancy)
- [Seguranca](/arquitetura/seguranca)
