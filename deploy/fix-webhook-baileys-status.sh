#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy da correção do webhook para Baileys ==="
puts ""

# Copiar arquivo corrigido
spawn scp -o StrictHostKeyChecking=no \
    apps/api/src/routes/webhook.routes.ts \
    ${user}@${server}:/tmp/

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

send "echo '=== Copiando arquivo corrigido ==='\r"
expect "# "

send "cp /tmp/webhook.routes.ts /opt/chatblue/app/apps/api/src/routes/\r"
expect "# "

send "echo '=== Compilando código ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -40\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "echo '=== Verificando status ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof



