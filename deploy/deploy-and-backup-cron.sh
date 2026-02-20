#!/bin/bash
# =============================================================================
# Deploy ChatBlue + agendar cron de backup (mínimo de acessos ao servidor)
# Uso: ./deploy/deploy-and-backup-cron.sh
#      ou: DEPLOY_PASS=suasenha ./deploy/deploy-and-backup-cron.sh
# =============================================================================
set -e

SERVER="${DEPLOY_SERVER:-84.247.191.105}"
USER="${DEPLOY_USER:-root}"
# Use chave SSH ou export DEPLOY_PASS para senha (evite deixar no código)
LOCAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$LOCAL_REPO"

echo "=== Deploy ChatBlue + Cron de backup ==="
echo "Servidor: ${USER}@${SERVER}"
echo ""

# 1. Comprimir código (excluir node_modules, .next, etc.)
echo "[1/4] Comprimindo código..."
tar -czf /tmp/chatblue-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.turbo' \
  --exclude='.git' \
  --exclude='*.log' \
  .

# 2. Enviar para o servidor (uma conexão)
echo "[2/4] Enviando para o servidor..."
if [ -n "$DEPLOY_PASS" ]; then
  sshpass -p "$DEPLOY_PASS" scp -o StrictHostKeyChecking=no /tmp/chatblue-deploy.tar.gz "${USER}@${SERVER}:/tmp/"
else
  scp -o StrictHostKeyChecking=no /tmp/chatblue-deploy.tar.gz "${USER}@${SERVER}:/tmp/"
fi

# 3. Uma única sessão SSH: extrair, build, migrate, pm2, cron
echo "[3/4] Executando deploy e configurando cron no servidor..."
run_remote() {
  if [ -n "$DEPLOY_PASS" ]; then
    sshpass -p "$DEPLOY_PASS" ssh -o StrictHostKeyChecking=no "${USER}@${SERVER}" "$@"
  else
    ssh -o StrictHostKeyChecking=no "${USER}@${SERVER}" "$@"
  fi
}

run_remote 'bash -s' << 'REMOTE'
set -e
cd /opt/chatblue

# Preservar .env e dados
[ -f .env ] && cp .env .env.backup
[ -d app/apps/api/sessions ] && cp -r app/apps/api/sessions /tmp/cb-sessions-bak 2>/dev/null || true
[ -d app/apps/api/apps/api/sessions ] && cp -r app/apps/api/apps/api/sessions /tmp/cb-sessions-doubled-bak 2>/dev/null || true
[ -d app/apps/api/uploads ] && cp -r app/apps/api/uploads /tmp/cb-uploads-bak 2>/dev/null || true

rm -rf app && mkdir -p app && cd app && tar -xzf /tmp/chatblue-deploy.tar.gz && rm /tmp/chatblue-deploy.tar.gz
[ -f ../.env.backup ] && cp ../.env.backup ../.env
cp /opt/chatblue/.env /opt/chatblue/app/apps/api/.env 2>/dev/null || true
echo "NEXT_PUBLIC_API_URL=" > /opt/chatblue/app/apps/web/.env.local 2>/dev/null || true

# Restaurar sessões e uploads
[ -d /tmp/cb-sessions-bak ] && mkdir -p apps/api/sessions && cp -r /tmp/cb-sessions-bak/* apps/api/sessions/ 2>/dev/null || true; rm -rf /tmp/cb-sessions-bak
[ -d /tmp/cb-sessions-doubled-bak ] && mkdir -p apps/api/apps/api/sessions && cp -r /tmp/cb-sessions-doubled-bak/* apps/api/apps/api/sessions/ 2>/dev/null || true; rm -rf /tmp/cb-sessions-doubled-bak
[ -d /tmp/cb-uploads-bak ] && mkdir -p apps/api/uploads && cp -r /tmp/cb-uploads-bak/* apps/api/uploads/ 2>/dev/null || true; rm -rf /tmp/cb-uploads-bak

# Dependências
cd /opt/chatblue/app
pnpm install --frozen-lockfile

# API: CommonJS e Prisma
cd apps/api
sed -i '/"type": "module",/d' package.json 2>/dev/null || true
sed -i 's/"module": "NodeNext"/"module": "CommonJS"/' tsconfig.json 2>/dev/null || true
sed -i 's/"moduleResolution": "NodeNext"/"moduleResolution": "node"/' tsconfig.json 2>/dev/null || true
npx prisma generate
pnpm run build:force 2>/dev/null || pnpm run build || true

# Web
cd ../web
pnpm build

# Migrations
cd /opt/chatblue/app/apps/api
PG_PASS=$(grep POSTGRES_PASSWORD /opt/chatblue/.env 2>/dev/null | cut -d= -f2)
export DATABASE_URL="postgresql://chatblue:${PG_PASS}@localhost:5432/chatblue"
pnpm prisma migrate deploy || echo "Aviso: migrate deploy com falha ou já aplicado"

# PM2
cd /opt/chatblue
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Cron do backup: criar log dir e linha no crontab do root
mkdir -p /var/log/chatblue
CRON_LINE="0 3 * * * /opt/chatblue/app/deploy/backup.sh >> /var/log/chatblue/backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "deploy/backup.sh" || true; echo "$CRON_LINE") | crontab -
echo "Cron de backup agendado (diário às 3h)."

echo "=== Deploy e cron concluídos ==="
pm2 list
crontab -l
REMOTE

rm -f /tmp/chatblue-deploy.tar.gz
echo "[4/4] Concluído."
echo ""
echo "Backup agendado: todo dia às 3h em /opt/chatblue/backups (log em /var/log/chatblue/backup.log)"