#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy da tradução de erros do Meta ==="

# Copy the new error translator file
puts "=== Copiando meta-error-translator.ts ==="
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/api/src/utils/meta-error-translator.ts ${user}@${server}:/tmp/

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

# Copy updated webhook.routes.ts
puts "=== Copiando webhook.routes.ts ==="
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/api/src/routes/webhook.routes.ts ${user}@${server}:/tmp/

expect {
    "password:" {
        send "${password}\r"
    }
}

expect eof

# SSH to move files and restart
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

send "echo '=== Criando diretório utils se não existir ==='\r"
expect "# "

send "mkdir -p /opt/chatblue/app/apps/api/src/utils\r"
expect "# "

send "echo '=== Movendo arquivos ==='\r"
expect "# "

send "cp /tmp/meta-error-translator.ts /opt/chatblue/app/apps/api/src/utils/\r"
expect "# "

send "cp /tmp/message.routes.ts /opt/chatblue/app/apps/api/src/routes/\r"
expect "# "

send "cp /tmp/webhook.routes.ts /opt/chatblue/app/apps/api/src/routes/\r"
expect "# "

send "echo '=== Compilando API ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Verificando logs ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream | tail -15\r"
expect "# "

send "exit\r"
expect eof

puts "=== Deploy concluído! ==="

