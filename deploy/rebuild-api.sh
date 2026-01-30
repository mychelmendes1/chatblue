#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Rebuild completo da API ==="

# SSH e rebuild
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

send "echo '=== Parando API ==='\r"
expect "# "

send "pm2 stop chatblue-api\r"
expect "# "

send "echo '=== Limpando build anterior ==='\r"
expect "# "

send "rm -rf dist\r"
expect "# "

send "echo '=== Verificando arquivo fonte ==='\r"
expect "# "

send "ls -la src/routes/webform.routes.ts 2>&1\r"
expect "# "

send "echo '=== Fazendo rebuild ==='\r"
expect "# "

send "cd /opt/chatblue/app && pnpm --filter api build 2>&1 | tail -50\r"
expect "# "

send "echo '=== Verificando se arquivos foram gerados ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && ls -la dist/routes/webform.routes.* 2>&1\r"
expect "# "

send "echo '=== Iniciando API ==='\r"
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

send "echo '=== Rebuild concluído! ==='\r"
expect "# "

send "exit\r"
expect eof






