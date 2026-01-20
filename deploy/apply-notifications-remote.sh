#!/bin/bash

cd /opt/chatblue/app/apps/api

echo "=== Verificando variáveis de ambiente do banco ==="
DATABASE_URL=$(grep DATABASE_URL .env | head -1 | cut -d'"' -f2)

if [ -z "$DATABASE_URL" ]; then
    echo "ERRO: DATABASE_URL não encontrado no .env"
    exit 1
fi

echo "DATABASE_URL encontrado"

# Tentar via Docker primeiro
echo "=== Tentando aplicar SQL via Docker ==="
if docker ps | grep -q chatblue-db; then
    echo "Aplicando via container chatblue-db..."
    docker exec -i chatblue-db psql -U chatblue -d chatblue < /tmp/create_notifications_table.sql
    if [ $? -eq 0 ]; then
        echo "✓ SQL aplicado com sucesso via Docker!"
        docker exec -i chatblue-db psql -U chatblue -d chatblue -c "SELECT COUNT(*) FROM notifications;"
        exit 0
    fi
fi

if docker ps | grep -q chatblue-postgres; then
    echo "Aplicando via container chatblue-postgres..."
    docker exec -i chatblue-postgres psql -U chatblue -d chatblue < /tmp/create_notifications_table.sql
    if [ $? -eq 0 ]; then
        echo "✓ SQL aplicado com sucesso via Docker!"
        docker exec -i chatblue-postgres psql -U chatblue -d chatblue -c "SELECT COUNT(*) FROM notifications;"
        exit 0
    fi
fi

# Tentar conexão direta
echo "=== Tentando conexão direta ao PostgreSQL ==="
export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

echo "Conectando: Host=$DB_HOST, Port=$DB_PORT, DB=$DB_NAME, User=$DB_USER"

if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ]; then
    psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f /tmp/create_notifications_table.sql
    if [ $? -eq 0 ]; then
        echo "✓ SQL aplicado com sucesso!"
        psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM notifications;"
        exit 0
    fi
fi

# Se localhost, tentar via socket
if [ "$DB_HOST" = "localhost" ] || [ -z "$DB_HOST" ]; then
    echo "Tentando conexão via socket Unix..."
    psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/create_notifications_table.sql 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ SQL aplicado com sucesso!"
        psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM notifications;"
        exit 0
    else
        echo "ERRO: Não foi possível conectar ao banco de dados"
        echo "Verifique se o PostgreSQL está rodando e acessível"
        exit 1
    fi
fi






