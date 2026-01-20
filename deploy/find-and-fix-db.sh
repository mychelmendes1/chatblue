#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Descobrindo e corrigindo banco de dados ==="

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

send "echo '=== Verificando DATABASE_URL no .env ==='\r"
expect "# "

send "grep DATABASE_URL /opt/chatblue/app/apps/api/.env\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Verificando se PostgreSQL está rodando ==='\r"
expect "# "

send "systemctl status postgresql 2>&1 | head -10 || echo 'Não é systemd'\r"
expect "# "

send "ps aux | grep postgres | head -5\r"
expect "# "

send "docker ps -a | grep postgres\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando conexão via psql diretamente ==='\r"
expect "# "

send "PGPASSWORD=chatblue123 psql -h localhost -U chatblue -d chatblue -c '\\dt' 2>&1 | head -20\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Adicionando coluna instagram_id ==='\r"
expect "# "

send "PGPASSWORD=chatblue123 psql -h localhost -U chatblue -d chatblue -c \"ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(255);\" 2>&1\r"
expect "# "

send "PGPASSWORD=chatblue123 psql -h localhost -U chatblue -d chatblue -c \"ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lid_id VARCHAR(255);\" 2>&1\r"
expect "# "

send "echo '=== Verificando colunas adicionadas ==='\r"
expect "# "

send "PGPASSWORD=chatblue123 psql -h localhost -U chatblue -d chatblue -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'contacts' AND column_name IN ('instagram_id', 'lid_id');\" 2>&1\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "

send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

