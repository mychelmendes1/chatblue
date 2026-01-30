#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set phone "554896195555"

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

send "echo '=== Buscando contato ${phone} ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, phone, name, company_id FROM contacts WHERE phone LIKE '%${phone}%' OR phone LIKE '%4896195555%' OR phone LIKE '%896195555%' LIMIT 5;\"\r"
expect "# "

send "echo '=== Buscando tickets do contato ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT t.id, t.protocol, t.status, t.assigned_to_id, t.department_id, c.phone, c.name as contact_name, u.name as assigned_to_name, d.name as department_name FROM tickets t LEFT JOIN contacts c ON t.contact_id = c.id LEFT JOIN users u ON t.assigned_to_id = u.id LEFT JOIN departments d ON t.department_id = d.id WHERE c.phone LIKE '%${phone}%' OR c.phone LIKE '%4896195555%' OR c.phone LIKE '%896195555%' ORDER BY t.updated_at DESC LIMIT 5;\"\r"
expect "# "

send "echo '=== Buscando usuária Tayara ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT u.id, u.name, u.email, u.role, u.is_active, array_agg(DISTINCT d.name) as departments FROM users u LEFT JOIN user_departments ud ON u.id = ud.user_id LEFT JOIN departments d ON ud.department_id = d.id WHERE u.name ILIKE '%tayara%' GROUP BY u.id, u.name, u.email, u.role, u.is_active;\"\r"
expect "# "

send "echo '=== Análise de visibilidade ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT t.protocol, t.status, c.phone, c.name as contact_name, u.name as assigned_to, d.name as department, CASE WHEN u2.role IN ('SUPER_ADMIN', 'ADMIN') THEN 'Vê todos (ADMIN)' WHEN t.assigned_to_id = u2.id THEN 'Atribuído ao usuário' WHEN t.department_id IN (SELECT department_id FROM user_departments WHERE user_id = u2.id) THEN 'No departamento do usuário' ELSE 'NÃO VISÍVEL' END as visibility FROM tickets t LEFT JOIN contacts c ON t.contact_id = c.id LEFT JOIN users u ON t.assigned_to_id = u.id LEFT JOIN departments d ON t.department_id = d.id CROSS JOIN users u2 WHERE (c.phone LIKE '%${phone}%' OR c.phone LIKE '%4896195555%' OR c.phone LIKE '%896195555%') AND u2.name ILIKE '%tayara%' AND t.status IN ('PENDING', 'IN_PROGRESS', 'WAITING') ORDER BY t.updated_at DESC;\"\r"
expect "# "

send "exit\r"
expect eof






