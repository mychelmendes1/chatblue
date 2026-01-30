#!/bin/bash
# Script para configurar HTTPS com Let's Encrypt

set -e

DOMAIN="${1:-}"
EMAIL="${2:-admin@example.com}"

if [ -z "$DOMAIN" ]; then
    echo "❌ Erro: Domínio não especificado"
    echo "Uso: $0 <dominio.com> [email]"
    echo "Exemplo: $0 chatblue.example.com admin@example.com"
    exit 1
fi

echo "🔒 Configurando HTTPS para: $DOMAIN"
echo "📧 Email: $EMAIL"

# Atualizar pacotes
echo "📦 Atualizando pacotes..."
apt-get update -qq

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

# Backup da configuração atual do Nginx
CONFIG_FILE="/etc/nginx/sites-available/chatblue"
if [ -f "$CONFIG_FILE" ]; then
    echo "💾 Fazendo backup da configuração do Nginx..."
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Criar configuração do Nginx com HTTPS
echo "⚙️  Configurando Nginx para $DOMAIN..."

cat > "$CONFIG_FILE" <<EOF
# HTTP - Redirecionar para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Permitir certificados do Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirecionar todo o resto para HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration (será preenchido pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

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
        proxy_pass http://localhost:3000;
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
        proxy_pass http://localhost:3001;
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

    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:3001;
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
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Testar configuração do Nginx
echo "🧪 Testando configuração do Nginx..."
nginx -t

# Recarregar Nginx
echo "🔄 Recarregando Nginx..."
systemctl reload nginx

# Obter certificado SSL
echo "🔐 Obtendo certificado SSL do Let's Encrypt..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

# Verificar instalação
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ Certificado SSL instalado com sucesso!"
    
    # Configurar renovação automática
    echo "🔄 Configurando renovação automática..."
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    # Testar renovação
    certbot renew --dry-run
    
    echo ""
    echo "🎉 HTTPS configurado com sucesso!"
    echo "🌐 Acesse: https://$DOMAIN"
    echo ""
    echo "📝 Notas:"
    echo "  - Certificado válido por 90 dias"
    echo "  - Renovação automática configurada"
    echo "  - HTTP redireciona automaticamente para HTTPS"
else
    echo "❌ Erro ao obter certificado SSL"
    echo "Verifique se:"
    echo "  1. O domínio $DOMAIN aponta para o IP do servidor"
    echo "  2. A porta 80 está aberta no firewall"
    echo "  3. Não há outro servidor web usando a porta 80"
    exit 1
fi














