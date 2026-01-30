#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando logs de erro da API ==="

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

send "pm2 logs chatblue-api --lines 50 --nostream --err\r"
expect "# "

send "echo '=== Verificando logs de saída ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 30 --nostream --out\r"
expect "# "

send "exit\r"
expect eof





