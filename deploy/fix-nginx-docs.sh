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

# Check if docs location exists
send "grep 'location /docs' /etc/nginx/sites-available/chatblue || echo 'NOT_FOUND'\r"
expect "# "

# Add docs location manually using a here document
send "cat >> /tmp/nginx_docs_block.txt << 'NGINXBLOCK'
    # Documentation (Docusaurus)
    location /docs {
        alias /var/www/chatblue/docs;
        try_files \\\$uri \\\$uri/ /docs/index.html;
        index index.html;
    }

NGINXBLOCK\r"
expect "# "

# Use sed to insert before Let's Encrypt
send "sed -i '/# Let'\''s Encrypt validation/r /tmp/nginx_docs_block.txt' /etc/nginx/sites-available/chatblue\r"
expect "# "

send "rm /tmp/nginx_docs_block.txt\r"
expect "# "

send "nginx -t\r"
expect "# "

send "systemctl reload nginx\r"
expect "# "

send "sleep 3 && curl -I https://chat.grupoblue.com.br/docs/ 2>&1 | head -8\r"
expect "# "

send "exit\r"
expect eof

puts "=== Concluído! ==="
