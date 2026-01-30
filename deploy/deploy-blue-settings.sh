#!/usr/bin/expect -f

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

puts "=== Deploy Blue Settings ==="

# Lista de arquivos para copiar
set files {
    "apps/web/app/(dashboard)/settings/page.tsx"
    "apps/api/src/routes/settings.routes.ts"
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

send "mkdir -p 'app/(dashboard)/settings'\r"
expect "# "

send "cp /tmp/page.tsx 'app/(dashboard)/settings/'\r"
expect "# "

send "echo '=== Fazendo build do frontend ==='\r"
expect "# "

send "pnpm build 2>&1 | tail -40\r"
expect "# "

send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "cp /tmp/settings.routes.ts src/routes/\r"
expect "# "

send "echo '=== Fazendo build da API ==='\r"
expect "# "

send "pnpm build:force 2>&1 | tail -20\r"
expect "# "

send "echo '=== Reiniciando serviços ==='\r"
expect "# "

send "pm2 restart chatblue-web --update-env\r"
expect "# "

send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo '=== Deploy concluído! ==='\r"
expect "# "

send "exit\r"
expect eof






