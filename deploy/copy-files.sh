#!/usr/bin/expect -f

set timeout 30
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn scp -o StrictHostKeyChecking=no apps/api/src/routes/user.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/user.routes.ts

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

send "echo '=== Compilando apenas o arquivo alterado ==='\r"
expect "# "
send "npx tsc src/routes/user.routes.ts --skipLibCheck --outDir dist --module commonjs --target es2020 --esModuleInterop --resolveJsonModule 2>&1 | head -20 || echo 'Compilação pode ter erros, mas continuando...'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 reload chatblue-api\r"
expect "# "

send "echo '=== Verificando status ==='\r"
expect "# "
send "sleep 2\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Verificando logs ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 10 --nostream | tail -10\r"
expect "# "

send "exit\r"
expect eof

