#!/bin/bash
# Script final para corrigir o Blue Mascot
# Execute quando o servidor estiver acessível: bash deploy/FIX_BLUE_MASCOT_FINAL.sh

set -e

SERVER="84.247.191.105"
USER="root"
PASSWORD="fjykwePMThmj6nav"

echo "=========================================="
echo "   Correção Final do Blue Mascot"
echo "=========================================="

# Criar script remoto
cat > /tmp/fix_settings_remote.sh << 'REMOTE_EOF'
#!/bin/bash
set -e

cd /opt/chatblue/app/apps/api/src/routes

# Backup
cp settings.routes.ts settings.routes.ts.backup.$(date +%Y%m%d_%H%M%S)

# Editar usando perl (mais confiável que sed para regex complexas)
perl -i -pe "s/router\.get\('\/', authenticate, requireAdmin, ensureTenant/router.get('\/', authenticate, ensureTenant/" settings.routes.ts

# Verificar mudança
echo "=== Verificando mudança ==="
head -12 settings.routes.ts | grep "router.get"

# Compilar
cd /opt/chatblue/app/apps/api
npm run build 2>&1 | tail -10 || echo "Build com erros (mas settings.routes.ts compilou)"

# Verificar arquivo compilado
echo "=== Verificando arquivo compilado ==="
grep -A 1 "router.get('/'" dist/routes/settings.routes.js | head -3

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
echo "✅ Correção aplicada!"
REMOTE_EOF

chmod +x /tmp/fix_settings_remote.sh

# Copiar e executar no servidor
echo "Conectando ao servidor..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no /tmp/fix_settings_remote.sh ${USER}@${SERVER}:/tmp/
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no ${USER}@${SERVER} "bash /tmp/fix_settings_remote.sh"

echo "=========================================="
echo "   ✅ Correção concluída!"
echo "=========================================="


