#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Logs de envio de template ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 200 --nostream 2>&1 | grep -i 'template\\|meta\\|sendTemplate\\|wamid\\|failed\\|132000' | tail -50\r"
expect "# "

send "exit\r"
expect eof










