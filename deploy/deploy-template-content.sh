#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy da exibição do conteúdo real do template ==="

# Copy updated meta-cloud.service.ts
puts "=== Copiando meta-cloud.service.ts ==="
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/api/src/services/whatsapp/meta-cloud.service.ts ${user}@${server}:/tmp/

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

# Copy updated message.routes.ts
puts "=== Copiando message.routes.ts ==="
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/api/src/routes/message.routes.ts ${user}@${server}:/tmp/

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

send "cp /tmp/meta-cloud.service.ts /opt/chatblue/app/apps/api/src/services/whatsapp/\r"
expect "# "

send "cp /tmp/message.routes.ts /opt/chatblue/app/apps/api/src/routes/\r"
expect "# "

send "echo '=== Compilando API ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -20\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy concluído! ==="

