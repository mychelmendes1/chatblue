#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated file
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/routes/message.routes.ts \
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

send "echo '=== Movendo arquivo atualizado ==='\r"
expect "# "

send "cp /tmp/message.routes.ts /opt/chatblue/app/apps/api/src/routes/message.routes.ts\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Fazendo build forçado da API ==='\r"
expect "# "
send "pnpm build:force 2>&1 | tail -30\r"
expect "# "

send "echo '=== Reiniciando serviço API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Verificando se a função foi adicionada ==='\r"
expect "# "
send "grep -c 'getActiveConnectionForTicket' dist/routes/message.routes.js\r"
expect "# "

send "exit\r"
expect eof




