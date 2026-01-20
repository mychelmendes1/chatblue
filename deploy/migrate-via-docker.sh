#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Aplicando Migration Knowledge Contexts ==="
puts "PostgreSQL está rodando no Docker"

# SSH e aplicar migration
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

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Verificando container PostgreSQL ==='\r"
expect "# "

send "docker ps | grep postgres\r"
expect "# "

send "echo '=== Testando conexão com banco ==='\r"
expect "# "

send "PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2) docker exec chatblue_postgres psql -U chatblue -d chatblue -c 'SELECT version();' 2>&1 | head -5\r"
expect "# "

send "echo '=== Executando migration SQL diretamente no container ==='\r"
expect "# "

send "cat prisma/migrations/20250112190000_add_knowledge_contexts/migration.sql | docker exec -i chatblue_postgres psql -U chatblue -d chatblue 2>&1\r"
expect "# "

send "echo '=== Verificando se tabelas foram criadas ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"\\dt knowledge*\" 2>&1\r"
expect "# "

send "echo '=== Verificando dados existentes (contagem) ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT 'tickets' as tabela, COUNT(*) as total FROM tickets UNION ALL SELECT 'contacts', COUNT(*) FROM contacts;\" 2>&1\r"
expect "# "

send "echo '=== Regenerando Prisma Client ==='\r"
expect "# "

send "pnpm prisma generate 2>&1 | tail -5\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -10\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

send "echo '=== Migration concluída com sucesso! ==='\r"
expect "# "

send "exit\r"
expect eof




