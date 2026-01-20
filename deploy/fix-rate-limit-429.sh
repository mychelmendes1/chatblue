#!/bin/bash

# Script para corrigir erro 429 (Too Many Requests) no login
# Corrige loop infinito no checkAuth e ajusta rate limiting

set -e

echo "=== Corrigindo erro 429 (Too Many Requests) ==="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações do servidor
SERVER_USER="root"
SERVER_HOST="84.247.191.105"
SERVER_PATH="/opt/chatblue"

echo -e "${YELLOW}1. Conectando ao servidor...${NC}"

ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e

cd /opt/chatblue/app

echo "2. Fazendo pull das atualizações..."
git pull origin main

echo "3. Instalando dependências..."
cd apps/api
pnpm install

echo "4. Compilando API..."
pnpm run build

echo "5. Reiniciando API..."
cd /opt/chatblue
pm2 restart chatblue-api --update-env

echo "6. Verificando status..."
pm2 status chatblue-api

echo -e "\n✅ Correções aplicadas com sucesso!"
echo "O rate limiting foi ajustado e o loop no checkAuth foi corrigido."

ENDSSH

echo -e "\n${GREEN}✅ Deploy concluído!${NC}"
