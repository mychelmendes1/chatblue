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

send "echo '=== Recompilando auth.middleware ==='\r"
expect "# "
send "npx tsc src/middlewares/auth.middleware.ts --outDir dist/middlewares --module commonjs --target es2020 --esModuleInterop --resolveJsonModule --skipLibCheck --moduleResolution node --lib es2020,dom 2>&1 | head -10\r"
expect "# "

send "ls -lh dist/middlewares/auth.middleware.js\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

