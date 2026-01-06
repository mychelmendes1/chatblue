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
send "echo '=== Status Final dos Serviços ==='\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Testando API ==='\r"
expect "# "
send "curl -s http://localhost:3001/health | head -1 && echo ' - API OK'\r"
expect "# "

send "echo '=== Testando Web ==='\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 && echo ' - Web OK'\r"
expect "# "

send "echo '=== Verificando logs recentes do Web ==='\r"
expect "# "
send "pm2 logs chatblue-web --lines 5 --nostream | tail -5\r"
expect "# "

send "echo '=== Verificando se portas estão abertas ==='\r"
expect "# "
send "ss -tlnp | grep -E ':(3000|3001|80|443)'\r"
expect "# "

send "exit\r"
expect eof





