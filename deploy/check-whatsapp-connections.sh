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
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c 'SELECT id, name, type, status, is_active, phone_number_id, business_id FROM whatsapp_connections;'\r"
expect "# "

send "echo '=== Conexões META_CLOUD ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, status, access_token IS NOT NULL as has_token, phone_number_id, business_id FROM whatsapp_connections WHERE type='META_CLOUD';\"\r"
expect "# "

send "exit\r"
expect eof

