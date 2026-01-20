#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app\r"
expect "# "

send "echo '=== Parando PM2 ==='\r"
expect "# "
send "pm2 stop all\r"
expect "# "

send "sleep 2\r"
expect "# "

send "echo '=== Iniciando PM2 ==='\r"
expect "# "
send "pm2 start all\r"
expect "# "

send "sleep 8\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Teste da rota search com token válido (via API) ==='\r"
expect "# "
# Just test if route exists
send "curl -s -o /dev/null -w '%{http_code}' 'http://localhost:3001/api/contacts/search?q=test'\r"
expect "# "

send "exit\r"
expect eof










