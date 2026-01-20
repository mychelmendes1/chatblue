#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Deploy Knowledge Contexts System ==="

# Lista de arquivos para copiar
set files {
    "apps/api/src/services/knowledge/ingestion.service.ts"
    "apps/api/src/services/knowledge/context-retrieval.service.ts"
    "apps/api/src/services/knowledge/embedding.service.ts"
    "apps/api/src/services/notion/notion.service.ts"
    "apps/api/src/services/ai/context-builder.service.ts"
    "apps/api/src/routes/knowledge-context.routes.ts"
    "apps/api/src/server.ts"
    "apps/api/prisma/schema.prisma"
    "apps/api/prisma/migrations/20250112190000_add_knowledge_contexts/migration.sql"
    "apps/api/package.json"
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

send "echo '=== Instalando dependência mammoth ==='\r"
expect "# "

send "pnpm add mammoth 2>&1 | tail -5\r"
expect "# "

send "echo '=== Movendo arquivos atualizados ==='\r"
expect "# "

send "mkdir -p src/services/knowledge\r"
expect "# "

send "cp /tmp/ingestion.service.ts src/services/knowledge/\r"
expect "# "

send "cp /tmp/context-retrieval.service.ts src/services/knowledge/\r"
expect "# "

send "cp /tmp/embedding.service.ts src/services/knowledge/\r"
expect "# "

send "cp /tmp/notion.service.ts src/services/notion/\r"
expect "# "

send "cp /tmp/context-builder.service.ts src/services/ai/\r"
expect "# "

send "cp /tmp/knowledge-context.routes.ts src/routes/\r"
expect "# "

send "cp /tmp/server.ts src/\r"
expect "# "

send "cp /tmp/schema.prisma prisma/\r"
expect "# "

send "mkdir -p prisma/migrations/20250112190000_add_knowledge_contexts\r"
expect "# "

send "cp /tmp/migration.sql prisma/migrations/20250112190000_add_knowledge_contexts/\r"
expect "# "

send "cp /tmp/package.json .\r"
expect "# "

send "echo '=== Gerando Prisma Client ==='\r"
expect "# "

send "pnpm prisma generate 2>&1 | tail -10\r"
expect "# "

send "echo '=== Executando migration ==='\r"
expect "# "

send "pnpm prisma migrate deploy 2>&1 | tail -20\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -30\r"
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
