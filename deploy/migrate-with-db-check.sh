#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Aplicando Migration Knowledge Contexts ==="

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

send "echo '=== Verificando/iniciando PostgreSQL ==='\r"
expect "# "

send "systemctl status postgresql 2>&1 | head -5 || systemctl status postgresql@* 2>&1 | head -5 || docker ps | grep postgres || echo 'Verificando Docker...'\r"
expect "# "

send "echo '=== Aguardando banco iniciar (tentando conectar) ==='\r"
expect "# "

send "for i in {1..10}; do sleep 2; PGPASSWORD=\$(grep POSTGRES_PASSWORD /opt/chatblue/.env | cut -d= -f2) psql -U chatblue -h localhost -d chatblue -c 'SELECT 1' 2>&1 | grep -q '1 row' && echo 'Banco acessível!' && break || echo 'Tentativa \$i/10...'; done\r"
expect "# "

send "echo '=== Executando migration ==='\r"
expect "# "

send "pnpm prisma migrate deploy 2>&1\r"
expect "# "

send "echo '=== Verificando status da migration ==='\r"
expect "# "

send "pnpm prisma migrate status 2>&1 | tail -10\r"
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

send "echo '=== Migration concluída! ==='\r"
expect "# "

send "exit\r"
expect eof






