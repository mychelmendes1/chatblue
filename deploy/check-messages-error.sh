#!/usr/bin/expect -f

set timeout 30
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
send "echo '=== Status da API ==='\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Últimos logs de erro ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 30 --nostream 2>&1 | grep -i 'error\\|Error\\|ERROR' | tail -20\r"
expect "# "

send "echo '=== Verificando endpoint de mensagens ==='\r"
expect "# "
send "curl -s http://localhost:3001/health 2>&1 | head -5\r"
expect "# "

send "echo '=== Logs recentes ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 20 --nostream 2>&1 | tail -20\r"
expect "# "

send "exit\r"
expect eof





