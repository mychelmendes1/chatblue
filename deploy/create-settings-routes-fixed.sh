#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Criando arquivo settings.routes.ts corrigido"
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

# Fazer backup
puts "\n=== Fazendo backup ==="
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup.final\r"
expect "# "

# Usar Python para editar o arquivo corretamente
puts "\n=== Editando arquivo usando Python ==="
send "cd /opt/chatblue/app/apps/api/src/routes && python3 << 'PYEOF'\r"
expect "# "
send "import re\r"
expect "# "
send "with open('settings.routes.ts', 'r') as f:\r"
expect "# "
send "    content = f.read()\r"
expect "# "
send "content = re.sub(\r"
expect "# "
send "    r'router\\.get\\(\\'/',\\s+authenticate,\\s+requireAdmin,\\s+ensureTenant',\r"
expect "# "
send "    'router.get(\\\'/\\\', authenticate, ensureTenant',\r"
expect "# "
send "    content\r"
expect "# "
send ")\r"
expect "# "
send "with open('settings.routes.ts', 'w') as f:\r"
expect "# "
send "    f.write(content)\r"
expect "# "
send "print('Arquivo editado com sucesso')\r"
expect "# "
send "PYEOF\r"
expect "# "

# Verificar mudança
puts "\n=== Verificando mudança ==="
send "head -12 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | tail -2\r"
expect "# "

# Compilar
puts "\n=== Compilando ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -5\r"
expect "# "

# Verificar arquivo compilado
puts "\n=== Verificando arquivo compilado ==="
send "grep 'router.get' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js | head -2\r"
expect "# "

# Reiniciar
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

puts "\n=========================================="
puts "   ✅ Correção aplicada!"
puts "=========================================="

send "exit\r"
expect eof




