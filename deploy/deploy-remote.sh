#!/usr/bin/expect -f

set timeout 30
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

send "echo '=== Verificando status do Git ==='\r"
expect "# "
send "git status\r"
expect "# "

send "echo '=== Fazendo pull das alterações ==='\r"
expect "# "
send "git pull origin main\r"
expect "# "

send "echo '=== Instalando dependências ==='\r"
expect "# "
send "pnpm install --frozen-lockfile\r"
expect "# "

send "echo '=== Fazendo build ==='\r"
expect "# "
send "pnpm build\r"
expect "# "

send "echo '=== Reiniciando serviços PM2 ==='\r"
expect "# "
send "pm2 reload all\r"
expect "# "

send "echo '=== Verificando status dos serviços ==='\r"
expect "# "
send "sleep 3\r"
expect "# "
send "pm2 status\r"
expect "# "

send "echo '=== Verificando logs recentes ==='\r"
expect "# "
send "pm2 logs chatblue-api --lines 20 --nostream\r"
expect "# "

send "exit\r"
expect eof












