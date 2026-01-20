#!/usr/bin/expect -f

set timeout 180
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Deploy Completo - Blue Mascot Fix"
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
send "head -12 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | tail -2\r"
expect "# "

# Verificar se requireAdmin foi removido
puts "\n=== Verificando se requireAdmin foi removido ==="
send "grep -n 'router.get.*requireAdmin' /opt/chatblue/app/apps/api/src/routes/settings.routes.ts || echo 'requireAdmin não encontrado na rota GET /' (OK)\r"
expect "# "

# Compilar
puts "\n=== Compilando TypeScript ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -20\r"
expect "# "

# Verificar arquivo compilado
puts "\n=== Verificando arquivo compilado ==="
send "grep 'router.get' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js | head -3\r"
expect "# "

# Verificar se requireAdmin foi removido no compilado
puts "\n=== Verificando se requireAdmin foi removido no compilado ==="
send "grep 'router.get.*requireAdmin.*settings' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js || echo 'requireAdmin removido com sucesso!' (OK)\r"
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

# Logs
puts "\n=== Verificando logs recentes ==="
send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

puts "\n=========================================="
puts "   ✅ Deploy concluído!"
puts "=========================================="

send "exit\r"
expect eof


