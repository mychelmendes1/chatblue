#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Deploy da correção de menções (@) ==="

# Copy updated file
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/web/components/chat/chat-window.tsx \
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

# SSH and deploy
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

send "echo '=== Movendo arquivo atualizado ==='\r"
expect "# "

send "cp /tmp/chat-window.tsx /opt/chatblue/app/apps/web/components/chat/chat-window.tsx\r"
expect "# "

send "cd /opt/chatblue/app/apps/web\r"
expect "# "

send "echo '=== Fazendo build do Web ==='\r"
expect "# "

send "pnpm build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Reiniciando serviço Web ==='\r"
expect "# "

send "pm2 reload chatblue-web --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-web --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

send "echo '=== Deploy concluído! ==='\r"
expect "# "

send "exit\r"
expect eof




