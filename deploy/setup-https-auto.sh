#!/bin/bash
# Script para configurar HTTPS com Let's Encrypt (com domínio) ou certificado auto-assinado (sem domínio)

set -e

DOMAIN="${1:-84.247.191.105}"
EMAIL="${2:-admin@example.com}"

echo "🔒 Configurando HTTPS para: $DOMAIN"

# Verificar se é um IP ou domínio
if [[ $DOMAIN =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo "⚠️  IP detectado: $DOMAIN"
    echo "⚠️  Let's Encrypt requer um domínio válido."
    echo "⚠️  Será configurado certificado auto-assinado (navegador mostrará aviso de segurança)."
    USE_SELF_SIGNED=true
else
    echo "✅ Domínio detectado: $DOMAIN"
    USE_SELF_SIGNED=false
fi

# Atualizar pacotes
echo "📦 Atualizando pacotes..."
apt-get update -qq

# Criar diretórios necessários
mkdir -p /var/www/html/.well-known/acme-challenge
mkdir -p /etc/nginx/ssl

if [ "$USE_SELF_SIGNED" = true ]; then
    # Certificado auto-assinado
    echo "🔐 Gerando certificado auto-assinado..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/privkey.pem \
        -out /etc/nginx/ssl/fullchain.pem \
        -subj "/C=BR/ST=State/L=City/O=ChatBlue/CN=$DOMAIN"
    
    CERT_PATH="/etc/nginx/ssl"
else
    # Instalar certbot se não estiver instalado
    if ! command -v certbot &> /dev/null; then
        echo "📦 Instalando Certbot..."
        apt-get install -y certbot python3-certbot-nginx
    else
        echo "✅ Certbot já instalado"
    fi
    
    # Verificar se o Nginx está rodando
    if ! systemctl is-active --quiet nginx; then
        echo "🚀 Iniciando Nginx..."
        systemctl start nginx
        systemctl enable nginx
    fi
fi

# Backup da configuração atual
CONFIG_FILE="/etc/nginx/sites-available/chatblue"
if [ -f "$CONFIG_FILE" ]; then
    echo "💾 Fazendo backup da configuração do Nginx..."
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Criar configuração do Nginx
echo "⚙️  Configurando Nginx..."

if [ "$USE_SELF_SIGNED" = true ]; then
    # Configuração com certificado auto-assinado
    cat > "$CONFIG_FILE" <<EOF
# HTTP - Redirecionar para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Redirecionar para HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/chatblue-access.log;
    error_log /var/log/nginx/chatblue-error.log;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # API Backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        client_max_body_size 50M;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Uploads
    location /uploads {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
else
    # Configuração inicial para Let's Encrypt
    cat > "$CONFIG_FILE" <<EOF
# HTTP - Para validação do Let's Encrypt
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Permitir certificados do Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Frontend (temporário, para validação)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # API (temporário)
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

    # Testar e recarregar Nginx
    nginx -t
    systemctl reload nginx

    # Obter certificado SSL do Let's Encrypt
    echo "🔐 Obtendo certificado SSL do Let's Encrypt..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect || {
        echo "❌ Erro ao obter certificado. Verifique se:"
        echo "  1. O domínio $DOMAIN aponta para este servidor"
        echo "  2. A porta 80 está aberta no firewall"
        echo "  3. Não há outro servidor usando a porta 80"
        exit 1
    }
fi

# Testar configuração do Nginx
echo "🧪 Testando configuração do Nginx..."
nginx -t

# Recarregar Nginx
echo "🔄 Recarregando Nginx..."
systemctl reload nginx

# Configurar renovação automática (apenas para Let's Encrypt)
if [ "$USE_SELF_SIGNED" = false ]; then
    echo "🔄 Configurando renovação automática..."
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    # Testar renovação
    certbot renew --dry-run
fi

echo ""
echo "🎉 HTTPS configurado com sucesso!"
if [ "$USE_SELF_SIGNED" = true ]; then
    echo "⚠️  Usando certificado auto-assinado"
    echo "⚠️  Navegadores mostrarão aviso de segurança"
    echo "🌐 Acesse: https://$DOMAIN (aceite o aviso de segurança)"
    echo ""
    echo "💡 Para certificado válido, configure um domínio apontando para este IP"
else
    echo "✅ Certificado SSL válido instalado"
    echo "🌐 Acesse: https://$DOMAIN"
    echo ""
    echo "📝 Notas:"
    echo "  - Certificado válido por 90 dias"
    echo "  - Renovação automática configurada"
    echo "  - HTTP redireciona automaticamente para HTTPS"
fi







