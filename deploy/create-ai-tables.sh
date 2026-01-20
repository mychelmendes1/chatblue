#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Criando tabelas de AI no banco de dados ==="

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

# Create AI tables directly via psql
send "docker exec -i chatblue_postgres psql -U chatblue -d chatblue << 'EOF'\r"
expect ">"

send "
-- Create AIDataSourceType enum if not exists
DO \$\$ BEGIN
    CREATE TYPE \"AIDataSourceType\" AS ENUM ('NOTION', 'GOOGLE_DRIVE', 'CONFLUENCE', 'SHAREPOINT', 'ZENDESK', 'INTERCOM', 'CUSTOM_API', 'FILE_UPLOAD', 'WEB_CRAWL');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- Create ai_data_sources table
CREATE TABLE IF NOT EXISTS ai_data_sources (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    type \"AIDataSourceType\" NOT NULL,
    description TEXT,
    config JSONB DEFAULT '{}',
    category TEXT,
    tags TEXT\[\] DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    sync_enabled BOOLEAN DEFAULT false,
    sync_schedule TEXT,
    last_sync_at TIMESTAMP(3),
    sync_error TEXT,
    total_documents INTEGER DEFAULT 0,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_documents table
CREATE TABLE IF NOT EXISTS ai_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category TEXT,
    tags TEXT\[\] DEFAULT '{}',
    keywords TEXT\[\] DEFAULT '{}',
    external_id TEXT,
    external_url TEXT,
    checksum TEXT,
    embedding DOUBLE PRECISION\[\] DEFAULT '{}',
    embedding_model TEXT,
    is_indexed BOOLEAN DEFAULT false,
    index_error TEXT,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    relevance_score DOUBLE PRECISION DEFAULT 0,
    data_source_id TEXT REFERENCES ai_data_sources(id) ON DELETE SET NULL,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Create ai_knowledge_gaps table
CREATE TABLE IF NOT EXISTS ai_knowledge_gaps (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    topic TEXT NOT NULL,
    description TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    sample_queries TEXT\[\] DEFAULT '{}',
    suggested_category TEXT,
    suggested_data_source TEXT,
    status TEXT DEFAULT 'pending',
    resolved_at TIMESTAMP(3),
    resolved_by TEXT,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_documents_company ON ai_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_documents_data_source ON ai_documents(data_source_id);
CREATE INDEX IF NOT EXISTS idx_ai_documents_category ON ai_documents(category);
CREATE INDEX IF NOT EXISTS idx_ai_data_sources_company ON ai_data_sources(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_company ON ai_knowledge_gaps(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_status ON ai_knowledge_gaps(status);
EOF\r"

expect "# "

# Regenerate Prisma Client
send "cd /opt/chatblue/app/apps/api && pnpm prisma generate 2>&1 | tail -5\r"
expect "# "

# Restart API
send "pm2 restart chatblue-api\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof

puts "=== Tabelas de AI criadas com sucesso! ==="

