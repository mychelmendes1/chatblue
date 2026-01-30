#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Aplicando Migration Knowledge Contexts ==="
puts "Esta migration APENAS CRIA novas tabelas, NÃO modifica dados existentes"

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

send "echo '=== Aguardando banco de dados iniciar ==='\r"
expect "# "

send "sleep 10\r"
expect "# "

send "echo '=== Copiando arquivo corrigido ==='\r"
expect "# "

send "cp /tmp/context-builder.service.ts src/services/ai/ 2>/dev/null || echo 'Arquivo não encontrado'\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -10\r"
expect "# "

send "echo '=== Executando migration (só cria novas tabelas) ==='\r"
expect "# "

send "pnpm prisma migrate deploy 2>&1\r"
expect "# "

send "echo '=== Verificando se migration foi aplicada ==='\r"
expect "# "

send "pnpm prisma migrate status 2>&1 | tail -10\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | tail -15\r"
expect "# "

send "echo '=== Migration concluída! ==='\r"
expect "# "

send "exit\r"
expect eof






