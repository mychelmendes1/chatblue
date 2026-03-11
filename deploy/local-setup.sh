#!/bin/bash
# =============================================================================
# ChatBlue - Setup Local Completo
# Sobe Postgres + Redis, aplica schema, seed, e deixa pronto para pnpm dev
# =============================================================================
set -e

cd "$(dirname "$0")/.."
echo "ChatBlue - Setup local"
echo ""

# 1) Subir Postgres e Redis
echo "[1/4] Subindo Postgres e Redis (Docker)..."
docker compose -f docker/docker-compose.yml up -d postgres redis 2>/dev/null || \
  docker-compose -f docker/docker-compose.yml up -d postgres redis

echo "Aguardando serviços..."
sleep 5

# 2) Aplicar schema Prisma (--force-reset limpa schema conflitante do dump anterior)
echo ""
echo "[2/4] Aplicando schema do banco (Prisma db push)..."
(cd apps/api && npx prisma db push --force-reset --accept-data-loss)

# 3) Seed
echo ""
echo "[3/4] Populando banco (seed)..."
pnpm --filter api db:seed

# 4) Env
echo ""
echo "[4/4] Verificando .env..."
for f in .env apps/api/.env apps/web/.env.local; do
  if [ -f "$f" ]; then echo "  OK $f"; else echo "  FALTA $f"; fi
done

echo ""
echo "=========================================="
echo "  Setup concluído!"
echo "=========================================="
echo ""
echo "Para iniciar API + Web:"
echo "  pnpm dev"
echo ""
echo "URLs:"
echo "  Web:  http://localhost:3000"
echo "  API:  http://localhost:3001"
echo ""
echo "Login: admin@chatblue.com / admin123"
echo ""
