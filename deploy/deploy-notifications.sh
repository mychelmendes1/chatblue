#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated files
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/prisma/schema.prisma \
    ${local_base}/apps/api/src/routes/notification.routes.ts \
    ${local_base}/apps/api/src/routes/ticket.routes.ts \
    ${local_base}/apps/api/src/routes/message.routes.ts \
    ${local_base}/apps/api/src/server.ts \
    ${local_base}/apps/api/src/sockets/index.ts \
    ${local_base}/apps/web/components/layout/notifications.tsx \
    ${local_base}/apps/web/components/layout/header.tsx \
    ${local_base}/apps/web/components/ui/popover.tsx \
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
send "echo '=== Movendo arquivos atualizados ==='\r"
expect "# "

send "cp /tmp/schema.prisma /opt/chatblue/app/apps/api/prisma/schema.prisma\r"
expect "# "
send "cp /tmp/notification.routes.ts /opt/chatblue/app/apps/api/src/routes/notification.routes.ts\r"
expect "# "
send "cp /tmp/ticket.routes.ts /opt/chatblue/app/apps/api/src/routes/ticket.routes.ts\r"
expect "# "
send "cp /tmp/message.routes.ts /opt/chatblue/app/apps/api/src/routes/message.routes.ts\r"
expect "# "
send "cp /tmp/server.ts /opt/chatblue/app/apps/api/src/server.ts\r"
expect "# "
send "cp /tmp/index.ts /opt/chatblue/app/apps/api/src/sockets/index.ts\r"
expect "# "
send "cp /tmp/notifications.tsx /opt/chatblue/app/apps/web/components/layout/notifications.tsx\r"
expect "# "
send "cp /tmp/header.tsx /opt/chatblue/app/apps/web/components/layout/header.tsx\r"
expect "# "
send "cp /tmp/popover.tsx /opt/chatblue/app/apps/web/components/ui/popover.tsx\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Gerando migração do Prisma ==='\r"
expect "# "
send "npx prisma migrate dev --name add_notifications --create-only 2>&1 | tail -20\r"
expect "# "

send "echo '=== Aplicando migração ==='\r"
expect "# "
send "npx prisma migrate deploy 2>&1 | tail -20\r"
expect "# "

send "echo '=== Gerando Prisma Client ==='\r"
expect "# "
send "npx prisma generate 2>&1 | tail -10\r"
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

send "pm2 logs chatblue-api --lines 10 --nostream | tail -10\r"
expect "# "

send "pm2 logs chatblue-web --lines 10 --nostream | tail -10\r"
expect "# "

send "echo '=== Verificando saúde dos serviços ==='\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health && echo ' - API OK!' || echo 'API ainda não responde'\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 && echo ' - Web OK!' || echo 'Web ainda não responde'\r"
expect "# "

send "exit\r"
expect eof

