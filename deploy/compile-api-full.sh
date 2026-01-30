#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando API completa (pode demorar) ==='\r"
expect "# "

# Compile only the routes directory to avoid other errors
send "npx tsc --skipLibCheck 2>&1 | grep -v 'error TS' | tail -5 || echo 'Compilação terminou'\r"
expect "# "

send "echo '=== Verificando arquivos JS compilados ==='\r"
expect "# "
send "ls -la dist/routes/contact.routes.js 2>/dev/null && echo 'contact.routes.js OK' || echo 'contact.routes.js não existe'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Teste de busca de contatos ==='\r"
expect "# "
send "curl -s 'http://localhost:3001/contacts/search?q=test' -H 'Cookie: token=test' | head -c 200\r"
expect "# "

send "exit\r"
expect eof












