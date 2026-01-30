#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando logs após correção do Baileys ==="

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

send "echo '=== Status dos serviços ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimos logs da API (últimas 100 linhas) ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 100 --nostream 2>&1 | tail -80\r"
expect -timeout 30 "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando se há erros de creds.json ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 200 --nostream 2>&1 | grep -i 'creds.json' | tail -20 || echo 'Nenhum erro de creds.json encontrado!'\r"
expect -timeout 30 "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando conexões ativas no banco ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, type, status, is_active FROM whatsapp_connections WHERE type = 'BAILEYS';\" 2>/dev/null || echo 'Erro ao consultar banco'\r"
expect -timeout 30 "# "

send "exit\r"
expect eof
