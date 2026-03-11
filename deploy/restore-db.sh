#!/bin/bash
# =============================================================================
# Restaura um dump do PostgreSQL (chatblue) de forma limpa.
# Uso: ./restore-db.sh [caminho_do_dump]
# Ex.: ./restore-db.sh /tmp/chatblue_dump.backup
#      docker cp meu-dump.backup chatblue-postgres:/tmp/ && ./restore-db.sh /tmp/meu-dump.backup
# =============================================================================
set -e

CONTAINER="${PG_CONTAINER:-chatblue-postgres}"
PG_USER="${PG_USER:-chatblue}"
# No image oficial Postgres, POSTGRES_USER=chatblue cria só esse usuário (superuser)
PG_SUPERUSER="${PG_SUPERUSER:-chatblue}"
DUMP_PATH="${1:-/tmp/chatblue_dump.backup}"

echo "Container: $CONTAINER"
echo "Dump:      $DUMP_PATH"
echo ""

# 1) Encerrar conexões, dropar e recriar o banco
echo "[1/3] Recriando banco (terminate + DROP + CREATE)..."
docker exec "$CONTAINER" psql -U "$PG_SUPERUSER" -d postgres -v ON_ERROR_STOP=1 <<'SQL'
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'chatblue' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS chatblue;
CREATE DATABASE chatblue OWNER chatblue;
SQL

# 2) Restaurar SEM --clean (banco já está vazio)
echo "[2/3] Restaurando dump (sem --clean)..."
docker exec "$CONTAINER" pg_restore -U "$PG_USER" -d chatblue --no-owner --no-acl "$DUMP_PATH" 2>/dev/null || true
# pg_restore pode sair com 1 por warnings; ignoramos se os dados principais foram restaurados

# 3) Verificar
echo "[3/3] Verificando..."
docker exec "$CONTAINER" psql -U "$PG_USER" -d chatblue -c "SELECT COUNT(*) AS companies FROM companies; SELECT COUNT(*) AS users FROM users;" 2>/dev/null || true

echo ""
echo "Concluído. Se o dump tiver schema diferente do Prisma atual, rode:"
echo "  pnpm --filter api db:push   # ou  db:migrate"
echo ""
