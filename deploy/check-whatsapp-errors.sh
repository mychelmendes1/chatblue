#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando erros de conexão WhatsApp ==="
puts ""

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

# Verificar logs recentes relacionados ao WhatsApp
send "echo '=== Últimos erros relacionados ao WhatsApp ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 200 --nostream | grep -iE '(whatsapp|baileys|meta|connection|error|fail|qr)' | tail -50\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Logs de conexão WhatsApp (últimas 100 linhas) ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 100 --nostream | grep -iE '(connection|whatsapp|baileys|meta)' | tail -30\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Status dos processos PM2 ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando erros recentes (últimas 50 linhas) ==='\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 50 --nostream | tail -50\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando banco de dados para conexões WhatsApp ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, type, status, phone, is_active, last_connected, created_at FROM whatsapp_connections ORDER BY updated_at DESC LIMIT 10;\" 2>/dev/null || echo 'Erro ao conectar ao banco'\r"
expect "# "

send "exit\r"
expect eof



