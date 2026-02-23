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

# 1. Status do PM2
send "pm2 status\r"
expect "# "

# 2. Logs recentes da API (últimas 100 linhas) filtrando QR / baileys / whatsapp / connection
send "pm2 logs chatblue-api --nostream --lines 100 2>&1 | grep -iE 'qr|baileys|whatsapp|connection|socket|error|warn|session' | tail -50\r"
expect -timeout 15 "# "

# 3. Verificar conexões WhatsApp no banco
send {docker exec chatblue_postgres psql -U chatblue chatblue -c "SELECT id, name, type, status, phone_number, is_default, LEFT(session_data::text, 100) AS session_preview FROM whatsapp_connections ORDER BY created_at DESC LIMIT 10;"}
send "\r"
expect -timeout 15 "# "

# 4. Ver se a pasta sessions existe e tem conteúdo
send "ls -la /opt/chatblue/app/apps/api/sessions/ 2>/dev/null || echo 'Pasta sessions não existe'\r"
expect "# "

# 5. Logs completos recentes (últimas 50 linhas sem filtro)
send "pm2 logs chatblue-api --nostream --lines 50 2>&1 | tail -50\r"
expect -timeout 15 "# "

# 6. Verificar se a rota de QR code está respondendo
send {curl -s http://localhost:3001/api/health 2>&1 | head -5}
send "\r"
expect "# "

# 7. Verificar porta e processo
send "netstat -tlnp 2>/dev/null | grep -E '3001|3000' || ss -tlnp | grep -E '3001|3000'\r"
expect "# "

send "exit\r"
expect eof
