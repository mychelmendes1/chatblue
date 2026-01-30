#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando status da API ==="

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

send "pm2 status\r"
expect "# "

send "echo '=== Logs da API (últimas 50 linhas) ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 50 --nostream\r"
expect "# "

send "echo '=== Verificando porta da API ==='\r"
expect "# "

send "netstat -tlnp | grep :3000 || ss -tlnp | grep :3000\r"
expect "# "

send "echo '=== Verificando processos Node ==='\r"
expect "# "

send "ps aux | grep node | grep -v grep\r"
expect "# "

send "exit\r"
expect eof





