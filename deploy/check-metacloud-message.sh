#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando mensagens para 556198626334 via Meta Cloud ==="

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

send "echo '=== Mensagens recentes para 556198626334 ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT m.id, m.content, m.status, m.failed_reason, m.wamid, wc.name as connection_name, wc.type, m.created_at FROM messages m JOIN tickets t ON m.ticket_id = t.id JOIN contacts c ON t.contact_id = c.id LEFT JOIN whatsapp_connections wc ON m.connection_id = wc.id WHERE c.phone = '556198626334' AND m.is_from_me = true ORDER BY m.created_at DESC LIMIT 10;\" 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Logs recentes de Meta Cloud ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 100 --nostream 2>&1 | grep -iE 'meta|cloud|template|556198626334' | tail -20\r"
expect "# "

send "exit\r"
expect eof



