#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Adicionando todas as colunas ausentes ao banco ==="

spawn scp -o StrictHostKeyChecking=no apps/api/src/scripts/add-rating-token-column.ts ${user}@${server}:/tmp/add-missing-columns.ts

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

expect eof

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

send "echo '=== Copiando script ==='\r"
expect "# "

send "cp /tmp/add-missing-columns.ts /opt/chatblue/app/apps/api/src/scripts/add-missing-columns.ts\r"
expect "# "

send "echo '=== Executando script para adicionar colunas ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx tsx src/scripts/add-missing-columns.ts 2>&1\r"
expect "# "

send "echo '=== Regenerando Prisma Client ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx prisma@5.22.0 generate 2>&1 | tail -20\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Testando API ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1\r"
expect "# "

send "exit\r"
expect eof

