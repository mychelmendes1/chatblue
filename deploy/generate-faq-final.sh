#!/usr/bin/expect -f

set timeout 900
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Gerando FAQ do banco de dados ==="

# Copiar script JS
spawn sh -c "scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/deploy/process_faq.js ${user}@${server}:/tmp/process_faq.js"

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect eof

# SSH para executar
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Executar script Node.js
send "node /tmp/process_faq.js 2>&1\r"
expect "# "

# Verificar arquivo gerado
send "test -f /opt/chatblue/app/docs-site/docs/treinamento/faq-atendimentos.md && (echo 'SUCCESS' && wc -l /opt/chatblue/app/docs-site/docs/treinamento/faq-atendimentos.md && head -30 /opt/chatblue/app/docs-site/docs/treinamento/faq-atendimentos.md) || echo 'FAILED'\r"
expect "# "

# Copiar arquivo de volta para localhost
send "exit\r"
expect eof

puts "\n=== Copiando FAQ para localhost ==="

spawn scp -o StrictHostKeyChecking=no ${user}@${server}:/opt/chatblue/app/docs-site/docs/treinamento/faq-atendimentos.md /Users/mychel/Downloads/Projetos/chatblue/chatblue/docs-site/docs/treinamento/faq-atendimentos.md

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect eof

puts "\n=== FAQ gerado e copiado com sucesso! ==="

