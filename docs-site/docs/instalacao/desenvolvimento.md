---
sidebar_position: 2
title: Ambiente de Desenvolvimento
description: Como configurar o ChatBlue para desenvolvimento local
---

# Ambiente de Desenvolvimento

Este guia explica como configurar o ChatBlue para desenvolvimento local.

## Pre-requisitos

Certifique-se de ter instalado:

- Node.js 18+
- pnpm 8+
- Docker e Docker Compose (para PostgreSQL e Redis)
- Git

## Clonando o Repositorio

```bash
# Clone o repositorio
git clone https://github.com/seu-usuario/chatblue.git

# Entre no diretorio
cd chatblue
```

## Estrutura do Monorepo

O ChatBlue usa Turborepo com pnpm workspaces:

```
chatblue/
├── apps/
│   ├── api/          # Backend Express
│   └── web/          # Frontend Next.js
├── packages/         # Pacotes compartilhados (futuro)
├── docker/           # Configuracoes Docker
├── docs-site/        # Documentacao (Docusaurus)
├── turbo.json        # Configuracao Turborepo
├── pnpm-workspace.yaml
└── package.json
```

## Instalando Dependencias

```bash
# Instalar todas as dependencias
pnpm install
```

Este comando instala as dependencias de todos os workspaces (api e web).

## Configurando Variaveis de Ambiente

### Backend (API)

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configuracoes:

```env
# Database
DATABASE_URL="postgresql://chatblue:chatblue123@localhost:5432/chatblue"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="sua-chave-secreta-jwt-aqui"
JWT_REFRESH_SECRET="sua-chave-secreta-refresh-aqui"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
NODE_ENV="development"
API_PORT=3001
API_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
```

### Frontend (Web)

Crie o arquivo `apps/web/.env.local`:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Conteudo:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Iniciando Servicos com Docker

O Docker Compose configura PostgreSQL e Redis:

```bash
# Iniciar servicos em background
docker compose up -d

# Verificar status
docker compose ps
```

Servicos disponiveis:
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Configurando o Banco de Dados

### Executar Migrations

```bash
# Gerar o cliente Prisma
pnpm --filter api prisma generate

# Executar migrations
pnpm --filter api prisma migrate dev
```

### Seed do Banco

Popula o banco com dados iniciais:

```bash
pnpm --filter api prisma db seed
```

Dados criados:
- Empresa: "Demo Company"
- Usuario Admin: admin@chatblue.com / 123456
- Departamentos de exemplo
- Configuracoes padrao

### Prisma Studio

Para visualizar e editar dados:

```bash
pnpm --filter api prisma studio
```

Acesse em: http://localhost:5555

## Iniciando o Desenvolvimento

### Todos os Servicos

```bash
# Inicia API e Web em paralelo
pnpm dev
```

### Apenas Backend

```bash
pnpm --filter api dev
```

### Apenas Frontend

```bash
pnpm --filter web dev
```

## URLs de Acesso

| Servico | URL | Descricao |
|---------|-----|-----------|
| Frontend | http://localhost:3000 | Interface do usuario |
| API | http://localhost:3001 | Backend REST |
| Prisma Studio | http://localhost:5555 | Admin do banco |

## Credenciais de Acesso

```
Email: admin@chatblue.com
Senha: 123456
```

## Comandos Uteis

### Linting

```bash
# Lint em todo o projeto
pnpm lint

# Lint apenas no backend
pnpm --filter api lint

# Lint apenas no frontend
pnpm --filter web lint
```

### Testes

```bash
# Executar todos os testes
pnpm test

# Testes do backend
pnpm --filter api test

# Testes com coverage
pnpm --filter api test:coverage
```

### Build

```bash
# Build de producao
pnpm build

# Build apenas do backend
pnpm --filter api build

# Build apenas do frontend
pnpm --filter web build
```

### Prisma

```bash
# Gerar cliente apos mudancas no schema
pnpm --filter api prisma generate

# Criar nova migration
pnpm --filter api prisma migrate dev --name nome_da_migration

# Reset do banco (CUIDADO!)
pnpm --filter api prisma migrate reset

# Ver status das migrations
pnpm --filter api prisma migrate status
```

## Estrutura de Pastas Detalhada

### Backend (apps/api)

```
apps/api/
├── src/
│   ├── config/         # Configuracoes (db, redis, logger)
│   ├── middlewares/    # Middlewares Express
│   ├── routes/         # Rotas da API
│   ├── services/       # Logica de negocio
│   ├── sockets/        # Handlers Socket.io
│   ├── jobs/           # Processadores BullMQ
│   ├── utils/          # Utilitarios
│   └── server.ts       # Entry point
├── prisma/
│   ├── schema.prisma   # Schema do banco
│   └── seed.ts         # Script de seed
└── package.json
```

### Frontend (apps/web)

```
apps/web/
├── app/
│   ├── (auth)/         # Paginas de autenticacao
│   ├── (dashboard)/    # Paginas protegidas
│   ├── layout.tsx      # Layout raiz
│   └── providers.tsx   # Providers React
├── components/
│   ├── chat/           # Componentes do chat
│   ├── ui/             # Componentes Shadcn/UI
│   └── layout/         # Componentes de layout
├── stores/             # Stores Zustand
├── lib/                # Utilitarios
└── package.json
```

## Hot Reload

O desenvolvimento inclui hot reload automatico:

- **Backend**: Reinicia automaticamente ao salvar arquivos TypeScript
- **Frontend**: Fast Refresh do Next.js para atualizacao instantanea

## Debug

### Backend (VS Code)

Adicione ao `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "api", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Frontend (React DevTools)

Instale a extensao React DevTools no navegador para debug do frontend.

## Problemas Comuns

### Erro de conexao com PostgreSQL

```bash
# Verifique se o container esta rodando
docker compose ps

# Reinicie se necessario
docker compose restart postgres
```

### Erro de conexao com Redis

```bash
# Verifique se o container esta rodando
docker compose ps

# Reinicie se necessario
docker compose restart redis
```

### Erro no Prisma Client

```bash
# Regenere o cliente
pnpm --filter api prisma generate
```

### Porta ja em uso

```bash
# Encontre o processo na porta 3000
lsof -i :3000

# Mate o processo
kill -9 <PID>
```

## Proximos Passos

- [Configuracao com Docker](/instalacao/docker)
- [Variaveis de Ambiente](/instalacao/variaveis-ambiente)
- [Arquitetura do Sistema](/arquitetura/visao-geral)
