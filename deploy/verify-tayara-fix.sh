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
send "echo '=== Status final do tayara ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.email, u.company_id as empresa_principal_id, c.name as empresa_principal, (SELECT COUNT(*) FROM user_companies uc WHERE uc.user_id = u.id AND uc.status = 'APPROVED') as acessos_adicionais FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = 'tayara@grupoblue.com.br';\"\r"
expect "# "

send "echo '=== Verificando se tayara tem acesso à Mychel ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT CASE WHEN EXISTS (SELECT 1 FROM user_companies WHERE user_id = (SELECT id FROM users WHERE email = 'tayara@grupoblue.com.br') AND company_id = 'cmjnjvtdw0000js8x8nqsztj8' AND status = 'APPROVED') THEN 'SIM' ELSE 'NÃO' END as tem_acesso_mychel;\"\r"
expect "# "

send "exit\r"
expect eof





