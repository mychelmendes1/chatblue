#!/usr/bin/expect -f

set timeout 900
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy final NPS - Garantindo build completo ==="
puts ""

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

send "cd /opt/chatblue/app && git pull origin main 2>&1 | tail -5\r"
expect "# "

send "cd /opt/chatblue/app/apps/web && pnpm run build 2>&1 | tail -40\r"
expect "# "

send "test -f .next/BUILD_ID && echo 'BUILD OK' || echo 'BUILD FAILED'\r"
expect "# "

send "pm2 restart chatblue-web\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "curl -s http://localhost:3001/health | head -1\r"
expect "# "

send "exit\r"
expect eof

puts ""
puts "=== Deploy finalizado! ==="



