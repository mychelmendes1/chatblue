#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Analisando logs da conexão WhatsApp ==="
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

send "echo '=== Últimas 100 linhas de log da API ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 100 --nostream | tail -100\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Erros recentes ==='\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 50 --nostream | tail -50\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Status das conexões no banco ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, type, status, phone, is_active, last_connected FROM whatsapp_connections ORDER BY updated_at DESC LIMIT 5;\" 2>/dev/null || echo 'Erro ao conectar ao banco'\r"
expect "# "

send "exit\r"
expect eof
