#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy fixed files
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/routes/notification.routes.ts \
    ${local_base}/apps/web/lib/api.ts \
    ${user}@${server}:/tmp/

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

# SSH and deploy
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

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

expect "# "
send "echo '=== Movendo arquivos corrigidos ==='\r"
expect "# "

send "cp /tmp/notification.routes.ts /opt/chatblue/app/apps/api/src/routes/notification.routes.ts\r"
expect "# "
send "cp /tmp/api.ts /opt/chatblue/app/apps/web/lib/api.ts\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "
send "pnpm build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "cd /opt/chatblue/app/apps/web\r"
expect "# "

send "echo '=== Fazendo build do frontend ==='\r"
expect "# "
send "pnpm build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Verificando se o build foi bem-sucedido ==='\r"
expect "# "
send "test -f .next/BUILD_ID && echo 'Build OK' || echo 'ERRO: Build falhou'\r"
expect "# "

send "echo '=== Reiniciando frontend ==='\r"
expect "# "
send "pm2 reload chatblue-web --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 5 --nostream | tail -5\r"
expect "# "

send "pm2 logs chatblue-web --lines 5 --nostream | tail -5\r"
expect "# "

send "echo '=== Verificando saúde dos serviços ==='\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health && echo ' - API OK!' || echo 'API ainda não responde'\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 && echo ' - Web OK!' || echo 'Web ainda não responde'\r"
expect "# "

send "exit\r"
expect eof








