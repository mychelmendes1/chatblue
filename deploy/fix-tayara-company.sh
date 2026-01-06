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
send "echo '=== Verificando acessos do tayara ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT uc.id, uc.user_id, uc.company_id, uc.role, uc.status, c.name as empresa FROM user_companies uc JOIN companies c ON uc.company_id = c.id WHERE uc.user_id = (SELECT id FROM users WHERE email = 'tayara@grupoblue.com.br');\"\r"
expect "# "

send "echo '=== Verificando se há acesso à Mychel ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT COUNT(*) as total FROM user_companies WHERE user_id = (SELECT id FROM users WHERE email = 'tayara@grupoblue.com.br') AND company_id = 'cmjnjvtdw0000js8x8nqsztj8';\"\r"
expect "# "

send "echo '=== Mudando empresa principal do tayara para Tokeniza ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"UPDATE users SET company_id = 'cmjnjw8kc0000ffj4i6n4x8qu' WHERE email = 'tayara@grupoblue.com.br';\"\r"
expect "# "

send "echo '=== Verificando empresa atual do tayara ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.email, u.company_id, c.name as empresa FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = 'tayara@grupoblue.com.br';\"\r"
expect "# "

send "exit\r"
expect eof





