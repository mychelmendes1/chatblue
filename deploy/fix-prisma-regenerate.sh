#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Forçando regeneração do Prisma Client ==="

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

send "echo '=== Parando API ==='\r"
expect "# "

send "pm2 stop chatblue-api\r"
expect "# "

send "echo '=== Limpando cache do Prisma ==='\r"
expect "# "

send "cd /opt/chatblue/app && rm -rf node_modules/.prisma 2>/dev/null; rm -rf node_modules/@prisma/client 2>/dev/null\r"
expect "# "

send "echo '=== Reinstalando Prisma Client ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm install @prisma/client@5.22.0 --force 2>&1 | tail -20\r"
expect "# "

send "echo '=== Regenerando Prisma Client ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx prisma@5.22.0 generate 2>&1 | tail -20\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 start chatblue-api\r"
expect "# "

send "sleep 8\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Testando API ==='\r"
expect "# "

send "curl -s http://localhost:3001/health\r"
expect "# "

send "exit\r"
expect eof



