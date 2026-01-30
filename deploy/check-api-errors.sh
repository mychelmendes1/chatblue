#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando erros da API ==="

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

send "pm2 logs chatblue-api --err --lines 20 --nostream | tail -20\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimos logs gerais ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 30 --nostream | grep -i 'error\\|fail\\|502' | tail -20\r"
expect "# "

send "exit\r"
expect eof



