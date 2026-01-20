#!/usr/bin/expect -f

set timeout 1800
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Fazendo backup do banco de dados do servidor ==="

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Criar backup do banco de dados
send "docker exec chatblue_postgres pg_dump -U chatblue -d chatblue -F c -f /tmp/chatblue_backup.dump 2>&1\r"
expect "# "

# Verificar se backup foi criado
send "docker exec chatblue_postgres ls -lh /tmp/chatblue_backup.dump 2>&1\r"
expect "# "

# Copiar backup para fora do container
send "docker cp chatblue_postgres:/tmp/chatblue_backup.dump /tmp/chatblue_backup.dump 2>&1\r"
expect "# "

# Verificar tamanho do arquivo
send "ls -lh /tmp/chatblue_backup.dump 2>&1\r"
expect "# "

send "exit\r"
expect eof

puts "\n=== Copiando backup para localhost ==="

# Copiar arquivo para localhost
spawn scp -o StrictHostKeyChecking=no ${user}@${server}:/tmp/chatblue_backup.dump /tmp/chatblue_backup.dump

expect {
    "password:" { send "${password}\r" }
    "yes/no" { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect eof

puts "\n=== Backup copiado com sucesso! ==="
puts "Arquivo salvo em: /tmp/chatblue_backup.dump"

