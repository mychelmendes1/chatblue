#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando configuração do Nginx ==="

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

send "echo '=== Testando API direta ==='\r"
expect "# "

send "curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test\",\"password\":\"test\"}' 2>&1 | head -3\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando API via nginx ==='\r"
expect "# "

send "curl -s -X POST http://localhost/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test\",\"password\":\"test\"}' 2>&1 | head -3\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando arquivos de configuração nginx ==='\r"
expect "# "

send "find /etc/nginx -name '*.conf' -type f 2>/dev/null | head -5\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Status do nginx ==='\r"
expect "# "

send "systemctl status nginx 2>&1 | head -10 || nginx -t 2>&1 | head -5\r"
expect "# "

send "exit\r"
expect eof



