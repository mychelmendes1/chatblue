#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando e compilando Instagram service ==="

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

send "echo '=== Verificando arquivos ==='\r"
expect "# "

send "ls -la /opt/chatblue/app/apps/api/src/services/instagram/ 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "ls -la /opt/chatblue/app/apps/api/dist/services/instagram/ 2>&1 || echo 'Diretório dist não existe'\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Compilando apenas o Instagram service ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx tsc src/services/instagram/instagram.service.ts --outDir dist/services/instagram --module commonjs --target es2020 --esModuleInterop --skipLibCheck 2>&1 | head -20\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando se compilou ==='\r"
expect "# "

send "ls -la /opt/chatblue/app/apps/api/dist/services/instagram/ 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 10 --nostream | tail -10\r"
expect "# "

send "exit\r"
expect eof



