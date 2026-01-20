#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

# SSH and apply migration
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

send "echo '=== Aplicando migração do Prisma ==='\r"
expect "# "
send "npx prisma migrate deploy 2>&1 | tail -30\r"
expect "# "

send "echo '=== Verificando se a tabela foi criada ==='\r"
expect "# "
send "npx prisma db execute --stdin <<< 'SELECT COUNT(*) FROM notifications;' 2>&1 | tail -5\r"
expect "# "

send "exit\r"
expect eof






