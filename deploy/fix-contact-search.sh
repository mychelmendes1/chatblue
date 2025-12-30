#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy fixed contact routes
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/routes/contact.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/contact.routes.ts
expect "password:" { send "${password}\r" }
expect eof

# SSH to compile and restart
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando contact.routes.ts ==='\r"
expect "# "
send "npx tsc src/routes/contact.routes.ts --outDir dist/routes --skipLibCheck --esModuleInterop --module NodeNext --moduleResolution NodeNext --target ES2020 2>&1 || echo 'Compilação individual falhou - tentando build geral'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "curl -s http://localhost:3001/api/health || echo 'Health check falhou'\r"
expect "# "

send "exit\r"
expect eof

