#!/usr/bin/expect -f
set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# 1. PM2 status
send "pm2 status\r"
expect "# "

# 2. Logs do web (Next.js) - últimas 50 linhas de erro
send "pm2 logs chatblue-web --nostream --lines 50 2>&1 | tail -50\r"
expect -timeout 15 "# "

# 3. Logs de erro específicos do web
send "tail -50 /opt/chatblue/logs/web-error.log 2>/dev/null\r"
expect -timeout 10 "# "

# 4. Testar rota diretamente
send {curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ai-agent}
send "\r"
expect "# "

send {curl -s http://localhost:3000/ai-agent 2>&1 | head -20}
send "\r"
expect "# "

# 5. Verificar se o .next build existe e está ok
send "ls -la /opt/chatblue/app/apps/web/.next/server/app/ 2>/dev/null | head -20\r"
expect "# "

# 6. Verificar o .env.local do web
send "cat /opt/chatblue/app/apps/web/.env.local 2>/dev/null\r"
expect "# "

# 7. Verificar se existem erros no build
send "ls -la /opt/chatblue/app/apps/web/.next/BUILD_ID 2>/dev/null && cat /opt/chatblue/app/apps/web/.next/BUILD_ID\r"
expect "# "

send "exit\r"
expect eof
