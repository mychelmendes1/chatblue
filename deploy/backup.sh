#!/bin/bash
# =============================================================================
# ChatBlue - Rotina de backup no servidor
# Aumenta a segurança: permite recuperar após falhas, exclusões ou migrações.
#
# Uso: executar manualmente ou via cron.
# Cron (diário às 3h): 0 3 * * * /opt/chatblue/app/deploy/backup.sh >> /var/log/chatblue/backup.log 2>&1
#
# Ajuste as variáveis abaixo se seus caminhos forem diferentes.
# =============================================================================

set -e

BACKUP_DIR="${BACKUP_DIR:-/opt/chatblue/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
# Container e banco (ajuste se usar outro nome)
PG_CONTAINER="${PG_CONTAINER:-chatblue_postgres}"
PG_USER="${PG_USER:-chatblue}"
PG_DATABASE="${PG_DATABASE:-chatblue}"
# Caminho base dos dados (uploads, sessões WhatsApp)
DATA_ROOT="${DATA_ROOT:-/opt/chatblue/data}"
ENV_FILE="${ENV_FILE:-/opt/chatblue/.env}"

DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Iniciando rotina de backup (destino: $BACKUP_DIR)"

# --- Backup do PostgreSQL ---
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${PG_CONTAINER}$"; then
  log "Backup do PostgreSQL (container: $PG_CONTAINER)..."
  if docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" "$PG_DATABASE" | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"; then
    log "PostgreSQL: OK ($(du -h "$BACKUP_DIR/db-$DATE.sql.gz" | cut -f1))"
  else
    log "ERRO: Falha no pg_dump"
    exit 1
  fi
else
  log "AVISO: Container $PG_CONTAINER não encontrado; pulando backup do banco."
fi

# --- Backup dos uploads (opcional) ---
if [ -d "$DATA_ROOT/uploads" ]; then
  log "Backup dos uploads..."
  tar -czf "$BACKUP_DIR/uploads-$DATE.tar.gz" -C "$DATA_ROOT" uploads 2>/dev/null && log "Uploads: OK" || log "AVISO: Falha no backup de uploads"
else
  log "AVISO: Pasta $DATA_ROOT/uploads não encontrada; pulando."
fi

# --- Backup das sessões WhatsApp (opcional) ---
if [ -d "$DATA_ROOT/whatsapp-sessions" ]; then
  log "Backup das sessões WhatsApp..."
  tar -czf "$BACKUP_DIR/whatsapp-$DATE.tar.gz" -C "$DATA_ROOT" whatsapp-sessions 2>/dev/null && log "WhatsApp sessions: OK" || log "AVISO: Falha no backup de sessões"
else
  log "AVISO: Pasta $DATA_ROOT/whatsapp-sessions não encontrada; pulando."
fi

# --- Backup do .env (opcional) ---
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$BACKUP_DIR/env-$DATE.bak"
  log "Cópia do .env: OK"
else
  log "AVISO: Arquivo $ENV_FILE não encontrado; pulando."
fi

# --- Limpar backups antigos ---
log "Removendo backups com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

log "Backup finalizado. Arquivos em $BACKUP_DIR:"
ls -lh "$BACKUP_DIR" 2>/dev/null || true














