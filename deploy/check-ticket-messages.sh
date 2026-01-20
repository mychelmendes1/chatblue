#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Verificando ticket e mensagens ==='\r"
expect "# "
send {docker exec chatblue_postgres psql -U chatblue -d chatblue -c "SELECT t.id, t.status, c.name, c.phone, t.connection_id FROM tickets t JOIN contacts c ON t.contact_id = c.id WHERE t.id = 'cmjsjyeue000brsnfv3v24i1s';"}
send "\r"
expect "# "

send "echo '=== Todas as mensagens deste ticket ==='\r"
expect "# "
send {docker exec chatblue_postgres psql -U chatblue -d chatblue -c "SELECT id, content, type, status, is_from_me, created_at FROM messages WHERE ticket_id = 'cmjsjyeue000brsnfv3v24i1s' ORDER BY created_at DESC;"}
send "\r"
expect "# "

send "echo '=== Verificando conexão ==='\r"
expect "# "
send {docker exec chatblue_postgres psql -U chatblue -d chatblue -c "SELECT id, name, type FROM whatsapp_connections WHERE id IN (SELECT connection_id FROM tickets WHERE id = 'cmjsjyeue000brsnfv3v24i1s');"}
send "\r"
expect "# "

send "exit\r"
expect eof










