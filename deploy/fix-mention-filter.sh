#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy da correção do filtro de menções ==="

# Copy updated chat-sidebar.tsx
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/web/components/chat/chat-sidebar.tsx ${user}@${server}:/tmp/

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

# SSH to move files and rebuild
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

send "cp /tmp/chat-sidebar.tsx /opt/chatblue/app/apps/web/components/chat/\r"
expect "# "

send "cd /opt/chatblue/app/apps/web && pnpm run build 2>&1 | tail -15\r"
expect "# "

send "pm2 restart chatblue-web\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy concluído! ==="

