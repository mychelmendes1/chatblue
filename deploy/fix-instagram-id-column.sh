#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Adicionando coluna instagram_id diretamente ==="

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

send "echo '=== Verificando colunas atuais na tabela contacts ==='\r"
expect "# "

send "docker exec chatblue-postgres psql -U chatblue -d chatblue -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contacts' ORDER BY ordinal_position;\" 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Adicionando colunas instagram_id e lid_id se não existirem ==='\r"
expect "# "

send "docker exec chatblue-postgres psql -U chatblue -d chatblue -c \"ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(255);\" 2>&1\r"
expect "# "

send "docker exec chatblue-postgres psql -U chatblue -d chatblue -c \"ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lid_id VARCHAR(255);\" 2>&1\r"
expect "# "

send "echo '=== Verificando se colunas foram criadas ==='\r"
expect "# "

send "docker exec chatblue-postgres psql -U chatblue -d chatblue -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'contacts' AND column_name IN ('instagram_id', 'lid_id');\" 2>&1\r"
expect "# "

send "echo '=== Regenerando Prisma e reiniciando API ==='\r"
expect "# "

send "pm2 stop chatblue-api\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && npx prisma@5.22.0 generate 2>&1 | tail -10\r"
expect "# "

send "pm2 start chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

