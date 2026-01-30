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
send "echo '=== Excluindo usuários @demo.com ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"DELETE FROM users WHERE email LIKE '%@demo.com';\"\r"
expect "# "

send "echo '=== Verificando usuários restantes ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.email, u.name, c.name as empresa FROM users u JOIN companies c ON u.company_id = c.id ORDER BY u.created_at DESC;\"\r"
expect "# "

send "exit\r"
expect eof












