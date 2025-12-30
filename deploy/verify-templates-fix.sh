#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Verificando se o JS foi atualizado ==='\r"
expect "# "
send "grep -n 'businessId' dist/services/whatsapp/meta-cloud.service.js | head -5\r"
expect "# "

send "echo '=== Verificando getTemplates no JS ==='\r"
expect "# "
send "grep -A5 'async getTemplates' dist/services/whatsapp/meta-cloud.service.js | head -10\r"
expect "# "

send "exit\r"
expect eof

