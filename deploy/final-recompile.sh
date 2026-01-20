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

send "echo '=== Compilando usando tsconfig ==='\r"
expect "# "
send "npx tsc --project tsconfig.json 2>&1 | grep -E '(auth.middleware|error|Error)' | head -10 || echo 'Compilação OK'\r"
expect "# "

send "ls -lh dist/middlewares/auth.middleware.js | awk '{print \$6, \$7, \$8, \$9}'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 logs chatblue-api --lines 3 --nostream | tail -3\r"
expect "# "

send "exit\r"
expect eof










