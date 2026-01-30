#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Deploy Blue Frontend ==="

# Lista de arquivos do Blue para copiar
set files {
    "apps/web/components/blue/blue-mascot.tsx"
    "apps/web/components/blue/blue-chat.tsx"
    "apps/web/components/blue/blue-tips.tsx"
    "apps/web/components/blue/context-detector.ts"
    "apps/web/app/(dashboard)/layout.tsx"
}

# Copiar arquivos
foreach file $files {
    puts "Copiando $file..."
    spawn scp -o StrictHostKeyChecking=no \
        ${local_base}/${file} \
        ${user}@${server}:/tmp/[file tail $file]
    
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
}

puts "=== Arquivos copiados. Conectando ao servidor... ==="

# SSH e deploy
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

send "echo '=== Movendo arquivos Blue Frontend ==='\r"
expect "# "

send "mkdir -p components/blue\r"
expect "# "

send "cp /tmp/blue-mascot.tsx components/blue/\r"
expect "# "

send "cp /tmp/blue-chat.tsx components/blue/\r"
expect "# "

send "cp /tmp/blue-tips.tsx components/blue/\r"
expect "# "

send "cp /tmp/context-detector.ts components/blue/\r"
expect "# "

send "mkdir -p app/\(dashboard\)\r"
expect "# "

send "cp /tmp/layout.tsx app/\(dashboard\)/\r"
expect "# "

send "echo '=== Fazendo build do frontend ==='\r"
expect "# "

send "pnpm install --frozen-lockfile 2>&1 | tail -10 || pnpm install 2>&1 | tail -10\r"
expect "# "

send "pnpm build 2>&1 | tail -50\r"
expect "# "

send "echo '=== Reiniciando frontend ==='\r"
expect "# "

send "pm2 restart chatblue-web --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Deploy frontend concluído! ==='\r"
expect "# "

send "exit\r"
expect eof






