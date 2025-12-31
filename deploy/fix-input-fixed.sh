#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated files
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/components/chat/chat-window.tsx ${user}@${server}:/opt/chatblue/app/apps/web/components/chat/chat-window.tsx
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/app/\(dashboard\)/chat/page.tsx ${user}@${server}:/opt/chatblue/app/apps/web/app/\(dashboard\)/chat/page.tsx
expect "password:" { send "${password}\r" }
expect eof

spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/app/\(dashboard\)/layout.tsx ${user}@${server}:/opt/chatblue/app/apps/web/app/\(dashboard\)/layout.tsx
expect "password:" { send "${password}\r" }
expect eof

# SSH to rebuild frontend
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/web\r"
expect "# "

send "echo '=== Compilando Frontend ==='\r"
expect "# "
send "pnpm build 2>&1 | tail -20\r"
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

