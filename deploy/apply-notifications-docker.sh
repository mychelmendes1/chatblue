#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy SQL file
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/prisma/migrations/create_notifications_table.sql \
    ${user}@${server}:/tmp/

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

expect eof

# SSH and execute
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
send "echo '=== Verificando containers Docker ==='\r"
expect "# "
send "docker ps --format '{{.Names}}' | grep -E '(postgres|db)'\r"
expect "# "

send "echo '=== Aplicando SQL via Docker ==='\r"
expect "# "
send "cat /tmp/create_notifications_table.sql | docker exec -i chatblue-db psql -U chatblue -d chatblue 2>&1 || cat /tmp/create_notifications_table.sql | docker exec -i chatblue-postgres psql -U chatblue -d chatblue 2>&1 || (docker ps --format '{{.Names}}' | grep postgres | head -1 | xargs -I {} sh -c 'cat /tmp/create_notifications_table.sql | docker exec -i {} psql -U chatblue -d chatblue 2>&1')\r"
expect "# "

send "echo '=== Verificando se a tabela foi criada ==='\r"
expect "# "
send "docker exec -i chatblue-db psql -U chatblue -d chatblue -c 'SELECT COUNT(*) FROM notifications;' 2>&1 || docker exec -i chatblue-postgres psql -U chatblue -d chatblue -c 'SELECT COUNT(*) FROM notifications;' 2>&1 || (docker ps --format '{{.Names}}' | grep postgres | head -1 | xargs -I {} sh -c 'docker exec -i {} psql -U chatblue -d chatblue -c \"SELECT COUNT(*) FROM notifications;\"')\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof








