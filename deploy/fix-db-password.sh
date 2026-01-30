#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo senha do banco ==="

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

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "sed -i 's|postgresql://postgres:postgres@|postgresql://chatblue:0Gq7zr9QCu8mtSpx9BMIRp9PxUC1YPyk@|g' .env\r"
expect "# "

send "cat .env | grep DATABASE_URL\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 logs chatblue-api --lines 15 --nostream\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof





