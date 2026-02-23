#!/usr/bin/expect -f
# Deploy: envia código por rsync e executa deploy no servidor (2 conexões).
# Uso: ./deploy/deploy-all-improvements.sh
# Execute do diretório do projeto.

set timeout 600
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_dir [pwd]
set remote_dir "/opt/chatblue/app"

# 1) Enviar código por rsync (exclui node_modules, .next, .env do servidor)
puts "=== Enviando código para o servidor (rsync) ==="
spawn rsync -avz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  --exclude=.env \
  --exclude=.env.local \
  --exclude=.env.production \
  --exclude=.env.*.local \
  --exclude=apps/api/node_modules \
  --exclude=apps/web/node_modules \
  --exclude=apps/web/.next \
  --exclude=packages/*/node_modules \
  --exclude=.git \
  --exclude=sessions \
  -e "ssh -o StrictHostKeyChecking=no" \
  "$local_dir/" ${user}@${server}:${remote_dir}/

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

# 2) Conectar e rodar deploy no servidor
puts "\n=== Executando deploy no servidor ==="
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
send "cd $remote_dir && bash deploy/deploy.sh\r"
expect {
    "Deploy finalizado com sucesso!" { }
    "Deploy Concluído!" { }
    "# " { }
}
expect -timeout 300 "# "

send "exit\r"
expect eof
puts "\n=== Deploy finalizado ==="
