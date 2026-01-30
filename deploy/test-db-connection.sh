#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Testando conexão com banco de dados ==="

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

send "echo '=== Testando conexão direta ao PostgreSQL ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c 'SELECT 1;' 2>&1\r"
expect "# "

send "echo '=== Verificando se a API consegue acessar localhost:5432 ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && node -e \"const net = require('net'); const client = net.createConnection(5432, 'localhost', () => { console.log('Conectado!'); client.end(); }); client.on('error', (err) => { console.error('Erro:', err.message); process.exit(1); });\" 2>&1\r"
expect "# "

send "echo '=== Verificando variável DATABASE_URL ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && cat .env | grep DATABASE_URL\r"
expect "# "

send "echo '=== Regenerando Prisma Client ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm prisma generate 2>&1 | tail -10\r"
expect "# "

send "exit\r"
expect eof





