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

send "echo '=== Verificando DATABASE_URL completo ==='\r"
expect "# "
send "cat apps/api/.env | grep -E 'DATABASE|REDIS'\r"
expect "# "

send "echo '=== Portas abertas ==='\r"
expect "# "
send "ss -tlnp | grep -E '5432|6379|3001'\r"
expect "# "

send "echo '=== Docker containers ==='\r"
expect "# "
send "docker ps 2>/dev/null | head -10\r"
expect "# "

send "exit\r"
expect eof

