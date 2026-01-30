#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Atualizando configuração do Nginx ==="

# Copy nginx config
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/deploy/chatblue-nginx.conf ${user}@${server}:/tmp/chatblue_nginx.conf

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect eof

# SSH to apply config
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

send "cp /etc/nginx/sites-available/chatblue /etc/nginx/sites-available/chatblue.backup.`date +%Y%m%d_%H%M%S`\r"
expect "# "

send "cp /tmp/chatblue_nginx.conf /etc/nginx/sites-available/chatblue\r"
expect "# "

send "nginx -t\r"
expect "# "

send "systemctl reload nginx\r"
expect "# "

send "sleep 3 && curl -I https://chat.grupoblue.com.br/docs/ 2>&1 | head -10\r"
expect "# "

send "exit\r"
expect eof

puts "=== Configuração do Nginx atualizada! ==="



