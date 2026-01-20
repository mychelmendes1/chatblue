#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Deploy Blue Assistant ==="

# Lista de arquivos para copiar
set files {
    "apps/api/src/services/blue/blue.service.ts"
    "apps/api/src/services/blue/blue-context-builder.service.ts"
    "apps/api/src/services/blue/code-rag.service.ts"
    "apps/api/src/services/blue/doc-rag.service.ts"
    "apps/api/src/routes/blue.routes.ts"
    "apps/api/src/scripts/ingest-codebase.ts"
    "apps/api/prisma/migrations/20250112203000_add_blue_assistant/migration.sql"
}

# Copiar arquivos
foreach file $files {
    puts "Copiando $file..."
    spawn scp -o StrictHostKeyChecking=no \
        ${local_base}/${file} \
        ${user}@${server}:/tmp/[file tail $file]
    
    expect {
        "password:" {
            send "${password}\r"
        }
        "yes/no" {
            send "yes\r"
            expect "password:"
            send "${password}\r"
        }
    }
    
    expect eof
}

puts "=== Arquivos copiados. Conectando ao servidor... ==="

# SSH e deploy
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${password}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${password}\r"
    }
}

expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Movendo arquivos Blue Assistant ==='\r"
expect "# "

send "mkdir -p src/services/blue\r"
expect "# "

send "cp /tmp/blue.service.ts src/services/blue/\r"
expect "# "

send "cp /tmp/blue-context-builder.service.ts src/services/blue/\r"
expect "# "

send "cp /tmp/code-rag.service.ts src/services/blue/\r"
expect "# "

send "cp /tmp/doc-rag.service.ts src/services/blue/\r"
expect "# "

send "cp /tmp/blue.routes.ts src/routes/\r"
expect "# "

send "mkdir -p src/scripts\r"
expect "# "

send "cp /tmp/ingest-codebase.ts src/scripts/\r"
expect "# "

send "mkdir -p prisma/migrations/20250112203000_add_blue_assistant\r"
expect "# "

send "cp /tmp/migration.sql prisma/migrations/20250112203000_add_blue_assistant/\r"
expect "# "

send "echo '=== Gerando Prisma Client ==='\r"
expect "# "

send "pnpm prisma generate 2>&1 | tail -10\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -30\r"
expect "# "

send "echo '=== Executando migration ==='\r"
expect "# "

send "pnpm prisma migrate deploy 2>&1 | tail -20\r"
expect "# "

send "echo '=== Verificando tabela blue_interactions ==='\r"
expect "# "

send "PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2) psql -U chatblue -h localhost -d chatblue -c \"\\dt blue_interactions\" 2>&1 | head -5\r"
expect "# "

send "echo '=== Reiniciando serviço API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 logs chatblue-api --lines 20 --nostream\r"
expect "# "

send "echo '=== Deploy concluído ==='\r"
expect "# "

send "exit\r"
expect eof
