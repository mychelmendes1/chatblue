#!/usr/bin/expect -f

set timeout 30
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

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
send "echo '=== Ativando todos os usuários inativos ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"UPDATE users SET is_active = true WHERE is_active = false;\"\r"
expect "# "

send "echo '=== Verificando usuários após ativação ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT email, name, is_active, company_id FROM users ORDER BY created_at DESC;\"\r"
expect "# "

send "exit\r"
expect eof












