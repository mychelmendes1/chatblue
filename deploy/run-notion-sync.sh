#!/usr/bin/expect -f
set timeout 900
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Modo full-search: buscar todos os 690 contatos para encontrar os restantes
send {cd /opt/chatblue/app/apps/api && DATABASE_URL='postgresql://chatblue:0Gq7zr9QCu8mtSpx9BMIRp9PxUC1YPyk@localhost:5432/chatblue' npx tsx src/scripts/notion-batch-sync.ts cmjnhvo590000z3491cz3mw8z full-search 2>&1}
send "\r"
expect -timeout 700 {
    "=== Resultado ===" { }
    "Erro fatal:" { }
    "# " { }
}
expect -timeout 30 "# "

# Resultado
send {docker exec chatblue_postgres psql -U chatblue chatblue -c "SELECT COUNT(*) FILTER (WHERE is_client = true) AS clientes, COUNT(*) FILTER (WHERE is_ex_client = true) AS ex_clientes, COUNT(*) FILTER (WHERE notion_page_id IS NOT NULL) AS com_notion, COUNT(*) AS total FROM contacts WHERE company_id = 'cmjnhvo590000z3491cz3mw8z';"}
send "\r"
expect -timeout 15 "# "

send "exit\r"
expect eof
puts "\n=== Concluído ==="
