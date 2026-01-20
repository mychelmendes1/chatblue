#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo DATABASE_URL ==="

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

send "echo '=== Backup do .env ==='\r"
expect "# "

send "cp .env .env.backup\r"
expect "# "

send "echo '=== Alterando localhost para 127.0.0.1 ==='\r"
expect "# "

send "sed -i 's/localhost:5432/127.0.0.1:5432/g' .env\r"
expect "# "

send "echo '=== Verificando alteração ==='\r"
expect "# "

send "cat .env | grep DATABASE_URL\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 logs chatblue-api --lines 15 --nostream\r"
expect "# "

send "exit\r"
expect eof



