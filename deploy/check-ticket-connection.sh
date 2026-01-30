#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando conexão do ticket ==="

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

send "echo '=== Tickets recentes com suas conexões ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT t.id, t.protocol, t.status, t.connection_id, c.name as contact_name, c.phone, wc.name as connection_name, wc.type as conn_type FROM tickets t JOIN contacts c ON t.contact_id = c.id JOIN whatsapp_connections wc ON t.connection_id = wc.id ORDER BY t.created_at DESC LIMIT 5;\" 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Mensagens recentes com suas conexões ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT m.id, m.content, m.status, m.is_from_me, m.failed_reason, wc.name as connection_name, wc.type as conn_type, m.created_at FROM messages m LEFT JOIN whatsapp_connections wc ON m.connection_id = wc.id WHERE m.is_from_me = true ORDER BY m.created_at DESC LIMIT 10;\" 2>&1\r"
expect "# "

send "exit\r"
expect eof



