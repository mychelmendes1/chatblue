#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated files
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/routes/ticket.routes.ts \
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

send "cp /tmp/ticket.routes.ts /opt/chatblue/app/apps/api/src/routes/ticket.routes.ts\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "
send "pnpm build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Reiniciando serviço API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Verificando logs recentes ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 10 --nostream\r"
expect "# "

send "exit\r"
expect eof






