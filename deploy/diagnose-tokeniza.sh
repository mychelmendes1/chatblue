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

# 1. Encontrar a empresa Tokeniza e suas conexões
send {docker exec chatblue_postgres psql -U chatblue chatblue -c "SELECT c.id AS company_id, c.name AS company_name FROM companies c WHERE LOWER(c.name) LIKE '%tokeniza%';"}
send "\r"
expect "# "

# 2. Conexões WhatsApp da Tokeniza
send {docker exec chatblue_postgres psql -U chatblue chatblue -c "SELECT wc.id, wc.name, wc.type, wc.status, wc.is_active, wc.phone_number_id, wc.created_at::date, wc.updated_at FROM whatsapp_connections wc JOIN companies c ON wc.company_id = c.id WHERE LOWER(c.name) LIKE '%tokeniza%' ORDER BY wc.created_at;"}
send "\r"
expect "# "

# 3. Verificar sessões no filesystem
send {docker exec chatblue_postgres psql -U chatblue chatblue -t -c "SELECT wc.id FROM whatsapp_connections wc JOIN companies c ON wc.company_id = c.id WHERE LOWER(c.name) LIKE '%tokeniza%' AND wc.type = 'BAILEYS';" | tr -d ' ' | while read id; do if [ -n "$id" ]; then echo "=== Session: $id ==="; ls -la /opt/chatblue/app/apps/api/sessions/$id/ 2>/dev/null || echo "  NO SESSION DIR"; fi; done}
send "\r"
expect "# "

# 4. Verificar se creds.json existe para cada sessão
send {docker exec chatblue_postgres psql -U chatblue chatblue -t -c "SELECT wc.id FROM whatsapp_connections wc JOIN companies c ON wc.company_id = c.id WHERE LOWER(c.name) LIKE '%tokeniza%' AND wc.type = 'BAILEYS';" | tr -d ' ' | while read id; do if [ -n "$id" ]; then echo "$id: $(ls /opt/chatblue/app/apps/api/sessions/$id/creds.json 2>/dev/null && echo 'HAS CREDS' || echo 'NO CREDS')"; fi; done}
send "\r"
expect "# "

# 5. Logs recentes do Baileys para conexões da Tokeniza
send {TOKENIZA_IDS=$(docker exec chatblue_postgres psql -U chatblue chatblue -t -c "SELECT wc.id FROM whatsapp_connections wc JOIN companies c ON wc.company_id = c.id WHERE LOWER(c.name) LIKE '%tokeniza%' AND wc.type = 'BAILEYS';" | tr -d ' ' | tr '\n' '|' | sed 's/|$//'); pm2 logs chatblue-api --nostream --lines 200 2>&1 | grep -E "$TOKENIZA_IDS" | tail -30}
send "\r"
expect -timeout 20 "# "

# 6. Status geral das sessões (quais estão OK e quais falham)
send {pm2 logs chatblue-api --nostream --lines 200 2>&1 | grep -iE 'QR Code received|QR Code saved|connection open|connected successfully|405|Connection Failure|Max retries|session path' | tail -30}
send "\r"
expect -timeout 15 "# "

send "exit\r"
expect eof
