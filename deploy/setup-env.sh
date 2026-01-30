#!/bin/bash
set -e

echo "=== Configurando ChatBlue ==="

# Gerar senhas
PG_PASS=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-32)
REDIS_PASS=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-64)

echo "[1/6] Senhas geradas"

# Configurar .env
cp /opt/chatblue/.env.example /opt/chatblue/.env
cd /opt/chatblue
sed -i "s|CHANGE_THIS_PASSWORD|$PG_PASS|g" .env
sed -i "s|CHANGE_THIS_REDIS_PASSWORD|$REDIS_PASS|g" .env
sed -i "s|CHANGE_THIS_JWT_SECRET_64_CHARS_MINIMUM|$JWT_SECRET|g" .env
sed -i "s|SEU_DOMINIO.com|84.247.191.105|g" .env

echo "[2/6] .env configurado"

# Configurar Nginx
sed -i "s|SEU_DOMINIO.com|84.247.191.105|g" /etc/nginx/sites-available/chatblue
sed -i 's|listen 443 ssl http2|listen 80|g' /etc/nginx/sites-available/chatblue
sed -i '/ssl_certificate/d' /etc/nginx/sites-available/chatblue
nginx -t && systemctl reload nginx

echo "[3/6] Nginx configurado"

# Iniciar Docker
cd /opt/chatblue
docker-compose up -d
sleep 10

echo "[4/6] Containers Docker iniciados"
docker ps

# Verificar se há código
cd /opt/chatblue/app
if [ -f package.json ]; then
    echo "[5/6] Código encontrado. Fazendo deploy..."
    
    pnpm install --frozen-lockfile
    cd apps/api
    pnpm prisma migrate deploy
    pnpm prisma generate
    cd ../..
    pnpm build
    
    pm2 delete all 2>/dev/null || true
    pm2 start /opt/chatblue/ecosystem.config.js
    pm2 save
    pm2 startup | tail -1 | bash 2>/dev/null || true
    
    sleep 5
    pm2 status
    
    echo "[6/6] Deploy concluído"
else
    echo "[5/6] Código não encontrado"
    echo "Clone o repositório:"
    echo "  cd /opt/chatblue/app"
    echo "  git clone SEU_REPOSITORIO ."
fi

echo ""
echo "=== Configuração concluída ==="
echo ""
echo "Próximos passos:"
echo "1. Configure DNS apontando para 84.247.191.105"
echo "2. Configure SSL: certbot --nginx -d seudominio.com -d api.seudominio.com"
echo "3. Altere o domínio no .env e Nginx quando tiver o domínio configurado"














