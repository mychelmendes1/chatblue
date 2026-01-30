#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy modified files via SCP
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/routes/connection.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/connection.routes.ts
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/routes/message.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/message.routes.ts
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/routes/contact.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/contact.routes.ts
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/services/message-processor.service.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/services/message-processor.service.ts
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/components/chat/template-selector.tsx ${user}@${server}:/opt/chatblue/app/apps/web/components/chat/template-selector.tsx
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/components/chat/chat-sidebar.tsx ${user}@${server}:/opt/chatblue/app/apps/web/components/chat/chat-sidebar.tsx
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/components/chat/chat-window.tsx ${user}@${server}:/opt/chatblue/app/apps/web/components/chat/chat-window.tsx
expect "password:" { send "${password}\r" }
expect eof

# Now SSH to compile and restart
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app\r"
expect "# "

send "echo '=== Compilando API ==='\r"
expect "# "
send "cd apps/api && npx tsc --skipLibCheck 2>&1 | grep -E 'error TS' | head -10 || echo 'Compilação OK'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "echo '=== Compilando Frontend ==='\r"
expect "# "
send "cd /opt/chatblue/app/apps/web && pnpm build 2>&1 | tail -20\r"
expect "# "

send "echo '=== Reiniciando Frontend ==='\r"
expect "# "
send "pm2 restart chatblue-web\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof












