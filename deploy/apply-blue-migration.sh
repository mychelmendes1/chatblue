#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Aplicando Migration Blue Assistant ==="

# SSH e aplicar migration
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

send "echo '=== Verificando Docker containers ==='\r"
expect "# "

send "docker ps | grep postgres\r"
expect "# "

send "echo '=== Aplicando migration via Docker ==='\r"
expect "# "

send "docker cp prisma/migrations/20250112203000_add_blue_assistant/migration.sql chatblue_postgres:/tmp/migration.sql\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -f /tmp/migration.sql 2>&1\r"
expect "# "

send "echo '=== Verificando tabela blue_interactions ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"\\dt blue_interactions\" 2>&1\r"
expect "# "

send "echo '=== Migration concluída! ==='\r"
expect "# "

send "exit\r"
expect eof
