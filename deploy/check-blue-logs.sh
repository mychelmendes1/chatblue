#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Verificando Logs do Blue Mascot"
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

# Verificar logs do PM2 relacionados ao Blue
puts "\n=== Buscando nos logs do PM2 (últimas 500 linhas) ==="
send "pm2 logs chatblue-api --lines 500 --nostream 2>&1 | grep -i 'blue\\|Blue\\|mascot\\|/api/settings\\|blueEnabled' | tail -30\r"
expect "# "

# Verificar se a rota /api/blue está registrada
puts "\n=== Verificando se a rota /api/blue está no código compilado ==="
send "grep -r 'blueRouter\\|/api/blue' /opt/chatblue/app/apps/api/dist/server.js 2>&1 | head -5\r"
expect "# "

# Verificar se o componente Blue está no frontend compilado
puts "\n=== Verificando se o componente Blue está compilado ==="
send "find /opt/chatblue/app/apps/web/.next -name '*blue*' -o -name '*Blue*' 2>&1 | head -10\r"
expect "# "

# Verificar configurações do Blue no banco
puts "\n=== Verificando configurações do Blue no banco de dados ==="
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT company_id, blue_enabled, ai_enabled, ai_provider FROM company_settings ORDER BY updated_at DESC LIMIT 5;\" 2>&1\r"
expect "# "

# Verificar se a tabela blue_interactions existe
puts "\n=== Verificando se a tabela blue_interactions existe ==="
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"\\d blue_interactions\" 2>&1\r"
expect "# "

# Verificar erros recentes no console
puts "\n=== Verificando erros de API recentes ==="
send "pm2 logs chatblue-api --lines 200 --nostream --err 2>&1 | grep -i 'error\\|failed\\|404\\|500' | tail -20\r"
expect "# "

# Verificar se o componente BlueMascot está no código fonte
puts "\n=== Verificando código fonte do BlueMascot ==="
send "ls -la /opt/chatblue/app/apps/web/components/blue/ 2>&1\r"
expect "# "

# Verificar arquivos .next
puts "\n=== Verificando estrutura do .next ==="
send "ls -la /opt/chatblue/app/apps/web/.next 2>&1 | head -20\r"
expect "# "

puts "\n=== Verificação concluída ==="
send "exit\r"
expect eof


