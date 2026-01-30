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

send "echo '=== Ordem das rotas GET no arquivo JS ==='\r"
expect "# "
send "grep -n \"router.get\" dist/routes/contact.routes.js | head -20\r"
expect "# "

send "echo '=== Verificando número de linhas da rota search vs :id ==='\r"
expect "# "
send "grep -n 'router.get.*search' dist/routes/contact.routes.js\r"
expect "# "
send "grep -n 'router.get.*/:id' dist/routes/contact.routes.js\r"
expect "# "

send "exit\r"
expect eof












