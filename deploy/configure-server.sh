#!/usr/bin/expect -f
# Script para configurar servidor após instalação

set timeout 600
set server "84.247.191.105"
set user "root"
set pass "fjykwePMThmj6nav"

# Substitua pelo seu domínio
set domain "seudominio.com"
set api_domain "api.seudominio.com"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${pass}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${pass}\r"
    }
}

expect "# "

# 1. Gerar senhas seguras
puts "\n[1/6] Gerando senhas seguras..."
send "openssl rand -base64 32 | tr -d '=+/' | cut -c1-25 > /tmp/pg_pass\r"
expect "# "
send "openssl rand -base64 32 | tr -d '=+/' | cut -c1-25 > /tmp/redis_pass\r"
expect "# "
send "openssl rand -base64 64 | tr -d '=+/' | cut -c1-64 > /tmp/jwt_secret\r"
expect "# "

send "PG_PASS=$(cat /tmp/pg_pass)\r"
expect "# "
send "REDIS_PASS=$(cat /tmp/redis_pass)\r"
expect "# "
send "JWT_SECRET=$(cat /tmp/jwt_secret)\r"
expect "# "

# 2. Configurar .env
puts "\n[2/6] Configurando .env..."
send "cp /opt/chatblue/.env.example /opt/chatblue/.env\r"
expect "# "

send "sed -i \"s|CHANGE_THIS_PASSWORD|\$PG_PASS|g\" /opt/chatblue/.env\r"
expect "# "
send "sed -i \"s|CHANGE_THIS_REDIS_PASSWORD|\$REDIS_PASS|g\" /opt/chatblue/.env\r"
expect "# "
send "sed -i \"s|CHANGE_THIS_JWT_SECRET_64_CHARS_MINIMUM|\$JWT_SECRET|g\" /opt/chatblue/.env\r"
expect "# "
send "sed -i \"s|SEU_DOMINIO.com|${domain}|g\" /opt/chatblue/.env\r"
expect "# "

# 3. Configurar Nginx
puts "\n[3/6] Configurando Nginx..."
send "sed -i \"s|SEU_DOMINIO.com|${domain}|g\" /etc/nginx/sites-available/chatblue\r"
expect "# "
send "nginx -t\r"
expect "# "
send "systemctl reload nginx\r"
expect "# "

# 4. Iniciar containers Docker
puts "\n[4/6] Iniciando containers Docker..."
send "cd /opt/chatblue && docker-compose up -d\r"
expect "# "

# Aguardar PostgreSQL estar pronto
puts "\nAguardando PostgreSQL ficar pronto..."
send "sleep 10\r"
expect "# "
send "docker exec chatblue_postgres pg_isready -U chatblue || sleep 10\r"
expect "# "

# 5. Verificar se repositório já foi clonado
puts "\n[5/6] Verificando código da aplicação..."
send "cd /opt/chatblue/app && if [ ! -f package.json ]; then echo 'REPO_NOT_FOUND'; else echo 'REPO_FOUND'; fi\r"
expect {
    "REPO_NOT_FOUND" {
        puts "\n⚠️  Repositório não encontrado. Você precisa clonar o código:"
        puts "   cd /opt/chatblue/app"
        puts "   git clone SEU_REPOSITORIO ."
        expect "# "
    }
    "REPO_FOUND" {
        puts "\n✅ Repositório encontrado. Fazendo deploy..."
        expect "# "
        
        send "cd /opt/chatblue/app && pnpm install --frozen-lockfile\r"
        expect "# " {
            timeout {
                puts "Timeout no pnpm install, mas continuando..."
                expect "# "
            }
        }
        
        send "cd /opt/chatblue/app/apps/api && pnpm prisma migrate deploy && pnpm prisma generate\r"
        expect "# "
        
        send "cd /opt/chatblue/app && pnpm build\r"
        expect "# " {
            timeout {
                puts "Timeout no build, mas continuando..."
                expect "# "
            }
        }
        
        send "pm2 start /opt/chatblue/ecosystem.config.js\r"
        expect "# "
        send "pm2 save\r"
        expect "# "
        send "pm2 startup | tail -1 | bash || true\r"
        expect "# "
    }
}

# 6. Verificar serviços
puts "\n[6/6] Verificando serviços..."
send "docker ps\r"
expect "# "
send "pm2 status\r"
expect "# "
send "curl -s http://localhost:3001/health || echo 'API_NOT_RUNNING'\r"
expect "# "

puts "\n✅ Configuração concluída!"
puts "\n⚠️  IMPORTANTE: Configure SSL após configurar DNS:"
puts "   certbot --nginx -d ${domain} -d ${api_domain}"
puts "\n⚠️  TROQUE A SENHA DO ROOT:"
puts "   passwd root"

send "exit\r"
expect eof












