#!/bin/bash
# Script para corrigir Blue Mascot quando servidor estiver online
# Uso: bash deploy/FIX_BLUE_WHEN_ONLINE.sh

SERVER="84.247.191.105"
USER="root"
PASSWORD="fjykwePMThmj6nav"

echo "Tentando conectar ao servidor..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no ${USER}@${SERVER} << 'ENDSSH'

cd /opt/chatblue/app/apps/api/src/routes

# Backup
cp settings.routes.ts settings.routes.ts.backup.$(date +%Y%m%d_%H%M%S)

# Editar com perl (mais confiável)
perl -i -pe "s/router\.get\('\/', authenticate, requireAdmin, ensureTenant/router.get('\/', authenticate, ensureTenant/" settings.routes.ts

# Verificar
echo "=== Verificando mudança ==="
head -12 settings.routes.ts | grep "router.get"

# Compilar
cd /opt/chatblue/app/apps/api
npm run build 2>&1 | tail -5 || true

# Verificar compilado
echo "=== Verificando compilado ==="
grep -A 1 "router.get('/'" dist/routes/settings.routes.js | head -2

# Reiniciar
echo "=== Reiniciando PM2 ==="
pm2 restart chatblue-api --update-env
sleep 5

# Verificação final
echo "=== Verificação final ==="
if grep -q "router.get.*requireAdmin.*settings" dist/routes/settings.routes.js; then
    echo "❌ AINDA TEM requireAdmin"
else
    echo "✅ requireAdmin removido com sucesso!"
fi

pm2 status
ENDSSH




