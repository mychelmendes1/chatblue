#!/bin/bash
# Script para corrigir problemas do deploy

set -e

echo "Corrigindo docker-compose.yml..."
cd /opt/chatblue

# Adicionar portas ao postgres e redis
sed -i '/postgres:/a\    ports:\n      - "5432:5432"' docker-compose.yml
sed -i '/redis:/a\    ports:\n      - "6379:6379"' docker-compose.yml

# Reiniciar containers
docker-compose down
docker-compose up -d
sleep 5

# Corrigir .env na pasta api
PG_PASS=$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2)
cd /opt/chatblue/app/apps/api
sed -i "s|chatblue123|$PG_PASS|g" .env

# Rodar migrations
cd /opt/chatblue/app/apps/api
DATABASE_URL="postgresql://chatblue:${PG_PASS}@localhost:5432/chatblue" pnpm prisma migrate deploy

echo "Correções aplicadas!"







