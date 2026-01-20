#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "echo '=== Adicionando regra de webhook no Nginx ==='\r"
expect "# "

# Create a backup first
send "cp /etc/nginx/sites-enabled/chatblue /etc/nginx/sites-enabled/chatblue.bak\r"
expect "# "

# Add webhook location after the uploads location
send "sed -i '/location \\/uploads {/i\\    # Webhooks (Meta, Baileys)\\n    location /webhooks {\\n        proxy_pass http://127.0.0.1:3001;\\n        proxy_http_version 1.1;\\n        proxy_set_header Host \\$host;\\n        proxy_set_header X-Real-IP \\$remote_addr;\\n        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;\\n        proxy_set_header X-Forwarded-Proto \\$scheme;\\n    }\\n' /etc/nginx/sites-enabled/chatblue\r"
expect "# "

send "echo '=== Verificando se foi adicionado ==='\r"
expect "# "
send "grep -A5 'webhooks' /etc/nginx/sites-enabled/chatblue\r"
expect "# "

send "echo '=== Testando configuração do Nginx ==='\r"
expect "# "
send "nginx -t\r"
expect "# "

send "echo '=== Recarregando Nginx ==='\r"
expect "# "
send "systemctl reload nginx\r"
expect "# "

send "echo '=== Testando webhook novamente ==='\r"
expect "# "
send {curl -s "https://chat.grupoblue.com.br/webhooks/meta/cmjr5gonq00534lywu2h17f6h?hub.mode=subscribe&hub.verify_token=6823565c63ea383160459bcd59dda24a&hub.challenge=test123"}
send "\r"
expect "# "

send "exit\r"
expect eof










