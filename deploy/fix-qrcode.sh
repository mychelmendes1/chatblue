#!/usr/bin/expect -f
set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_dir [pwd]

# 1) Enviar arquivo corrigido
spawn scp -o StrictHostKeyChecking=no \
  "$local_dir/apps/api/src/services/whatsapp/baileys.service.ts" \
  ${user}@${server}:/opt/chatblue/app/apps/api/src/services/whatsapp/baileys.service.ts

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}
expect eof

# 2) Conectar e aplicar
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Limpar sessões stale copiadas do dev local (owner mychel = do dev)
send "rm -rf /opt/chatblue/app/apps/api/sessions/._* 2>/dev/null && echo 'Removed macOS metadata files'\r"
expect "# "

# Build
send "cd /opt/chatblue/app && pnpm build --filter api 2>&1 | tail -5\r"
expect -timeout 60 "# "

# Parar PM2 completamente e reiniciar (para limpar cache de conexões)
send "pm2 stop all && sleep 3 && pm2 start deploy/ecosystem.config.js --update-env\r"
expect -timeout 30 "# "

# Aguardar e verificar
send "sleep 25\r"
expect -timeout 35 "# "

# Verificar sessions path e QR
send {pm2 logs chatblue-api --nostream --lines 50 2>&1 | grep -iE 'session path|Using session|qr code|QR Code received|connection.*close|405|version' | head -20}
send "\r"
expect -timeout 15 "# "

send "exit\r"
expect eof
puts "\n=== Concluído ==="
