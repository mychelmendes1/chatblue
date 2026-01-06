#!/usr/bin/expect -f

set timeout 120
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
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando message.routes.ts para JavaScript ==='\r"
expect "# "

# Compile just this file using swc (faster) or tsc
send "npx swc src/routes/message.routes.ts -o dist/routes/message.routes.js --config-file .swcrc 2>&1 || echo 'Usando tsc...'\r"
expect "# "

# Fallback to manual conversion - copy compiled version
send "echo '=== Verificando se arquivo compilou ==='\r"
expect "# "
send "ls -la dist/routes/message.routes.js 2>/dev/null || echo 'Arquivo não existe'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Logs API ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

send "exit\r"
expect eof





