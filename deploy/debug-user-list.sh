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
send "echo '=== Verificando usuário tayara ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.id, u.email, u.name, u.is_active, u.company_id, c.name as empresa FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = 'tayara@grupoblue.com.br';\"\r"
expect "# "

send "echo '=== Verificando todos os usuários da empresa Mychel ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.email, u.name, u.is_active FROM users u WHERE u.company_id = 'cmjnjvtdw0000js8x8nqsztj8';\"\r"
expect "# "

send "echo '=== Verificando usuários @demo.com ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.email, u.name, u.is_active, c.name as empresa FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email LIKE '%@demo.com';\"\r"
expect "# "

send "echo '=== Verificando logs recentes da API ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 30 --nostream | grep -i 'user\|tayara\|company' | tail -20\r"
expect "# "

send "exit\r"
expect eof





