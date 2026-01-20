#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Corrigindo context-builder e aplicando migration ==="

# Copiar arquivo corrigido
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/services/ai/context-builder.service.ts \
    ${user}@${server}:/tmp/context-builder.service.ts

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

puts "=== Arquivo copiado. Conectando ao servidor... ==="

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

send "echo '=== Verificando status do banco ==='\r"
expect "# "

send "pg_isready -h localhost -p 5432 2>&1\r"
expect "# "

send "echo '=== Fazendo backup antes da migration ==='\r"
expect "# "

send "cd /opt/chatblue && pg_dump -U chatblue -h localhost chatblue > /tmp/chatblue_backup_before_knowledge_contexts_$(date +%Y%m%d_%H%M%S).sql 2>&1 | tail -5\r"
expect "# "

send "echo '=== Backup criado. Movendo arquivo corrigido ==='\r"
expect "# "

send "cp /tmp/context-builder.service.ts src/services/ai/\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -15\r"
expect "# "

send "echo '=== Executando migration (somente cria novas tabelas, não altera existentes) ==='\r"
expect "# "

send "pnpm prisma migrate deploy 2>&1\r"
expect "# "

send "echo '=== Verificando se as tabelas foram criadas ==='\r"
expect "# "

send "psql -U chatblue -h localhost -d chatblue -c \"\\dt knowledge*\" 2>&1 | head -10\r"
expect "# "

send "echo '=== Verificando se as tabelas existentes estão intactas ==='\r"
expect "# "

send "psql -U chatblue -h localhost -d chatblue -c \"SELECT COUNT(*) as total_tickets FROM tickets;\" 2>&1 | grep -A 1 total_tickets\r"
expect "# "

send "psql -U chatblue -h localhost -d chatblue -c \"SELECT COUNT(*) as total_contacts FROM contacts;\" 2>&1 | grep -A 1 total_contacts\r"
expect "# "

send "echo '=== Reiniciando serviço API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | tail -15\r"
expect "# "

send "echo '=== Deploy e migration concluídos ==='\r"
expect "# "

send "exit\r"
expect eof




