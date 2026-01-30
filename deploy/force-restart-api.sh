#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Forçando restart completo da API ==="

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

send "echo '=== Parando API ==='\r"
expect "# "

send "pm2 stop chatblue-api\r"
expect "# "

send "sleep 2\r"
expect "# "

send "echo '=== Verificando código atualizado ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && grep -A 3 'baseUrl.includes' dist/services/nps/nps.service.js 2>/dev/null | head -5 || echo 'Código não encontrado - precisa recompilar'\r"
expect "# "

send "echo '=== Recompilando API ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -20\r"
expect "# "

send "echo '=== Verificando código após build ==='\r"
expect "# "

send "grep -A 3 'baseUrl.includes' dist/services/nps/nps.service.js 2>/dev/null | head -5 || echo 'Código ainda não encontrado'\r"
expect "# "

send "echo '=== Verificando variáveis de ambiente ==='\r"
expect "# "

send "pm2 env 1 | grep -E '(NODE_ENV|FRONTEND_URL|WEB_URL)' || echo 'Variáveis não encontradas'\r"
expect "# "

send "echo '=== Reiniciando API com --update-env ==='\r"
expect "# "

send "cd /opt/chatblue && pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status | grep chatblue-api\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream | tail -10\r"
expect "# "

send "exit\r"
expect eof

puts ""
puts "=== Restart concluído! ==="


