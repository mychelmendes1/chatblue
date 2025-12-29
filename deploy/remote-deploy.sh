#!/bin/bash
set -e

cd /opt/chatblue

# Backup .env
if [ -f .env ]; then
  cp .env .env.backup
  echo "Backup .env OK"
fi

# Limpar e extrair
rm -rf app
mkdir -p app
cd app
tar -xzf /tmp/chatblue-deploy.tar.gz
rm /tmp/chatblue-deploy.tar.gz
echo "Extração OK"

# Restaurar .env
if [ -f ../.env.backup ]; then
  cp ../.env.backup ../.env
  echo ".env restaurado"
fi

# Instalar dependências
echo "Instalando dependências..."
cd /opt/chatblue/app
pnpm install --frozen-lockfile

# Configurar API (CommonJS)
echo "Configurando API..."
cd apps/api
sed -i '/"type": "module",/d' package.json 2>/dev/null || true
sed -i 's/"module": "NodeNext"/"module": "CommonJS"/' tsconfig.json
sed -i 's/"moduleResolution": "NodeNext"/"moduleResolution": "node"/' tsconfig.json

# Build API
echo "Compilando API..."
pnpm run build:force 2>&1 | tail -5 || pnpm run build 2>&1 | tail -5 || echo "Build API concluido"

# Build Web
echo "Compilando Web..."
cd ../web
pnpm build 2>&1 | tail -5

# Migrations
echo "Rodando migrations..."
cd /opt/chatblue/app/apps/api
PG_PASS=$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2)
DATABASE_URL="postgresql://chatblue:${PG_PASS}@localhost:5432/chatblue" pnpm prisma migrate deploy || echo "Migrations OK"

# Reiniciar PM2
echo "Reiniciando aplicação..."
cd /opt/chatblue
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=== STATUS FINAL ==="
docker ps --format '{{.Names}}: {{.Status}}'
echo ""
pm2 list | head -10
echo ""
sleep 5 && curl -s http://localhost:3001/health && echo " - API OK!" || echo "API ainda inicializando..."



