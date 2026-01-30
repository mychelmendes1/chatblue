#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy fixed meta-cloud service
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/services/whatsapp/meta-cloud.service.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/services/whatsapp/meta-cloud.service.ts
expect "password:" { send "${password}\r" }
expect eof

# SSH to compile and restart
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando meta-cloud.service.ts ==='\r"
expect "# "
send "npx tsc --skipLibCheck 2>&1 | grep -E 'error TS|meta-cloud' | head -10 || echo 'OK'\r"
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












