#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Extraindo dados de conversas do servidor ==="

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Criar script SQL temporário no servidor
send "cat > /tmp/extract_faq.sql << 'EOFSQL'
-- Extrair mensagens de clientes de tickets resolvidos/fechados
SELECT 
    m.id,
    m.content,
    m.created_at,
    t.id as ticket_id,
    t.protocol,
    t.status,
    t.resolved_at,
    c.name as contact_name,
    c.phone
FROM messages m
INNER JOIN tickets t ON m.ticket_id = t.id
INNER JOIN contacts c ON t.contact_id = c.id
WHERE 
    t.status IN ('RESOLVED', 'CLOSED')
    AND m.is_from_me = false
    AND m.type = 'TEXT'
    AND m.content IS NOT NULL
    AND LENGTH(m.content) > 10
    AND t.resolved_at >= NOW() - INTERVAL '30 days'
ORDER BY m.created_at DESC
LIMIT 1000;
EOFSQL\r"

expect "# "

# Executar query e salvar resultado
send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -F ',' -A -t < /tmp/extract_faq.sql > /tmp/conversations_faq.csv 2>&1\r"

expect "# "

# Verificar se arquivo foi criado
send "wc -l /tmp/conversations_faq.csv\r"

expect "# "

# Copiar arquivo para local (via scp em outro comando)
send "exit\r"
expect eof

puts "\n=== Dados extraídos! ==="
puts "Arquivo salvo em: /tmp/conversations_faq.csv no servidor"



