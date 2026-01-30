#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando PostgreSQL ==="

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

send "echo '=== Verificando containers Docker ==='\r"
expect "# "

send "docker ps -a | grep postgres\r"
expect "# "

send "echo '=== Verificando se PostgreSQL está escutando ==='\r"
expect "# "

send "netstat -tlnp | grep :5432 || ss -tlnp | grep :5432\r"
expect "# "

send "echo '=== Verificando variáveis de ambiente ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && cat .env | grep -i database || cat .env.local | grep -i database || echo 'Arquivo .env não encontrado'\r"
expect "# "

send "echo '=== Tentando iniciar PostgreSQL (se estiver parado) ==='\r"
expect "# "

send "docker ps -a --format '{{.Names}}' | grep postgres | head -1 | xargs -I {} docker start {} 2>&1\r"
expect "# "

send "sleep 3\r"
expect "# "

send "docker ps | grep postgres\r"
expect "# "

send "exit\r"
expect eof





