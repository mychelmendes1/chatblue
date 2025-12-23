# ChatBlue - Sistema de Atendimento via WhatsApp

Sistema de atendimento similar ao WhatsApp Web, com suporte a múltiplas empresas, múltiplos atendentes, conexões via Baileys e API Oficial Meta, atendente de IA, SLA, métricas e integração com Notion.

## Funcionalidades Principais

- **Multi-Tenancy**: Suporte a múltiplas empresas com isolamento completo de dados
- **Múltiplos Canais WhatsApp**: Conexão via Baileys (não-oficial) e API Meta Cloud (oficial)
- **Atendente de IA**: Atendimento automatizado com transferência para humanos
- **Hierarquia de Departamentos**: Triagem, Comercial, Suporte, Financeiro, etc.
- **SLA e Métricas**: Controle de tempo de resposta e resolução
- **Integração Notion**: Verificação de clientes e ex-clientes
- **Interface WhatsApp-like**: Visual familiar para fácil adoção

## Stack Tecnológica

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Redis + BullMQ (filas)
- Socket.io (real-time)
- Baileys (WhatsApp não-oficial)
- Meta Cloud API (WhatsApp oficial)

### Frontend
- Next.js 14 (App Router)
- TypeScript + Tailwind CSS
- Shadcn/UI + Radix UI
- Zustand (estado)
- Socket.io-client
- React Query

## Início Rápido

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- Docker e Docker Compose

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/chatblue.git
cd chatblue

# Instale as dependências
pnpm install

# Inicie os serviços (PostgreSQL e Redis)
docker-compose -f docker/docker-compose.yml up -d postgres redis

# Configure as variáveis de ambiente
cp .env.example .env

# Execute as migrações
pnpm db:push

# Popule o banco com dados iniciais
pnpm --filter api db:seed

# Inicie em modo desenvolvimento
pnpm dev
```

### Acessar o Sistema

- Frontend: http://localhost:3000
- API: http://localhost:3001

### Credenciais de Demo

- **Super Admin**: admin@chatblue.com / admin123
- **Agentes**: joao@demo.com, ana@demo.com, pedro@demo.com (senha: agent123)

## Estrutura do Projeto

```
chatblue/
├── apps/
│   ├── api/              # Backend Express
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middlewares/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── sockets/
│   │   └── prisma/
│   │
│   └── web/              # Frontend Next.js
│       ├── app/
│       ├── components/
│       ├── stores/
│       └── lib/
│
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.api
│   └── Dockerfile.web
│
└── docs/
    ├── ARCHITECTURE.md
    └── FEATURES.md
```

## Documentação

- [Arquitetura do Sistema](docs/ARCHITECTURE.md)
- [Funcionalidades Detalhadas](docs/FEATURES.md)

## Configuração

### Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://chatblue:chatblue123@localhost:5432/chatblue"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="seu-segredo-jwt"
JWT_REFRESH_SECRET="seu-segredo-refresh"

# API
API_PORT=3001
FRONTEND_URL="http://localhost:3000"

# Notion (opcional)
NOTION_API_KEY=""
NOTION_DATABASE_ID=""

# AI (opcional)
OPENAI_API_KEY=""

# Meta WhatsApp (para API oficial)
META_APP_ID=""
META_APP_SECRET=""
META_WEBHOOK_VERIFY_TOKEN=""
```

## Licença

MIT
