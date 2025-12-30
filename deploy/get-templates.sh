#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app\r"
expect "# "

# Get templates from Meta API directly via the connection
send {docker exec chatblue_postgres psql -U chatblue -d chatblue -c "SELECT id, name, phone_number_id, business_id, access_token FROM whatsapp_connections WHERE type='META_CLOUD' LIMIT 1;"}
send "\r"
expect "# "

send "exit\r"
expect eof

