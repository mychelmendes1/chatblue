#!/bin/bash
# Script para configurar SSL com Let's Encrypt após DNS do Cloudflare propagar

set -e

if [ -z "$1" ]; then
    echo "❌ Erro: Domínio não especificado"
    echo "Uso: $0 <domínio-completo> [email]"
    echo "Exemplo: $0 chat.exemplo.com admin@exemplo.com"
    exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@example.com}"

echo "🔒 Configurando HTTPS com Let's Encrypt para: $DOMAIN"
echo "📧 Email: $EMAIL"

# Verificar se o DNS já propagou
echo "🔍 Verificando DNS..."
RESOLVED_IP=$(dig +short "$DOMAIN" @8.8.8.8 | tail -1)
SERVER_IP="84.247.191.105"

if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    echo "⚠️  DNS ainda não propagou completamente"
    echo "   Domínio $DOMAIN resolve para: $RESOLVED_IP"
    echo "   Esperado: $SERVER_IP"
    echo ""
    echo "⏳ Aguarde alguns minutos e tente novamente."
    echo "   Cloudflare geralmente propaga em 1-5 minutos."
    exit 1
fi

echo "✅ DNS propagado corretamente!"
echo "   $DOMAIN → $RESOLVED_IP"

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

# Backup da configuração atual
CONFIG_FILE="/etc/nginx/sites-available/chatblue"
if [ -f "$CONFIG_FILE" ]; then
    echo "💾 Fazendo backup da configuração do Nginx..."
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Criar configuração temporária HTTP para validação do Let's Encrypt
echo "⚙️  Configurando Nginx para validação Let's Encrypt..."
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

# Criar diretório para validação
mkdir -p /var/www/html/.well-known/acme-challenge

# Obter certificado SSL do Let's Encrypt
echo "🔐 Obtendo certificado SSL do Let's Encrypt..."
certbot --nginx -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect \
    || {
    echo ""
    echo "❌ Erro ao obter certificado Let's Encrypt"
    echo "Verifique se:"
    echo "  1. O DNS $DOMAIN aponta para $SERVER_IP"
    echo "  2. A porta 80 está aberta no firewall"
    echo "  3. O Cloudflare está com proxy DESABILITADO (Somente DNS)"
    echo ""
    echo "Teste o DNS com: dig $DOMAIN @8.8.8.8"
    exit 1
}

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
    echo "📝 Informações:"
    echo "  - Certificado válido por 90 dias"
    echo "  - Renovação automática configurada"
    echo "  - HTTP redireciona automaticamente para HTTPS"
    echo ""
    echo "⚠️  IMPORTANTE: Certifique-se de que o Cloudflare está com Proxy DESABILITADO"
    echo "   (Status: Somente DNS) para SSL funcionar corretamente."
else
    echo "❌ Erro ao instalar certificado SSL"
    exit 1
fi














