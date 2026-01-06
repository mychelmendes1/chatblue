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
send "echo '=== Verificando todos os usuários no banco ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, email, name, is_active, company_id, created_at FROM users ORDER BY created_at DESC;\"\r"
expect "# "

send "echo '=== Verificando usuários inativos ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT COUNT(*) as total_inativos FROM users WHERE is_active = false;\"\r"
expect "# "

send "echo '=== Verificando empresas ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, slug FROM companies;\"\r"
expect "# "

send "echo '=== Verificando usuários por empresa ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT c.name as empresa, COUNT(u.id) as total_usuarios, COUNT(CASE WHEN u.is_active THEN 1 END) as usuarios_ativos FROM companies c LEFT JOIN users u ON c.id = u.company_id GROUP BY c.id, c.name;\"\r"
expect "# "

send "exit\r"
expect eof





