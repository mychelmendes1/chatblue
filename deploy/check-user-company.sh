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
send "echo '=== Verificando usuários e suas empresas ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.email, u.name, u.is_active, c.name as empresa, c.slug FROM users u JOIN companies c ON u.company_id = c.id ORDER BY u.created_at DESC;\"\r"
expect "# "

send "echo '=== Verificando se há emails duplicados em empresas diferentes ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT email, COUNT(*) as total, STRING_AGG(c.name, ', ') as empresas FROM users u JOIN companies c ON u.company_id = c.id GROUP BY email HAVING COUNT(*) > 1;\"\r"
expect "# "

send "exit\r"
expect eof












