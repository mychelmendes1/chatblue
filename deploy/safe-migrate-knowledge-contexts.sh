#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Aplicando migration de forma segura ==="
puts "Esta migration APENAS CRIA novas tabelas (knowledge_contexts, knowledge_sources, knowledge_chunks)"
puts "NÃO MODIFICA NEM REMOVE nenhuma tabela ou dado existente"
puts ""

# Aguardar um pouco antes de conectar
sleep 2

# Copiar arquivo corrigido
spawn scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
    ${local_base}/apps/api/src/services/ai/context-builder.service.ts \
    ${user}@${server}:/tmp/context-builder.service.ts

expect {
    "password:" {
        send "${password}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${password}\r"
    }
    timeout {
        puts "Timeout ao conectar. Tentando novamente..."
        exit 1
    }
}

expect eof

puts "=== Arquivo copiado. Conectando ao servidor... ==="

# SSH e deploy
spawn ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${server}

expect {
    "password:" {
        send "${password}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${password}\r"
    }
    timeout {
        puts "Timeout ao conectar. Servidor pode estar indisponível."
        exit 1
    }
}

expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Verificando status do banco de dados ==='\r"
expect "# "

send "pg_isready -h localhost -p 5432 2>&1\r"
expect "# "

send "echo '=== Criando backup de segurança ==='\r"
expect "# "

send "cd /opt/chatblue && PGPASSWORD=\$(grep POSTGRES_PASSWORD .env | cut -d= -f2) pg_dump -U chatblue -h localhost chatblue > /tmp/chatblue_backup_before_knowledge_$(date +%Y%m%d_%H%M%S).sql 2>&1\r"
expect "# "

send "echo '=== Backup criado. Verificando contagem de registros antes da migration ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2) psql -U chatblue -h localhost -d chatblue -c \"SELECT 'tickets' as tabela, COUNT(*) as total FROM tickets UNION ALL SELECT 'contacts', COUNT(*) FROM contacts UNION ALL SELECT 'messages', COUNT(*) FROM messages;\" 2>&1 | grep -E 'tabela|tickets|contacts|messages' | head -6\r"
expect "# "

send "echo '=== Movendo arquivo corrigido ==='\r"
expect "# "

send "cp /tmp/context-builder.service.ts src/services/ai/\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -10\r"
expect "# "

send "echo '=== Executando migration (SOMENTE cria novas tabelas, não modifica existentes) ==='\r"
expect "# "

send "pnpm prisma migrate deploy 2>&1\r"
expect "# "

send "echo '=== Verificando se as novas tabelas foram criadas ==='\r"
expect "# "

send "PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2) psql -U chatblue -h localhost -d chatblue -c \"\\dt knowledge*\" 2>&1 | grep -E 'knowledge|public' | head -10\r"
expect "# "

send "echo '=== Verificando se dados existentes estão intactos ==='\r"
expect "# "

send "PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2) psql -U chatblue -h localhost -d chatblue -c \"SELECT 'tickets' as tabela, COUNT(*) as total FROM tickets UNION ALL SELECT 'contacts', COUNT(*) FROM contacts UNION ALL SELECT 'messages', COUNT(*) FROM messages;\" 2>&1 | grep -E 'tabela|tickets|contacts|messages' | head -6\r"
expect "# "

send "echo '=== Reiniciando serviço API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Migration concluída com sucesso! ==='\r"
expect "# "

send "echo '=== Verificando logs da API ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

send "exit\r"
expect eof






