---
sidebar_position: 6
title: Backup e Recuperacao
description: Estrategias de backup e procedimentos de recuperacao para o ChatBlue
---

# Backup e Recuperacao

Este guia detalha as estrategias de backup e procedimentos de recuperacao para garantir a seguranca dos dados do ChatBlue.

## Visao Geral

Os componentes que precisam de backup incluem:

| Componente | Prioridade | Frequencia Recomendada |
|------------|------------|------------------------|
| Banco de Dados PostgreSQL | Critica | A cada 6 horas |
| Redis (dados persistidos) | Alta | Diario |
| Arquivos de upload | Alta | Diario |
| Sessoes WhatsApp | Alta | Diario |
| Arquivos de configuracao | Media | Semanal |
| Logs | Baixa | Semanal |

## Backup do PostgreSQL

### Backup Manual com pg_dump

```bash
# Backup completo do banco
sudo -u postgres pg_dump chatblue_production > /backup/chatblue_$(date +%Y%m%d_%H%M%S).sql

# Backup comprimido
sudo -u postgres pg_dump chatblue_production | gzip > /backup/chatblue_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup em formato custom (mais flexivel para restore)
sudo -u postgres pg_dump -Fc chatblue_production > /backup/chatblue_$(date +%Y%m%d_%H%M%S).dump

# Backup apenas do schema
sudo -u postgres pg_dump --schema-only chatblue_production > /backup/chatblue_schema_$(date +%Y%m%d).sql

# Backup apenas dos dados
sudo -u postgres pg_dump --data-only chatblue_production > /backup/chatblue_data_$(date +%Y%m%d).sql
```

### Backup de Tabelas Especificas

```bash
# Backup de tabelas especificas
sudo -u postgres pg_dump -t messages -t tickets chatblue_production > /backup/chatblue_messages_$(date +%Y%m%d).sql

# Backup excluindo tabelas de log
sudo -u postgres pg_dump --exclude-table='*_log' chatblue_production > /backup/chatblue_no_logs_$(date +%Y%m%d).sql
```

### Script de Backup Automatizado

```bash
sudo nano /usr/local/bin/backup-chatblue-db.sh
```

```bash
#!/bin/bash

# Configuracoes
DB_NAME="chatblue_production"
DB_USER="chatblue"
BACKUP_DIR="/backup/postgresql"
RETENTION_DAYS=7
S3_BUCKET="s3://seu-bucket-backup/chatblue/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/chatblue/backup.log"

# Criar diretorio se nao existir
mkdir -p $BACKUP_DIR

# Nome do arquivo de backup
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

# Log de inicio
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup do banco de dados..." >> $LOG_FILE

# Executar backup
if sudo -u postgres pg_dump -Fc $DB_NAME > $BACKUP_FILE; then
    # Comprimir
    gzip $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE}.gz"

    # Calcular tamanho
    SIZE=$(du -h $BACKUP_FILE | cut -f1)

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup concluido: $BACKUP_FILE ($SIZE)" >> $LOG_FILE

    # Upload para S3 (se configurado)
    if command -v aws &> /dev/null; then
        if aws s3 cp $BACKUP_FILE $S3_BUCKET/; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Upload para S3 concluido" >> $LOG_FILE
        else
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: Falha no upload para S3" >> $LOG_FILE
        fi
    fi

    # Remover backups antigos locais
    find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backups antigos removidos (>$RETENTION_DAYS dias)" >> $LOG_FILE

else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: Falha no backup do banco de dados" >> $LOG_FILE
    exit 1
fi
```

```bash
# Tornar executavel
sudo chmod +x /usr/local/bin/backup-chatblue-db.sh

# Agendar no cron (a cada 6 horas)
echo "0 */6 * * * root /usr/local/bin/backup-chatblue-db.sh" | sudo tee /etc/cron.d/chatblue-db-backup
```

### Backup Continuo com WAL Archiving

Para RPO (Recovery Point Objective) proximo de zero:

```bash
# Editar postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf
```

```ini
# Habilitar WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'gzip < %p > /backup/postgresql/wal/%f.gz'
archive_timeout = 300
```

```bash
# Criar diretorio de WAL
sudo mkdir -p /backup/postgresql/wal
sudo chown postgres:postgres /backup/postgresql/wal

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

## Backup do Redis

### Backup Manual

```bash
# Forcar save do RDB
redis-cli BGSAVE

# Aguardar conclusao
redis-cli LASTSAVE

# Copiar arquivo RDB
sudo cp /var/lib/redis/dump.rdb /backup/redis/dump_$(date +%Y%m%d_%H%M%S).rdb
```

### Script de Backup Redis

```bash
sudo nano /usr/local/bin/backup-chatblue-redis.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/backup/redis"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/chatblue/backup.log"

mkdir -p $BACKUP_DIR

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup do Redis..." >> $LOG_FILE

# Forcar save
redis-cli BGSAVE

# Aguardar conclusao
sleep 5
while [ $(redis-cli LASTSAVE) == $(redis-cli LASTSAVE) ]; do
    sleep 1
done

# Copiar arquivo
if sudo cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_${TIMESTAMP}.rdb; then
    gzip $BACKUP_DIR/redis_${TIMESTAMP}.rdb
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup Redis concluido" >> $LOG_FILE
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: Falha no backup Redis" >> $LOG_FILE
    exit 1
fi

# Remover backups antigos
find $BACKUP_DIR -name "*.rdb.gz" -mtime +$RETENTION_DAYS -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-chatblue-redis.sh
echo "0 2 * * * root /usr/local/bin/backup-chatblue-redis.sh" | sudo tee /etc/cron.d/chatblue-redis-backup
```

## Backup de Arquivos

### Script de Backup de Arquivos

```bash
sudo nano /usr/local/bin/backup-chatblue-files.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/backup/files"
APP_DIR="/var/www/chatblue"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/chatblue/backup.log"
S3_BUCKET="s3://seu-bucket-backup/chatblue/files"

mkdir -p $BACKUP_DIR

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup de arquivos..." >> $LOG_FILE

# Backup de uploads
if tar -czf $BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz -C $APP_DIR uploads; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup de uploads concluido" >> $LOG_FILE
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: Falha no backup de uploads" >> $LOG_FILE
fi

# Backup de sessoes WhatsApp
if tar -czf $BACKUP_DIR/sessions_${TIMESTAMP}.tar.gz -C $APP_DIR sessions; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup de sessoes concluido" >> $LOG_FILE
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: Falha no backup de sessoes" >> $LOG_FILE
fi

# Backup de configuracoes
if tar -czf $BACKUP_DIR/config_${TIMESTAMP}.tar.gz \
    $APP_DIR/apps/api/.env \
    $APP_DIR/apps/web/.env \
    $APP_DIR/ecosystem.config.js \
    /etc/nginx/sites-available/chatblue \
    /etc/letsencrypt/live/; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup de configuracoes concluido" >> $LOG_FILE
fi

# Upload para S3
if command -v aws &> /dev/null; then
    aws s3 sync $BACKUP_DIR $S3_BUCKET --exclude "*.tmp"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync com S3 concluido" >> $LOG_FILE
fi

# Remover backups antigos
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-chatblue-files.sh
echo "0 3 * * * root /usr/local/bin/backup-chatblue-files.sh" | sudo tee /etc/cron.d/chatblue-files-backup
```

## Backup Completo

### Script Master de Backup

```bash
sudo nano /usr/local/bin/backup-chatblue-full.sh
```

```bash
#!/bin/bash

LOG_FILE="/var/log/chatblue/backup.log"
SLACK_WEBHOOK="https://hooks.slack.com/services/xxx/xxx/xxx"

send_notification() {
    local status=$1
    local message=$2

    curl -s -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\":floppy_disk: *ChatBlue Backup*\n*Status:* $status\n*Message:* $message\n*Time:* $(date '+%Y-%m-%d %H:%M:%S')\"}" \
        $SLACK_WEBHOOK
}

echo "========================================" >> $LOG_FILE
echo "[$(date '+%Y-%m-%d %H:%M:%S')] INICIANDO BACKUP COMPLETO" >> $LOG_FILE
echo "========================================" >> $LOG_FILE

# Backup do banco
if /usr/local/bin/backup-chatblue-db.sh; then
    DB_STATUS="OK"
else
    DB_STATUS="ERRO"
fi

# Backup do Redis
if /usr/local/bin/backup-chatblue-redis.sh; then
    REDIS_STATUS="OK"
else
    REDIS_STATUS="ERRO"
fi

# Backup de arquivos
if /usr/local/bin/backup-chatblue-files.sh; then
    FILES_STATUS="OK"
else
    FILES_STATUS="ERRO"
fi

# Verificar resultado geral
if [ "$DB_STATUS" == "OK" ] && [ "$REDIS_STATUS" == "OK" ] && [ "$FILES_STATUS" == "OK" ]; then
    send_notification "SUCESSO" "Todos os backups concluidos com sucesso"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BACKUP COMPLETO CONCLUIDO COM SUCESSO" >> $LOG_FILE
else
    send_notification "ERRO" "Falha em algum backup - DB: $DB_STATUS, Redis: $REDIS_STATUS, Files: $FILES_STATUS"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BACKUP COMPLETO COM ERROS" >> $LOG_FILE
fi

echo "========================================" >> $LOG_FILE
```

```bash
sudo chmod +x /usr/local/bin/backup-chatblue-full.sh
echo "0 4 * * * root /usr/local/bin/backup-chatblue-full.sh" | sudo tee /etc/cron.d/chatblue-full-backup
```

## Restauracao

### Restaurar PostgreSQL

```bash
# Parar aplicacao
pm2 stop all

# Restaurar de arquivo .sql
sudo -u postgres psql chatblue_production < /backup/chatblue_20240115.sql

# Restaurar de arquivo .dump (formato custom)
sudo -u postgres pg_restore -d chatblue_production /backup/chatblue_20240115.dump

# Restaurar para novo banco
sudo -u postgres createdb chatblue_restored
sudo -u postgres pg_restore -d chatblue_restored /backup/chatblue_20240115.dump

# Restaurar apenas tabelas especificas
sudo -u postgres pg_restore -d chatblue_production -t messages -t tickets /backup/chatblue_20240115.dump

# Reiniciar aplicacao
pm2 start all
```

### Restaurar Redis

```bash
# Parar Redis
sudo systemctl stop redis-server

# Substituir arquivo RDB
sudo cp /backup/redis/redis_20240115.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb

# Iniciar Redis
sudo systemctl start redis-server
```

### Restaurar Arquivos

```bash
# Restaurar uploads
tar -xzf /backup/files/uploads_20240115.tar.gz -C /var/www/chatblue/

# Restaurar sessoes WhatsApp
tar -xzf /backup/files/sessions_20240115.tar.gz -C /var/www/chatblue/

# Ajustar permissoes
sudo chown -R chatblue:chatblue /var/www/chatblue/uploads
sudo chown -R chatblue:chatblue /var/www/chatblue/sessions
```

### Procedimento de Disaster Recovery

```bash
sudo nano /usr/local/bin/chatblue-disaster-recovery.sh
```

```bash
#!/bin/bash

# Este script realiza recuperacao completa do ChatBlue
# Use com cuidado!

echo "=========================================="
echo "   ChatBlue - Disaster Recovery Script   "
echo "=========================================="
echo ""
echo "ATENCAO: Este script ira restaurar o sistema"
echo "a partir dos backups mais recentes."
echo ""
read -p "Deseja continuar? (sim/nao): " confirm

if [ "$confirm" != "sim" ]; then
    echo "Operacao cancelada."
    exit 0
fi

# Parar servicos
echo "Parando servicos..."
pm2 stop all
sudo systemctl stop redis-server
sudo systemctl stop nginx

# Encontrar backups mais recentes
DB_BACKUP=$(ls -t /backup/postgresql/*.dump.gz | head -1)
REDIS_BACKUP=$(ls -t /backup/redis/*.rdb.gz | head -1)
UPLOADS_BACKUP=$(ls -t /backup/files/uploads_*.tar.gz | head -1)
SESSIONS_BACKUP=$(ls -t /backup/files/sessions_*.tar.gz | head -1)

echo ""
echo "Backups encontrados:"
echo "  DB: $DB_BACKUP"
echo "  Redis: $REDIS_BACKUP"
echo "  Uploads: $UPLOADS_BACKUP"
echo "  Sessions: $SESSIONS_BACKUP"
echo ""
read -p "Confirma restauracao destes backups? (sim/nao): " confirm2

if [ "$confirm2" != "sim" ]; then
    echo "Operacao cancelada."
    exit 0
fi

# Restaurar banco
echo "Restaurando banco de dados..."
gunzip -k $DB_BACKUP
DB_FILE="${DB_BACKUP%.gz}"
sudo -u postgres dropdb chatblue_production
sudo -u postgres createdb chatblue_production -O chatblue
sudo -u postgres pg_restore -d chatblue_production $DB_FILE
rm $DB_FILE

# Restaurar Redis
echo "Restaurando Redis..."
gunzip -k $REDIS_BACKUP
REDIS_FILE="${REDIS_BACKUP%.gz}"
sudo cp $REDIS_FILE /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb
rm $REDIS_FILE

# Restaurar arquivos
echo "Restaurando arquivos..."
tar -xzf $UPLOADS_BACKUP -C /var/www/chatblue/
tar -xzf $SESSIONS_BACKUP -C /var/www/chatblue/
sudo chown -R chatblue:chatblue /var/www/chatblue/uploads
sudo chown -R chatblue:chatblue /var/www/chatblue/sessions

# Reiniciar servicos
echo "Reiniciando servicos..."
sudo systemctl start redis-server
sudo systemctl start nginx
pm2 start all

echo ""
echo "=========================================="
echo "   Disaster Recovery Concluido!          "
echo "=========================================="
echo ""
echo "Verifique os servicos:"
echo "  pm2 status"
echo "  curl http://localhost:3001/health"
```

## Backup para Cloud

### AWS S3

```bash
# Instalar AWS CLI
sudo apt install -y awscli

# Configurar credenciais
aws configure

# Testar acesso
aws s3 ls s3://seu-bucket-backup/
```

### Script de Sync com S3

```bash
#!/bin/bash

BACKUP_DIR="/backup"
S3_BUCKET="s3://seu-bucket-backup/chatblue"

# Sync incremental
aws s3 sync $BACKUP_DIR $S3_BUCKET \
    --exclude "*.tmp" \
    --exclude "*.log" \
    --storage-class STANDARD_IA

# Verificar
aws s3 ls $S3_BUCKET --recursive --human-readable
```

### Lifecycle Policy para S3

```json
{
    "Rules": [
        {
            "ID": "MoveToGlacier",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "chatblue/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "GLACIER"
                }
            ],
            "Expiration": {
                "Days": 365
            }
        }
    ]
}
```

## Verificacao de Integridade

### Script de Verificacao

```bash
sudo nano /usr/local/bin/verify-chatblue-backup.sh
```

```bash
#!/bin/bash

LOG_FILE="/var/log/chatblue/backup-verify.log"
BACKUP_DIR="/backup"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando verificacao de backups..." >> $LOG_FILE

# Verificar backups do banco
echo "Verificando backups do PostgreSQL..." >> $LOG_FILE
for file in $BACKUP_DIR/postgresql/*.dump.gz; do
    if gunzip -t "$file" 2>/dev/null; then
        echo "  OK: $file" >> $LOG_FILE
    else
        echo "  CORROMPIDO: $file" >> $LOG_FILE
    fi
done

# Verificar backups de arquivos
echo "Verificando backups de arquivos..." >> $LOG_FILE
for file in $BACKUP_DIR/files/*.tar.gz; do
    if tar -tzf "$file" >/dev/null 2>&1; then
        echo "  OK: $file" >> $LOG_FILE
    else
        echo "  CORROMPIDO: $file" >> $LOG_FILE
    fi
done

# Listar tamanhos
echo "" >> $LOG_FILE
echo "Tamanhos dos backups:" >> $LOG_FILE
du -sh $BACKUP_DIR/* >> $LOG_FILE

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Verificacao concluida" >> $LOG_FILE
```

## Boas Praticas

:::tip Recomendacoes de Backup
1. **Regra 3-2-1**: 3 copias, 2 midias diferentes, 1 offsite
2. **Teste regularmente**: Faca restore de teste mensalmente
3. **Criptografia**: Criptografe backups sensiveis
4. **Monitore**: Configure alertas para falhas de backup
5. **Documente**: Mantenha runbooks de recuperacao atualizados
6. **RTO/RPO**: Defina e documente seus objetivos de recuperacao
:::

### Checklist de Backup

- [ ] Backups automaticos configurados
- [ ] Retencao adequada definida
- [ ] Backup offsite configurado (S3, etc)
- [ ] Scripts de restauracao testados
- [ ] Monitoramento de falhas ativo
- [ ] Documentacao atualizada
- [ ] Equipe treinada em DR

## Proximos Passos

- [Troubleshooting - Banco de Dados](/troubleshooting/banco-dados)
- [Monitoramento](/deploy/monitoramento)
