#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

# API Key gerada para Tokeniza
set api_key "da1feeb3078107ecd2d3ace57c2d8d8eb5d25242ddd21a281488303b1198fb34"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${password}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${password}\r"
    }
}

expect "# "

send "echo '=== Atualizando API Key para empresa Tokeniza ==='\r"
expect "# "

# Executar SQL via docker exec usando o nome correto do container
send "docker exec -i chatblue_postgres psql -U postgres -d chatblue -c \"UPDATE companies SET webform_api_key = '${api_key}' WHERE name ILIKE '%Tokeniza%';\"\r"
expect "# "

send "echo '=== Verificando atualização ==='\r"
expect "# "

send "docker exec -i chatblue_postgres psql -U postgres -d chatblue -c \"SELECT id, name, slug, LEFT(webform_api_key, 20) || '...' as api_key_preview FROM companies WHERE name ILIKE '%Tokeniza%';\"\r"
expect "# "

send "echo '=== API Key configurada com sucesso! ==='\r"
expect "# "

send "exit\r"
expect eof






