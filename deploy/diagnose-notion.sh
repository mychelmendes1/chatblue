#!/usr/bin/expect -f
set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# 1. Verificar config do Notion por empresa
send "docker exec chatblue_postgres psql -U chatblue chatblue -c \"\
SELECT cs.company_id, co.name AS empresa, \
  cs.notion_sync_enabled, \
  CASE WHEN cs.notion_api_key IS NOT NULL AND cs.notion_api_key != '' THEN 'SIM' ELSE 'NAO' END AS tem_api_key, \
  CASE WHEN cs.notion_database_id IS NOT NULL AND cs.notion_database_id != '' THEN 'SIM' ELSE 'NAO' END AS tem_db_id, \
  LEFT(cs.notion_database_id, 20) AS db_id_preview \
FROM company_settings cs \
JOIN companies co ON co.id = cs.company_id;\"\r"
expect -timeout 30 "# "

# 2. Contatos marcados como cliente pelo Notion
send "docker exec chatblue_postgres psql -U chatblue chatblue -c \"\
SELECT c.phone, c.name, c.is_client, c.is_ex_client, c.client_since, c.notion_page_id, co.name AS empresa \
FROM contacts c \
JOIN companies co ON co.id = c.company_id \
WHERE c.is_client = true OR c.notion_page_id IS NOT NULL \
ORDER BY co.name, c.name \
LIMIT 30;\"\r"
expect -timeout 30 "# "

# 3. Total de contatos enriquecidos vs total
send "docker exec chatblue_postgres psql -U chatblue chatblue -c \"\
SELECT co.name AS empresa, \
  COUNT(*) AS total_contatos, \
  COUNT(*) FILTER (WHERE c.is_client = true) AS clientes, \
  COUNT(*) FILTER (WHERE c.is_ex_client = true) AS ex_clientes, \
  COUNT(*) FILTER (WHERE c.notion_page_id IS NOT NULL) AS com_notion \
FROM contacts c \
JOIN companies co ON co.id = c.company_id \
GROUP BY co.name \
ORDER BY co.name;\"\r"
expect -timeout 30 "# "

# 4. Logs do Notion sync recentes
send "grep -i 'notion' /opt/chatblue/logs/api-out.log 2>/dev/null | tail -20 || echo 'Sem logs de notion'\r"
expect -timeout 15 "# "
send "grep -i 'notion' /opt/chatblue/logs/api-error.log 2>/dev/null | tail -20 || echo 'Sem erros de notion'\r"
expect -timeout 15 "# "

# 5. Verificar se Redis está rodando (fila do BullMQ)
send "docker exec chatblue_redis redis-cli -a zCW8lNtbuZAdKJ5TsRlxhefGUp7zS0I KEYS 'bull:notion*' 2>/dev/null | head -10 || echo 'Sem filas notion'\r"
expect -timeout 15 "# "

# 6. Testar se a API do Notion responde (via curl na API)
send "curl -s http://localhost:3001/api/settings 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); print('notionSyncEnabled:', d.get('notionSyncEnabled','?')); print('notionApiKey set:', bool(d.get('notionApiKey'))); print('notionDatabaseId set:', bool(d.get('notionDatabaseId')))\" 2>/dev/null || echo 'Nao conseguiu ler settings via API'\r"
expect -timeout 15 "# "

send "exit\r"
expect eof
