#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy message.routes.ts via SCP
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/api/src/routes/message.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/message.routes.ts

expect {
    "password:" {
        send "${password}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${password}\r"
    }
}

expect eof

# Copy chat-sidebar.tsx via SCP
spawn scp -o StrictHostKeyChecking=no ${local_base}/apps/web/components/chat/chat-sidebar.tsx ${user}@${server}:/opt/chatblue/app/apps/web/components/chat/chat-sidebar.tsx

expect {
    "password:" {
        send "${password}\r"
    }
}

expect eof

# Now SSH to compile and restart
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${password}\r"
    }
}

expect "# "
send "cd /opt/chatblue/app\r"
expect "# "

send "echo '=== Recompilando API (ignorando erros em arquivos não modificados) ==='\r"
expect "# "
send "cd apps/api && npx tsc --skipLibCheck 2>&1 | grep -E '(message\\.routes|error TS)' | head -20 || echo 'Compilação concluída'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "echo '=== Recompilando Frontend ==='\r"
expect "# "
send "cd /opt/chatblue/app/apps/web && pnpm build 2>&1 | tail -15\r"
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










