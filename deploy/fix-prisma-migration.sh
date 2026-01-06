#!/usr/bin/expect -f

set timeout 120
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
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Verificando schema atual ==='\r"
expect "# "
send "grep -E 'metadata|failedReason|lastMessageAt' prisma/schema.prisma | head -10\r"
expect "# "

send "echo '=== Criando migration ==='\r"
expect "# "
send "npx prisma migrate dev --name add_whatsapp_api_fields --create-only 2>&1 | tail -20\r"
expect "# "

send "echo '=== Aplicando migration ==='\r"
expect "# "
send "npx prisma migrate deploy 2>&1 | tail -20\r"
expect "# "

send "echo '=== Regenerando Prisma Client ==='\r"
expect "# "
send "npx prisma generate 2>&1 | tail -5\r"
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





