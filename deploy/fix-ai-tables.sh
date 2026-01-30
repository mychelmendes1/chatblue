#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Criando tabelas de AI no banco de dados ==="

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

# Run prisma db push to create missing tables
send "pnpm prisma db push --accept-data-loss 2>&1 | tail -30\r"
expect "# "

# Regenerate Prisma Client
send "pnpm prisma generate 2>&1 | tail -10\r"
expect "# "

# Restart API
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy concluído! ==="



