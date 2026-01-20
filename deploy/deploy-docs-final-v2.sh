#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Finalizando Deploy da Documentação ==="

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Deploy build files
send "cd /opt/chatblue/app/docs-site\r"
expect "# "

send "test -d build && (rm -rf /var/www/chatblue/docs/* && cp -r build/* /var/www/chatblue/docs/ && echo 'Files deployed') || echo 'Build directory not found'\r"
expect "# "

send "ls -la /var/www/chatblue/docs/ | head -10\r"
expect "# "

# Update nginx
send "TS=$(date +%Y%m%d_%H%M%S) && cp /etc/nginx/sites-available/chatblue /etc/nginx/sites-available/chatblue.backup.$TS && echo \"Backup: chatblue.backup.$TS\"\r"
expect "# "

# Check if docs location exists, if not add it
send "grep -q 'location /docs' /etc/nginx/sites-available/chatblue || perl -i -pe 's|# Let'\''s Encrypt validation|    location /docs {\\n        alias /var/www/chatblue/docs;\\n        try_files \\\$uri \\\$uri/ /docs/index.html;\\n        index index.html;\\n    }\\n\\n    # Let'\''s Encrypt validation|' /etc/nginx/sites-available/chatblue\r"
expect "# "

send "nginx -t\r"
expect "# "

send "systemctl reload nginx\r"
expect "# "

send "sleep 3 && curl -I https://chat.grupoblue.com.br/docs/ 2>&1 | head -10\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy finalizado! ==="
