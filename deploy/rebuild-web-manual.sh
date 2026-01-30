#!/bin/bash
# Script para executar manualmente no servidor quando SSH estiver disponível
# Execute: ssh root@84.247.191.105 'bash -s' < deploy/rebuild-web-manual.sh

set -e

echo "=== Rebuild completo do frontend Web ==="
echo ""

cd /opt/chatblue/app

echo "1. Atualizando código do Git..."
git pull origin main

echo ""
echo "2. Limpando cache do Next.js..."
cd apps/web
rm -rf .next node_modules/.cache 2>/dev/null || true

echo ""
echo "3. Instalando dependências..."
pnpm install

echo ""
echo "4. Compilando frontend..."
pnpm run build

echo ""
echo "5. Verificando build..."
if [ -f .next/BUILD_ID ]; then
    echo "✅ Build concluído com sucesso!"
    BUILD_ID=$(cat .next/BUILD_ID)
    echo "   Build ID: $BUILD_ID"
else
    echo "❌ Build falhou!"
    exit 1
fi

echo ""
echo "6. Reiniciando serviço Web..."
cd /opt/chatblue
pm2 restart chatblue-web --update-env

echo ""
echo "7. Aguardando inicialização..."
sleep 5

echo ""
echo "8. Status dos serviços:"
pm2 status | grep -E "(chatblue-api|chatblue-web)"

echo ""
echo "9. Testando frontend..."
if curl -s http://localhost:3000/nps/test-token | grep -q "Carregando pesquisa"; then
    echo "✅ Frontend respondendo corretamente!"
else
    echo "⚠️  Frontend pode ter problemas - verifique os logs"
fi

echo ""
echo "=== Rebuild concluído! ==="
echo ""
echo "Para verificar logs:"
echo "  pm2 logs chatblue-web --lines 50"



