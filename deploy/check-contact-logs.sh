#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set phone "5513997633269"

puts "=========================================="
puts "   Verificando Logs do Contato: $phone"
puts "=========================================="

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

# Verificar logs do PM2 relacionados ao número
puts "\n=== Buscando nos logs do PM2 (últimas 200 linhas) ==="
send "pm2 logs chatblue-api --lines 200 --nostream 2>&1 | grep -i '$phone\\|13997633269\\|sending message\\|failed\\|error' | tail -30\r"
expect "# "

# Verificar mensagens no banco de dados
puts "\n=== Verificando mensagens no banco de dados ==="
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT c.id, c.name, c.phone, c.company_id, c.last_message_at FROM contacts c WHERE c.phone LIKE '%$phone%' OR c.phone LIKE '%13997633269%' LIMIT 5;\" 2>&1\r"
expect "# "

# Verificar mensagens falhadas
puts "\n=== Verificando mensagens falhadas ==="
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT m.id, m.content, m.status, m.failed_reason, m.created_at, t.protocol, wc.name as connection_name, wc.type, wc.status as connection_status FROM messages m JOIN tickets t ON m.ticket_id = t.id JOIN contacts c ON t.contact_id = c.id JOIN whatsapp_connections wc ON m.connection_id = wc.id WHERE (c.phone LIKE '%$phone%' OR c.phone LIKE '%13997633269%') AND (m.status = 'FAILED' OR m.status = 'PENDING') AND m.is_from_me = true ORDER BY m.created_at DESC LIMIT 10;\" 2>&1\r"
expect "# "

# Verificar mensagens recentes
puts "\n=== Verificando mensagens recentes (últimas 20) ==="
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT m.id, m.content, m.status, m.is_from_me, m.created_at, m.wamid, t.protocol FROM messages m JOIN tickets t ON m.ticket_id = t.id JOIN contacts c ON t.contact_id = c.id WHERE (c.phone LIKE '%$phone%' OR c.phone LIKE '%13997633269%') ORDER BY m.created_at DESC LIMIT 20;\" 2>&1\r"
expect "# "

# Verificar conexões WhatsApp
puts "\n=== Verificando status das conexões WhatsApp ==="
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, type, status, is_active, last_connected FROM whatsapp_connections WHERE company_id = (SELECT company_id FROM contacts WHERE phone LIKE '%$phone%' OR phone LIKE '%13997633269%' LIMIT 1);\" 2>&1\r"
expect "# "

# Verificar tickets do contato
puts "\n=== Verificando tickets do contato ==="
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT t.id, t.protocol, t.status, t.priority, t.created_at, t.updated_at, wc.name as connection_name, wc.status as connection_status, wc.is_active FROM tickets t JOIN contacts c ON t.contact_id = c.id JOIN whatsapp_connections wc ON t.connection_id = wc.id WHERE (c.phone LIKE '%$phone%' OR c.phone LIKE '%13997633269%') ORDER BY t.updated_at DESC LIMIT 5;\" 2>&1\r"
expect "# "

# Verificar logs de erro recentes relacionados
puts "\n=== Verificando logs de erro recentes ==="
send "pm2 logs chatblue-api --lines 500 --nostream --err 2>&1 | grep -i '$phone\\|13997633269\\|sending message\\|failed to send\\|whatsapp não conectado\\|no active connection' | tail -20\r"
expect "# "

puts "\n=== Verificação concluída ==="
send "exit\r"
expect eof


