#!/usr/bin/expect -f

set timeout 120
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
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup.$(date +%Y%m%d_%H%M%S)\r"
expect "# "

# Criar arquivo temporário com a correção
puts "\n=== Criando arquivo com correção ==="
send "cat > /tmp/settings.routes.ts << 'EOF'\r"
send "import { Router } from 'express';\r"
send "import { z } from 'zod';\r"
send "import { prisma } from '../config/database.js';\r"
send "import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';\r"
send "import { ensureTenant } from '../middlewares/tenant.middleware.js';\r"
send "import { NotionService } from '../services/notion/notion.service.js';\r"
send "\r"
send "const router = Router();\r"
send "\r"
send "// Get settings (public - returns only safe non-sensitive settings)\r"
send "router.get('/', authenticate, ensureTenant, async (req, res, next) => {\r"
send "  try {\r"
send "    let settings = await prisma.companySettings.findUnique({\r"
send "      where: { companyId: req.user!.companyId },\r"
send "    });\r"
send "\r"
send "    if (!settings) {\r"
send "      settings = await prisma.companySettings.create({\r"
send "        data: { companyId: req.user!.companyId },\r"
send "      });\r"
send "    }\r"
send "\r"
send "    // Hide sensitive data\r"
send "    const safeSettings = {\r"
send "      ...settings,\r"
send "      notionApiKey: settings.notionApiKey ? '••••••••' : null,\r"
send "      aiApiKey: settings.aiApiKey ? '••••••••' : null,\r"
send "      whisperApiKey: settings.whisperApiKey ? '••••••••' : null,\r"
send "    };\r"
send "\r"
send "    res.json(safeSettings);\r"
send "  } catch (error) {\r"
send "    next(error);\r"
send "  }\r"
send "});\r"
send "\r"
send "// Get settings (admin only - returns full settings)\r"
send "router.get('/admin', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {\r"
send "  try {\r"
send "    let settings = await prisma.companySettings.findUnique({\r"
send "      where: { companyId: req.user!.companyId },\r"
send "    });\r"
send "\r"
send "    if (!settings) {\r"
send "      settings = await prisma.companySettings.create({\r"
send "        data: { companyId: req.user!.companyId },\r"
send "      });\r"
send "    }\r"
send "\r"
send "    // Hide sensitive data\r"
send "    const safeSettings = {\r"
send "      ...settings,\r"
send "      notionApiKey: settings.notionApiKey ? '••••••••' : null,\r"
send "      aiApiKey: settings.aiApiKey ? '••••••••' : null,\r"
send "      whisperApiKey: settings.whisperApiKey ? '••••••••' : null,\r"
send "    };\r"
send "\r"
send "    res.json(safeSettings);\r"
send "  } catch (error) {\r"
send "    next(error);\r"
send "  }\r"
send "});\r"
send "\r"
send "EOF\r"
expect "# "

# Copiar arquivo corrigido
puts "\n=== Copiando arquivo corrigido ==="
send "cp /tmp/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts\r"
expect "# "

# Verificar se o arquivo foi copiado corretamente
puts "\n=== Verificando arquivo copiado ==="
send "head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -E 'Get settings|public|admin only'\r"
expect "# "

# Compilar TypeScript
puts "\n=== Compilando TypeScript ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -20\r"
expect "# "

# Verificar se compilou sem erros
puts "\n=== Verificando se compilou sem erros ==="
send "if [ \$? -eq 0 ]; then echo '✅ Compilação bem-sucedida'; else echo '❌ Erro na compilação'; fi\r"
expect "# "

# Verificar se a rota está no código compilado
puts "\n=== Verificando rota no código compilado ==="
send "grep -E 'Get settings|/admin' /opt/chatblue/app/apps/api/dist/routes/settings.routes.js 2>&1 | head -5\r"
expect "# "

# Reiniciar PM2
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

# Aguardar um pouco
send "sleep 3\r"
expect "# "

# Verificar status do PM2
puts "\n=== Verificando status do PM2 ==="
send "pm2 status\r"
expect "# "

# Verificar logs recentes
puts "\n=== Verificando logs recentes ==="
send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

puts "\n=== Deploy concluído ==="
send "exit\r"
expect eof


