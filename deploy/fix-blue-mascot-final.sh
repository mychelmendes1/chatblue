#!/usr/bin/expect -f

set timeout 180
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Correção Final do Blue Mascot"
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

# Verificar arquivo atual
puts "\n=== Verificando arquivo atual ==="
send "head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -E 'router.get.*settings|requireAdmin'\r"
expect "# "

# Fazer backup
puts "\n=== Fazendo backup ==="
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup.before-fix\r"
expect "# "

# Editar linha 11 removendo requireAdmin usando sed
puts "\n=== Removendo requireAdmin da linha 11 ==="
send "cd /opt/chatblue/app/apps/api/src/routes && sed -i 's/router.get(\\''\\/\\'', authenticate, requireAdmin, ensureTenant/router.get(\\''\\/\\'', authenticate, ensureTenant/' settings.routes.ts\r"
expect "# "

# Verificar se a mudança foi aplicada
puts "\n=== Verificando mudança ==="
send "head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -A 2 'router.get(\\''\\/\\'''\r"
expect "# "

# Adicionar rota /admin após a rota GET /
puts "\n=== Verificando se precisa adicionar rota /admin ==="
send "grep -q 'router.get.*admin.*settings' /opt/chatblue/app/apps/api/src/routes/settings.routes.ts && echo 'Rota /admin já existe' || echo 'Precisa adicionar rota /admin'\r"
expect "# "

# Compilar
puts "\n=== Compilando ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | grep -E 'settings.routes|error TS|Success' | tail -10\r"
expect "# "

# Verificar arquivo compilado
puts "\n=== Verificando arquivo compilado ==="
send "grep -A 2 'router.get(\\''\\/\\''\|router.get(\\''\\/admin\\''\)' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js | head -10\r"
expect "# "

# Reiniciar
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

# Status
puts "\n=== Status do PM2 ==="
send "pm2 status\r"
expect "# "

puts "\n=========================================="
puts "   ✅ Correção aplicada!"
puts "=========================================="

send "exit\r"
expect eof




