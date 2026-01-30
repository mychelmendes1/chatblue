#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Adicionando campos Instagram de volta ao select ==="

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

send "cd /opt/chatblue/app/apps/api/src/routes\r"
expect "# "

send "perl -i -pe \"s/companyId: true,/companyId: true,\\n        instagramAccountId: true,\\n        instagramUsername: true,/\" connection.routes.ts\r"
expect "# "

send "echo '=== Verificando mudança ==='\r"
expect "# "

send "grep -A 2 'companyId: true' connection.routes.ts | head -5\r"
expect "# "

send "echo '=== Compilando API ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -30\r"
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



