#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando e corrigindo configuração PM2 ==="

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

send "echo '=== Verificando arquivo gerado ==='\r"
expect "# "

send "ls -lh dist/server.* 2>&1\r"
expect "# "

send "echo '=== Verificando configuração PM2 ==='\r"
expect "# "

send "pm2 show chatblue-api | grep -A 5 'script path' || pm2 describe chatblue-api | grep -A 5 'script path'\r"
expect "# "

send "echo '=== Usando build:force (ignora erros TS) ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -30\r"
expect "# "

send "echo '=== Verificando se server.js existe ==='\r"
expect "# "

send "ls -lh dist/server.js 2>&1\r"
expect "# "

send "echo '=== Atualizando PM2 para usar server.js ==='\r"
expect "# "

send "pm2 delete chatblue-api\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pm2 start dist/server.js --name chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream\r"
expect "# "

send "echo '=== Correção concluída! ==='\r"
expect "# "

send "exit\r"
expect eof
