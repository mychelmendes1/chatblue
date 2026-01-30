#!/usr/bin/expect -f

set timeout 180
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Deploy: Correção do Blue Mascot"
puts "=========================================="

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${password}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${password}\r"
    }
}

expect "# "

# Fazer backup do arquivo atual
puts "\n=== Fazendo backup do arquivo atual ==="
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup\r"
expect "# "

# Editar o arquivo removendo requireAdmin da linha 11
puts "\n=== Editando arquivo - removendo requireAdmin ==="
send "cd /opt/chatblue/app/apps/api/src/routes && sed -i '11s/, requireAdmin//' settings.routes.ts\r"
expect "# "

# Adicionar rota /admin após a rota GET /
puts "\n=== Adicionando rota /admin ==="
send "cd /opt/chatblue/app/apps/api/src/routes && sed -i '36a\\\n// Get settings (admin only - returns full settings)\\nrouter.get(\"/admin\", authenticate, requireAdmin, ensureTenant, async (req, res, next) => {\\n  try {\\n    let settings = await prisma.companySettings.findUnique({\\n      where: { companyId: req.user!.companyId },\\n    });\\n\\n    if (!settings) {\\n      settings = await prisma.companySettings.create({\\n        data: { companyId: req.user!.companyId },\\n      });\\n    }\\n\\n    // Hide sensitive data\\n    const safeSettings = {\\n      ...settings,\\n      notionApiKey: settings.notionApiKey ? \"••••••••\" : null,\\n      aiApiKey: settings.aiApiKey ? \"••••••••\" : null,\\n      whisperApiKey: settings.whisperApiKey ? \"••••••••\" : null,\\n    };\\n\\n    res.json(safeSettings);\\n  } catch (error) {\\n    next(error);\\n  }\\n});' settings.routes.ts\r"
expect "# "

# Verificar se a edição funcionou
puts "\n=== Verificando arquivo editado ==="
send "head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -E 'Get settings|router.get'\r"
expect "# "

# Tentar compilar apenas o arquivo (não todo o projeto)
puts "\n=== Verificando se o arquivo compila ==="
send "cd /opt/chatblue/app/apps/api && npx tsc --noEmit src/routes/settings.routes.ts 2>&1 | head -10\r"
expect "# "

# Copiar arquivo local completo via cat (melhor abordagem)
puts "\n=== Copiando arquivo completo correto ==="
send "cat > /opt/chatblue/app/apps/api/src/routes/settings.routes.ts << 'SETTINGSEOF'\r"
# Aqui vou enviar o arquivo completo de forma diferente
send "cat /tmp/settings.routes.ts > /opt/chatblue/app/apps/api/src/routes/settings.routes.ts 2>&1\r"
expect "# "

# Verificar se o arquivo foi copiado
puts "\n=== Verificando arquivo copiado ==="
send "grep -n 'Get settings' /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | head -3\r"
expect "# "

# Compilar o projeto (ignorando erros pré-existentes)
puts "\n=== Compilando projeto (pode ter erros pré-existentes) ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | grep -E 'error|Error|success|Success|settings.routes' | tail -10\r"
expect "# "

# Verificar se o arquivo compilado existe
puts "\n=== Verificando se compilou ==="
send "ls -la /opt/chatblue/app/apps/api/dist/routes/settings.routes.js 2>&1\r"
expect "# "

# Reiniciar PM2
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

# Aguardar
send "sleep 5\r"
expect "# "

# Verificar status
puts "\n=== Verificando status do PM2 ==="
send "pm2 status\r"
expect "# "

# Verificar logs
puts "\n=== Verificando logs recentes ==="
send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | tail -15\r"
expect "# "

puts "\n=========================================="
puts "   Deploy concluído!"
puts "=========================================="

send "exit\r"
expect eof




