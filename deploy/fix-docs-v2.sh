#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

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

# Create placeholder image directories and files
send "mkdir -p static/img/guias static/img/treinamento\r"
expect "# "

send "touch static/img/guias/whatsapp-menu.png static/img/guias/meta-criar-app.png static/img/guias/midia-enviar.png static/img/guias/template-criar.png static/img/treinamento/login.png\r"
expect "# "

# Now try build
send "npm run build 2>&1 | tail -40\r"
expect "# "

send "exit\r"
expect eof
