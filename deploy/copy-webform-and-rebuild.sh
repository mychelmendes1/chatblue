#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Copiando webform.routes e fazendo rebuild ==="

# Primeiro copiar o arquivo usando expect
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/api/src/routes/webform.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/webform.routes.ts

expect {
    "password:" {
        send "${password}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${password}\r"
    }
    timeout {
        puts "Timeout no scp"
        exit 1
    }
}

expect {
    eof {}
    timeout {
        puts "Timeout esperando fim do scp"
        exit 1
    }
}

# Agora fazer rebuild via SSH
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

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "pm2 stop chatblue-api\r"
expect "# "

send "rm -rf dist\r"
expect "# "

send "cd /opt/chatblue/app && pnpm --filter api build:force 2>&1 | tail -30\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && ls -la dist/routes/webform.routes.* 2>&1\r"
expect "# "

send "pm2 start chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | tail -15\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1\r"
expect "# "

send "echo '=== Correção concluída! ==='\r"
expect "# "

send "exit\r"
expect eof






