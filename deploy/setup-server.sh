#!/bin/bash
# =============================================================================
# ChatBlue - Script de Setup do Servidor
# =============================================================================
# Execute este script UMA VEZ no servidor para configurar:
#   1. Chave SSH para GitHub Actions (deploy automático)
#   2. Script de backup com agendamento via cron
#   3. Estrutura de diretórios organizada
#   4. Segurança básica (nova senha SSH, fail2ban)
#
# Como executar:
#   curl -sL https://raw.githubusercontent.com/mychelmendes1/chatblue/main/deploy/setup-server.sh | bash
#   OU
#   bash setup-server.sh
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=========================================="
echo "  ChatBlue - Setup do Servidor"
echo -e "==========================================${NC}"
echo ""

# ---------------------------------------------------------------------------
# 1. Verificações iniciais
# ---------------------------------------------------------------------------
echo -e "${BLUE}[1/7]${NC} Verificando ambiente..."

if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}❌ Execute como root (sudo bash setup-server.sh)${NC}"
    exit 1
fi

if [ ! -d /opt/chatblue ]; then
    echo -e "${RED}❌ Diretório /opt/chatblue não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Ambiente OK${NC}"

# ---------------------------------------------------------------------------
# 2. Criar estrutura de diretórios
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[2/7]${NC} Criando estrutura de diretórios..."

mkdir -p /opt/chatblue/{scripts,backups,logs,keys}
chmod 700 /opt/chatblue/keys

echo -e "${GREEN}✅ Diretórios criados${NC}"
echo "   /opt/chatblue/scripts  → Scripts de manutenção"
echo "   /opt/chatblue/backups  → Backups do banco e arquivos"
echo "   /opt/chatblue/logs     → Logs de deploy e backup"
echo "   /opt/chatblue/keys     → Chaves SSH"

# ---------------------------------------------------------------------------
# 3. Gerar chave SSH para GitHub Actions
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[3/7]${NC} Gerando chave SSH para deploy automático..."

SSH_KEY_PATH="/opt/chatblue/keys/github_deploy"

if [ -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}⚠️  Chave já existe. Pulando geração.${NC}"
else
    ssh-keygen -t ed25519 -C "chatblue-deploy@github-actions" -f "$SSH_KEY_PATH" -N "" -q

    # Adicionar chave pública ao authorized_keys
    cat "${SSH_KEY_PATH}.pub" >> /root/.ssh/authorized_keys
    chmod 600 /root/.ssh/authorized_keys

    echo -e "${GREEN}✅ Chave SSH gerada${NC}"
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  CHAVE PRIVADA - COPIE E ADICIONE COMO SECRET NO GITHUB    ║${NC}"
echo -e "${CYAN}║  Nome do secret: SERVER_SSH_KEY                             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
cat "$SSH_KEY_PATH"
echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo ""

# ---------------------------------------------------------------------------
# 4. Instalar script de backup
# ---------------------------------------------------------------------------
echo -e "${BLUE}[4/7]${NC} Configurando backup automático..."

cat > /opt/chatblue/scripts/backup.sh << 'BACKUP_EOF'
#!/bin/bash
# =============================================================================
# ChatBlue - Backup Completo
# =============================================================================

set -e

BACKUP_DIR="/opt/chatblue/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="chatblue_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
LOG_FILE="/opt/chatblue/logs/backup.log"
QUIET=false

[[ "$1" == "--quiet" ]] && QUIET=true

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" >> "$LOG_FILE"
    $QUIET || echo "$msg"
}

log "=== INÍCIO DO BACKUP ==="

# Carregar variáveis
if [ -f /opt/chatblue/.env ]; then
    export $(grep -v '^#' /opt/chatblue/.env | grep -E '^(DB_|DATABASE_URL|REDIS_)' | xargs)
fi

# Extrair credenciais do DATABASE_URL se existir
if [ -n "$DATABASE_URL" ]; then
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
fi

# Fallbacks
DB_USER=${DB_USER:-chatblue}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-chatblue}

mkdir -p "$BACKUP_PATH"

# 1. Backup PostgreSQL
log "📦 Fazendo dump do PostgreSQL..."
if PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "${BACKUP_PATH}/database.dump" 2>>"$LOG_FILE"; then
    DB_SIZE=$(du -h "${BACKUP_PATH}/database.dump" | cut -f1)
    log "✅ PostgreSQL OK ($DB_SIZE)"
else
    log "❌ PostgreSQL falhou"
fi

# 2. Backup Redis
log "📦 Fazendo backup do Redis..."
REDIS_PASS=$(echo "$REDIS_URL" | sed -n 's|.*://:\([^@]*\)@.*|\1|p' 2>/dev/null)
if [ -n "$REDIS_PASS" ]; then
    redis-cli -a "$REDIS_PASS" BGSAVE 2>/dev/null
else
    redis-cli BGSAVE 2>/dev/null
fi
sleep 2

REDIS_DUMP=$(find /var/lib/redis /etc/redis /opt -name "dump.rdb" 2>/dev/null | head -1)
if [ -n "$REDIS_DUMP" ] && [ -f "$REDIS_DUMP" ]; then
    cp "$REDIS_DUMP" "${BACKUP_PATH}/redis_dump.rdb"
    log "✅ Redis OK"
else
    log "⚠️ Redis dump não encontrado"
fi

# 3. Backup configurações
log "📦 Backup de configurações..."
mkdir -p "${BACKUP_PATH}/config"
cp -f /opt/chatblue/.env "${BACKUP_PATH}/config/" 2>/dev/null || true
cp -f /opt/chatblue/ecosystem.config.js "${BACKUP_PATH}/config/" 2>/dev/null || true

# Nginx
if [ -f /etc/nginx/sites-available/chatblue ]; then
    cp /etc/nginx/sites-available/chatblue "${BACKUP_PATH}/config/nginx-chatblue.conf"
elif [ -f /etc/nginx/conf.d/chatblue.conf ]; then
    cp /etc/nginx/conf.d/chatblue.conf "${BACKUP_PATH}/config/"
fi
log "✅ Configurações OK"

# 4. Backup uploads
log "📦 Backup de uploads..."
UPLOADS_DIR="/opt/chatblue/app/apps/api/uploads"
if [ -d "$UPLOADS_DIR" ]; then
    tar -czf "${BACKUP_PATH}/uploads.tar.gz" -C "$(dirname $UPLOADS_DIR)" "$(basename $UPLOADS_DIR)" 2>/dev/null
    UPLOADS_SIZE=$(du -h "${BACKUP_PATH}/uploads.tar.gz" | cut -f1)
    log "✅ Uploads OK ($UPLOADS_SIZE)"
else
    log "⚠️ Diretório de uploads não encontrado"
fi

# 5. Backup Prisma schema
if [ -f /opt/chatblue/app/apps/api/prisma/schema.prisma ]; then
    cp /opt/chatblue/app/apps/api/prisma/schema.prisma "${BACKUP_PATH}/config/"
    log "✅ Prisma schema OK"
fi

# 6. Comprimir tudo
log "📦 Comprimindo backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME" 2>/dev/null
rm -rf "$BACKUP_PATH"

TOTAL_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log "✅ Backup comprimido: ${BACKUP_NAME}.tar.gz ($TOTAL_SIZE)"

# 7. Rotação - manter últimos 7
log "🔄 Rotacionando backups antigos..."
cd "$BACKUP_DIR"
ls -t chatblue_backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true

TOTAL_BACKUPS=$(ls chatblue_backup_*.tar.gz 2>/dev/null | wc -l)
log "✅ Total de backups mantidos: $TOTAL_BACKUPS"

log "=== BACKUP CONCLUÍDO ==="
BACKUP_EOF

chmod +x /opt/chatblue/scripts/backup.sh
echo -e "${GREEN}✅ Script de backup instalado${NC}"

# ---------------------------------------------------------------------------
# 5. Configurar cron para backup diário
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[5/7]${NC} Configurando backup automático via cron..."

# Remover cron anterior do chatblue se existir
crontab -l 2>/dev/null | grep -v "chatblue" | crontab - 2>/dev/null || true

# Adicionar novo cron (backup diário às 3h da manhã)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/chatblue/scripts/backup.sh --quiet >> /opt/chatblue/logs/cron-backup.log 2>&1") | crontab -

echo -e "${GREEN}✅ Backup agendado para todos os dias às 03:00${NC}"

# ---------------------------------------------------------------------------
# 6. Fazer primeiro backup AGORA
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[6/7]${NC} Executando primeiro backup..."

bash /opt/chatblue/scripts/backup.sh 2>&1 | while IFS= read -r line; do
    echo "   $line"
done

echo -e "${GREEN}✅ Primeiro backup concluído${NC}"

# ---------------------------------------------------------------------------
# 7. Instalar ferramentas de segurança
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}[7/7]${NC} Configurações de segurança..."

# Instalar fail2ban se não existir
if ! command -v fail2ban-client &>/dev/null; then
    echo "   Instalando fail2ban..."
    apt-get update -qq && apt-get install -y -qq fail2ban >/dev/null 2>&1
    systemctl enable fail2ban >/dev/null 2>&1
    systemctl start fail2ban >/dev/null 2>&1
    echo -e "   ${GREEN}✅ fail2ban instalado${NC}"
else
    echo -e "   ${GREEN}✅ fail2ban já instalado${NC}"
fi

# Configurar SSH para aceitar chave
if ! grep -q "PubkeyAuthentication yes" /etc/ssh/sshd_config; then
    sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
    systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true
    echo -e "   ${GREEN}✅ SSH configurado para aceitar chaves${NC}"
fi

# ---------------------------------------------------------------------------
# Resumo final
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}=========================================="
echo "  Setup Concluído!"
echo -e "==========================================${NC}"
echo ""
echo -e "📋 ${YELLOW}PRÓXIMOS PASSOS (faça agora):${NC}"
echo ""
echo "   1. Vá no GitHub → seu repositório → Settings → Secrets and variables → Actions"
echo ""
echo "   2. Adicione estes secrets:"
echo -e "      ${CYAN}SERVER_HOST${NC}     = 84.247.191.105"
echo -e "      ${CYAN}SERVER_USER${NC}     = root"
echo -e "      ${CYAN}SERVER_SSH_PORT${NC}  = 22"
echo -e "      ${CYAN}SERVER_SSH_KEY${NC}   = (copie a chave privada mostrada acima)"
echo ""
echo "   3. Copie o arquivo deploy.yml para .github/workflows/ no repositório"
echo ""
echo "   4. Faça um push para a branch main e o deploy será automático!"
echo ""
echo -e "${GREEN}Backup automático: todos os dias às 03:00${NC}"
echo -e "${GREEN}Backups salvos em: /opt/chatblue/backups/${NC}"
echo ""

# Verificar se o sistema está saudável
echo -e "${BLUE}Status atual dos serviços:${NC}"
echo ""

# PM2
if command -v pm2 &>/dev/null; then
    pm2 list 2>/dev/null | head -15
else
    echo "   ⚠️ PM2 não encontrado"
fi

echo ""

# PostgreSQL
if pg_isready -q 2>/dev/null; then
    echo -e "   PostgreSQL: ${GREEN}✅ Rodando${NC}"
else
    echo -e "   PostgreSQL: ${RED}❌ Parado${NC}"
fi

# Redis
if redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "   Redis:      ${GREEN}✅ Rodando${NC}"
else
    echo -e "   Redis:      ${RED}❌ Parado${NC}"
fi

# Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "   Nginx:      ${GREEN}✅ Rodando${NC}"
else
    echo -e "   Nginx:      ${RED}❌ Parado${NC}"
fi

echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Troque a senha SSH do servidor!${NC}"
echo "   Execute: passwd root"
echo ""
