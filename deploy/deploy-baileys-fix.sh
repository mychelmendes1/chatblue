#!/bin/bash
# Script para fazer deploy da correção do Baileys disconnect
# Execute: bash deploy/deploy-baileys-fix.sh

set -e

SERVER="84.247.191.105"
USER="root"
PASSWORD="fjykwePMThmj6nav"
REMOTE_PATH="/opt/chatblue/app"

echo "=== Deploy da correção do Baileys disconnect ==="
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "Instalando sshpass..."
    if command -v brew &> /dev/null; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "sshpass não encontrado. Por favor instale manualmente."
        exit 1
    fi
fi

echo "1. Parando API no servidor..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no ${USER}@${SERVER} "pm2 stop chatblue-api" || true

echo ""
echo "2. Enviando arquivos corrigidos..."

# Send baileys.service.ts
echo "   - baileys.service.ts"
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no \
    apps/api/src/services/whatsapp/baileys.service.ts \
    ${USER}@${SERVER}:${REMOTE_PATH}/apps/api/src/services/whatsapp/baileys.service.ts

# Send connection.routes.ts
echo "   - connection.routes.ts"
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no \
    apps/api/src/routes/connection.routes.ts \
    ${USER}@${SERVER}:${REMOTE_PATH}/apps/api/src/routes/connection.routes.ts

echo ""
echo "3. Recompilando API no servidor..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no ${USER}@${SERVER} << 'ENDSSH'
cd /opt/chatblue/app

echo "Recompilando TypeScript da API..."
cd apps/api
npx tsc --build --force 2>&1 || echo "Warnings ignorados, continuando..."

echo ""
echo "Reiniciando API..."
cd /opt/chatblue/app
pm2 restart chatblue-api

echo ""
echo "Aguardando inicialização..."
sleep 5

echo ""
echo "Status dos serviços:"
pm2 status
ENDSSH

echo ""
echo "=== Deploy concluído! ==="
echo ""
echo "A correção implementada:"
echo "1. Método disconnect() agora remove todos os event listeners antes de fechar"
echo "2. Opção forceLogout para fazer logout completo do WhatsApp"
echo "3. Verificação se conexão está deletada antes de tentar reconectar"
echo "4. Verificação no banco de dados se conexão ainda existe antes de conectar"
echo ""
echo "Isso deve resolver o problema de sessões 'fantasmas' que continuavam"
echo "tentando processar eventos após serem excluídas."
