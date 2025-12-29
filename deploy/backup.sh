#!/bin/bash
# =============================================================================
# ChatBlue Backup Script
# Adicione ao cron: 0 3 * * * /opt/chatblue/app/deploy/backup.sh
# =============================================================================

BACKUP_DIR="/opt/chatblue/backups"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup..."

# Backup do PostgreSQL
echo "[$(date)] Backup do PostgreSQL..."
docker exec chatblue_postgres pg_dump -U chatblue chatblue | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Backup dos uploads
echo "[$(date)] Backup dos uploads..."
tar -czf "$BACKUP_DIR/uploads-$DATE.tar.gz" -C /opt/chatblue/data uploads 2>/dev/null

# Backup das sessões do WhatsApp
echo "[$(date)] Backup das sessões WhatsApp..."
tar -czf "$BACKUP_DIR/whatsapp-$DATE.tar.gz" -C /opt/chatblue/data whatsapp-sessions 2>/dev/null

# Backup do .env
cp /opt/chatblue/.env "$BACKUP_DIR/env-$DATE.bak"

# Limpar backups antigos
echo "[$(date)] Limpando backups com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

# Mostrar backups atuais
echo "[$(date)] Backups concluídos:"
ls -lh "$BACKUP_DIR"

echo "[$(date)] Backup finalizado!"



