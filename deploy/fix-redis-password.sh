#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo senha do Redis ==="

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

send "cp .env .env.backup2\r"
expect "# "

send "echo '=== Atualizando REDIS_URL com senha ==='\r"
expect "# "

send "sed -i 's|REDIS_URL=\"redis://localhost:6379\"|REDIS_URL=\"redis://:zCW8lNtbuZAdKJ5TsRlxhefGUp7zS0I@127.0.0.1:6379\"|g' .env\r"
expect "# "

send "echo '=== Verificando alteração ==='\r"
expect "# "

send "cat .env | grep REDIS_URL\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 logs chatblue-api --lines 20 --nostream\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof





