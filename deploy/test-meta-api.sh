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

send {PHONE_ID=$(docker exec chatblue_postgres psql -U chatblue -d chatblue -t -c "SELECT phone_number_id FROM whatsapp_connections WHERE type='META_CLOUD' LIMIT 1;" | tr -d ' \n')}
send "\r"
expect "# "

send {echo "Phone ID: $PHONE_ID"}
send "\r"
expect "# "

send {echo "=== Info do Phone Number ==="}
send "\r"
expect "# "

send {curl -s "https://graph.facebook.com/v21.0/$PHONE_ID" -H "Authorization: Bearer $TOKEN"}
send "\r"
expect "# "

send {echo ""}
send "\r"
expect "# "

send {echo "=== Tentando WABA ID via whatsapp_business_account ==="}
send "\r"
expect "# "

send {curl -s "https://graph.facebook.com/v21.0/$PHONE_ID?fields=id,verified_name,display_phone_number" -H "Authorization: Bearer $TOKEN"}
send "\r"
expect "# "

send "exit\r"
expect eof

