#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo layout do Blue ==="

# SSH e corrigir
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

send "cd /opt/chatblue/app/apps/web\r"
expect "# "

send "mkdir -p 'app/(dashboard)'\r"
expect "# "

send "cp /tmp/layout.tsx 'app/(dashboard)/'\r"
expect "# "

send "echo '=== Fazendo build novamente ==='\r"
expect "# "

send "pnpm build 2>&1 | tail -30\r"
expect "# "

send "echo '=== Reiniciando frontend ==='\r"
expect "# "

send "pm2 restart chatblue-web --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Correção concluída! ==='\r"
expect "# "

send "exit\r"
expect eof






