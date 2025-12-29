#!/bin/bash
# =============================================================================
# ChatBlue Complete Installation Script
# Execute no servidor: bash <(curl -s https://raw.githubusercontent.com/...) 
# OU copie e execute localmente
# =============================================================================

set -e

echo "=========================================="
echo "  ChatBlue - Limpeza e Instalação"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# -----------------------------------------------------------------------------
# LIMPEZA DO SISTEMA
# -----------------------------------------------------------------------------
log "Iniciando limpeza do sistema..."

# Parar serviços existentes
log "Parando serviços existentes..."
systemctl stop nginx 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Remover diretórios antigos
log "Removendo instalações antigas..."
rm -rf /opt/chatblue 2>/dev/null || true

# Limpar Docker (opcional - descomente se quiser limpar completamente)
# docker system prune -af --volumes 2>/dev/null || true

log "Limpeza concluída!"
echo ""

# -----------------------------------------------------------------------------
# ATUALIZAÇÃO DO SISTEMA
# -----------------------------------------------------------------------------
log "Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt update
apt upgrade -y

# -----------------------------------------------------------------------------
# INSTALAÇÃO DE DEPENDÊNCIAS
# -----------------------------------------------------------------------------
log "Instalando dependências..."
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
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# -----------------------------------------------------------------------------
# DOCKER
# -----------------------------------------------------------------------------
log "Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

log "Docker: $(docker --version)"
log "Docker Compose: $(docker-compose --version)"

# -----------------------------------------------------------------------------
# NODE.JS
# -----------------------------------------------------------------------------
log "Instalando Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

npm install -g pnpm pm2

log "Node: $(node --version)"
log "pnpm: $(pnpm --version)"
log "PM2: $(pm2 --version)"

# -----------------------------------------------------------------------------
# ESTRUTURA DE DIRETÓRIOS
# -----------------------------------------------------------------------------
log "Criando estrutura de diretórios..."
mkdir -p /opt/chatblue/{app,data,logs,backups,ssl}
mkdir -p /opt/chatblue/data/{postgres,redis,uploads,whatsapp-sessions}
chmod -R 755 /opt/chatblue

# -----------------------------------------------------------------------------
# USUÁRIO CHATBLUE
# -----------------------------------------------------------------------------
log "Criando usuário chatblue..."
if ! id "chatblue" &>/dev/null; then
    useradd -r -s /bin/bash -d /opt/chatblue chatblue
    usermod -aG docker chatblue
fi
chown -R chatblue:chatblue /opt/chatblue

# -----------------------------------------------------------------------------
# FIREWALL
# -----------------------------------------------------------------------------
log "Configurando firewall..."
ufw --force disable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable
log "Firewall configurado"

# -----------------------------------------------------------------------------
# FAIL2BAN
# -----------------------------------------------------------------------------
log "Configurando Fail2Ban..."
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
EOF

systemctl enable fail2ban
systemctl restart fail2ban
log "Fail2Ban configurado"

# -----------------------------------------------------------------------------
# NGINX
# -----------------------------------------------------------------------------
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/chatblue << 'EOF'
# ChatBlue Nginx Configuration
# Configure SEU_DOMINIO.com abaixo

upstream chatblue_api {
    server 127.0.0.1:3001;
    keepalive 64;
}

upstream chatblue_web {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# Web App (configure seu domínio)
server {
    listen 443 ssl http2;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    # SSL - será configurado pelo certbot
    # ssl_certificate /etc/letsencrypt/live/SEU_DOMINIO.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/SEU_DOMINIO.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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

# API Server (configure seu domínio)
server {
    listen 443 ssl http2;
    server_name api.SEU_DOMINIO.com;

    # SSL - será configurado pelo certbot
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

    # WebSocket for Socket.io
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
nginx -t && systemctl enable nginx && systemctl start nginx
log "Nginx configurado"

# -----------------------------------------------------------------------------
# DOCKER COMPOSE
# -----------------------------------------------------------------------------
log "Criando docker-compose.yml..."
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
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  chatblue_network:
    driver: bridge
EOF

# -----------------------------------------------------------------------------
# ENV EXAMPLE
# -----------------------------------------------------------------------------
log "Criando .env.example..."
cat > /opt/chatblue/.env.example << 'EOF'
# ChatBlue Production Environment Variables
# Copie para .env: cp .env.example .env

# Database
POSTGRES_USER=chatblue
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=chatblue
DATABASE_URL=postgresql://chatblue:CHANGE_THIS_PASSWORD@localhost:5432/chatblue

# Redis
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD
REDIS_URL=redis://:CHANGE_THIS_REDIS_PASSWORD@localhost:6379

# JWT
JWT_SECRET=CHANGE_THIS_JWT_SECRET_64_CHARS_MINIMUM
JWT_EXPIRES_IN=7d

# API
API_PORT=3001
API_URL=https://api.SEU_DOMINIO.com
CORS_ORIGIN=https://SEU_DOMINIO.com

# Web
NEXT_PUBLIC_API_URL=https://api.SEU_DOMINIO.com

# WhatsApp
WHATSAPP_SESSION_PATH=/opt/chatblue/data/whatsapp-sessions

# AI (opcional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Upload
UPLOAD_PATH=/opt/chatblue/data/uploads
MAX_FILE_SIZE=16777216

# Node Environment
NODE_ENV=production
EOF

# -----------------------------------------------------------------------------
# PM2 ECOSYSTEM
# -----------------------------------------------------------------------------
log "Criando ecosystem.config.js..."
cat > /opt/chatblue/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'chatblue-api',
      cwd: '/opt/chatblue/app/apps/api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_file: '/opt/chatblue/.env',
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/chatblue/logs/api-error.log',
      out_file: '/opt/chatblue/logs/api-out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      name: 'chatblue-web',
      cwd: '/opt/chatblue/app/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '/opt/chatblue/.env',
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/chatblue/logs/web-error.log',
      out_file: '/opt/chatblue/logs/web-out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
EOF

# -----------------------------------------------------------------------------
# DEPLOY SCRIPT
# -----------------------------------------------------------------------------
log "Criando script de deploy..."
cat > /opt/chatblue/deploy.sh << 'DEPLOYEOF'
#!/bin/bash
set -e

APP_DIR="/opt/chatblue/app"
BACKUP_DIR="/opt/chatblue/backups"

cd "$APP_DIR"

echo "[Deploy] Criando backup..."
mkdir -p "$BACKUP_DIR"
docker exec chatblue_postgres pg_dump -U chatblue chatblue > "$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql" 2>/dev/null || true

echo "[Deploy] Atualizando código..."
git fetch origin
git pull origin main

echo "[Deploy] Instalando dependências..."
pnpm install --frozen-lockfile

echo "[Deploy] Rodando migrations..."
cd apps/api
pnpm prisma migrate deploy
pnpm prisma generate
cd ../..

echo "[Deploy] Fazendo build..."
pnpm build

echo "[Deploy] Reiniciando PM2..."
pm2 reload ecosystem.config.js --update-env

echo "[Deploy] Concluído!"
pm2 status
DEPLOYEOF

chmod +x /opt/chatblue/deploy.sh

# -----------------------------------------------------------------------------
# FINALIZAÇÃO
# -----------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "  Instalação Concluída!"
echo "=========================================="
echo ""
echo "✅ Docker instalado e configurado"
echo "✅ Node.js e pnpm instalados"
echo "✅ PM2 instalado"
echo "✅ Nginx configurado"
echo "✅ Estrutura de diretórios criada"
echo "✅ Firewall e Fail2Ban configurados"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Configure o .env:"
echo "   cp /opt/chatblue/.env.example /opt/chatblue/.env"
echo "   nano /opt/chatblue/.env"
echo ""
echo "2. Edite o Nginx com seu domínio:"
echo "   nano /etc/nginx/sites-available/chatblue"
echo "   (substitua SEU_DOMINIO.com)"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "3. Configure SSL (após configurar DNS):"
echo "   certbot --nginx -d seudominio.com -d api.seudominio.com"
echo ""
echo "4. Inicie os containers:"
echo "   cd /opt/chatblue"
echo "   docker-compose up -d"
echo ""
echo "5. Clone e deploy do código:"
echo "   cd /opt/chatblue/app"
echo "   git clone SEU_REPOSITORIO ."
echo "   pnpm install && pnpm build"
echo "   cd apps/api && pnpm prisma migrate deploy && cd ../.."
echo "   pm2 start /opt/chatblue/ecosystem.config.js"
echo "   pm2 save && pm2 startup"
echo ""
echo "⚠️  IMPORTANTE: TROQUE A SENHA DO ROOT AGORA!"
echo "   passwd root"
echo ""
echo "=========================================="



