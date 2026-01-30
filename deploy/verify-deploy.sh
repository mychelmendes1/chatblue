#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando status do deploy ==="

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

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando API ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando Web (se compilou) ==='\r"
expect "# "

send "ls -la /opt/chatblue/app/apps/web/.next/standalone 2>&1 | head -5 || echo 'Web ainda não compilou completamente'\r"
expect "# "

send "exit\r"
expect eof



