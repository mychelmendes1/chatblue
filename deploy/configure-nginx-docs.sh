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

# Use awk to add docs location before Let's Encrypt section
send "awk '/# Let'\''s Encrypt validation/ {print \"    # Documentation (Docusaurus)\"; print \"    location /docs {\"; print \"        alias /var/www/chatblue/docs;\"; print \"        try_files \\\\\\$uri \\\\\\$uri/ /docs/index.html;\"; print \"        index index.html;\"; print \"    }\"; print \"\"; }1' /etc/nginx/sites-available/chatblue > /tmp/chatblue_nginx_new.conf && mv /tmp/chatblue_nginx_new.conf /etc/nginx/sites-available/chatblue\r"
expect "# "

send "nginx -t\r"
expect "# "

send "systemctl reload nginx\r"
expect "# "

send "sleep 3 && curl -I https://chat.grupoblue.com.br/docs/ 2>&1 | head -10\r"
expect "# "

send "exit\r"
expect eof

puts "=== Nginx configurado! ==="
