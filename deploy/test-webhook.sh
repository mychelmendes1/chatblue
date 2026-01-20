#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Verificando webhook token no banco ==='\r"
expect "# "
send {docker exec chatblue_postgres psql -U chatblue -d chatblue -c "SELECT id, webhook_token FROM whatsapp_connections WHERE id='cmjr5gonq00534lywu2h17f6h';"}
send "\r"
expect "# "

send "echo '=== Testando webhook localmente ==='\r"
expect "# "
send {curl -s "http://localhost:3001/webhooks/meta/cmjr5gonq00534lywu2h17f6h?hub.mode=subscribe&hub.verify_token=6823565c63ea383160459bcd59dda24a&hub.challenge=test123"}
send "\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando via HTTPS externo ==='\r"
expect "# "
send {curl -s "https://chat.grupoblue.com.br/webhooks/meta/cmjr5gonq00534lywu2h17f6h?hub.mode=subscribe&hub.verify_token=6823565c63ea383160459bcd59dda24a&hub.challenge=test123"}
send "\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando logs de erro ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | grep -i 'webhook\\|error' | tail -10\r"
expect "# "

send "exit\r"
expect eof










