#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

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
send "cd /opt/chatblue/app\r"
expect "# "

send "echo '=== Baixando atualizações ==='\r"
expect "# "
send "git pull origin main 2>&1 | tail -10\r"
expect "# "

send "echo '=== Instalando dependências ==='\r"
expect "# "
send "pnpm install 2>&1 | tail -5\r"
expect "# "

send "echo '=== Gerando Prisma Client ==='\r"
expect "# "
send "cd apps/api && npx prisma generate 2>&1 | tail -5\r"
expect "# "

send "echo '=== Aplicando migrations ==='\r"
expect "# "
send "npx prisma migrate deploy 2>&1 | tail -10 || echo 'Migration pode precisar ser feita manualmente'\r"
expect "# "

send "echo '=== Compilando API ==='\r"
expect "# "
send "pnpm run build 2>&1 | tail -20\r"
expect "# "

send "echo '=== Reiniciando serviços ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 5 --nostream\r"
expect "# "

send "exit\r"
expect eof

