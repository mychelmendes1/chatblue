#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Logs recentes da API (últimos 100) ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 100 --nostream 2>&1 | grep -i '556198626334\\|template\\|error\\|failed\\|send' | tail -40\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificar mensagens enviadas para este contato ==='\r"
expect "# "
send {docker exec chatblue_postgres psql -U chatblue -d chatblue -c "SELECT m.id, m.content, m.status, m.wamid, m.failed_reason, m.created_at FROM messages m JOIN tickets t ON m.ticket_id = t.id JOIN contacts c ON t.contact_id = c.id WHERE c.phone LIKE '%556198626334%' ORDER BY m.created_at DESC LIMIT 5;"}
send "\r"
expect "# "

send "exit\r"
expect eof

