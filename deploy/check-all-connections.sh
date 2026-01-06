#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app\r"
expect "# "

send "echo '=== Listando TODAS as conexões ==='\r"
expect "# "
send "sudo -u postgres psql -d chatblue -c 'SELECT id, name, type, status, \"isActive\" FROM \"WhatsAppConnection\";'\r"
expect "# "

send "echo '=== Verificando schema da tabela ==='\r"
expect "# "
send "sudo -u postgres psql -d chatblue -c '\\d \"WhatsAppConnection\"' | head -30\r"
expect "# "

send "exit\r"
expect eof





