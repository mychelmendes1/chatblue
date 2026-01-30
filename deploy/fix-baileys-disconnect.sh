#!/usr/bin/expect -f

set timeout 180
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo problema de desconexão do Baileys ==="

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

# Stop the API first to prevent issues during update
send "echo '=== Parando API para atualização ==='\r"
expect "# "

send "pm2 stop chatblue-api\r"
expect "# "

# Backup current files
send "echo '=== Fazendo backup dos arquivos atuais ==='\r"
expect "# "

send "cp /opt/chatblue/app/apps/api/src/services/whatsapp/baileys.service.ts /opt/chatblue/app/apps/api/src/services/whatsapp/baileys.service.ts.bak 2>/dev/null || true\r"
expect "# "

send "cp /opt/chatblue/app/apps/api/src/routes/connection.routes.ts /opt/chatblue/app/apps/api/src/routes/connection.routes.ts.bak 2>/dev/null || true\r"
expect "# "

send "echo '=== Backup concluído ==='\r"
expect "# "

send "exit\r"
expect eof

puts "=== Backup concluído, agora enviando arquivos corrigidos ==="
