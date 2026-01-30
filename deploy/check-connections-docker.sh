#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Listando conexões WhatsApp ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c 'SELECT id, name, type, status, \"isActive\", \"phoneNumberId\", \"businessId\" FROM \"WhatsAppConnection\";'\r"
expect "# "

send "echo '=== Detalhes da conexão META_CLOUD (se houver) ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, \\\"accessToken\\\" IS NOT NULL as has_token, \\\"phoneNumberId\\\", \\\"businessId\\\" FROM \\\"WhatsAppConnection\\\" WHERE type='META_CLOUD';\"\r"
expect "# "

send "exit\r"
expect eof












