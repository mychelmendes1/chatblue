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

send "echo '=== Verificando conexões no banco ==='\r"
expect "# "
send "sudo -u postgres psql -d chatblue -c \"SELECT id, name, type, status, \\\"phoneNumberId\\\", \\\"businessId\\\", \\\"accessToken\\\" IS NOT NULL as has_token FROM \\\"WhatsAppConnection\\\" WHERE type='META_CLOUD';\" 2>/dev/null\r"
expect "# "

send "echo '=== Verificando se meta-cloud.service.js tem getTemplates ==='\r"
expect "# "
send "grep -n 'getTemplates\\|listTemplates\\|message_templates' apps/api/dist/services/whatsapp/meta-cloud.service.js 2>/dev/null | head -10\r"
expect "# "

send "echo '=== Testando chamada de API diretamente (sem templates buscar WABA ID) ==='\r"
expect "# "
# Get connection details to test
send "sudo -u postgres psql -d chatblue -t -c \"SELECT \\\"phoneNumberId\\\", substring(\\\"accessToken\\\" from 1 for 30) as token_prefix FROM \\\"WhatsAppConnection\\\" WHERE type='META_CLOUD' LIMIT 1;\" 2>/dev/null\r"
expect "# "

send "exit\r"
expect eof










