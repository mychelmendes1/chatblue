#!/bin/bash
# =============================================================================
# Garante banco com dados: restaura dump (se existir no container) ou aplica
# schema + seed. Rode com Docker (postgres) já up.
# =============================================================================
set -e

cd "$(dirname "$0")/.."
CONTAINER="${PG_CONTAINER:-chatblue-postgres}"
DUMP_IN_CONTAINER="/tmp/chatblue_dump.backup"

echo "ChatBlue - Banco com dados"
echo ""

# 1) Restaurar dump se existir no container
if docker exec "$CONTAINER" test -f "$DUMP_IN_CONTAINER" 2>/dev/null; then
  echo "[1/3] Dump encontrado no container. Restaurando..."
  bash deploy/restore-db.sh "$DUMP_IN_CONTAINER"
  echo ""
  echo "[2/3] Ajustando schema (Prisma db push)..."
  (cd apps/api && npx prisma db push --accept-data-loss 2>/dev/null) || true
  # Remover constraint que atrapalha, se existir
  docker exec "$CONTAINER" psql -U chatblue -d chatblue -v ON_ERROR_STOP=0 -c "
    ALTER TABLE IF EXISTS ai_query_sources DROP CONSTRAINT IF EXISTS ai_query_sources_query_id_document_id_key;
  " 2>/dev/null || true
  (cd apps/api && npx prisma db push --accept-data-loss 2>/dev/null) || true
  (cd apps/api && npx prisma generate 2>/dev/null) || true
  echo ""
  echo "[3/3] Pronto. Dados do dump restaurados."
else
  echo "[1/3] Nenhum dump em $DUMP_IN_CONTAINER. Aplicando schema e seed..."
  (cd apps/api && npx prisma db push --force-reset --accept-data-loss)
  echo ""
  echo "[2/3] Populando com seed (admin@chatblue.com / admin123)..."
  pnpm --filter api db:seed
  echo ""
  echo "[3/3] Pronto. Use admin@chatblue.com / admin123 para login."
fi

echo ""
echo "Reinicie a API (pnpm --filter api dev) e acesse o app."
echo ""
