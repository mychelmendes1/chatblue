#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy updated file
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/routes/ticket.routes.ts \
    ${user}@${server}:/tmp/ticket.routes.ts

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
send "echo '=== Movendo arquivo corrigido ==='\r"
expect "# "

send "cp /tmp/ticket.routes.ts /opt/chatblue/app/apps/api/src/routes/ticket.routes.ts\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando TypeScript ==='\r"
expect "# "
send "npx tsc --project tsconfig.json 2>&1 | tail -20\r"
expect "# "

send "echo '=== Verificando se o build foi bem-sucedido ==='\r"
expect "# "
send "test -f dist/routes/ticket.routes.js && echo 'Build OK' || echo 'ERRO: Arquivo não encontrado'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 15 --nostream | tail -15\r"
expect "# "

send "echo '=== Verificando saúde da API ==='\r"
expect "# "
send "curl -s http://localhost:3001/health && echo '' || echo 'API ainda não responde'\r"
expect "# "

send "exit\r"
expect eof






