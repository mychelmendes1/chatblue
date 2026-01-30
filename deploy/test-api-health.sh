#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Testando saúde da API ==="

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

send "echo '=== Status PM2 ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando /health ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando /api/auth/login (POST sem body) ==='\r"
expect "# "

send "curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' 2>&1 | head -3\r"
expect "# "

send "echo ''\r"
expect "# "

send "pm2 logs chatblue-api --lines 5 --nostream | tail -5\r"
expect "# "

send "exit\r"
expect eof



