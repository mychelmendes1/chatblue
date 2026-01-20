#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Corrigindo build do Blue ==="

# Copiar arquivo corrigido primeiro
puts "Copiando blue-mascot.tsx corrigido..."
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/web/components/blue/blue-mascot.tsx \
    ${user}@${server}:/tmp/blue-mascot.tsx

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

send "cp /tmp/blue-mascot.tsx components/blue/\r"
expect "# "

send "echo '=== Fazendo build novamente ==='\r"
expect "# "

send "pnpm build 2>&1 | tail -40\r"
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

