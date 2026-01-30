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

send "echo '=== Verificando variáveis de ambiente do container ==='\r"
expect "# "

send "docker exec chatblue_postgres env | grep -i postgres\r"
expect "# "

send "echo '=== Tentando com usuário padrão do Docker ==='\r"
expect "# "

# Tentar com diferentes usuários
send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -c \"UPDATE companies SET webform_api_key = '${api_key}' WHERE name ILIKE '%Tokeniza%';\" 2>&1 || docker exec -i chatblue_postgres psql -d chatblue -c \"UPDATE companies SET webform_api_key = '${api_key}' WHERE name ILIKE '%Tokeniza%';\" 2>&1\r"
expect "# "

send "echo '=== Verificando atualização ==='\r"
expect "# "

send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, slug, LEFT(webform_api_key, 20) || '...' as api_key_preview FROM companies WHERE name ILIKE '%Tokeniza%';\" 2>&1 || docker exec -i chatblue_postgres psql -d chatblue -c \"SELECT id, name, slug, LEFT(webform_api_key, 20) || '...' as api_key_preview FROM companies WHERE name ILIKE '%Tokeniza%';\" 2>&1\r"
expect "# "

send "echo '=== Concluído ==='\r"
expect "# "

send "exit\r"
expect eof








