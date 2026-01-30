#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

# Copy updated files
spawn scp -o StrictHostKeyChecking=no \
    apps/api/src/services/whatsapp/meta-cloud.service.ts \
    apps/api/src/services/whatsapp/whatsapp.service.ts \
    apps/api/src/services/whatsapp/baileys.service.ts \
    apps/api/src/routes/webhook.routes.ts \
    apps/api/src/services/message-processor.service.ts \
    apps/api/prisma/schema.prisma \
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

# SSH and move files
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
send "echo '=== Movendo arquivos ==='\r"
expect "# "

send "cp /tmp/meta-cloud.service.ts /opt/chatblue/app/apps/api/src/services/whatsapp/\r"
expect "# "
send "cp /tmp/whatsapp.service.ts /opt/chatblue/app/apps/api/src/services/whatsapp/\r"
expect "# "
send "cp /tmp/baileys.service.ts /opt/chatblue/app/apps/api/src/services/whatsapp/\r"
expect "# "
send "cp /tmp/webhook.routes.ts /opt/chatblue/app/apps/api/src/routes/\r"
expect "# "
send "cp /tmp/message-processor.service.ts /opt/chatblue/app/apps/api/src/services/\r"
expect "# "
send "cp /tmp/schema.prisma /opt/chatblue/app/apps/api/prisma/\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Gerando Prisma Client ==='\r"
expect "# "
send "npx prisma generate 2>&1 | tail -5\r"
expect "# "

send "echo '=== Compilando TypeScript ==='\r"
expect "# "
send "npx tsc --project tsconfig.json 2>&1 | grep -E '^src/(services/whatsapp|routes/webhook)' | head -20 || echo 'Compilação OK ou com warnings em outros arquivos'\r"
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

send "exit\r"
expect eof












