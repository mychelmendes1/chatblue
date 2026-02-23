#!/usr/bin/expect -f
set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_dir [pwd]

# 1) Enviar next.config.js corrigido
spawn scp -o StrictHostKeyChecking=no \
  "$local_dir/apps/web/next.config.js" \
  ${user}@${server}:/opt/chatblue/app/apps/web/next.config.js

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}
expect eof

# 2) Conectar e reconstruir
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Corrigir .env.local (NEXT_PUBLIC_API_URL vazio para usar reverse proxy)
send "echo 'NEXT_PUBLIC_API_URL=' > /opt/chatblue/app/apps/web/.env.local && echo '.env.local fixed'\r"
expect "# "

# Limpar build anterior corrompido
send "rm -rf /opt/chatblue/app/apps/web/.next && echo 'Removed old .next'\r"
expect "# "

# Reconstruir o frontend
send "cd /opt/chatblue/app && pnpm build --filter web 2>&1 | tail -15\r"
expect -timeout 180 "# "

# Reiniciar PM2
send "pm2 reload deploy/ecosystem.config.js --update-env\r"
expect -timeout 30 "# "

# Aguardar e testar
send "sleep 5\r"
expect -timeout 15 "# "

send {curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ai-agent}
send "\r"
expect "# "

# Verificar se não tem mais erros
send "tail -5 /opt/chatblue/logs/web-error.log 2>/dev/null\r"
expect "# "

send "exit\r"
expect eof
puts "\n=== Concluído ==="
