#!/bin/bash
set -e

echo "=== Corrigindo Deploy ChatBlue ==="

cd /opt/chatblue

# 1. Corrigir docker-compose.yml
echo "[1/4] Corrigindo docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: chatblue_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-chatblue}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-chatblue}
    volumes:
      - /opt/chatblue/data/postgres:/var/lib/postgresql/data
    networks:
      - chatblue_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatblue"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: chatblue_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - /opt/chatblue/data/redis:/data
    networks:
      - chatblue_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  chatblue_network:
    driver: bridge
EOF

# 2. Reiniciar containers
echo "[2/4] Reiniciando containers..."
docker-compose down
docker-compose up -d
sleep 10

# 3. Rodar migrations
echo "[3/4] Rodando migrations..."
PG_PASS=$(grep POSTGRES_PASSWORD .env | cut -d= -f2)
cd /opt/chatblue/app/apps/api
DATABASE_URL="postgresql://chatblue:${PG_PASS}@localhost:5432/chatblue" pnpm prisma migrate deploy || echo "Migrations podem ter falhado, mas continuando..."

# 4. Reiniciar PM2
echo "[4/4] Reiniciando PM2..."
cd /opt/chatblue
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=== Correção concluída! ==="
docker ps
pm2 list | head -5







