#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Verificando conexões META_CLOUD ==='\r"
expect "# "
send "psql -U chatblue -d chatblue -c \"SELECT id, name, type, status, phone_number_id, business_id FROM whatsapp_connections WHERE type='META_CLOUD' AND is_active=true;\" 2>/dev/null\r"
expect "# "

send "echo '=== Logs recentes da API ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 30 --nostream 2>&1 | grep -i 'template\\|error\\|failed' | tail -20\r"
expect "# "

send "echo '=== Verificando se a rota templates existe no JS ==='\r"
expect "# "
send "grep -n 'templates' dist/routes/connection.routes.js | head -10\r"
expect "# "

send "exit\r"
expect eof





