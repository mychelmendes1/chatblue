# Backup no servidor (rotina local)

Ter backups automáticos **no próprio servidor** já aumenta bastante a segurança: você ganha recuperação pontual, proteção contra exclusões acidentais e migrações que derem errado.

## O que a rotina faz

O script `deploy/backup.sh`:

- Faz **dump do PostgreSQL** (banco do ChatBlue), comprimido (`.sql.gz`).
- Opcionalmente faz backup de **uploads** e **sessões WhatsApp** (se as pastas existirem).
- Guarda cópia do **.env** (sem senhas em texto puro no script).
- **Remove** backups mais antigos que 7 dias (configurável), para não encher o disco.

Tudo é salvo em **um diretório no servidor** (por padrão `/opt/chatblue/backups`). Nada é enviado para nuvem por esse script.

## Como usar

### Executar manualmente

No servidor:

```bash
cd /opt/chatblue/app   # ou onde está o repositório
./deploy/backup.sh
```

Para ver o log no terminal e no arquivo:

```bash
./deploy/backup.sh 2>&1 | tee -a /var/log/chatblue/backup.log
```

### Agendar com cron (recomendado)

1. Crie o diretório de log (se quiser arquivo de log):

   ```bash
   sudo mkdir -p /var/log/chatblue
   sudo chown seu_usuario:seu_usuario /var/log/chatblue
   ```

2. Edite o cron do usuário que roda a aplicação:

   ```bash
   crontab -e
   ```

3. Adicione uma linha para rodar **todo dia às 3h**:

   ```cron
   0 3 * * * /opt/chatblue/app/deploy/backup.sh >> /var/log/chatblue/backup.log 2>&1
   ```

   Ajuste o caminho `/opt/chatblue/app` se o projeto estiver em outro lugar.

### Ajustar caminhos ou nomes

Você pode definir variáveis de ambiente antes do script (ou no cron):

- `BACKUP_DIR` – pasta onde salvar os backups (padrão: `/opt/chatblue/backups`)
- `RETENTION_DAYS` – dias para manter cada backup (padrão: `7`)
- `PG_CONTAINER` – nome do container do Postgres (padrão: `chatblue_postgres`)
- `PG_USER` / `PG_DATABASE` – usuário e nome do banco
- `DATA_ROOT` – pasta base dos dados (uploads, sessões) (padrão: `/opt/chatblue/data`)
- `ENV_FILE` – caminho do `.env` (padrão: `/opt/chatblue/.env`)

Exemplo no cron, com retenção de 14 dias:

```cron
0 3 * * * RETENTION_DAYS=14 /opt/chatblue/app/deploy/backup.sh >> /var/log/chatblue/backup.log 2>&1
```

## Restaurar o banco a partir de um backup

Com um arquivo `db-YYYYMMDD-HHMMSS.sql.gz`:

```bash
gunzip -c /opt/chatblue/backups/db-20250115-030001.sql.gz | docker exec -i chatblue_postgres psql -U chatblue chatblue
```

Ou, se o Postgres estiver instalado no host:

```bash
gunzip -c /opt/chatblue/backups/db-20250115-030001.sql.gz | sudo -u postgres psql chatblue_production
```

Ajuste usuário, banco e container conforme seu ambiente.

## Próximo passo: cópia para nuvem

A rotina no servidor já melhora a segurança. Para proteger também contra falha do próprio servidor (disco, VPS), o ideal é **copiar** esses backups para outro lugar (por exemplo Google Drive, S3 ou outro servidor). Isso pode ser um segundo script ou etapa que rode depois do `backup.sh` (por exemplo com `rclone` ou `scp`). Ver plano em conversa anterior sobre backup para Google Drive.
