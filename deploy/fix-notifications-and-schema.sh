#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo rota de notificações e schema do banco ==="

spawn scp -o StrictHostKeyChecking=no apps/api/src/server.ts ${user}@${server}:/tmp/

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

send "echo '=== Copiando server.ts atualizado ==='\r"
expect "# "

send "cp /tmp/server.ts /opt/chatblue/app/apps/api/src/\r"
expect "# "

send "echo '=== Sincronizando schema Prisma com o banco ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx prisma@5.22.0 db push --skip-generate 2>&1 | tail -30\r"
expect "# "

send "echo '=== Regenerando Prisma Client ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx prisma@5.22.0 generate 2>&1 | tail -20\r"
expect "# "

send "echo '=== Compilando API ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -40\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof



