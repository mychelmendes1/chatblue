#!/usr/bin/expect -f

set timeout 180
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Deploy: Correção do Blue Mascot"
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

# Fazer backup do arquivo atual
puts "\n=== Fazendo backup do arquivo atual ==="
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup.\\\$\(date +%Y%m%d_%H%M%S\)\r"
expect "# "

# Copiar arquivo corrigido
puts "\n=== Copiando arquivo corrigido ==="
send "cp /tmp/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts\r"
expect "# "

# Verificar se o arquivo foi copiado corretamente
puts "\n=== Verificando arquivo copiado ==="
send "head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -E 'Get settings|public|admin only'\r"
expect "# "

# Compilar TypeScript
puts "\n=== Compilando TypeScript ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -30\r"
expect "# "

# Verificar se compilou sem erros
puts "\n=== Verificando se compilou ==="
send "if [ \$? -eq 0 ]; then echo '✅ Compilação bem-sucedida'; else echo '❌ Erro na compilação'; fi\r"
expect "# "

# Verificar se a rota está no código compilado
puts "\n=== Verificando rota no código compilado ==="
send "grep -E 'app.get.*settings|/admin' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js 2>&1 | head -5\r"
expect "# "

# Reiniciar PM2
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

# Aguardar um pouco
send "sleep 5\r"
expect "# "

# Verificar status do PM2
puts "\n=== Verificando status do PM2 ==="
send "pm2 status\r"
expect "# "

# Verificar logs recentes
puts "\n=== Verificando logs recentes ==="
send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | tail -15\r"
expect "# "

puts "\n=========================================="
puts "   Deploy concluído!"
puts "=========================================="
puts "\nO Blue Mascot agora deve aparecer para"
puts "todos os usuários quando blueEnabled=true"
puts "\n"

send "exit\r"
expect eof

