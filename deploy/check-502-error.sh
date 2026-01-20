#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando erro 502 no login ==="
puts ""

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

send "echo '=== Status dos processos PM2 ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimos logs da API (erros) ==='\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 30 --nostream | tail -30\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Últimos logs da API (saída) ==='\r"
expect "# "

send "pm2 logs chatblue-api --out --lines 30 --nostream | tail -30\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando saúde da API ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1 | head -5 || echo 'API não responde'\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando nginx ==='\r"
expect "# "

send "curl -s http://localhost/health 2>&1 | head -5 || echo 'Nginx não responde'\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Logs do nginx (últimas 20 linhas) ==='\r"
expect "# "

send "tail -20 /var/log/nginx/error.log 2>/dev/null || echo 'Log do nginx não encontrado'\r"
expect "# "

send "exit\r"
expect eof

