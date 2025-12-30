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

send "echo '=== Verificando como webhookRouter é registrada no server.js ==='\r"
expect "# "
send "grep -n 'webhook' dist/server.js | head -10\r"
expect "# "

send "echo '=== Verificando se a rota existe no arquivo de rotas ==='\r"
expect "# "
send "grep -n 'meta/:connectionId' dist/routes/webhook.routes.js | head -5\r"
expect "# "

send "echo '=== Testando localmente com /webhooks ==='\r"
expect "# "
send {curl -s "http://localhost:3001/webhooks/meta/cmjr5gonq00534lywu2h17f6h?hub.mode=subscribe&hub.verify_token=6823565c63ea383160459bcd59dda24a&hub.challenge=test123" | head -c 200}
send "\r"
expect "# "

send "echo ''\r"
expect "# "

send "exit\r"
expect eof

