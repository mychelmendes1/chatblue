#!/usr/bin/expect -f
set timeout 900
set server "84.247.191.105"
set user "root"
set pass "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect {
    "password:" { send "${pass}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${pass}\r" }
}

expect "# "

# Gerar senhas
send "PG_PASS=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-32)\r"
expect "# "
send "REDIS_PASS=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-32)\r"
expect "# "
send "JWT_SECRET=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-64)\r"
expect "# "

# Configurar .env
send "cp /opt/chatblue/.env.example /opt/chatblue/.env\r"
expect "# "
send "cd /opt/chatblue && sed -i \"s|CHANGE_THIS_PASSWORD|$PG_PASS|g\" .env\r"
expect "# "
send "sed -i \"s|CHANGE_THIS_REDIS_PASSWORD|$REDIS_PASS|g\" .env\r"
expect "# "
send "sed -i \"s|CHANGE_THIS_JWT_SECRET_64_CHARS_MINIMUM|$JWT_SECRET|g\" .env\r"
expect "# "

# Usar IP por enquanto - pode ser alterado depois
send "DOMAIN=\"84.247.191.105\"\r"
expect "# "
send "sed -i \"s|SEU_DOMINIO.com|$DOMAIN|g\" .env\r"
expect "# "

# Configurar Nginx (sem SSL por enquanto)
send "sed -i \"s|SEU_DOMINIO.com|$DOMAIN|g\" /etc/nginx/sites-available/chatblue\r"
expect "# "
send "sed -i 's|listen 443 ssl http2|listen 80|g' /etc/nginx/sites-available/chatblue\r"
expect "# "
send "sed -i '/ssl_certificate/d' /etc/nginx/sites-available/chatblue\r"
expect "# "
send "nginx -t && systemctl reload nginx\r"
expect "# "

# Iniciar Docker
send "cd /opt/chatblue && docker-compose up -d\r"
expect "# "
send "sleep 10\r"
expect "# "

# Verificar containers
send "docker ps --format 'table {{.Names}}\\t{{.Status}}'\r"
expect "# "

# Verificar se há código
send "cd /opt/chatblue/app && if [ -f package.json ]; then echo 'CODE_EXISTS'; else echo 'NO_CODE'; fi\r"
expect {
    "CODE_EXISTS" {
        expect "# "
        send "cd /opt/chatblue/app && pnpm install --frozen-lockfile\r"
        expect "# " { timeout { send "\r"; expect "# " } }
        
        send "cd /opt/chatblue/app/apps/api && pnpm prisma migrate deploy\r"
        expect "# "
        
        send "pnpm prisma generate\r"
        expect "# "
        
        send "cd /opt/chatblue/app && pnpm build\r"
        expect "# " { timeout { send "\r"; expect "# " } }
        
        send "pm2 delete all 2>/dev/null || true\r"
        expect "# "
        send "pm2 start /opt/chatblue/ecosystem.config.js\r"
        expect "# "
        send "pm2 save\r"
        expect "# "
        send "pm2 startup | tail -1 | bash 2>/dev/null || true\r"
        expect "# "
        
        send "sleep 5 && pm2 status\r"
        expect "# "
    }
    "NO_CODE" {
        expect "# "
    }
}

send "echo 'Configuracao concluida!'\r"
expect "# "
send "exit\r"
expect eof














