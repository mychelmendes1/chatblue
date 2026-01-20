#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn scp -o StrictHostKeyChecking=no apps/api/src/routes/ticket.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/ticket.routes.ts

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

send "echo '=== Compilando ticket.routes.ts ==='\r"
expect "# "
send "npx tsc src/routes/ticket.routes.ts --outDir dist/routes --module commonjs --target es2020 --esModuleInterop --resolveJsonModule --skipLibCheck --moduleResolution node 2>&1 | tail -5 || true\r"
expect "# "

send "ls -lh dist/routes/ticket.routes.js | awk '{print \$6, \$7, \$8, \$9}'\r"
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










