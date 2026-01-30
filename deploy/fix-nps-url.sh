#!/bin/bash
# Script para executar no servidor para corrigir o problema do NPS URL
# Execute: ssh root@84.247.191.105 'bash -s' < deploy/fix-nps-url.sh

set -e

echo "=== Corrigindo URL do NPS ==="
echo ""

cd /opt/chatblue/app

echo "1. Atualizando código do Git..."
git pull origin main

echo ""
echo "2. Recompilando API..."
cd apps/api
pnpm run build

echo ""
echo "3. Verificando se o código foi atualizado..."
if grep -q "baseUrl.includes('localhost')" dist/services/nps/nps.service.js; then
    echo "✅ Código atualizado encontrado!"
else
    echo "⚠️  Código não encontrado - pode precisar verificar"
fi

echo ""
echo "4. Reiniciando API com --update-env..."
cd /opt/chatblue
pm2 restart chatblue-api --update-env

echo ""
echo "5. Aguardando inicialização..."
sleep 5

echo ""
echo "6. Status do serviço:"
pm2 status | grep chatblue-api

echo ""
echo "7. Verificando logs recentes..."
pm2 logs chatblue-api --lines 5 --nostream | tail -5

echo ""
echo "=== Correção concluída! ==="
echo ""
echo "Agora os links do NPS devem usar: https://chat.grupoblue.com.br/nps/[token]"


