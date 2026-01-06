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

send "echo '=== Verificando se a rota search está no JS ==='\r"
expect "# "
send "grep -n 'search' dist/routes/contact.routes.js | head -10\r"
expect "# "

send "echo '=== Verificando se a rota está registrada no app ==='\r"
expect "# "
send "grep -n 'contactRouter' dist/app.js | head -5\r"
expect "# "

send "echo '=== Verificando logs recentes ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 20 --nostream\r"
expect "# "

send "exit\r"
expect eof





