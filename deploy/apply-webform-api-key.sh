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

send "echo '=== Adicionando coluna webform_api_key ==='\r"
expect "# "

# Adicionar coluna se não existir
send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE companies ADD COLUMN IF NOT EXISTS webform_api_key TEXT UNIQUE;\"\r"
expect "# "

send "echo '=== Criando índice ==='\r"
expect "# "

send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -c \"CREATE INDEX IF NOT EXISTS idx_companies_webform_api_key ON companies(webform_api_key) WHERE webform_api_key IS NOT NULL;\"\r"
expect "# "

send "echo '=== Atualizando API Key para empresa Tokeniza ==='\r"
expect "# "

# Atualizar API Key
send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -c \"UPDATE companies SET webform_api_key = '${api_key}' WHERE name ILIKE '%Tokeniza%';\"\r"
expect "# "

send "echo '=== Verificando atualização ==='\r"
expect "# "

send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT id, name, slug, LEFT(webform_api_key, 20) || '...' as api_key_preview FROM companies WHERE name ILIKE '%Tokeniza%';\"\r"
expect "# "

send "echo '=== API Key configurada com sucesso! ==='\r"
expect "# "

send "exit\r"
expect eof






