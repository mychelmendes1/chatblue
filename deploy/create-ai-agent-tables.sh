#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Criando tabelas de AI Agent ==="

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
-- Create AIQueryStatus enum if not exists
DO \$\$ BEGIN
    CREATE TYPE \"AIQueryStatus\" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- Create ai_agent_configs table
CREATE TABLE IF NOT EXISTS ai_agent_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    temperature DOUBLE PRECISION DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1500,
    tone TEXT,
    style TEXT,
    rules JSONB DEFAULT '{}',
    trigger_keywords TEXT\[\] DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, category)
);

-- Create ai_agent_data_sources table
CREATE TABLE IF NOT EXISTS ai_agent_data_sources (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_config_id TEXT NOT NULL REFERENCES ai_agent_configs(id) ON DELETE CASCADE,
    data_source_id TEXT NOT NULL REFERENCES ai_data_sources(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_config_id, data_source_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_company ON ai_agent_configs(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_agent_data_sources_agent ON ai_agent_data_sources(agent_config_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_data_sources_data ON ai_agent_data_sources(data_source_id);

SELECT 'Tabelas criadas com sucesso!' as resultado;
EOF\r"

expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm prisma generate 2>&1 | tail -5\r"
expect "# "

send "pm2 restart chatblue-api && sleep 3 && pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Tabelas criadas! ==="
