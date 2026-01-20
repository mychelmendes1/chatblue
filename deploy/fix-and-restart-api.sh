#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Corrigindo código e reiniciando API ==="

# Copiar arquivo corrigido
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/services/ai/context-builder.service.ts \
    ${user}@${server}:/tmp/context-builder-fixed.service.ts

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

# SSH e aplicar correção
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

send "echo '=== Aplicando correção no context-builder.service.ts ==='\r"
expect "# "

send "sed -i \"s/ticket\\.assignedTo\\?\\.id/ticket.assignedToId || undefined/g\" src/services/ai/context-builder.service.ts\r"
expect "# "

send "grep -n 'assignedToId' src/services/ai/context-builder.service.ts | head -2\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -10\r"
expect "# "

send "echo '=== Verificando se build foi bem-sucedido ==='\r"
expect "# "

send "ls -la dist/server.js dist/server.cjs 2>&1 | head -3\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | tail -15\r"
expect "# "

send "echo '=== Correção e reinicialização concluídas! ==='\r"
expect "# "

send "exit\r"
expect eof




