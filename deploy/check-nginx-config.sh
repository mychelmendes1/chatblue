#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Configuração do Nginx para chat.grupoblue.com.br ==='\r"
expect "# "
send "cat /etc/nginx/sites-enabled/chat.grupoblue.com.br 2>/dev/null || cat /etc/nginx/sites-available/chat.grupoblue.com.br 2>/dev/null || ls /etc/nginx/sites-enabled/\r"
expect "# "

send "echo '=== Verificando a rota da API ==='\r"
expect "# "
send "grep -r 'api\\|webhook\\|3001' /etc/nginx/sites-enabled/ 2>/dev/null | head -30\r"
expect "# "

send "exit\r"
expect eof





