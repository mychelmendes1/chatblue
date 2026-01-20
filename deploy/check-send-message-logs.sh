#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando logs de envio de mensagem ==="

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

send "echo '=== Logs recentes da API (últimas 100 linhas) ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 100 --nostream 2>&1 | grep -iE 'send|POST|message|error|fail|prisma|ticket' | tail -40\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando erros específicos de Prisma ==='\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 100 --nostream 2>&1 | grep -iE 'prisma|P2022|P2025|column|exist' | tail -20\r"
expect "# "

send "exit\r"
expect eof

