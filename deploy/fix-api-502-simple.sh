#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo erro 502 da API ==="

# SSH e corrigir
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

send "echo '=== Verificando status da API ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Verificando logs da API ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 30 --nostream 2>&1 | tail -30\r"
expect "# "

send "echo '=== Verificando arquivos de build ==='\r"
expect "# "

send "ls -la dist/server.js\r"
expect "# "

send "echo '=== Tentando parar e iniciar API ==='\r"
expect "# "

send "pm2 stop chatblue-api\r"
expect "# "

send "sleep 2\r"
expect "# "

send "pm2 start chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 20 --nostream 2>&1 | tail -20\r"
expect "# "

send "echo '=== Testando health check ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1\r"
expect "# "

send "echo '=== Correção concluída! ==='\r"
expect "# "

send "exit\r"
expect eof




