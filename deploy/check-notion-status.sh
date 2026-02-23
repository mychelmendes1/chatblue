#!/usr/bin/expect -f
set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Buscar credenciais via queries separadas
send {docker exec chatblue_postgres psql -U chatblue chatblue -t -c "SELECT notion_api_key FROM company_settings WHERE company_id = 'cmjnhvo590000z3491cz3mw8z';" | tr -d ' \n' > /tmp/nk.txt}
send "\r"
expect "# "

send {docker exec chatblue_postgres psql -U chatblue chatblue -t -c "SELECT notion_database_id FROM company_settings WHERE company_id = 'cmjnhvo590000z3491cz3mw8z';" | tr -d ' \n' > /tmp/nd.txt}
send "\r"
expect "# "

# Rodar o check usando os valores
send {cd /opt/chatblue/app/apps/api && npx tsx src/scripts/notion-check-props.ts $(cat /tmp/nk.txt) $(cat /tmp/nd.txt) 2>&1}
send "\r"
expect -timeout 30 "# "

send "exit\r"
expect eof
