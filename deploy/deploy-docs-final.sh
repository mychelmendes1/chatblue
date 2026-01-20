#!/usr/bin/expect -f

set timeout 1200
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

# Install dependencies if needed
send "test -d node_modules || npm install --legacy-peer-deps 2>&1 | tail -10\r"
expect "# "

# Build docs (ignore broken images)
send "npm run build 2>&1 | tail -40\r"
expect "# "

# Check if build succeeded
send "test -d build && echo 'Build succeeded' || echo 'Build failed'\r"
expect "# "

# Create docs directory in nginx root
send "mkdir -p /var/www/chatblue/docs\r"
expect "# "

# Copy build output if build succeeded
send "if [ -d build ]; then cp -r build/* /var/www/chatblue/docs/ && echo 'Files copied'; else echo 'Build directory not found'; fi\r"
expect "# "

# Verify files copied
send "ls -la /var/www/chatblue/docs/ | head -10\r"
expect "# "

# Backup nginx config (use backticks for date command)
send "BACKUP_FILE=\"/etc/nginx/sites-available/chatblue.backup.`date +%Y%m%d_%H%M%S`\" && cp /etc/nginx/sites-available/chatblue \"$BACKUP_FILE\" && echo \"Backup created: $BACKUP_FILE\"\r"
expect "# "

# Check if docs location already exists
send "grep -q 'location /docs' /etc/nginx/sites-available/chatblue && echo 'location /docs already exists' || echo 'location /docs not found'\r"
expect "# "

# Add docs location before Let's Encrypt location using perl
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

