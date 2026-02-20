#!/usr/bin/expect -f
# Deploy completo em uma única conexão SSH: pull, backup, migrate, build, reload.
# Uso: ./deploy/deploy-all-improvements.sh
# Execute do diretório do projeto, após ter feito push do código.

set timeout 600
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
send "cd /opt/chatblue/app && git fetch origin && git pull origin main\r"
expect "# " -timeout 120

send "bash deploy/deploy.sh\r"
expect {
    "Deploy finalizado com sucesso!" { }
    "Deploy Concluído!" { }
    "# " { }
}
expect "# " -timeout 300

send "exit\r"
expect eof
