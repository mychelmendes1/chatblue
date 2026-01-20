#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Backup nginx using backticks
send "cp /etc/nginx/sites-available/chatblue /etc/nginx/sites-available/chatblue.backup.`date +%Y%m%d_%H%M%S` && echo 'Backup created'\r"
expect "# "

# Check if docs location exists
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

puts "=== Concluído! ==="
