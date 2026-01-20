#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy script to server
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/src/scripts/check-ticket-visibility.ts \
    ${user}@${server}:/tmp/

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

# SSH and execute script
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

send "cp /tmp/check-ticket-visibility.ts src/scripts/check-ticket-visibility.ts\r"
expect "# "

send "echo '=== Verificando containers Docker ==='\r"
expect "# "

send "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'postgres|chatblue'\r"
expect "# "

send "echo '=== Verificando DATABASE_URL ==='\r"
expect "# "

send "grep DATABASE_URL .env 2>/dev/null || echo 'DATABASE_URL não encontrado no .env'\r"
expect "# "

send "echo '=== Executando verificação de visibilidade ==='\r"
expect "# "

send "export DATABASE_URL=\$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '\"') && pnpm exec tsx src/scripts/check-ticket-visibility.ts\r"
expect "# "

send "exit\r"
expect eof

