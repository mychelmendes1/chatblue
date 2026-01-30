#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy da Documentação Docusaurus ==="

# First, build docs locally (we'll do this separately if needed, but let's try to build on server)
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

# Check if docs-site directory exists, if not, copy entire directory
send "cd /opt/chatblue/app\r"
expect "# "

send "if [ ! -d \"docs-site\" ]; then echo 'docs-site not found, need to copy from local'; else echo 'docs-site exists'; fi\r"
expect "# "

# Copy docs-site if needed (we'll do this via scp first)
expect "# "

send "exit\r"
expect eof

# Now copy docs-site to server
spawn scp -r -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/docs-site ${user}@${server}:/tmp/

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

# SSH again to build and deploy
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

send "cp -r /tmp/docs-site /opt/chatblue/app/ && cd /opt/chatblue/app/docs-site\r"
expect "# "

# Check Node.js version and install dependencies
send "node --version\r"
expect "# "

send "npm --version\r"
expect "# "

# Install dependencies
send "npm install --legacy-peer-deps 2>&1 | tail -20\r"
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

# Update nginx config to serve docs
send "cp /etc/nginx/sites-available/chatblue /etc/nginx/sites-available/chatblue.backup.$(date +%Y%m%d_%H%M%S)\r"
expect "# "

# Add docs location to nginx config using perl
send "perl -i -pe \"s|# Let's Encrypt validation|    # Documentation (Docusaurus)\\n    location /docs {\\n        alias /var/www/chatblue/docs;\\n        try_files \\\\\$uri \\\\\$uri/ /docs/index.html;\\n        index index.html;\\n    }\\n\\n    # Let's Encrypt validation|\" /etc/nginx/sites-available/chatblue\r"
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
send "curl -I https://chat.grupoblue.com.br/docs/ 2>&1 | head -5\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy da Documentação concluído! ==="



