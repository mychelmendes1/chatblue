#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

# First, upload the file via SCP
spawn scp -o StrictHostKeyChecking=no /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/api/src/routes/message.routes.ts ${user}@${server}:/opt/chatblue/app/apps/api/src/routes/message.routes.ts

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

# Now SSH to compile and restart
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${password}\r"
    }
}

expect "# "
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Compilando apenas message.routes.ts ==='\r"
expect "# "
send "npx tsc src/routes/message.routes.ts --outDir dist/routes --esModuleInterop --skipLibCheck --target ES2020 --module NodeNext --moduleResolution NodeNext 2>&1 || echo 'Usando compilação alternativa...'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

send "exit\r"
expect eof

