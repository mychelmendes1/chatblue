---
sidebar_position: 1
slug: /
title: Introducao
description: Bem-vindo a documentacao completa do ChatBlue
---

# ChatBlue

Bem-vindo a documentacao oficial do **ChatBlue** - uma plataforma multi-tenant completa para atendimento ao cliente via WhatsApp.

## O que e o ChatBlue?

O ChatBlue e uma solucao empresarial de atendimento ao cliente que integra o WhatsApp com recursos avancados de:

- **Multi-tenancy**: Suporte a multiplas empresas com isolamento completo de dados
- **Inteligencia Artificial**: Atendimento automatizado com OpenAI e Anthropic
- **Gestao de Tickets**: Sistema completo de gerenciamento de conversas
- **SLA e Metricas**: Monitoramento de performance e acordos de nivel de servico
- **Departamentos**: Hierarquia organizacional com transferencias inteligentes
- **Integracao Notion**: Sincronizacao de dados de clientes

## Stack Tecnologico

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **ORM**: Prisma
- **Banco de Dados**: PostgreSQL
- **Cache/Filas**: Redis + BullMQ
- **Real-time**: Socket.io

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Linguagem**: TypeScript
- **Estado**: Zustand
- **Estilizacao**: Tailwind CSS + Shadcn/UI
- **Data Fetching**: TanStack Query

### Integracoes
- **WhatsApp**: Baileys (nao-oficial) + Meta Cloud API (oficial)
- **IA**: OpenAI (GPT-4) + Anthropic (Claude)
- **CRM**: Notion API
- **Transcricao**: Whisper API

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    Next.js + React                           │
│                   (Port 3000)                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│              Express + Socket.io + BullMQ                    │
│                   (Port 3001)                                │
├─────────────────────┬───────────────────────────────────────┤
│                     │                                        │
│    ┌────────────────┼────────────────┐                      │
│    ▼                ▼                ▼                      │
│ PostgreSQL       Redis          WhatsApp                    │
│  (Prisma)     (Cache/Jobs)    (Baileys/Meta)               │
└─────────────────────────────────────────────────────────────┘
```

## Funcionalidades Principais

### 1. Conexao WhatsApp
- Suporte a Baileys (conexao via QR Code)
- Suporte a Meta Cloud API (API oficial)
- Reconexao automatica
- Health check continuo

### 2. Gestao de Tickets
- Criacao automatica de tickets
- Atribuicao a agentes e departamentos
- Transferencias com historico
- Sistema de prioridades
- Avaliacao de atendimento

### 3. Chat em Tempo Real
- Interface similar ao WhatsApp
- Suporte a texto, imagens, audio, video e documentos
- Indicadores de digitacao
- Status de mensagem (enviado, entregue, lido)
- Reacoes com emoji

### 4. Inteligencia Artificial
- Atendimento automatico 24/7
- Configuracao de personalidade
- Transcricao de audios
- Transferencia inteligente para humanos
- Contexto baseado em historico

### 5. SLA e Metricas
- Tempo de primeira resposta
- Tempo de resolucao
- Horario comercial configuravel
- Alertas de SLA
- Dashboard de performance

### 6. Multi-tenancy
- Isolamento completo por empresa
- Planos: BASIC, PRO, ENTERPRISE
- Usuarios com acesso a multiplas empresas
- Configuracoes independentes

## Inicio Rapido

### Requisitos
- Node.js 18+
- pnpm 8+
- Docker e Docker Compose
- PostgreSQL 12+ (ou via Docker)
- Redis 6+ (ou via Docker)

### Instalacao

```bash
# Clone o repositorio
git clone https://github.com/seu-usuario/chatblue.git
cd chatblue

# Instale as dependencias
pnpm install

# Configure as variaveis de ambiente
cp .env.example .env

# Inicie os servicos com Docker
docker compose up -d

# Execute as migrations
pnpm --filter api prisma migrate dev

# Seed do banco de dados
pnpm --filter api prisma db seed

# Inicie o desenvolvimento
pnpm dev
```

### Acessos
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs

### Credenciais de Demo
```
Email: admin@chatblue.com
Senha: 123456
```

## Navegacao da Documentacao

- **[Instalacao](/instalacao/requisitos)**: Requisitos e configuracao do ambiente
- **[Arquitetura](/arquitetura/visao-geral)**: Entenda como o sistema funciona
- **[Backend](/backend/visao-geral)**: API, services e banco de dados
- **[Frontend](/frontend/visao-geral)**: Componentes e paginas
- **[Funcionalidades](/funcionalidades/chat)**: Detalhes de cada funcionalidade
- **[API](/api/introducao)**: Referencia completa da API REST
- **[Guias](/guias/introducao)**: Tutoriais passo a passo
- **[Deploy](/deploy/producao)**: Implantacao em producao
- **[Troubleshooting](/troubleshooting/problemas-comuns)**: Resolucao de problemas

## Suporte

- **GitHub Issues**: Para reportar bugs e solicitar funcionalidades
- **Documentacao**: Esta wiki para consulta
- **Email**: suporte@chatblue.com.br

## Licenca

Este projeto e proprietario. Todos os direitos reservados.
