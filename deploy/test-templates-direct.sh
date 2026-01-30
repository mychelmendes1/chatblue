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

send {echo "Business ID: $BUSINESS_ID"}
send "\r"
expect "# "

send {echo "=== Tentando listar templates usando business_id como WABA ID ==="}
send "\r"
expect "# "

send {curl -s "https://graph.facebook.com/v21.0/$BUSINESS_ID/message_templates" -H "Authorization: Bearer $TOKEN" | head -c 1000}
send "\r"
expect "# "

send {echo ""}
send "\r"
expect "# "

send {echo "=== Verificando se business_id é WABA ou Business Account ==="}
send "\r"
expect "# "

send {curl -s "https://graph.facebook.com/v21.0/$BUSINESS_ID" -H "Authorization: Bearer $TOKEN" | head -c 500}
send "\r"
expect "# "

send {echo ""}
send "\r"
expect "# "

send {echo "=== Buscando WABA via phone number owner ==="}
send "\r"
expect "# "

send {PHONE_ID=$(docker exec chatblue_postgres psql -U chatblue -d chatblue -t -c "SELECT phone_number_id FROM whatsapp_connections WHERE type='META_CLOUD' LIMIT 1;" | tr -d ' \n')}
send "\r"
expect "# "

send {curl -s "https://graph.facebook.com/v21.0/$PHONE_ID/owner_business_info" -H "Authorization: Bearer $TOKEN" | head -c 500}
send "\r"
expect "# "

send "exit\r"
expect eof












