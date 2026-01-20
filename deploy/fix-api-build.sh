#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo build da API ==="

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

send "echo '=== Verificando diretório dist ==='\r"
expect "# "

send "ls -la dist/ 2>&1 | head -20\r"
expect "# "

send "echo '=== Limpando build anterior ==='\r"
expect "# "

send "rm -rf dist node_modules/.cache\r"
expect "# "

send "echo '=== Fazendo build completo da API ==='\r"
expect "# "

send "pnpm build 2>&1 | tail -50\r"
expect "# "

send "echo '=== Verificando se server.cjs foi criado ==='\r"
expect "# "

send "ls -lh dist/server.cjs 2>&1\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 logs chatblue-api --lines 20 --nostream\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Correção concluída! ==='\r"
expect "# "

send "exit\r"
expect eof



