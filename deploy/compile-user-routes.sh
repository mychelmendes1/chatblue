#!/usr/bin/expect -f

set timeout 60
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

send "echo '=== Compilando apenas user.routes.ts ==='\r"
expect "# "
send "npx tsc src/routes/user.routes.ts --outDir dist/routes --module commonjs --target es2020 --esModuleInterop --resolveJsonModule --skipLibCheck --moduleResolution node 2>&1 | tail -5 || true\r"
expect "# "

send "echo '=== Verificando se arquivo foi compilado ==='\r"
expect "# "
send "ls -lh dist/routes/user.routes.js 2>&1 || echo 'Arquivo não encontrado'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 logs chatblue-api --lines 5 --nostream | tail -5\r"
expect "# "

send "exit\r"
expect eof












