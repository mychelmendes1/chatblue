# Instruções para Acessar via VNC e Corrigir

## Acesso VNC
- **IP**: 178.18.240.112
- **Porta**: 63028
- **Senha**: czXm3LFR

## Passos para Corrigir

### 1. Acessar via VNC
Use um cliente VNC (como RealVNC, TightVNC, ou TigerVNC) para conectar:
```
178.18.240.112:63028
```

### 2. Executar o Script

Após conectar via VNC, abra um terminal e execute:

```bash
# Copiar o script para o servidor (ou criar manualmente)
cat > /tmp/fix-ssh-and-blue.sh << 'EOF'
#!/bin/bash
echo "=== Verificando SSH ==="
systemctl status sshd || systemctl status ssh

echo "=== Reiniciando SSH ==="
systemctl restart sshd || systemctl restart ssh

echo "=== Aplicando correção Blue Mascot ==="
cd /opt/chatblue/app/apps/api/src/routes
cp settings.routes.ts settings.routes.ts.backup.$(date +%Y%m%d_%H%M%S)
perl -i -pe "s/router\.get\('\/', authenticate, requireAdmin, ensureTenant/router.get('\/', authenticate, ensureTenant/" settings.routes.ts

echo "=== Verificando mudança ==="
head -12 settings.routes.ts | tail -2

echo "=== Compilando ==="
cd /opt/chatblue/app/apps/api
npm run build 2>&1 | tail -5

echo "=== Reiniciando PM2 ==="
pm2 restart chatblue-api --update-env

echo "✅ Concluído!"
EOF

chmod +x /tmp/fix-ssh-and-blue.sh
bash /tmp/fix-ssh-and-blue.sh
```

### 3. Verificar SSH

Após executar o script, verifique se o SSH está funcionando:

```bash
systemctl status sshd
netstat -tlnp | grep :22
```

### 4. Testar Conexão SSH

De outro terminal, teste:
```bash
ssh root@84.247.191.105
```

## Alternativa: Comandos Manuais

Se preferir executar manualmente:

```bash
# 1. Reiniciar SSH
systemctl restart sshd

# 2. Corrigir Blue Mascot
cd /opt/chatblue/app/apps/api/src/routes
perl -i -pe "s/router\.get\('\/', authenticate, requireAdmin, ensureTenant/router.get('\/', authenticate, ensureTenant/" settings.routes.ts

# 3. Compilar
cd /opt/chatblue/app/apps/api
npm run build

# 4. Reiniciar API
pm2 restart chatblue-api --update-env
```



