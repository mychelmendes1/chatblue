#!/usr/bin/expect -f
# Envia correção do chat-window e reconstrói o frontend no servidor
set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_dir [pwd]
set remote_dir "/opt/chatblue/app"

# 1) Enviar apenas os arquivos alterados (código, sem .env nem sessions)
puts "=== Enviando correção ==="
spawn rsync -avz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  --exclude=.env \
  --exclude=.env.local \
  --exclude=.env.production \
  --exclude=.env.*.local \
  --exclude=apps/api/node_modules \
  --exclude=apps/web/node_modules \
  --exclude=apps/web/.next \
  --exclude=packages/*/node_modules \
  --exclude=.git \
  --exclude=sessions \
  -e "ssh -o StrictHostKeyChecking=no" \
  "$local_dir/" ${user}@${server}:${remote_dir}/

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}
expect eof

# 2) Rebuild e reload
puts "\n=== Rebuild + reload no servidor ==="
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "
send "cd /opt/chatblue/app && pnpm build --filter web\r"
expect -timeout 300 "# "

send "pm2 reload deploy/ecosystem.config.js --update-env\r"
expect -timeout 60 "# "

send "sleep 3 && curl -s http://localhost:3001/health && echo '' && curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 && echo ''\r"
expect "# "

send "exit\r"
expect eof
puts "\n=== Correção aplicada ==="
