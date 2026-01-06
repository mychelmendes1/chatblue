#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated server.ts
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/server.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/server.ts
expect "password:" { send "${password}\r" }
expect eof

# SSH to compile and restart
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando server.ts ==='\r"
expect "# "
send "npx tsc src/server.ts --outDir dist --esModuleInterop --resolveJsonModule --skipLibCheck 2>&1 | tail -5\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 3\r"
expect "# "

send "echo '=== Verificando se a rota mudou ==='\r"
expect "# "
send "grep -n 'webhooks' dist/server.js | head -3\r"
expect "# "

send "echo '=== Testando webhook ==='\r"
expect "# "
send {curl -s "http://localhost:3001/webhooks/meta/cmjr5gonq00534lywu2h17f6h?hub.mode=subscribe&hub.verify_token=6823565c63ea383160459bcd59dda24a&hub.challenge=test123"}
send "\r"
expect "# "

send "echo ''\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof





