#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

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

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Verificando se o código foi atualizado ==='\r"
expect "# "
send "grep -c 'isAllFilter' src/routes/ticket.routes.ts\r"
expect "# "

send "echo '=== Verificando como o PM2 está rodando ==='\r"
expect "# "
send "pm2 show chatblue-api | grep -E 'script|interpreter|exec_mode'\r"
expect "# "

send "echo '=== Verificando se dist foi atualizado ==='\r"
expect "# "
send "ls -lh dist/routes/ticket.routes.js 2>/dev/null && echo 'Arquivo compilado existe' || echo 'Arquivo compilado não existe'\r"
expect "# "

send "echo '=== Verificando última modificação do arquivo ==='\r"
expect "# "
send "stat -c '%y' src/routes/ticket.routes.ts\r"
expect "# "

send "exit\r"
expect eof






