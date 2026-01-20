#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Aplicando migration Knowledge Contexts ==="
puts "Esta migration APENAS CRIA novas tabelas, NÃO modifica dados existentes"

# Copiar arquivo corrigido
spawn scp -o StrictHostKeyChecking=no \
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
}

expect eof

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

send "echo '=== Movendo arquivo corrigido ==='\r"
expect "# "

send "cp /tmp/context-builder.service.ts src/services/ai/\r"
expect "# "

send "echo '=== Fazendo build ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -10\r"
expect "# "

send "echo '=== Executando migration (só cria novas tabelas) ==='\r"
expect "# "

send "pnpm prisma migrate deploy 2>&1\r"
expect "# "

send "echo '=== Verificando tabelas criadas ==='\r"
expect "# "

send "PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2) psql -U chatblue -h localhost -d chatblue -c \"\\dt knowledge*\" 2>&1 | head -10\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof




