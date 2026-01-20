#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Copiando script para servidor ==="

# Copiar script via tar
spawn sh -c "cd /Users/mychel/Downloads/Projetos/chatblue/chatblue && tar czf - apps/api/src/scripts/generate-faq-from-conversations.ts | ssh -o StrictHostKeyChecking=no ${user}@${server} 'cd /opt/chatblue/app && mkdir -p apps/api/src/scripts && tar xzf -'"

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect eof

puts "\n=== Executando script no servidor ==="

# SSH para executar
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

send "cd /opt/chatblue/app\r"
expect "# "

send "pnpm --filter api tsx apps/api/src/scripts/generate-faq-from-conversations.ts 2>&1 | tail -50\r"
expect "# "

send "test -f docs-site/docs/treinamento/faq-atendimentos.md && (echo 'SUCCESS' && wc -l docs-site/docs/treinamento/faq-atendimentos.md) || echo 'FAILED'\r"
expect "# "

send "exit\r"
expect eof

puts "\n=== Concluído! ==="
