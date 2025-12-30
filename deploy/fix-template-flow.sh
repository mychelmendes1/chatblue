#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated ticket.routes.ts
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/routes/ticket.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/ticket.routes.ts
expect "password:" { send "${password}\r" }
expect eof

# SSH to compile and restart
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando ticket.routes.ts ==='\r"
expect "# "
send "npx tsc src/routes/ticket.routes.ts --outDir dist --esModuleInterop --resolveJsonModule --skipLibCheck 2>&1 | tail -5\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

