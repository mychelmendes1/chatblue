#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando variáveis de ambiente do PM2 ==="

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

send "echo '=== Verificando .env ==='\r"
expect "# "

send "cat .env | grep -E '(REDIS_URL|DATABASE_URL)'\r"
expect "# "

send "echo '=== Verificando configuração PM2 ==='\r"
expect "# "

send "pm2 show chatblue-api | grep -A 20 'env' || pm2 describe chatblue-api | grep -A 20 'env'\r"
expect "# "

send "echo '=== Parando API ==='\r"
expect "# "

send "pm2 stop chatblue-api\r"
expect "# "

send "echo '=== Deletando processo PM2 ==='\r"
expect "# "

send "pm2 delete chatblue-api\r"
expect "# "

send "echo '=== Iniciando API com .env explícito ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pm2 start dist/server.js --name chatblue-api --update-env --env production\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 logs chatblue-api --lines 15 --nostream\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof





