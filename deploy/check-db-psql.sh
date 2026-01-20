#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Status do PostgreSQL ==='\r"
expect "# "
send "systemctl status postgresql | head -10\r"
expect "# "

send "echo '=== Conectando ao banco ==='\r"
expect "# "
send "PGPASSWORD=chatblue123 psql -h localhost -U chatblue -d chatblue -c 'SELECT id, name, type, status FROM \"WhatsAppConnection\";'\r"
expect "# "

send "exit\r"
expect eof










