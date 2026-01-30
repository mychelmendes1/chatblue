#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Listando tabelas do banco ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c '\\dt'\r"
expect "# "

send "echo '=== Buscando tabelas com whatsapp ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT tablename FROM pg_tables WHERE tablename ILIKE '%whatsapp%' OR tablename ILIKE '%connection%';\"\r"
expect "# "

send "exit\r"
expect eof












