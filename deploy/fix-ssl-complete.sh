#!/bin/bash
# Script completo para corrigir SSL - removendo conflitos e reconfigurando

set -e

echo "🔧 Corrigindo configuração SSL..."

# Parar Nginx temporariamente
systemctl stop nginx

# Recriar certificado SSL
echo "🔐 Recriando certificado SSL..."
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/privkey.pem \
    -out /etc/nginx/ssl/fullchain.pem \
    -subj "/C=BR/ST=State/L=City/O=ChatBlue/CN=84.247.191.105" 2>/dev/null

# Verificar permissões
chmod 644 /etc/nginx/ssl/fullchain.pem
chmod 600 /etc/nginx/ssl/privkey.pem

# Criar configuração limpa do Nginx
cat > /etc/nginx/sites-available/chatblue << 'EOF'
# HTTP - Redirecionar para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name 84.247.191.105;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name 84.247.191.105;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # SSL Security - configuração básica e compatível
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logs
    access_log /var/log/nginx/chatblue-access.log;
    error_log /var/log/nginx/chatblue-error.log;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # API Backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        client_max_body_size 50M;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Testar configuração
echo "🧪 Testando configuração..."
nginx -t

# Iniciar Nginx
echo "🚀 Iniciando Nginx..."
systemctl start nginx
systemctl enable nginx

# Verificar status
sleep 2
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx iniciado com sucesso!"
    echo "🔍 Testando conexão SSL..."
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost | grep -q "200\|301\|302"; then
        echo "✅ SSL funcionando corretamente!"
    else
        echo "⚠️  SSL pode ter problemas, mas Nginx está rodando"
    fi
else
    echo "❌ Erro ao iniciar Nginx"
    systemctl status nginx --no-pager | head -20
    exit 1
fi

echo ""
echo "🎉 Configuração SSL corrigida!"
echo "🌐 Teste acessando: https://84.247.191.105"
echo "⚠️  Você precisará aceitar o certificado auto-assinado no navegador"












