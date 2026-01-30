#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Reiniciando API e verificando correção ==="

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

send "echo '=== Reiniciando API para limpar instâncias em memória ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Aguardando 10 segundos para API inicializar ==='\r"
expect "# "

send "sleep 10\r"
expect -timeout 20 "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando logs dos últimos 10 segundos ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 30 --nostream 2>&1 | grep -v 'prisma:query' | tail -25\r"
expect -timeout 30 "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando se há erros de creds.json nos logs recentes ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 30 --nostream 2>&1 | grep -i 'creds.json' || echo 'SUCESSO: Nenhum erro de creds.json!'\r"
expect -timeout 30 "# "

send "echo ''\r"
expect "# "

send "echo '=== Status final ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof
