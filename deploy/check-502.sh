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
send "echo '=== Verificando status PM2 ==='\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Verificando se API está respondendo ==='\r"
expect "# "
send "curl -s http://localhost:3001/health || echo 'API não responde'\r"
expect "# "

send "echo '=== Verificando se Web está respondendo ==='\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'Web não responde'\r"
expect "# "

send "echo '=== Verificando logs do Nginx ==='\r"
expect "# "
send "tail -20 /var/log/nginx/error.log\r"
expect "# "

send "echo '=== Verificando configuração do Nginx ==='\r"
expect "# "
send "nginx -t 2>&1\r"
expect "# "

send "echo '=== Verificando processos Node ==='\r"
expect "# "
send "ps aux | grep -E '(node|next)' | grep -v grep | head -5\r"
expect "# "

send "echo '=== Verificando portas ==='\r"
expect "# "
send "netstat -tlnp | grep -E ':(3000|3001)' || ss -tlnp | grep -E ':(3000|3001)'\r"
expect "# "

send "exit\r"
expect eof





