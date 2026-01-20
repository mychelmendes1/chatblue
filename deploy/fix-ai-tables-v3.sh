#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Adicionando colunas faltantes nas tabelas de AI ==="

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

send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue << 'EOF'\r"
expect ">"

send "
-- Add missing columns to ai_data_sources
ALTER TABLE ai_data_sources ADD COLUMN IF NOT EXISTS sync_interval INTEGER DEFAULT 60;
ALTER TABLE ai_data_sources ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- Rename columns if needed
DO \\$\\$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_data_sources' AND column_name = 'sync_schedule') THEN
        ALTER TABLE ai_data_sources DROP COLUMN sync_schedule;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_data_sources' AND column_name = 'sync_error') THEN
        ALTER TABLE ai_data_sources RENAME COLUMN sync_error TO last_sync_error;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_data_sources' AND column_name = 'total_documents') THEN
        ALTER TABLE ai_data_sources DROP COLUMN total_documents;
    END IF;
END \\$\\$;

SELECT 'Colunas adicionadas com sucesso!' as resultado;
EOF\r"

expect "# "

# Regenerate Prisma Client
send "cd /opt/chatblue/app/apps/api && pnpm prisma generate 2>&1 | tail -5\r"
expect "# "

# Restart API
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 3 && pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Colunas corrigidas com sucesso! ==="
