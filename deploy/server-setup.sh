#!/bin/bash
# =============================================================================
# ChatBlue Server Setup Script
# Execute como root: bash server-setup.sh
# =============================================================================

set -e

echo "=========================================="
echo "       ChatBlue Server Setup"
echo "=========================================="

# -----------------------------------------------------------------------------
# 1. ATUALIZAÇÃO DO SISTEMA
# -----------------------------------------------------------------------------
echo "[1/10] Atualizando sistema..."
apt update && apt upgrade -y

# -----------------------------------------------------------------------------
# 2. INSTALAÇÃO DE DEPENDÊNCIAS BÁSICAS
# -----------------------------------------------------------------------------
echo "[2/10] Instalando dependências básicas..."
apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx \
    build-essential \
    software-properties-common

# -----------------------------------------------------------------------------
# 3. INSTALAÇÃO DO DOCKER
# -----------------------------------------------------------------------------
echo "[3/10] Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Instalar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker-compose --version)"

# -----------------------------------------------------------------------------
# 4. INSTALAÇÃO DO NODE.JS (via NVM)
# -----------------------------------------------------------------------------
echo "[4/10] Instalando Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Instalar pnpm
npm install -g pnpm

echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"

# -----------------------------------------------------------------------------
# 5. CRIAÇÃO DA ESTRUTURA DE DIRETÓRIOS
# -----------------------------------------------------------------------------
echo "[5/10] Criando estrutura de diretórios..."
mkdir -p /opt/chatblue/{app,data,logs,backups,ssl}
mkdir -p /opt/chatblue/data/{postgres,redis,uploads}
chmod -R 755 /opt/chatblue

# -----------------------------------------------------------------------------
# 6. CRIAÇÃO DO USUÁRIO CHATBLUE
# -----------------------------------------------------------------------------
echo "[6/10] Criando usuário chatblue..."
if ! id "chatblue" &>/dev/null; then
    useradd -r -s /bin/bash -d /opt/chatblue chatblue
    usermod -aG docker chatblue
fi
chown -R chatblue:chatblue /opt/chatblue

# -----------------------------------------------------------------------------
# 7. CONFIGURAÇÃO DO FIREWALL
# -----------------------------------------------------------------------------
echo "[7/10] Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 3001/tcp  # API
ufw --force enable

# -----------------------------------------------------------------------------
# 8. CONFIGURAÇÃO DO FAIL2BAN
# -----------------------------------------------------------------------------
echo "[8/10] Configurando Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# -----------------------------------------------------------------------------
# 9. CONFIGURAÇÃO DO NGINX
# -----------------------------------------------------------------------------
echo "[9/10] Configurando Nginx..."
cat > /etc/nginx/sites-available/chatblue << 'EOF'
# ChatBlue Nginx Configuration
# Substitua SEU_DOMINIO.com pelo seu domínio real

upstream chatblue_api {
    server 127.0.0.1:3001;
    keepalive 64;
}

upstream chatblue_web {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com api.SEU_DOMINIO.com;
    return 301 https://$server_name$request_uri;
}

# Main Web App
server {
    listen 443 ssl http2;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    # SSL will be configured by certbot
    # ssl_certificate /etc/letsencrypt/live/SEU_DOMINIO.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/SEU_DOMINIO.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://chatblue_web;
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
}

# API Server
server {
    listen 443 ssl http2;
    server_name api.SEU_DOMINIO.com;

    # SSL will be configured by certbot
    # ssl_certificate /etc/letsencrypt/live/api.SEU_DOMINIO.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.SEU_DOMINIO.com/privkey.pem;

    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://chatblue_api;
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

    # WebSocket support for Socket.io
    location /socket.io/ {
        proxy_pass http://chatblue_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
EOF

ln -sf /etc/nginx/sites-available/chatblue /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# -----------------------------------------------------------------------------
# 10. CRIAR DOCKER COMPOSE DE PRODUÇÃO
# -----------------------------------------------------------------------------
echo "[10/10] Criando docker-compose de produção..."
cat > /opt/chatblue/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: chatblue_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-chatblue}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-chatblue}
    volumes:
      - /opt/chatblue/data/postgres:/var/lib/postgresql/data
    networks:
      - chatblue_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatblue"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: chatblue_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - /opt/chatblue/data/redis:/data
    networks:
      - chatblue_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  chatblue_network:
    driver: bridge
EOF

# Criar arquivo .env de exemplo
cat > /opt/chatblue/.env.example << 'EOF'
# =============================================================================
# ChatBlue Production Environment Variables
# Copie para .env e preencha os valores
# =============================================================================

# Database
POSTGRES_USER=chatblue
POSTGRES_PASSWORD=GERE_UMA_SENHA_FORTE_AQUI
POSTGRES_DB=chatblue
DATABASE_URL=postgresql://chatblue:GERE_UMA_SENHA_FORTE_AQUI@localhost:5432/chatblue

# Redis
REDIS_PASSWORD=GERE_OUTRA_SENHA_FORTE_AQUI
REDIS_URL=redis://:GERE_OUTRA_SENHA_FORTE_AQUI@localhost:6379

# JWT
JWT_SECRET=GERE_UM_SECRET_DE_64_CARACTERES_AQUI
JWT_EXPIRES_IN=7d

# API
API_PORT=3001
API_URL=https://api.SEU_DOMINIO.com
CORS_ORIGIN=https://SEU_DOMINIO.com

# Web
NEXT_PUBLIC_API_URL=https://api.SEU_DOMINIO.com

# WhatsApp (Baileys)
WHATSAPP_SESSION_PATH=/opt/chatblue/data/whatsapp-sessions

# AI (opcional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Upload
UPLOAD_PATH=/opt/chatblue/data/uploads
MAX_FILE_SIZE=16777216
EOF

# -----------------------------------------------------------------------------
# FINALIZAÇÃO
# -----------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "       Setup Concluído!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo ""
echo "1. Configure seu domínio DNS apontando para este IP"
echo ""
echo "2. Edite o Nginx com seu domínio:"
echo "   nano /etc/nginx/sites-available/chatblue"
echo "   (substitua SEU_DOMINIO.com)"
echo ""
echo "3. Configure SSL com Let's Encrypt:"
echo "   certbot --nginx -d seudominio.com -d api.seudominio.com"
echo ""
echo "4. Configure o .env:"
echo "   cp /opt/chatblue/.env.example /opt/chatblue/.env"
echo "   nano /opt/chatblue/.env"
echo ""
echo "5. Inicie os containers:"
echo "   cd /opt/chatblue && docker-compose up -d"
echo ""
echo "6. Clone e deploy do ChatBlue:"
echo "   cd /opt/chatblue/app"
echo "   git clone SEU_REPOSITORIO ."
echo "   pnpm install"
echo "   pnpm prisma migrate deploy"
echo "   pnpm build"
echo ""
echo "7. Use PM2 para gerenciar os processos:"
echo "   npm install -g pm2"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "=========================================="



