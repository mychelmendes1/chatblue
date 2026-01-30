#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated files
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/services/whatsapp/baileys.service.ts \
    ${local_base}/apps/api/src/services/whatsapp/whatsapp.service.ts \
    ${local_base}/apps/api/src/routes/upload.routes.ts \
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

send "cp /tmp/baileys.service.ts /opt/chatblue/app/apps/api/src/services/whatsapp/baileys.service.ts\r"
expect "# "
send "cp /tmp/whatsapp.service.ts /opt/chatblue/app/apps/api/src/services/whatsapp/whatsapp.service.ts\r"
expect "# "
send "cp /tmp/upload.routes.ts /opt/chatblue/app/apps/api/src/routes/upload.routes.ts\r"
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

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream | tail -10\r"
expect "# "

send "echo '=== Verificando saúde da API ==='\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health && echo ' - API OK!' || echo 'API ainda não responde'\r"
expect "# "

send "exit\r"
expect eof








