#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo schema manualmente ==="

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

send "echo '=== Removendo constraint webform_api_key manualmente ==='\r"
expect "# "

send "docker exec chatblue-postgres psql -U chatblue -d chatblue -c 'ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_webform_api_key_key;' 2>&1\r"
expect "# "

send "echo '=== Removendo coluna webform_api_key se existir ==='\r"
expect "# "

send "docker exec chatblue-postgres psql -U chatblue -d chatblue -c 'ALTER TABLE companies DROP COLUMN IF EXISTS webform_api_key;' 2>&1\r"
expect "# "

send "echo '=== Aplicando schema Prisma ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx prisma@5.22.0 db push --accept-data-loss --skip-generate 2>&1 | tail -40\r"
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

send "exit\r"
expect eof



