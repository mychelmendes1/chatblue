#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Verificando correção do endpoint de conexões ==="

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

send "echo '=== Copiando arquivo com campos Instagram (agora que Prisma foi regenerado) ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && cat src/routes/connection.routes.ts | grep -A 2 'instagramAccountId' | head -5\r"
expect "# "

send "echo ''\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 10 --nostream | grep -i 'prisma\\|instagram\\|connection' | tail -10\r"
expect "# "

send "exit\r"
expect eof

