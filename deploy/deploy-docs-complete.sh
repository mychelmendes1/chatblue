#!/usr/bin/expect -f

set timeout 1200
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy da Documentação Docusaurus ==="

# Copy docs-site to server
puts "Copiando docs-site para o servidor..."
spawn sh -c "cd /Users/mychel/Downloads/Projetos/chatblue/chatblue && tar czf - docs-site | ssh -o StrictHostKeyChecking=no ${user}@${server} 'cd /opt/chatblue/app && tar xzf -'"

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
expect eof

# SSH to build and deploy
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

send "cd /opt/chatblue/app/docs-site\r"
expect "# "

send "test -d node_modules || npm install --legacy-peer-deps 2>&1 | tail -10\r"
expect "# "

send "npm run build 2>&1 | tail -50\r"
expect "# "

send "test -d build && echo 'SUCCESS' || echo 'FAILED'\r"
expect "# "

send "mkdir -p /var/www/chatblue/docs\r"
expect "# "

send "test -d build && cp -r build/* /var/www/chatblue/docs/ && echo 'Files copied' || echo 'Build failed, skipping copy'\r"
expect "# "

send "ls -la /var/www/chatblue/docs/ | head -10\r"
expect "# "

send "BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/nginx/sites-available/chatblue /etc/nginx/sites-available/chatblue.backup.$BACKUP_TIMESTAMP && echo \"Backup: chatblue.backup.$BACKUP_TIMESTAMP\"\r"
expect "# "

send "grep -q 'location /docs' /etc/nginx/sites-available/chatblue || perl -i -pe 's|# Let'\''s Encrypt validation|    # Documentation (Docusaurus)\\n    location /docs {\\n        alias /var/www/chatblue/docs;\\n        try_files \\\$uri \\\$uri/ /docs/index.html;\\n        index index.html;\\n    }\\n\\n    # Let'\''s Encrypt validation|' /etc/nginx/sites-available/chatblue\r"
expect "# "

send "nginx -t\r"
expect "# "

send "systemctl reload nginx\r"
expect "# "

send "sleep 2 && curl -I https://chat.grupoblue.com.br/docs/ 2>&1 | head -5\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy concluído! ==="
