#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Verificando Blue Mascot - Diagnóstico"
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

# Verificar arquivo settings.routes.ts
puts "\n=== Verificando arquivo settings.routes.ts ==="
send "head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -E 'router.get|requireAdmin|ensureTenant'\r"
expect "# "

# Verificar arquivo compilado
puts "\n=== Verificando arquivo compilado ==="
send "grep -A 2 'router.get' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js | head -10\r"
expect "# "

# Verificar configurações no banco
puts "\n=== Verificando configurações no banco de dados ==="
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT company_id, blue_enabled, ai_enabled, ai_provider FROM company_settings ORDER BY updated_at DESC LIMIT 5;\" 2>&1\r"
expect "# "

# Verificar logs da API para erros relacionados a /api/settings
puts "\n=== Verificando logs da API para /api/settings ==="
send "pm2 logs chatblue-api --lines 500 --nostream 2>&1 | grep -i 'settings\\|blue\\|403\\|401\\|error.*settings' | tail -20\r"
expect "# "

# Verificar se o componente Blue está no frontend
puts "\n=== Verificando se BlueMascot está no layout ==="
send "grep -r 'BlueMascot' /opt/chatblue/app/apps/web/app/\\(dashboard\\)/layout.tsx 2>&1\r"
expect "# "

# Verificar se o componente existe
puts "\n=== Verificando se componente BlueMascot existe ==="
send "ls -la /opt/chatblue/app/apps/web/components/blue/blue-mascot.tsx 2>&1\r"
expect "# "

# Verificar código do componente
puts "\n=== Verificando código do componente BlueMascot ==="
send "grep -A 10 'api.get.*settings' /opt/chatblue/app/apps/web/components/blue/blue-mascot.tsx 2>&1\r"
expect "# "

# Testar rota /api/settings diretamente
puts "\n=== Testando rota /api/settings (sem autenticação) ==="
send "curl -s http://localhost:3001/api/settings 2>&1 | head -10\r"
expect "# "

# Verificar logs de erro do frontend
puts "\n=== Verificando logs do frontend ==="
send "pm2 logs chatblue-web --lines 100 --nostream 2>&1 | grep -i 'blue\\|settings\\|error' | tail -15\r"
expect "# "

# Verificar se há erros no console
puts "\n=== Verificando erros recentes da API ==="
send "pm2 logs chatblue-api --lines 200 --nostream --err 2>&1 | grep -i 'settings\\|blue\\|403\\|401' | tail -15\r"
expect "# "

# Verificar se a rota está registrada no server.js
puts "\n=== Verificando se rota está registrada ==="
send "grep -E 'settings|settingsRouter' /opt/chatblue/app/apps/api/dist/server.js | head -5\r"
expect "# "

puts "\n=========================================="
puts "   Diagnóstico concluído"
puts "=========================================="

send "exit\r"
expect eof


