#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando tickets das mensagens falhadas ==="

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

send "echo '=== Mensagens recentes com ticket_id ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT m.id, m.content, m.status, m.failed_reason, m.ticket_id, m.connection_id, t.protocol, t.connection_id as ticket_conn_id FROM messages m JOIN tickets t ON m.ticket_id = t.id WHERE m.is_from_me = true ORDER BY m.created_at DESC LIMIT 10;\" 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Comparando connection_id da mensagem vs ticket ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT m.content, m.status, m.connection_id as msg_conn, t.connection_id as ticket_conn, (m.connection_id = t.connection_id) as match FROM messages m JOIN tickets t ON m.ticket_id = t.id WHERE m.is_from_me = true ORDER BY m.created_at DESC LIMIT 10;\" 2>&1\r"
expect "# "

send "exit\r"
expect eof

