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
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.id, u.email, u.name, u.company_id as empresa_principal, c.name as nome_empresa_principal FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = 'tayara@grupoblue.com.br';\"\r"
expect "# "

send "echo '=== Verificando acessos multi-empresa do tayara ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT uc.id, uc.user_id, uc.company_id, uc.role, uc.status, c.name as empresa FROM user_companies uc JOIN companies c ON uc.company_id = c.id WHERE uc.user_id = (SELECT id FROM users WHERE email = 'tayara@grupoblue.com.br');\"\r"
expect "# "

send "echo '=== Verificando todas as empresas ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, slug FROM companies;\"\r"
expect "# "

send "echo '=== Verificando qual empresa o tayara deveria estar ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.email, u.company_id, c.name as empresa FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = 'tayara@grupoblue.com.br';\"\r"
expect "# "

send "exit\r"
expect eof












