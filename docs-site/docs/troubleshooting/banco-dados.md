---
sidebar_position: 4
title: Problemas de Banco de Dados
description: Resolucao de problemas com PostgreSQL e Prisma no ChatBlue
---

# Problemas de Banco de Dados

Este guia aborda problemas comuns relacionados ao PostgreSQL e ao ORM Prisma no ChatBlue.

## Problemas de Conexao

### Erro: Connection refused

**Sintomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solucoes:**
```bash
# Verificar se PostgreSQL esta rodando
sudo systemctl status postgresql

# Iniciar se necessario
sudo systemctl start postgresql

# Verificar se esta ouvindo na porta correta
sudo netstat -tlnp | grep 5432

# Verificar logs do PostgreSQL
sudo tail -50 /var/log/postgresql/postgresql-16-main.log
```

### Erro: Authentication failed

**Sintomas:**
```
Error: password authentication failed for user "chatblue"
```

**Solucoes:**
```bash
# Verificar credenciais no .env
cat /var/www/chatblue/apps/api/.env | grep DATABASE_URL

# Testar conexao manualmente
psql -U chatblue -d chatblue_production -h localhost

# Resetar senha do usuario
sudo -u postgres psql
ALTER USER chatblue WITH PASSWORD 'nova_senha_segura';
\q

# Atualizar .env com nova senha
```

### Erro: Too many connections

**Sintomas:**
```
Error: too many connections for role "chatblue"
```

**Solucoes:**
```bash
# Verificar conexoes ativas
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE usename = 'chatblue';"

# Listar conexoes
sudo -u postgres psql -c "SELECT pid, usename, application_name, client_addr, state, query_start FROM pg_stat_activity WHERE usename = 'chatblue';"

# Encerrar conexoes ociosas
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'chatblue' AND state = 'idle' AND query_start < now() - interval '10 minutes';"

# Aumentar limite de conexoes (se necessario)
sudo nano /etc/postgresql/16/main/postgresql.conf
# max_connections = 200

sudo systemctl restart postgresql
```

### Configurar Connection Pool

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// .env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20&pool_timeout=10"
```

```typescript
// Configuracao do Prisma com pool
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

## Problemas de Performance

### Queries lentas

**Diagnostico:**
```bash
# Habilitar log de queries lentas
sudo -u postgres psql -c "ALTER SYSTEM SET log_min_duration_statement = 500;"
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Ver queries em execucao
sudo -u postgres psql -c "
SELECT pid, now() - query_start as duration, state, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;"

# Identificar queries mais frequentes
sudo -u postgres psql -d chatblue_production -c "
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;"
```

### Verificar e criar indices

```bash
# Identificar tabelas sem indices adequados
sudo -u postgres psql -d chatblue_production -c "
SELECT schemaname, relname, seq_scan, idx_scan,
       round(100.0 * idx_scan / (seq_scan + idx_scan), 2) as idx_ratio
FROM pg_stat_user_tables
WHERE (seq_scan + idx_scan) > 0
ORDER BY idx_ratio ASC;"

# Ver indices existentes
sudo -u postgres psql -d chatblue_production -c "
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;"

# Criar indice para campos frequentemente filtrados
sudo -u postgres psql -d chatblue_production -c "
CREATE INDEX CONCURRENTLY idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX CONCURRENTLY idx_tickets_company_id_status ON tickets(company_id, status);
CREATE INDEX CONCURRENTLY idx_tickets_created_at ON tickets(created_at DESC);"
```

### Otimizar queries Prisma

```typescript
// RUIM: N+1 queries
const tickets = await prisma.ticket.findMany();
for (const ticket of tickets) {
  const messages = await prisma.message.findMany({
    where: { ticketId: ticket.id },
  });
}

// BOM: Include para evitar N+1
const tickets = await prisma.ticket.findMany({
  include: {
    messages: true,
    contact: true,
    assignedUser: true,
  },
});

// MELHOR: Selecionar apenas campos necessarios
const tickets = await prisma.ticket.findMany({
  select: {
    id: true,
    status: true,
    createdAt: true,
    messages: {
      select: {
        id: true,
        body: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1, // Apenas ultima mensagem
    },
    contact: {
      select: {
        name: true,
        number: true,
      },
    },
  },
  where: {
    companyId: companyId,
    status: { not: 'closed' },
  },
  orderBy: { updatedAt: 'desc' },
  take: 50,
});
```

### Paginacao eficiente

```typescript
// Paginacao com cursor (mais eficiente para grandes datasets)
async function getTicketsPaginated(companyId: string, cursor?: string, limit = 20) {
  return await prisma.ticket.findMany({
    take: limit,
    skip: cursor ? 1 : 0, // Skip cursor se fornecido
    cursor: cursor ? { id: cursor } : undefined,
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      contact: true,
      _count: { select: { messages: true } },
    },
  });
}

// Paginacao com offset (mais simples, menos eficiente)
async function getTicketsOffset(companyId: string, page = 1, limit = 20) {
  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ticket.count({ where: { companyId } }),
  ]);

  return {
    data: tickets,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
```

## Problemas de Migrations

### Erro ao rodar migration

**Sintomas:**
```
Error: P3009 migrate found failed migrations in the target database
```

**Solucoes:**
```bash
# Ver status das migrations
cd /var/www/chatblue/apps/api
pnpm prisma migrate status

# Resolver migration falhada
pnpm prisma migrate resolve --rolled-back "migration_name"

# Ou marcar como aplicada (se os dados ja estao corretos)
pnpm prisma migrate resolve --applied "migration_name"

# Rodar migrations pendentes
pnpm prisma migrate deploy
```

### Migration trava

**Solucoes:**
```bash
# Verificar locks no banco
sudo -u postgres psql -d chatblue_production -c "
SELECT pid, usename, query, state, wait_event_type
FROM pg_stat_activity
WHERE wait_event_type IS NOT NULL;"

# Cancelar query travada
sudo -u postgres psql -c "SELECT pg_cancel_backend(PID);"

# Forcar termino (use com cuidado)
sudo -u postgres psql -c "SELECT pg_terminate_backend(PID);"
```

### Resetar banco em desenvolvimento

```bash
# CUIDADO: Isso apaga todos os dados!
# Apenas para desenvolvimento

cd /var/www/chatblue/apps/api

# Reset completo
pnpm prisma migrate reset

# Ou manualmente
sudo -u postgres psql -c "DROP DATABASE chatblue_development;"
sudo -u postgres psql -c "CREATE DATABASE chatblue_development OWNER chatblue;"
pnpm prisma migrate dev
pnpm prisma db seed
```

## Problemas de Dados

### Verificar integridade

```bash
# Verificar constraints violadas
sudo -u postgres psql -d chatblue_production -c "
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'f';" # Foreign keys

# Verificar orfaos (mensagens sem ticket)
sudo -u postgres psql -d chatblue_production -c "
SELECT COUNT(*)
FROM messages m
LEFT JOIN tickets t ON m.ticket_id = t.id
WHERE t.id IS NULL;"

# Verificar duplicatas
sudo -u postgres psql -d chatblue_production -c "
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;"
```

### Corrigir dados corrompidos

```bash
# Remover orfaos
sudo -u postgres psql -d chatblue_production -c "
DELETE FROM messages
WHERE ticket_id NOT IN (SELECT id FROM tickets);"

# Corrigir timestamps invalidos
sudo -u postgres psql -d chatblue_production -c "
UPDATE messages
SET created_at = updated_at
WHERE created_at > updated_at;"
```

### Soft delete nao funcionando

```typescript
// Verificar middleware de soft delete no Prisma
// prisma/schema.prisma
model Ticket {
  id        String    @id @default(cuid())
  deletedAt DateTime? // Campo para soft delete
  // ...
}

// Middleware para filtrar deletados
prisma.$use(async (params, next) => {
  if (params.model === 'Ticket') {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }
  }
  return next(params);
});

// Soft delete em vez de hard delete
async function deleteTicket(id: string) {
  return await prisma.ticket.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

## Manutencao do Banco

### VACUUM e ANALYZE

```bash
# Rodar VACUUM (recuperar espaco)
sudo -u postgres psql -d chatblue_production -c "VACUUM VERBOSE;"

# VACUUM FULL (mais agressivo, bloqueia tabela)
sudo -u postgres psql -d chatblue_production -c "VACUUM FULL VERBOSE messages;"

# ANALYZE (atualizar estatisticas)
sudo -u postgres psql -d chatblue_production -c "ANALYZE VERBOSE;"

# Agendar autovacuum
sudo nano /etc/postgresql/16/main/postgresql.conf
```

```ini
# Configuracoes de autovacuum
autovacuum = on
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
```

### Verificar tamanho do banco

```bash
# Tamanho total
sudo -u postgres psql -d chatblue_production -c "
SELECT pg_size_pretty(pg_database_size('chatblue_production'));"

# Tamanho por tabela
sudo -u postgres psql -d chatblue_production -c "
SELECT relname as table,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size,
       pg_size_pretty(pg_relation_size(relid)) as data_size,
       pg_size_pretty(pg_indexes_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;"

# Tabela mais pesada detalhada
sudo -u postgres psql -d chatblue_production -c "
SELECT count(*) as rows,
       pg_size_pretty(pg_total_relation_size('messages')) as size
FROM messages;"
```

### Arquivar dados antigos

```typescript
// Script para arquivar mensagens antigas
async function archiveOldMessages(daysOld: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Mover para tabela de arquivo
  await prisma.$executeRaw`
    INSERT INTO messages_archive
    SELECT * FROM messages
    WHERE created_at < ${cutoffDate}
    AND ticket_id IN (SELECT id FROM tickets WHERE status = 'closed')
  `;

  // Deletar originais
  const deleted = await prisma.message.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      ticket: { status: 'closed' },
    },
  });

  console.log(`Arquivadas ${deleted.count} mensagens`);
}
```

## Backup e Restore

### Backup rapido

```bash
# Backup comprimido
sudo -u postgres pg_dump -Fc chatblue_production > backup.dump

# Backup apenas schema
sudo -u postgres pg_dump --schema-only chatblue_production > schema.sql

# Backup de tabela especifica
sudo -u postgres pg_dump -t messages chatblue_production > messages.sql
```

### Restore

```bash
# Restore de dump
sudo -u postgres pg_restore -d chatblue_production backup.dump

# Restore de SQL
sudo -u postgres psql -d chatblue_production < backup.sql

# Restore para novo banco
sudo -u postgres createdb chatblue_restored
sudo -u postgres pg_restore -d chatblue_restored backup.dump
```

## Monitoramento

### Script de verificacao diaria

```bash
sudo nano /usr/local/bin/check-database-health.sh
```

```bash
#!/bin/bash

DB_NAME="chatblue_production"
LOG_FILE="/var/log/chatblue/db-health.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando verificacao do banco" >> $LOG_FILE

# Conexoes ativas
CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';")
echo "Conexoes ativas: $CONNECTIONS" >> $LOG_FILE

# Tamanho do banco
SIZE=$(sudo -u postgres psql -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
echo "Tamanho do banco: $SIZE" >> $LOG_FILE

# Queries lentas
SLOW=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '30 seconds';")
echo "Queries lentas (>30s): $SLOW" >> $LOG_FILE

# Dead tuples (precisam de VACUUM)
DEAD=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT sum(n_dead_tup) FROM pg_stat_user_tables;")
echo "Dead tuples: $DEAD" >> $LOG_FILE

# Alertas
if [ "$SLOW" -gt 5 ]; then
    echo "[ALERTA] Muitas queries lentas!" >> $LOG_FILE
fi

if [ "$CONNECTIONS" -gt 100 ]; then
    echo "[ALERTA] Muitas conexoes ativas!" >> $LOG_FILE
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Verificacao concluida" >> $LOG_FILE
```

## Boas Praticas

:::tip Recomendacoes
1. **Connection Pool**: Sempre use pool de conexoes
2. **Indices**: Crie indices para campos frequentemente filtrados
3. **Paginacao**: Use cursor-based para grandes datasets
4. **Select**: Selecione apenas campos necessarios
5. **N+1**: Use include/join para evitar queries extras
6. **Monitoring**: Monitore conexoes e queries lentas
7. **Backup**: Faca backups regulares e teste restores
8. **Vacuum**: Mantenha autovacuum configurado adequadamente
:::

## Proximos Passos

- [Performance](/troubleshooting/performance)
- [Backup](/deploy/backup)
