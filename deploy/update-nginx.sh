#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy new nginx config
spawn scp -o StrictHostKeyChecking=no ${local_base}/deploy/chatblue-nginx.conf ${user}@${server}:/etc/nginx/sites-enabled/chatblue
expect "password:" { send "${password}\r" }
expect eof

# SSH to test and reload
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Testando configuração do Nginx ==='\r"
expect "# "
send "nginx -t\r"
expect "# "

send "echo '=== Recarregando Nginx ==='\r"
expect "# "
send "systemctl reload nginx\r"
expect "# "

send "sleep 2\r"
expect "# "

send "echo '=== Testando webhook ==='\r"
expect "# "
send {curl -s "https://chat.grupoblue.com.br/webhooks/meta/cmjr5gonq00534lywu2h17f6h?hub.mode=subscribe&hub.verify_token=6823565c63ea383160459bcd59dda24a&hub.challenge=test123"}
send "\r"
expect "# "

send "echo ''\r"
expect "# "

send "exit\r"
expect eof












