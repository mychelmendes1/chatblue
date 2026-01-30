#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Copiando Instagram service para o servidor ==="
puts ""

# Copiar arquivo
spawn scp -o StrictHostKeyChecking=no \
    apps/api/src/services/instagram/instagram.service.ts \
    ${user}@${server}:/tmp/

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

# SSH e copiar arquivo
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

send "echo '=== Criando diretório Instagram ==='\r"
expect "# "

send "mkdir -p /opt/chatblue/app/apps/api/src/services/instagram\r"
expect "# "

send "echo '=== Copiando arquivo ==='\r"
expect "# "

send "cp /tmp/instagram.service.ts /opt/chatblue/app/apps/api/src/services/instagram/\r"
expect "# "

send "echo '=== Compilando código ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -40\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "echo '=== Verificando status ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando API ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1\r"
expect "# "

send "exit\r"
expect eof



