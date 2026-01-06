#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Últimos logs da API (sem filtro) ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 80 --nostream 2>&1 | tail -60\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimas mensagens de template no banco ==='\r"
expect "# "
send {docker exec chatblue_postgres psql -U chatblue -d chatblue -c "SELECT id, content, type, status, wamid, failed_reason, ticket_id, created_at FROM messages WHERE content LIKE '%Template%' ORDER BY created_at DESC LIMIT 10;"}
send "\r"
expect "# "

send "exit\r"
expect eof





