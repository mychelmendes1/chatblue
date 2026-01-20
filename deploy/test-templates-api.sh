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

send "echo '=== Pegando access_token da conexão META_CLOUD ==='\r"
expect "# "
send "TOKEN=$(docker exec chatblue_postgres psql -U chatblue -d chatblue -t -c \"SELECT access_token FROM whatsapp_connections WHERE type='META_CLOUD' LIMIT 1;\" | tr -d ' \\n')\r"
expect "# "

send "echo '=== Pegando phone_number_id ==='\r"
expect "# "
send "PHONE_ID=$(docker exec chatblue_postgres psql -U chatblue -d chatblue -t -c \"SELECT phone_number_id FROM whatsapp_connections WHERE type='META_CLOUD' LIMIT 1;\" | tr -d ' \\n')\r"
expect "# "
send "echo \"Phone ID: $PHONE_ID\"\r"
expect "# "

send "echo '=== Verificando informações do phone number (para pegar WABA ID) ==='\r"
expect "# "
send "curl -s \"https://graph.facebook.com/v21.0/$PHONE_ID\" -H \"Authorization: Bearer $TOKEN\" | head -c 500\r"
expect "# "

send "echo ''\r"
expect "# "
send "echo '=== Buscando WABA ID ==='\r"
expect "# "
send "WABA_ID=$(curl -s \"https://graph.facebook.com/v21.0/$PHONE_ID?fields=id,verified_name\" -H \"Authorization: Bearer $TOKEN\" | grep -o '\"id\":\"[^\"]*\"' | head -1 | cut -d'\"' -f4)\r"
expect "# "
send "echo \"WABA ID tentativa: $WABA_ID\"\r"
expect "# "

send "echo '=== Tentando pegar WABA diretamente ==='\r"
expect "# "
send "curl -s \"https://graph.facebook.com/v21.0/$PHONE_ID/whatsapp_business_account\" -H \"Authorization: Bearer $TOKEN\" | head -c 500\r"
expect "# "

send "echo ''\r"
expect "# "

send "exit\r"
expect eof










