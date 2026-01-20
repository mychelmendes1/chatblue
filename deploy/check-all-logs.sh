#!/usr/bin/expect -f

set timeout 90
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Últimos 100 logs da API ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 100 --nostream 2>&1 | tail -80\r"
expect "# "

send "exit\r"
expect eof










