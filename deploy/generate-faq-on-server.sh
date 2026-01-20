#!/usr/bin/expect -f

set timeout 900
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Executando script de geração de FAQ no servidor ==="

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

# Verificar se arquivo existe
send "test -f src/scripts/generate-faq-from-conversations.ts && echo 'Script found' || echo 'Script not found'\r"
expect "# "

# Executar script via tsx
send "cd /opt/chatblue/app && pnpm --filter api tsx apps/api/src/scripts/generate-faq-from-conversations.ts 2>&1\r"
expect "# "

# Verificar se arquivo foi gerado
send "test -f ../docs-site/docs/treinamento/faq-atendimentos.md && (echo 'FAQ generated successfully' && wc -l ../docs-site/docs/treinamento/faq-atendimentos.md) || echo 'FAQ file not found'\r"
expect "# "

send "exit\r"
expect eof

puts "\n=== Processo concluído! ==="

