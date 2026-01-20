#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando logs de envio de mensagem ==="

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

send "echo '=== Últimos logs da API (mensagens) ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 100 --nostream | grep -iE 'message|send|error|fail|baileys|meta' | tail -50\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimos erros da API ==='\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 30 --nostream | tail -30\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Status das conexões WhatsApp ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx tsx -e \"const { prisma } = require('./src/config/database.js'); prisma.whatsAppConnection.findMany({ select: { id: true, name: true, type: true, status: true, phone: true } }).then(c => console.log(JSON.stringify(c, null, 2))).finally(() => prisma.\\$disconnect())\" 2>&1 | tail -20\r"
expect "# "

send "exit\r"
expect eof

