#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando e corrigindo erros de TypeScript ==="

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

send "echo '=== Verificando arquivos no diretório errado ==='\r"
expect "# "

send "ls -la /opt/chatblue/app/apps/api/src/routes/*.service.ts 2>/dev/null || echo 'Nenhum arquivo .service.ts encontrado em routes/'\r"
expect "# "

send "echo '=== Se houver arquivos, removendo ==='\r"
expect "# "

send "rm -f /opt/chatblue/app/apps/api/src/routes/baileys.service.ts /opt/chatblue/app/apps/api/src/routes/whatsapp.service.ts 2>/dev/null && echo 'Arquivos removidos' || echo 'Arquivos não existem'\r"
expect "# "

send "echo '=== Compilando API para ver erros reais ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | grep -E 'error TS|Error' | head -30\r"
expect "# "

send "exit\r"
expect eof



