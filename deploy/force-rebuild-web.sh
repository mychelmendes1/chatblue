#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Forçando rebuild completo do frontend ==="

# 1. Atualizar código do git
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

send "cd /opt/chatblue/app && git pull origin main 2>&1 | tail -10\r"
expect "# "

send "exit\r"
expect eof

# 2. Copiar arquivos do frontend
puts ""
puts "=== Copiando arquivos do frontend ==="

spawn sh -c "cd /Users/mychel/Downloads/Projetos/chatblue/chatblue && tar czf - apps/web/app/nps apps/web/components/ui apps/web/lib/api.ts 2>/dev/null | ssh -o StrictHostKeyChecking=no ${user}@${server} 'cd /opt/chatblue/app && tar xzf -'"

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

expect eof

# 3. Rebuild completo
puts ""
puts "=== Rebuild completo do frontend ==="

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

send "cd /opt/chatblue/app/apps/web && rm -rf .next node_modules/.cache 2>/dev/null || true\r"
expect "# "

send "cd /opt/chatblue/app/apps/web && pnpm install 2>&1 | tail -10\r"
expect "# "

send "cd /opt/chatblue/app/apps/web && pnpm run build 2>&1 | tail -60\r"
expect "# "

send "test -f .next/BUILD_ID && echo '✅ BUILD OK' || echo '❌ BUILD FALHOU'\r"
expect "# "

send "pm2 restart chatblue-web --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status | grep chatblue-web\r"
expect "# "

send "pm2 logs chatblue-web --err --lines 5 --nostream | tail -5\r"
expect "# "

send "exit\r"
expect eof

puts ""
puts "=== Rebuild concluído! ==="



