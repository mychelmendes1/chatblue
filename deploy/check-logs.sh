#!/bin/bash
# Script para verificar logs do servidor ChatBlue
# Execute: bash deploy/check-logs.sh

echo "=========================================="
echo "   Verificando Logs do ChatBlue"
echo "=========================================="
echo ""

# Verificar logs do PM2
echo "📋 Últimas 50 linhas dos logs da API:"
echo "----------------------------------------"
pm2 logs chatblue-api --lines 50 --nostream | tail -50

echo ""
echo "📋 Últimas 50 linhas dos logs do Web:"
echo "----------------------------------------"
pm2 logs chatblue-web --lines 50 --nostream | tail -50

echo ""
echo "📋 Logs de erro da API:"
echo "----------------------------------------"
tail -50 /opt/chatblue/logs/api-error.log 2>/dev/null || echo "Arquivo de log não encontrado"

echo ""
echo "📋 Logs de saída da API:"
echo "----------------------------------------"
tail -50 /opt/chatblue/logs/api-out.log 2>/dev/null || echo "Arquivo de log não encontrado"

echo ""
echo "=========================================="
echo "   Verificando Status dos Serviços"
echo "=========================================="
pm2 status

echo ""
echo "=========================================="
echo "   Verificando Banco de Dados"
echo "=========================================="
echo "Conectando ao banco para verificar usuários..."
docker exec chatblue_postgres psql -U chatblue -d chatblue -c "SELECT id, email, name, \"is_active\", \"company_id\", created_at FROM users ORDER BY created_at DESC LIMIT 10;" 2>/dev/null || echo "Erro ao conectar ao banco de dados"

