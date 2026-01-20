#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando e corrigindo Redis ==="

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

send "echo '=== Verificando containers Redis ==='\r"
expect "# "

send "docker ps -a | grep redis\r"
expect "# "

send "echo '=== Verificando configuração Redis ==='\r"
expect "# "

send "docker ps -a --format '{{.Names}}' | grep redis | head -1 | xargs -I {} docker inspect {} | grep -A 10 REDIS || echo 'Redis não encontrado'\r"
expect "# "

send "echo '=== Verificando variáveis Redis no .env ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && cat .env | grep -i redis\r"
expect "# "

send "echo '=== Verificando se Redis está rodando ==='\r"
expect "# "

send "docker ps | grep redis\r"
expect "# "

send "echo '=== Testando conexão Redis ==='\r"
expect "# "

send "docker ps --format '{{.Names}}' | grep redis | head -1 | xargs -I {} docker exec {} redis-cli ping 2>&1 || echo 'Redis não acessível'\r"
expect "# "

send "echo '=== Verificando se precisa desabilitar autenticação ou configurar senha ==='\r"
expect "# "

send "docker ps --format '{{.Names}}' | grep redis | head -1 | xargs -I {} docker exec {} redis-cli CONFIG GET requirepass 2>&1\r"
expect "# "

send "exit\r"
expect eof



