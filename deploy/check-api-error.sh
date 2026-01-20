#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando erro detalhado da API ==="

# SSH e verificar
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

send "echo '=== Logs completos da API ==='\r"
expect "# "

send "pm2 logs chatblue-api --lines 50 --nostream 2>&1 | tail -50\r"
expect "# "

send "echo '=== Verificando se arquivo existe ==='\r"
expect "# "

send "ls -la dist/server.js\r"
expect "# "

send "echo '=== Tentando executar diretamente ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && node dist/server.js 2>&1 | head -30\r"
expect {
    "Error:" {
        expect "# "
    }
    timeout {
        send "\003"
        expect "# "
    }
    "# " {}
}

send "echo '=== Verificando dependências ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && ls -la node_modules/.bin/ | head -5\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && test -d node_modules/.prisma && echo 'Prisma existe' || echo 'Prisma NAO existe'\r"
expect "# "

send "exit\r"
expect eof
