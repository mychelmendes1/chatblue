#!/bin/bash
# =============================================================================
# ChatBlue Deploy Script
# Execute: bash deploy.sh
# =============================================================================

set -e

APP_DIR="/opt/chatblue/app"
BACKUP_DIR="/opt/chatblue/backups"
LOG_FILE="/opt/chatblue/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar se está no diretório correto
if [ ! -d "$APP_DIR" ]; then
    error "Diretório $APP_DIR não encontrado!"
fi

cd "$APP_DIR"

echo ""
echo "=========================================="
echo "       ChatBlue Deploy"
echo "=========================================="
echo ""

# 1. Criar backup do banco
log "Criando backup do banco de dados..."
BACKUP_FILE="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql"
docker exec chatblue_postgres pg_dump -U chatblue chatblue > "$BACKUP_FILE" 2>/dev/null || warn "Não foi possível criar backup do banco"
if [ -f "$BACKUP_FILE" ]; then
    gzip "$BACKUP_FILE"
    log "Backup salvo em: ${BACKUP_FILE}.gz"
fi

# 2. Pull das mudanças
log "Baixando atualizações do Git..."
git fetch origin
git pull origin main

# 3. Instalar dependências
log "Instalando dependências..."
pnpm install --frozen-lockfile

# 4. Rodar migrations
log "Executando migrations do Prisma..."
cd apps/api
pnpm prisma migrate deploy
pnpm prisma generate
cd ../..

# 5. Build da aplicação
log "Fazendo build da aplicação..."
pnpm build

# 6. Reiniciar PM2
log "Reiniciando serviços..."
pm2 reload ecosystem.config.js --update-env

# 7. Verificar saúde
log "Verificando saúde dos serviços..."
sleep 5

API_HEALTH=$(curl -s http://localhost:3001/health || echo "ERROR")
if [[ "$API_HEALTH" == *"ok"* ]]; then
    log "✅ API está rodando"
else
    error "❌ API não está respondendo!"
fi

WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$WEB_HEALTH" == "200" ]; then
    log "✅ Web está rodando"
else
    error "❌ Web não está respondendo!"
fi

# 8. Limpeza de backups antigos (manter últimos 7 dias)
log "Limpando backups antigos..."
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete 2>/dev/null || true

echo ""
echo "=========================================="
echo "       Deploy Concluído!"
echo "=========================================="
echo ""
log "Deploy finalizado com sucesso!"
pm2 status







