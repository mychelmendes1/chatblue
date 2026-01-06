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

send "echo '=== Verificando import no server.js ==='\r"
expect "# "
send "grep -n 'contact_routes' dist/server.js | head -5\r"
expect "# "

send "echo '=== Comparando arquivos ==='\r"
expect "# "
send "md5sum dist/routes/contact.routes.js dist/routes/routes/contact.routes.js 2>/dev/null\r"
expect "# "

send "echo '=== Verificando rota search em cada arquivo ==='\r"
expect "# "
send "grep \"router.get.*search\" dist/routes/contact.routes.js\r"
expect "# "
send "grep \"router.get.*search\" dist/routes/routes/contact.routes.js 2>/dev/null || echo 'não existe em routes/routes'\r"
expect "# "

send "echo '=== Estrutura de dist/routes ==='\r"
expect "# "
send "ls -la dist/routes/\r"
expect "# "

send "exit\r"
expect eof





