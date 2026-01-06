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
send "echo '=== Verificando logs de listagem de usuários ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 100 --nostream | grep -i 'listing users\|users found' | tail -10\r"
expect "# "

send "exit\r"
expect eof





