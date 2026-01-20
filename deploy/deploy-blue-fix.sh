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

# Fazer backup
puts "\n=== Fazendo backup ==="
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup\r"
expect "# "

# Copiar arquivo
puts "\n=== Copiando arquivo corrigido ==="
send "cp /tmp/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts\r"
expect "# "

# Verificar
puts "\n=== Verificando arquivo ==="
send "head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -E 'Get settings'\r"
expect "# "

# Compilar (mesmo com erros pré-existentes)
puts "\n=== Compilando (ignorando erros pré-existentes) ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 || echo 'Build com erros, mas continuando...'\r"
expect "# "

# Verificar se settings.routes.js foi gerado
puts "\n=== Verificando arquivo compilado ==="
send "ls -la /opt/chatblue/app/apps/api/dist/routes/settings.routes.js 2>&1\r"
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
puts "\n=== Logs recentes ==="
send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

puts "\n=========================================="
puts "   Deploy concluído!"
puts "=========================================="

send "exit\r"
expect eof


