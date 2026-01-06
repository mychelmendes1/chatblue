#!/usr/bin/expect -f

set timeout 300
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
send "cd /opt/chatblue/app/apps/web\r"
expect "# "

send "echo '=== Verificando se .next existe ==='\r"
expect "# "
send "ls -la .next 2>&1 | head -5 || echo 'Diretório .next não existe'\r"
expect "# "

send "echo '=== Fazendo build do Next.js ==='\r"
expect "# "
send "pnpm run build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Verificando se BUILD_ID foi criado ==='\r"
expect "# "
send "ls -la .next/BUILD_ID 2>&1 || echo 'BUILD_ID não encontrado'\r"
expect "# "

send "echo '=== Reiniciando Web ==='\r"
expect "# "
send "pm2 restart chatblue-web --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "echo '=== Verificando status ==='\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Testando Web ==='\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 && echo ' - Web OK!' || echo 'Web ainda não responde'\r"
expect "# "

send "exit\r"
expect eof





