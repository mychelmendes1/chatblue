#!/usr/bin/expect -f

set timeout 1500
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy completo da Documentação ==="

# Copy docs-site to server
spawn sh -c "cd /Users/mychel/Downloads/Projetos/chatblue/chatblue && tar czf - docs-site | ssh -o StrictHostKeyChecking=no ${user}@${server} 'cd /opt/chatblue/app && tar xzf -'"

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}
expect eof

# SSH to build
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

send "cd /opt/chatblue/app/docs-site\r"
expect "# "

# Install deps if needed
send "test -d node_modules || npm install --legacy-peer-deps 2>&1 | tail -5\r"
expect "# "

# Create all placeholder images
send "mkdir -p static/img/guias static/img/treinamento\r"
expect "# "

send "cd static/img/guias && touch anthropic-apikey.png anthropic-config.png baileys-celular.png baileys-formulario.png baileys-lista-conexoes.png baileys-qrcode.png departamento-criar.png departamento-transferir.png empresa-criar.png ia-menu.png meta-credenciais.png meta-criar-app.png meta-teste-conexao.png meta-webhook.png midia-enviar.png midia-receber.png notion-conectar.png notion-integracao.png notion-mapeamento-teste.png notion-mapeamento.png notion-sync-manual.png notion-teste.png openai-apikey.png openai-config.png permissoes-criar-papel.png personalidade-menu.png sla-alertas.png sla-config.png sla-relatorios.png template-criar.png template-selecao.png transcricao-config.png transferencia-config.png usuario-criar.png whatsapp-menu.png whatsapp-nova-conexao.png\r"
expect "# "

send "cd ../treinamento && touch login.png\r"
expect "# "

send "cd /opt/chatblue/app/docs-site\r"
expect "# "

# Build
send "npm run build 2>&1 | tail -50\r"
expect "# "

# Check build
send "test -d build && echo 'BUILD_SUCCESS' || echo 'BUILD_FAILED'\r"
expect "# "

# Deploy files
send "mkdir -p /var/www/chatblue/docs\r"
expect "# "

send "test -d build && rm -rf /var/www/chatblue/docs/* && cp -r build/* /var/www/chatblue/docs/ && echo 'Files deployed' || echo 'No build to deploy'\r"
expect "# "

# Update nginx
send "BACKUP_TIME=$(date +%Y%m%d_%H%M%S) && cp /etc/nginx/sites-available/chatblue /etc/nginx/sites-available/chatblue.backup.$BACKUP_TIME && echo \"Backup: $BACKUP_TIME\"\r"
expect "# "

send "grep -q 'location /docs' /etc/nginx/sites-available/chatblue || perl -i -pe 's|# Let'\''s Encrypt validation|    location /docs {\\n        alias /var/www/chatblue/docs;\\n        try_files \\\$uri \\\$uri/ /docs/index.html;\\n        index index.html;\\n    }\\n\\n    # Let'\''s Encrypt validation|' /etc/nginx/sites-available/chatblue\r"
expect "# "

send "nginx -t && systemctl reload nginx && sleep 2 && curl -I https://chat.grupoblue.com.br/docs/ 2>&1 | head -5\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy concluído! ==="
