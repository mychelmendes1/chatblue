#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando logs recentes ==="

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

send "echo '=== Últimas 80 linhas de erro ==='\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 80 --nostream 2>&1 | tail -80\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Logs recentes (POST/messages) ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 50 --nostream 2>&1 | grep -iE 'POST|send|message|error|prisma' | tail -30\r"
expect "# "

send "exit\r"
expect eof



