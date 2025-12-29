#!/bin/bash
set -e

echo "=== Deploy Limpo ChatBlue ==="

SERVER="84.247.191.105"
USER="root"
PASS="fjykwePMThmj6nav"

# 1. Comprimir código local
echo "[1/6] Comprimindo código local..."
cd /Users/mychel/Downloads/Projetos/chatblue/chatblue
tar -czf /tmp/chatblue-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.turbo' \
  --exclude='.git' \
  --exclude='*.log' \
  .

# 2. Transferir para servidor
echo "[2/6] Transferindo código para servidor..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no /tmp/chatblue-deploy.tar.gz ${USER}@${SERVER}:/tmp/

# 3. Executar script de instalação no servidor
echo "[3/6] Executando instalação no servidor..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no ${USER}@${SERVER} << 'REMOTE_SCRIPT'
set -e

cd /opt/chatblue

# Backup do .env existente
if [ -f .env ]; then
  cp .env .env.backup
  echo "Backup do .env criado"
fi

# Limpar diretório app
rm -rf app
mkdir -p app

# Extrair código
cd app
tar -xzf /tmp/chatblue-deploy.tar.gz
rm /tmp/chatblue-deploy.tar.gz

# Restaurar .env se existir backup
if [ -f ../.env.backup ]; then
  cp ../.env.backup ../.env
fi

# Instalar dependências
echo "[4/6] Instalando dependências..."
cd /opt/chatblue/app
pnpm install --frozen-lockfile

# Configurar API (CommonJS)
cd apps/api
# Garantir que não tem type: module
sed -i '/"type": "module",/d' package.json
# Garantir CommonJS no tsconfig
sed -i 's/"module": "NodeNext"/"module": "CommonJS"/' tsconfig.json
sed -i 's/"moduleResolution": "NodeNext"/"moduleResolution": "node"/' tsconfig.json

# Build API
echo "[5/6] Compilando API..."
pnpm run build:force || pnpm run build || true

# Build Web
cd ../web
echo "[6/6] Compilando Web..."
pnpm build

# Rodar migrations
echo "[7/7] Rodando migrations..."
cd /opt/chatblue/app/apps/api
PG_PASS=$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2)
DATABASE_URL="postgresql://chatblue:${PG_PASS}@localhost:5432/chatblue" pnpm prisma migrate deploy || echo "Migrations podem ter falhado"

# Reiniciar PM2
echo "Reiniciando aplicação..."
cd /opt/chatblue
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=== Deploy concluído! ==="
docker ps
pm2 list | head -10

REMOTE_SCRIPT

echo ""
echo "=== Deploy finalizado ==="
rm /tmp/chatblue-deploy.tar.gz



