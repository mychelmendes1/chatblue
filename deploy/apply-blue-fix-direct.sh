#!/usr/bin/expect -f

set timeout 180
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Aplicando correção do Blue Mascot"
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

# Verificar se arquivo existe em /tmp
puts "\n=== Verificando arquivo em /tmp ==="
send "ls -la /tmp/settings.routes.fixed.ts 2>&1\r"
expect "# "

# Se não existir, criar a partir do /tmp/settings.routes.ts anterior
puts "\n=== Usando arquivo de /tmp ou criando correção ==="
send "if [ -f /tmp/settings.routes.fixed.ts ]; then cp /tmp/settings.routes.fixed.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts; else echo 'Arquivo não encontrado, criando correção...'; cat /tmp/settings.routes.ts | sed 's/router.get(\\''\\/\\'', authenticate, requireAdmin, ensureTenant/router.get(\\''\\/\\'', authenticate, ensureTenant/' > /opt/chatblue/app/apps/api/src/routes/settings.routes.ts; fi\r"
expect "# "

# Verificar se mudou
puts "\n=== Verificando se mudou ==="
send "head -12 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep 'router.get'\r"
expect "# "

# Compilar
puts "\n=== Compilando ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -10\r"
expect "# "

# Verificar compilado
puts "\n=== Verificando compilado ==="
send "grep -A 1 'router.get.*/' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js | head -3\r"
expect "# "

# Reiniciar
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

# Verificar
puts "\n=== Verificação final ==="
send "grep 'router.get.*requireAdmin.*settings' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js && echo '❌ AINDA TEM requireAdmin' || echo '✅ requireAdmin removido com sucesso!'\r"
expect "# "

puts "\n=========================================="
puts "   ✅ Processo concluído!"
puts "=========================================="

send "exit\r"
expect eof


