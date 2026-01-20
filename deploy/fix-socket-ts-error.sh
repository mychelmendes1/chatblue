#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy fixed file
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/web/lib/socket.ts \
    ${user}@${server}:/tmp/

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

# SSH and fix
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

send "cp /tmp/socket.ts /opt/chatblue/app/apps/web/lib/socket.ts\r"
expect "# "

send "cd /opt/chatblue/app/apps/web\r"
expect "# "

send "echo '=== Fazendo build do Web ==='\r"
expect "# "
send "pnpm build 2>&1 | tail -20\r"
expect "# "

send "echo '=== Reiniciando Web ==='\r"
expect "# "
send "pm2 reload chatblue-web --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof






