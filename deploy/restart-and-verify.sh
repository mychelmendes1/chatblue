#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${password}\r"
    }
}

expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

send "exit\r"
expect eof





