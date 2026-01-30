#!/usr/bin/expect -f

set timeout 900
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy NPS automático para o servidor ==="
puts ""

# 1. Atualizar código do git
puts "=== Atualizando código do git ==="
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

send "cd /opt/chatblue/app && git pull origin main 2>&1 | tail -20\r"
expect "# "

send "exit\r"
expect eof

# 2. Copiar arquivos novos da API (NPS service e rotas atualizadas)
puts ""
puts "=== Copiando arquivos NPS da API ==="

# Copiar serviço NPS
spawn sh -c "cd /Users/mychel/Downloads/Projetos/chatblue/chatblue && tar czf - apps/api/src/services/nps apps/api/src/routes/ticket.routes.ts apps/api/src/routes/public.routes.ts apps/api/prisma/schema.prisma | ssh -o StrictHostKeyChecking=no ${user}@${server} 'cd /opt/chatblue/app && tar xzf -'"

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

expect eof

# 3. Copiar frontend NPS
puts ""
puts "=== Copiando página NPS do frontend ==="

spawn sh -c "cd /Users/mychel/Downloads/Projetos/chatblue/chatblue && tar czf - apps/web/app/nps | ssh -o StrictHostKeyChecking=no ${user}@${server} 'cd /opt/chatblue/app && tar xzf -'"

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

expect eof

# 4. Atualizar banco de dados e compilar
puts ""
puts "=== Atualizando banco de dados e compilando ==="

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

# Adicionar coluna npsToken se não existir
send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE tickets ADD COLUMN IF NOT EXISTS nps_token TEXT UNIQUE;\" 2>&1\r"
expect "# "

# Gerar Prisma Client
send "cd /opt/chatblue/app/apps/api && pnpm prisma generate 2>&1 | tail -10\r"
expect "# "

# Instalar dependências se necessário
send "cd /opt/chatblue/app && pnpm install 2>&1 | tail -10\r"
expect "# "

# Compilar API
send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -30\r"
expect "# "

# Compilar Web
send "cd /opt/chatblue/app/apps/web && pnpm run build 2>&1 | tail -30\r"
expect "# "

# Reiniciar serviços
send "echo '=== Reiniciando serviços ==='\r"
expect "# "

send "pm2 restart chatblue-api chatblue-web\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando API ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1 | head -3\r"
expect "# "

send "exit\r"
expect eof

puts ""
puts "=== Deploy NPS concluído! ==="



