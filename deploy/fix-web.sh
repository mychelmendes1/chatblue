#!/usr/bin/expect -f

set timeout 60
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
send "echo '=== Verificando logs do Web ==='\r"
expect "# "
send "pm2 logs chatblue-web --lines 50 --nostream | tail -50\r"
expect "# "

send "echo '=== Parando Web ==='\r"
expect "# "
send "pm2 stop chatblue-web\r"
expect "# "

send "echo '=== Verificando se porta 3000 está livre ==='\r"
expect "# "
send "lsof -i :3000 || echo 'Porta 3000 está livre'\r"
expect "# "

send "echo '=== Tentando iniciar Web manualmente para ver erro ==='\r"
expect "# "
send "cd /opt/chatblue/app/apps/web && timeout 10 pnpm exec next start -p 3000 2>&1 | head -30 || echo 'Processo terminou'\r"
expect "# "

send "echo '=== Reiniciando Web via PM2 ==='\r"
expect "# "
send "pm2 restart chatblue-web\r"
expect "# "

send "sleep 5\r"
expect "# "

send "echo '=== Verificando status ==='\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Testando Web ==='\r"
expect "# "
send "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 && echo ' - Web OK' || echo 'Web ainda não responde'\r"
expect "# "

send "exit\r"
expect eof





