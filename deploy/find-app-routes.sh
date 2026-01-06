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

send "echo '=== Arquivos JS no dist ==='\r"
expect "# "
send "ls dist/*.js 2>/dev/null\r"
expect "# "

send "echo '=== Verificando onde contactRouter é usado ==='\r"
expect "# "
send "grep -r 'contactRouter' dist/ 2>/dev/null | head -10\r"
expect "# "

send "echo '=== Verificando como as rotas são montadas ==='\r"
expect "# "
send "grep -n 'app.use.*contact' dist/*.js 2>/dev/null\r"
expect "# "

send "echo '=== Conteúdo do index.js ==='\r"
expect "# "
send "grep -n 'Router\\|use.*/' dist/index.js | head -20\r"
expect "# "

send "exit\r"
expect eof





