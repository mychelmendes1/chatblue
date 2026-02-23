#!/usr/bin/expect -f
set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# 1. Contatos e tickets
send "docker exec chatblue_postgres psql -U chatblue chatblue -c \"\
SELECT c.phone, c.name, c.created_at AS contato_criado, \
  t.id AS ticket_id, t.protocol, t.status, \
  t.created_at AS ticket_criado, \
  (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS qtd_msgs \
FROM contacts c \
LEFT JOIN tickets t ON t.contact_id = c.id \
WHERE REPLACE(REPLACE(REPLACE(c.phone,' ',''),'+',''),'-','') \
  SIMILAR TO '%(554192268001|557192652649|553188812312|551999934167|553193845500|557381896472)%' \
ORDER BY c.phone, t.created_at DESC;\"\r"
expect -timeout 60 "# "

# 2. Mensagens desses contatos (content, nao body)
send "docker exec chatblue_postgres psql -U chatblue chatblue -c \"\
SELECT c.phone, t.protocol, \
  m.is_from_me, m.type, \
  LEFT(m.content, 150) AS preview, \
  m.created_at AS hora, \
  m.status AS msg_status \
FROM contacts c \
JOIN tickets t ON t.contact_id = c.id \
JOIN messages m ON m.ticket_id = t.id \
WHERE REPLACE(REPLACE(REPLACE(c.phone,' ',''),'+',''),'-','') \
  SIMILAR TO '%(554192268001|557192652649|553188812312|551999934167|553193845500|557381896472)%' \
ORDER BY c.phone, m.created_at ASC;\"\r"
expect -timeout 60 "# "

# 3. Detalhes dos tickets (atendente, setor)
send "docker exec chatblue_postgres psql -U chatblue chatblue -c \"\
SELECT c.phone, t.protocol, t.status, \
  wc.name AS conexao, wc.channel, \
  u.name AS atendente, d.name AS setor, \
  t.created_at AS abertura, t.closed_at AS fechamento, \
  t.is_ai_handled AS ia \
FROM contacts c \
JOIN tickets t ON t.contact_id = c.id \
LEFT JOIN whatsapp_connections wc ON wc.id = t.connection_id \
LEFT JOIN users u ON u.id = t.assigned_to_id \
LEFT JOIN departments d ON d.id = t.department_id \
WHERE REPLACE(REPLACE(REPLACE(c.phone,' ',''),'+',''),'-','') \
  SIMILAR TO '%(554192268001|557192652649|553188812312|551999934167|553193845500|557381896472)%' \
ORDER BY c.phone, t.created_at DESC;\"\r"
expect -timeout 60 "# "

# 4. Activities (log de eventos)
send "docker exec chatblue_postgres psql -U chatblue chatblue -c \"\
SELECT c.phone, a.type, LEFT(a.description, 120) AS desc, a.created_at \
FROM contacts c \
JOIN tickets t ON t.contact_id = c.id \
JOIN activities a ON a.ticket_id = t.id \
WHERE REPLACE(REPLACE(REPLACE(c.phone,' ',''),'+',''),'-','') \
  SIMILAR TO '%(554192268001|557192652649|553188812312|551999934167|553193845500|557381896472)%' \
ORDER BY c.phone, a.created_at ASC;\"\r"
expect -timeout 60 "# "

# 5. Verificar se a conexao recebeu algum webhook pra esses numeros (via wamid)
send "docker exec chatblue_postgres psql -U chatblue chatblue -c \"\
SELECT c.phone, m.wamid, m.is_from_me, m.type, m.status, LEFT(m.content, 80) AS cnt, m.created_at \
FROM contacts c \
JOIN tickets t ON t.contact_id = c.id \
JOIN messages m ON m.ticket_id = t.id \
WHERE REPLACE(REPLACE(REPLACE(c.phone,' ',''),'+',''),'-','') \
  SIMILAR TO '%(554192268001|557192652649|553188812312|551999934167|553193845500|557381896472)%' \
ORDER BY c.phone, m.created_at ASC;\"\r"
expect -timeout 60 "# "

send "exit\r"
expect eof
