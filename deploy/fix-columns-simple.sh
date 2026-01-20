#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Corrigindo colunas ==="

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

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE ai_data_sources DROP COLUMN IF EXISTS sync_schedule;\"\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE ai_data_sources DROP COLUMN IF EXISTS sync_error;\"\r"
expect "# "

send "docker exec chatblue_postgres psql -U chatblue -d chatblue -c \"ALTER TABLE ai_data_sources DROP COLUMN IF EXISTS total_documents;\"\r"
expect "# "

send "pm2 restart chatblue-api && sleep 3 && pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Concluído! ==="
