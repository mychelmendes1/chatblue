#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Deploy completo Blue Frontend ==="

# Lista de arquivos do Blue para copiar
set files {
    "apps/web/components/blue/blue-mascot.tsx"
    "apps/web/components/blue/blue-chat.tsx"
    "apps/web/components/blue/blue-tips.tsx"
    "apps/web/components/blue/context-detector.ts"
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

# Copiar layout separadamente (tem parênteses no caminho)
puts "Copiando layout..."
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/web/app/\(dashboard\)/layout.tsx \
    ${user}@${server}:/tmp/layout.tsx

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

# Copiar server.ts se necessário
puts "Copiando server.ts..."
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/server.ts \
    ${user}@${server}:/tmp/server.ts

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

send "mkdir -p 'app/(dashboard)'\r"
expect "# "

send "cp /tmp/layout.tsx 'app/(dashboard)/'\r"
expect "# "

send "echo '=== Fazendo build do frontend ==='\r"
expect "# "

send "pnpm build 2>&1 | tail -50\r"
expect "# "

send "echo '=== Reiniciando frontend ==='\r"
expect "# "

send "pm2 restart chatblue-web --update-env\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "cp /tmp/server.ts src/\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -20\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Deploy completo concluído! ==='\r"
expect "# "

send "exit\r"
expect eof






