#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando logs do Baileys ==="

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

send "echo '=== Status PM2 ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Logs relacionados a Baileys/WhatsApp - últimas 300 linhas ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 500 --nostream 2>&1 | grep -iE 'baileys|whatsapp|connection|disconnect|socket|qr|connected|auth|logout|close|session' | tail -200\r"
expect -timeout 90 "# "

send "echo ''\r"
expect "# "

send "echo '=== Logs de ERRO relacionados a conexões - últimas 100 linhas ==='\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 300 --nostream 2>&1 | grep -iE 'baileys|whatsapp|connection|socket|duplicate|conflict|auth|session|close' | tail -100\r"
expect -timeout 60 "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimas 100 linhas de todos os logs da API ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 150 --nostream 2>&1 | tail -100\r"
expect -timeout 60 "# "

send "exit\r"
expect eof
