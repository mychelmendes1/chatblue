#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando envio WhatsApp ==="

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

send "echo '=== Logs de envio Baileys/WhatsApp ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 150 --nostream 2>&1 | grep -iE 'sendMessage|sending|sent|baileys|whatsapp|relay' | tail -30\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Status das conexões WhatsApp ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, type, status, phone FROM whatsapp_connections WHERE is_active = true;\" 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimas mensagens enviadas (fromMe=true) ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, content, status, is_from_me, failed_reason, created_at FROM messages WHERE is_from_me = true ORDER BY created_at DESC LIMIT 5;\" 2>&1\r"
expect "# "

send "exit\r"
expect eof

