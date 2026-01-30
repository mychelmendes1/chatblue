#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo erro 502 da API ==="

# SSH e corrigir
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

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Verificando arquivos de build ==='\r"
expect "# "

send "ls -la dist/server.* 2>&1\r"
expect "# "

send "echo '=== Verificando configuração do PM2 ==='\r"
expect "# "

send "cat /opt/chatblue/ecosystem.config.js 2>/dev/null | grep -A 5 'chatblue-api' | head -10\r"
expect "# "

send "echo '=== Verificando status da API ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 20 --nostream 2>&1 | tail -20\r"
expect "# "

send "echo '=== Corrigindo arquivo server (criar .cjs se necessário) ==='\r"
expect "# "

send "cd dist && if [ -f server.js ] && [ ! -f server.cjs ]; then cp server.js server.cjs && echo 'server.cjs criado'; else echo 'Arquivo já existe ou server.js não encontrado'; fi\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Tentando iniciar API novamente ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 20 --nostream 2>&1 | tail -20\r"
expect "# "

send "echo '=== Verificando se API está respondendo ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1 | head -5\r"
expect "# "

send "echo '=== Correção concluída! ==='\r"
expect "# "

send "exit\r"
expect eof






