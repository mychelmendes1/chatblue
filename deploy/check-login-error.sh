#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando erro de login ==="

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

send "echo '=== Últimos erros da API ==='\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 50 --nostream | tail -50\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimos logs da API (auth/login) ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 100 --nostream | grep -i 'auth\\|login\\|prisma\\|error' | tail -30\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Status PM2 ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

