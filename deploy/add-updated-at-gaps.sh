#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Adicionando updated_at na tabela ai_knowledge_gaps ==="

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

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE ai_knowledge_gaps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;\"\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"CREATE TRIGGER update_ai_knowledge_gaps_updated_at BEFORE UPDATE ON ai_knowledge_gaps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();\" 2>&1 | grep -v 'already exists' || true\r"
expect "# "

send "pm2 restart chatblue-api && sleep 3 && pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Coluna adicionada com sucesso! ==="
