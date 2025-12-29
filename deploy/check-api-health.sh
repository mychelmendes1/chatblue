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
send "echo '=== Status API ==='\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Health check ==='\r"
expect "# "
send "curl -s http://localhost:3001/health\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimos logs (verificando erros) ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | grep -E 'error|Error|ERROR' | tail -10 || echo 'Sem erros recentes'\r"
expect "# "

send "echo '=== Logs normais ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | grep -v error | tail -10\r"
expect "# "

send "exit\r"
expect eof

