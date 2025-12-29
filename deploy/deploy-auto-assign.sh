#!/usr/bin/expect -f

set timeout 300
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
send "cd /opt/chatblue/app\r"
expect "# "

send "echo '=== Atualizando repositório ==='\r"
expect "# "
send "git stash 2>/dev/null; git pull origin main 2>&1 | tail -10\r"
expect "# "

send "echo '=== Compilando API ==='\r"
expect "# "
send "cd apps/api && pnpm build 2>&1 | tail -20\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "echo '=== Compilando Frontend ==='\r"
expect "# "
send "cd /opt/chatblue/app/apps/web && pnpm build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Reiniciando Frontend ==='\r"
expect "# "
send "pm2 restart chatblue-web\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

