#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated files
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/components/chat/template-selector.tsx ${user}@${server}:/opt/chatblue/app/apps/web/components/chat/template-selector.tsx
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/components/chat/chat-sidebar.tsx ${user}@${server}:/opt/chatblue/app/apps/web/components/chat/chat-sidebar.tsx
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/routes/message.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/message.routes.ts
expect "password:" { send "${password}\r" }
expect eof

# SSH to compile and restart
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/web\r"
expect "# "

send "echo '=== Compilando Frontend ==='\r"
expect "# "
send "pnpm build 2>&1 | tail -15\r"
expect "# "

send "echo '=== Reiniciando Frontend ==='\r"
expect "# "
send "pm2 restart chatblue-web\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando message.routes.ts ==='\r"
expect "# "
send "npx tsc src/routes/message.routes.ts --outDir dist --esModuleInterop --resolveJsonModule --skipLibCheck 2>&1 | tail -5\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof





