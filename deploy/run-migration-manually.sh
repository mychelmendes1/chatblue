#!/bin/bash
# Script para executar migration no servidor
# Execute este script quando o servidor estiver acessível

echo "=== Aplicando Migration Knowledge Contexts ==="
echo "Esta migration APENAS CRIA novas tabelas, NÃO modifica dados existentes"
echo ""

cd /opt/chatblue/app/apps/api || exit 1

echo "=== 1. Movendo arquivo corrigido ==="
cp /tmp/context-builder.service.ts src/services/ai/ 2>/dev/null || echo "Arquivo não encontrado em /tmp, pulando..."

echo "=== 2. Fazendo build da API ==="
pnpm build:force 2>&1 | tail -10

echo ""
echo "=== 3. Executando migration (só cria novas tabelas) ==="
pnpm prisma migrate deploy 2>&1

echo ""
echo "=== 4. Verificando tabelas criadas ==="
PGPASSWORD=$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2) \
  psql -U chatblue -h localhost -d chatblue -c "\dt knowledge*" 2>&1 | head -10

echo ""
echo "=== 5. Reiniciando API ==="
pm2 restart chatblue-api --update-env

sleep 3

pm2 status

echo ""
echo "=== Migration concluída! ==="




