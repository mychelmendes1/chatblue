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
send "echo '=== Verificando ticket da Tokeniza ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT t.id, t.protocol, t.status, t.assigned_to_id, t.department_id, u.email as atribuido_para, d.name as departamento FROM tickets t LEFT JOIN users u ON t.assigned_to_id = u.id LEFT JOIN departments d ON t.department_id = d.id WHERE t.id = 'cmjr2myx80013bpkczvqj05oq';\"\r"
expect "# "

send "echo '=== Verificando role do tayara ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT email, role, company_id FROM users WHERE email = 'tayara@grupoblue.com.br';\"\r"
expect "# "

send "exit\r"
expect eof










