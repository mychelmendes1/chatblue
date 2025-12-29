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
send "echo '=== Verificando tickets da Tokeniza ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT t.id, t.protocol, t.status, t.company_id, c.name as empresa, COUNT(m.id) as total_mensagens FROM tickets t JOIN companies c ON t.company_id = c.id LEFT JOIN messages m ON t.id = m.ticket_id WHERE t.company_id = 'cmjnjw8kc0000ffj4i6n4x8qu' GROUP BY t.id, t.protocol, t.status, t.company_id, c.name ORDER BY t.created_at DESC LIMIT 10;\"\r"
expect "# "

send "echo '=== Verificando tickets da Mychel ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT t.id, t.protocol, t.status, t.company_id, c.name as empresa, COUNT(m.id) as total_mensagens FROM tickets t JOIN companies c ON t.company_id = c.id LEFT JOIN messages m ON t.id = m.ticket_id WHERE t.company_id = 'cmjnjvtdw0000js8x8nqsztj8' GROUP BY t.id, t.protocol, t.status, t.company_id, c.name ORDER BY t.created_at DESC LIMIT 10;\"\r"
expect "# "

send "echo '=== Verificando departamentos do tayara ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT ud.user_id, ud.department_id, d.name as departamento, d.company_id, c.name as empresa FROM user_departments ud JOIN departments d ON ud.department_id = d.id JOIN companies c ON d.company_id = c.id WHERE ud.user_id = (SELECT id FROM users WHERE email = 'tayara@grupoblue.com.br');\"\r"
expect "# "

send "exit\r"
expect eof

