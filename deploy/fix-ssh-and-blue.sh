#!/bin/bash
# Script para executar via VNC no servidor
# Este script:
# 1. Verifica e reinicia o serviço SSH
# 2. Aplica a correção do Blue Mascot

echo "=========================================="
echo "   Correção SSH e Blue Mascot"
echo "=========================================="

# 1. Verificar status do SSH
echo ""
echo "=== Verificando status do SSH ==="
systemctl status sshd 2>/dev/null || systemctl status ssh 2>/dev/null || service ssh status 2>/dev/null

# 2. Reiniciar SSH se necessário
echo ""
echo "=== Reiniciando serviço SSH ==="
systemctl restart sshd 2>/dev/null || systemctl restart ssh 2>/dev/null || service ssh restart 2>/dev/null
sleep 2

# 3. Verificar se SSH está rodando
echo ""
echo "=== Verificando se SSH está rodando ==="
systemctl is-active sshd 2>/dev/null || systemctl is-active ssh 2>/dev/null || service ssh status 2>/dev/null | grep -i running

# 4. Verificar porta 22
echo ""
echo "=== Verificando porta 22 ==="
netstat -tlnp 2>/dev/null | grep :22 || ss -tlnp 2>/dev/null | grep :22 || echo "Porta 22 não encontrada"

# 5. Aplicar correção do Blue Mascot
echo ""
echo "=========================================="
echo "   Aplicando correção do Blue Mascot"
echo "=========================================="

cd /opt/chatblue/app/apps/api/src/routes

# Backup
echo ""
echo "=== Fazendo backup ==="
cp settings.routes.ts settings.routes.ts.backup.$(date +%Y%m%d_%H%M%S)
echo "Backup criado"

# Verificar arquivo atual
echo ""
echo "=== Arquivo atual (linha 11) ==="
head -12 settings.routes.ts | tail -2

# Editar com perl
echo ""
echo "=== Editando arquivo ==="
perl -i -pe "s/router\.get\('\/', authenticate, requireAdmin, ensureTenant/router.get('\/', authenticate, ensureTenant/" settings.routes.ts
echo "Arquivo editado"

# Verificar mudança
echo ""
echo "=== Verificando mudança ==="
head -12 settings.routes.ts | tail -2

# Compilar
echo ""
echo "=== Compilando ==="
cd /opt/chatblue/app/apps/api
npm run build 2>&1 | tail -10

# Verificar arquivo compilado
echo ""
echo "=== Verificando arquivo compilado ==="
grep -A 1 "router.get('/'" dist/routes/settings.routes.js | head -2

# Verificar se requireAdmin foi removido
echo ""
echo "=== Verificação final ==="
if grep -q "router.get.*requireAdmin.*settings" dist/routes/settings.routes.js; then
    echo "❌ ERRO: Ainda tem requireAdmin"
else
    echo "✅ OK: requireAdmin removido com sucesso!"
fi

# Reiniciar PM2
echo ""
echo "=== Reiniciando PM2 ==="
pm2 restart chatblue-api --update-env
sleep 5

# Status
echo ""
echo "=== Status do PM2 ==="
pm2 status

echo ""
echo "=========================================="
echo "   ✅ Processo concluído!"
echo "=========================================="
echo ""
echo "SSH deve estar funcionando agora."
echo "Blue Mascot deve aparecer quando blueEnabled=true"
echo ""

