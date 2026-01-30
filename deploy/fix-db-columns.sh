#!/usr/bin/expect -f

set timeout 120
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
send "echo '=== Adicionando colunas faltantes no banco ==='\r"
expect "# "

# Adicionar coluna metadata em messages se não existir
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';\" 2>&1\r"
expect "# "

# Adicionar coluna failed_reason em messages se não existir
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE messages ADD COLUMN IF NOT EXISTS failed_reason TEXT;\" 2>&1\r"
expect "# "

# Adicionar coluna last_message_at em contacts se não existir
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP;\" 2>&1\r"
expect "# "

send "echo '=== Verificando colunas ==='\r"
expect "# "
send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' AND column_name IN ('metadata', 'failed_reason');\" 2>&1\r"
expect "# "

send "echo '=== Reiniciando API ==='\r"
expect "# "
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 5\r"
expect "# "

send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

send "exit\r"
expect eof












