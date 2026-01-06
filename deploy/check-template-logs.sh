#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Últimos erros da API ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 50 --nostream 2>&1 | grep -i 'template\\|error\\|132000' | tail -30\r"
expect "# "

send "exit\r"
expect eof





