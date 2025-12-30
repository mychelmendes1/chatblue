#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Testando webhook local ==='\r"
expect "# "
send {curl -v "http://localhost:3001/webhooks/meta/cmjr5gonq00534lywu2h17f6h?hub.mode=subscribe&hub.verify_token=6823565c63ea383160459bcd59dda24a&hub.challenge=test123" 2>&1 | tail -10}
send "\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando webhook externo ==='\r"
expect "# "
send {curl -v "https://chat.grupoblue.com.br/webhooks/meta/cmjr5gonq00534lywu2h17f6h?hub.mode=subscribe&hub.verify_token=6823565c63ea383160459bcd59dda24a&hub.challenge=test123" 2>&1 | tail -10}
send "\r"
expect "# "

send "exit\r"
expect eof

