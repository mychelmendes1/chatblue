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

send {TOKEN=$(docker exec chatblue_postgres psql -U chatblue -d chatblue -t -c "SELECT access_token FROM whatsapp_connections WHERE type='META_CLOUD' LIMIT 1;" | tr -d ' \n')}
send "\r"
expect "# "

send {BUSINESS_ID=$(docker exec chatblue_postgres psql -U chatblue -d chatblue -t -c "SELECT business_id FROM whatsapp_connections WHERE type='META_CLOUD' LIMIT 1;" | tr -d ' \n')}
send "\r"
expect "# "

send {echo "=== Listando TODOS os templates com status ==="}
send "\r"
expect "# "

send {curl -s "https://graph.facebook.com/v21.0/$BUSINESS_ID/message_templates?fields=name,status,category,language" -H "Authorization: Bearer $TOKEN"}
send "\r"
expect "# "

send "exit\r"
expect eof












