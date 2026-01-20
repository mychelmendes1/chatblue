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

send "echo '=== Verificando código compilado ==='\r"
expect "# "
send "grep -c 'isAllFilter' dist/routes/ticket.routes.js\r"
expect "# "

send "echo '=== Verificando se FILA filter está presente ==='\r"
expect "# "
send "grep -c 'isQueueFilter' dist/routes/ticket.routes.js\r"
expect "# "

send "echo '=== Verificando se TODOS filter está presente ==='\r"
expect "# "
send "grep -A 2 'TODOS:' dist/routes/ticket.routes.js | head -5\r"
expect "# "

send "echo '=== Status do serviço ==='\r"
expect "# "
send "pm2 status chatblue-api\r"
expect "# "

send "exit\r"
expect eof




