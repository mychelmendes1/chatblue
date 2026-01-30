#!/usr/bin/expect -f

set timeout 900
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy da Documentação Docusaurus ==="

# First, copy docs-site to server using tar/ssh
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

# Now SSH to build and deploy
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

# Check if node_modules exists, if not install
send "if [ ! -d \"node_modules\" ]; then echo 'Installing dependencies...'; npm install --legacy-peer-deps 2>&1 | tail -20; else echo 'Dependencies already installed'; fi\r"
expect "# "

# Build docs
send "npm run build 2>&1 | tail -30\r"
expect "# "

# Create docs directory in nginx root
send "mkdir -p /var/www/chatblue/docs\r"
expect "# "

# Copy build output
send "cp -r /opt/chatblue/app/docs-site/build/* /var/www/chatblue/docs/\r"
expect "# "

# Verify files copied
send "ls -la /var/www/chatblue/docs/ | head -10\r"
expect "# "

# Check current nginx config
send "grep -n 'location /docs' /etc/nginx/sites-available/chatblue || echo 'location /docs not found'\r"
expect "# "

# Backup nginx config
send "cp /etc/nginx/sites-available/chatblue /etc/nginx/sites-available/chatblue.backup.$(date +%Y%m%d_%H%M%S)\r"
expect "# "

# Add docs location before Let's Encrypt location
send "perl -i -pe 's|# Let'\''s Encrypt validation|    # Documentation (Docusaurus)\\n    location /docs {\\n        alias /var/www/chatblue/docs;\\n        try_files \\\$uri \\\$uri/ /docs/index.html;\\n        index index.html;\\n    }\\n\\n    # Let'\''s Encrypt validation|' /etc/nginx/sites-available/chatblue\r"
expect "# "

# Test nginx config
send "nginx -t\r"
expect "# "

# Reload nginx
send "systemctl reload nginx\r"
expect "# "

send "sleep 2\r"
expect "# "

# Check if docs are accessible
send "curl -I https://chat.grupoblue.com.br/docs/ 2>&1 | head -10\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy da Documentação concluído! ==="



