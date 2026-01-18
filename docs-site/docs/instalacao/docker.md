---
sidebar_position: 3
title: Configuracao Docker
description: Como executar o ChatBlue usando Docker
---

# Configuracao Docker

O ChatBlue oferece suporte completo a Docker para desenvolvimento e producao.

## Arquivos Docker

```
chatblue/
├── docker/
│   ├── docker-compose.yml      # Desenvolvimento
│   ├── docker-compose.prod.yml # Producao
│   ├── Dockerfile.api          # Container da API
│   └── Dockerfile.web          # Container do Frontend
└── docker-compose.yml          # Link para docker/
```

## Desenvolvimento com Docker

### Docker Compose (Desenvolvimento)

O arquivo `docker-compose.yml` configura apenas PostgreSQL e Redis:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: chatblue-postgres
    environment:
      POSTGRES_USER: chatblue
      POSTGRES_PASSWORD: chatblue123
      POSTGRES_DB: chatblue
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatblue"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: chatblue-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Comandos de Desenvolvimento

```bash
# Iniciar servicos
docker compose up -d

# Ver logs
docker compose logs -f

# Ver logs de um servico especifico
docker compose logs -f postgres

# Parar servicos
docker compose down

# Parar e remover volumes (CUIDADO: perde dados!)
docker compose down -v

# Reiniciar um servico
docker compose restart postgres

# Ver status dos containers
docker compose ps

# Acessar shell do PostgreSQL
docker compose exec postgres psql -U chatblue -d chatblue

# Acessar shell do Redis
docker compose exec redis redis-cli
```

## Producao com Docker

### Docker Compose (Producao)

O arquivo `docker-compose.prod.yml` inclui todos os servicos:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: chatblue-postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-chatblue}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-chatblue}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-chatblue}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - chatblue-network

  redis:
    image: redis:7-alpine
    container_name: chatblue-redis
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - chatblue-network

  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    container_name: chatblue-api
    restart: always
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - chatblue-network

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    container_name: chatblue-web
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001
    depends_on:
      - api
    networks:
      - chatblue-network

networks:
  chatblue-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### Dockerfile da API

```dockerfile
# docker/Dockerfile.api
FROM node:20-alpine AS base

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar arquivos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Instalar dependencias
RUN pnpm install --frozen-lockfile --filter api

# Copiar codigo fonte
COPY apps/api ./apps/api

# Gerar Prisma Client
RUN pnpm --filter api prisma generate

# Build
RUN pnpm --filter api build

# Producao
FROM node:20-alpine AS runner

WORKDIR /app

# Copiar arquivos necessarios
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/prisma ./prisma
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### Dockerfile do Frontend

```dockerfile
# docker/Dockerfile.web
FROM node:20-alpine AS base

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar arquivos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Instalar dependencias
RUN pnpm install --frozen-lockfile --filter web

# Copiar codigo fonte
COPY apps/web ./apps/web

# Build
RUN pnpm --filter web build

# Producao
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar arquivos do build
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
```

## Comandos de Producao

```bash
# Build das imagens
docker compose -f docker/docker-compose.prod.yml build

# Iniciar em producao
docker compose -f docker/docker-compose.prod.yml up -d

# Ver logs
docker compose -f docker/docker-compose.prod.yml logs -f

# Parar
docker compose -f docker/docker-compose.prod.yml down

# Atualizar (rebuild e restart)
docker compose -f docker/docker-compose.prod.yml up -d --build

# Executar migrations em producao
docker compose -f docker/docker-compose.prod.yml exec api npx prisma migrate deploy
```

## Variaveis de Ambiente para Docker

Crie um arquivo `.env` para producao:

```env
# Banco de dados
DB_USER=chatblue
DB_PASSWORD=sua-senha-segura
DB_NAME=chatblue

# JWT
JWT_SECRET=sua-chave-jwt-segura-32-caracteres
JWT_REFRESH_SECRET=sua-chave-refresh-segura

# Outras configuracoes...
```

## Docker em Diferentes Ambientes

### Desenvolvimento Local

```bash
# Apenas PostgreSQL e Redis
docker compose up -d
```

### Staging

```bash
# Todos os servicos
docker compose -f docker/docker-compose.prod.yml up -d
```

### Producao

```bash
# Com variaveis de ambiente de producao
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d
```

## Health Checks

Os containers incluem health checks para monitoramento:

```bash
# Ver status de saude
docker compose ps

# Detalhes de saude
docker inspect --format='{{json .State.Health}}' chatblue-postgres
```

## Volumes e Persistencia

### Volumes de Dados

- `postgres_data`: Dados do PostgreSQL
- `redis_data`: Dados do Redis (persistencia AOF)

### Backup de Volumes

```bash
# Backup do PostgreSQL
docker compose exec postgres pg_dump -U chatblue chatblue > backup.sql

# Restore
docker compose exec -T postgres psql -U chatblue chatblue < backup.sql
```

## Rede Docker

O Docker Compose cria uma rede interna para comunicacao entre containers:

```bash
# Ver redes
docker network ls

# Inspecionar rede
docker network inspect chatblue-network
```

## Logs e Monitoramento

### Ver Logs

```bash
# Todos os servicos
docker compose logs -f

# Servico especifico
docker compose logs -f api

# Ultimas 100 linhas
docker compose logs --tail=100 api

# Com timestamps
docker compose logs -f -t api
```

### Metricas de Container

```bash
# Uso de recursos
docker stats

# Uso de disco
docker system df
```

## Limpeza

```bash
# Remover containers parados
docker container prune

# Remover imagens nao utilizadas
docker image prune

# Remover volumes nao utilizados (CUIDADO!)
docker volume prune

# Limpeza completa (CUIDADO!)
docker system prune -a
```

## Troubleshooting

### Container nao inicia

```bash
# Ver logs de erro
docker compose logs api

# Verificar configuracao
docker compose config
```

### Erro de memoria

```bash
# Aumentar limites no docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G
```

### Erro de permissao de volume

```bash
# Ajustar permissoes
sudo chown -R 1000:1000 ./data
```

## Proximos Passos

- [Variaveis de Ambiente](/instalacao/variaveis-ambiente)
- [Deploy em Producao](/deploy/producao)
- [Monitoramento](/deploy/monitoramento)
