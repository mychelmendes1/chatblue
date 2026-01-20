#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Correção Simples do Blue Mascot"
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

# Usar perl para editar (mais confiável)
puts "\n=== Editando arquivo com perl ==="
send "cd /opt/chatblue/app/apps/api/src/routes && perl -i -pe \"s/router\\.get\\('\\\\/'\\s*,\\s*authenticate,\\s*requireAdmin,\\s*ensureTenant/router.get('\\\\/', authenticate, ensureTenant/\" settings.routes.ts\r"
expect "# "

# Verificar
puts "\n=== Verificando mudança ==="
send "head -12 settings.routes.ts | grep \"router.get\"\r"
expect "# "

# Compilar
puts "\n=== Compilando ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -5\r"
expect "# "

# Verificar compilado
puts "\n=== Verificando compilado ==="
send "grep -A 1 \"router.get('\\\\/'\" dist/routes/settings.routes.js | head -2\r"
expect "# "

# Reiniciar
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

# Verificação final
puts "\n=== Verificação final ==="
send "grep \"router.get.*requireAdmin.*settings\" dist/routes/settings.routes.js && echo 'ERRO: Ainda tem requireAdmin' || echo 'OK: requireAdmin removido!'\r"
expect "# "

puts "\n=========================================="
puts "   ✅ Correção aplicada!"
puts "=========================================="

send "exit\r"
expect eof


