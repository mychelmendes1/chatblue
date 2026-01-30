#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy do frontend com exibição de erros ==="

# Copy updated chat-window.tsx
puts "=== Copiando chat-window.tsx ==="
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/web/components/chat/chat-window.tsx ${user}@${server}:/tmp/

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

# Copy updated socket-provider.tsx
puts "=== Copiando socket-provider.tsx ==="
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/web/components/providers/socket-provider.tsx ${user}@${server}:/tmp/

expect {
    "password:" {
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

send "echo '=== Movendo arquivos ==='\r"
expect "# "

send "cp /tmp/chat-window.tsx /opt/chatblue/app/apps/web/components/chat/\r"
expect "# "

send "cp /tmp/socket-provider.tsx /opt/chatblue/app/apps/web/components/providers/\r"
expect "# "

send "echo '=== Compilando frontend ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/web && pnpm run build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Reiniciando frontend ==='\r"
expect "# "

send "pm2 restart chatblue-web\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy do frontend concluído! ==="



