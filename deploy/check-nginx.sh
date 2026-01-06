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
send "echo '=== Verificando status do Nginx ==='\r"
expect "# "
send "systemctl status nginx | head -10\r"
expect "# "

send "echo '=== Verificando configuração do Nginx ==='\r"
expect "# "
send "cat /etc/nginx/sites-enabled/* | grep -A 5 'proxy_pass' | head -20\r"
expect "# "

send "echo '=== Testando configuração ==='\r"
expect "# "
send "nginx -t\r"
expect "# "

send "echo '=== Reiniciando Nginx ==='\r"
expect "# "
send "systemctl reload nginx\r"
expect "# "

send "echo '=== Verificando se Nginx está rodando ==='\r"
expect "# "
send "systemctl status nginx | head -5\r"
expect "# "

send "echo '=== Testando acesso via localhost ==='\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost && echo ' - Frontend OK' || echo 'Frontend não responde'\r"
expect "# "

send "exit\r"
expect eof





