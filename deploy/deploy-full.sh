#!/bin/bash
set -e

echo "=== DEPLOY COMPLETO CHATBLUE ==="

cd /opt/chatblue

# Backup .env
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "Backup .env OK"
fi

# Extrair código
echo "Extraindo código..."
cd /opt/chatblue/app
rm -rf apps/ web/ api/ packages/ 2>/dev/null || true
tar -xzf /tmp/chatblue-deploy-full.tar.gz --strip-components=0 2>&1 | grep -v "LIBARCHIVE.xattr" || true
echo "Extração OK"

# Restaurar .env
if [ -f ../.env.backup.* ]; then
    cp ../.env.backup.* ../.env 2>/dev/null || true
    echo ".env restaurado"
fi

# Instalar dependências
echo "Instalando dependências..."
cd /opt/chatblue/app
pnpm install --frozen-lockfile
echo "Dependências instaladas"

# Gerar Prisma Client
echo "Gerando Prisma Client..."
cd /opt/chatblue/app/apps/api
pnpm prisma generate
echo "Prisma Client gerado"

# Build API
echo "Compilando API..."
cd /opt/chatblue/app/apps/api
pnpm build:force 2>&1 | tail -5
if [ -f dist/server.js ]; then
    mv dist/server.js dist/server.cjs
    echo "Build API OK"
else
    echo "ERRO: Build API falhou"
    exit 1
fi

# Build Web
echo "Compilando Web..."
cd /opt/chatblue/app/apps/web
pnpm build 2>&1 | tail -10
if [ -f .next/BUILD_ID ]; then
    echo "Build Web OK"
else
    echo "ERRO: Build Web falhou"
    exit 1
fi

# Atualizar PM2 ecosystem
echo "Atualizando PM2..."
cd /opt/chatblue
PG_PASS=$(grep POSTGRES_PASSWORD .env | cut -d= -f2)
REDIS_PASS=$(grep REDIS_PASSWORD .env | cut -d= -f2)

cat > ecosystem.config.js << ECOSYSTEM_EOF
module.exports = {
  apps: [
    {
      name: 'chatblue-api',
      cwd: '/opt/chatblue/app/apps/api',
      script: 'dist/server.cjs',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://chatblue:${PG_PASS}@localhost:5432/chatblue',
        REDIS_URL: 'redis://:${REDIS_PASS}@localhost:6379',
      },
      max_memory_restart: '500M',
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
      script: 'node',
      args: '.next/standalone/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '500M',
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
ECOSYSTEM_EOF

# Restart PM2
echo "Reiniciando aplicação..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=== DEPLOY CONCLUIDO ==="
echo "Aguardando inicialização..."
sleep 10

# Verificar status
echo ""
echo "=== STATUS ==="
docker ps --format '{{.Names}}: {{.Status}}'
echo ""
pm2 list | head -10
echo ""
curl -s http://localhost:3001/health && echo " - API OK!" || echo "API ainda não responde"
curl -s http://localhost:3000 2>&1 | head -3 && echo " - Web OK!" || echo "Web ainda não responde"
echo ""
ss -tlnp | grep -E '(3000|3001)' | head -5
echo ""
echo "=== ACESSO ==="
echo "API: http://84.247.191.105:3001"
echo "Web: http://84.247.191.105:3000"

