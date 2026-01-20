#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando e corrigindo credenciais do banco ==="

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

send "echo '=== Verificando variáveis do container PostgreSQL ==='\r"
expect "# "

send "docker inspect chatblue_postgres | grep -A 5 POSTGRES || docker inspect chatblue_postgres | grep -A 5 POSTGRES\r"
expect "# "

send "echo '=== Testando login com diferentes credenciais ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U postgres -d postgres -c 'SELECT 1;' 2>&1 | head -5\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c 'SELECT 1;' 2>&1 | head -5\r"
expect "# "

send "echo '=== Verificando se precisa usar postgres como usuário ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && cat .env | grep DATABASE_URL\r"
expect "# "

send "echo '=== Tentando com usuário postgres ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && sed -i 's/chatblue:chatblue123@/postgres:postgres@/g' .env\r"
expect "# "

send "cat .env | grep DATABASE_URL\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream\r"
expect "# "

send "exit\r"
expect eof



