#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Reiniciando frontend Web ==="

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

send "cd /opt/chatblue/app/apps/web && rm -rf .next 2>/dev/null || true\r"
expect "# "

send "echo '=== Recompilando frontend ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/web && pnpm run build 2>&1 | tail -50\r"
expect "# "

send "test -f .next/BUILD_ID && echo '✅ BUILD CONCLUÍDO' || echo '❌ BUILD FALHOU'\r"
expect "# "

send "echo '=== Reiniciando PM2 ==='\r"
expect "# "

send "pm2 delete chatblue-web 2>/dev/null || true\r"
expect "# "

send "cd /opt/chatblue && pm2 start ecosystem.config.js --only chatblue-web\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-web --err --lines 10 --nostream | tail -10\r"
expect "# "

send "curl -s http://localhost:3000/nps/test-token 2>&1 | grep -o 'Carregando pesquisa' | head -1 && echo ' ✅ Frontend OK' || echo ' ❌ Frontend com problema'\r"
expect "# "

send "exit\r"
expect eof

puts ""
puts "=== Reinicialização concluída! ==="



