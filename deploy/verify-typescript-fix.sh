#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando compilação TypeScript ==="

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

send "echo '=== Compilando API (mostrando últimas 50 linhas) ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -50\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Contando erros TypeScript ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | grep -c 'error TS' || echo '0 erros encontrados'\r"
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



