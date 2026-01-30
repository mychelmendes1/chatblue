#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Correção Final Blue Mascot (Perl)"
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

# Backup
puts "\n=== Fazendo backup ==="
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup.perl\r"
expect "# "

# Editar com perl (mais confiável para regex)
puts "\n=== Editando arquivo com perl ==="
send "cd /opt/chatblue/app/apps/api/src/routes && perl -i -pe 's/router\\.get\\(.\\/.\\'., authenticate, requireAdmin, ensureTenant/router.get(.\\/., authenticate, ensureTenant/' settings.routes.ts\r"
expect "# "

# Verificar mudança
puts "\n=== Verificando mudança ==="
send "head -12 settings.routes.ts | tail -2\r"
expect "# "

# Compilar
puts "\n=== Compilando ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -5\r"
expect "# "

# Verificar compilado
puts "\n=== Verificando arquivo compilado ==="
send "grep -A 1 'router.get.*/' dist/routes/settings.routes.js | head -2\r"
expect "# "

# Reiniciar
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

# Verificação final
puts "\n=== Verificação final ==="
send "if grep -q 'router.get.*requireAdmin.*settings' dist/routes/settings.routes.js; then echo 'ERRO: Ainda tem requireAdmin'; else echo 'OK: requireAdmin removido com sucesso!'; fi\r"
expect "# "

puts "\n=========================================="
puts "   ✅ Correção aplicada!"
puts "=========================================="

send "exit\r"
expect eof




