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

send "echo '=== Recompilando API ==='\r"
expect "# "
send "pnpm run build 2>&1 | grep -E '(error|Error|success|Success|Compiled)' | head -30 || echo 'Build concluído'\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "echo '=== Aguardando inicialização ==='\r"
expect "# "
send "sleep 5\r"
expect "# "

send "echo '=== Verificando status ==='\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Testando endpoint de usuários ==='\r"
expect "# "
send "curl -s http://localhost:3001/api/users -H 'Authorization: Bearer test' 2>&1 | head -5 || echo 'Endpoint testado'\r"
expect "# "

send "exit\r"
expect eof

