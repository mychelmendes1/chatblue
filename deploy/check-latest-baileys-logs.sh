#!/usr/bin/expect -f

set timeout 90
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando logs RECENTES após correção ==="

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

send "echo '=== Logs dos últimos 2 minutos (após reinício) ==='\r"
expect "# "

# Show only logs from after the restart
send "pm2 logs chatblue-api --lines 50 --nostream 2>&1 | grep -v 'prisma:query' | tail -40\r"
expect -timeout 30 "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando se há novos erros de creds.json (últimas 50 linhas) ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 50 --nostream 2>&1 | grep -i 'creds.json' || echo 'SUCESSO: Nenhum erro novo de creds.json!'\r"
expect -timeout 30 "# "

send "echo ''\r"
expect "# "

send "echo '=== Corrigindo conexão órfã no banco de dados ==='\r"
expect "# "

# Fix orphaned connection by marking it as inactive
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"UPDATE whatsapp_connections SET is_active = false, status = 'DISCONNECTED' WHERE id = 'cmkwmm67z001lx5p726zauk4e';\" 2>/dev/null\r"
expect -timeout 30 "# "

send "echo ''\r"
expect "# "

send "echo '=== Listando apenas conexões ATIVAS ==='\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, type, status, is_active FROM whatsapp_connections WHERE is_active = true;\" 2>/dev/null\r"
expect -timeout 30 "# "

send "exit\r"
expect eof
