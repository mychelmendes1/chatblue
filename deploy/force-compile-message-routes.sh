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

send "echo '=== Compilando message.routes.ts com tsc ==='\r"
expect "# "

# Use tsc directly on this file with proper options
send "node_modules/.bin/tsc src/routes/message.routes.ts --outDir dist --declaration false --module NodeNext --moduleResolution NodeNext --esModuleInterop --target ES2020 --skipLibCheck 2>&1 || echo 'Erro na compilação, tentando alternativa...'\r"
expect "# "

# Check if the output was created in the right place
send "ls -la dist/routes/message.routes.js 2>/dev/null && ls -la src/routes/message.routes.js 2>/dev/null; true\r"
expect "# "

# If tsc put it in src/routes, move it
send "if \\[ -f src/routes/message.routes.js \\]; then mv src/routes/message.routes.js dist/routes/message.routes.js; echo 'Moved to dist/routes/'; fi\r"
expect "# "

# Verify final file timestamp
send "echo '=== Arquivo final ==='\r"
expect "# "
send "ls -la dist/routes/message.routes.js\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Verificando logs por erros ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | grep -i error | tail -5 || echo 'Sem erros'\r"
expect "# "

send "exit\r"
expect eof










