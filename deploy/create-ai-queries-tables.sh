#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Criando tabelas de AI Queries ==="

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
-- Create ai_assistant_queries table
CREATE TABLE IF NOT EXISTS ai_assistant_queries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    query TEXT NOT NULL,
    context TEXT,
    response TEXT NOT NULL,
    edited_response TEXT,
    detected_category TEXT,
    category_confidence DOUBLE PRECISION,
    status \"AIQueryStatus\" DEFAULT 'PROCESSING',
    processing_time INTEGER,
    tokens_input INTEGER,
    tokens_output INTEGER,
    embedding_time INTEGER,
    search_time INTEGER,
    was_used BOOLEAN DEFAULT false,
    was_edited BOOLEAN DEFAULT false,
    used_at TIMESTAMP(3),
    rating INTEGER,
    rating_comment TEXT,
    rated_at TIMESTAMP(3),
    has_knowledge_gap BOOLEAN DEFAULT false,
    gap_description TEXT,
    ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_config_id TEXT REFERENCES ai_agent_configs(id) ON DELETE SET NULL,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_query_sources table
CREATE TABLE IF NOT EXISTS ai_query_sources (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    query_id TEXT NOT NULL REFERENCES ai_assistant_queries(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
    relevance_score DOUBLE PRECISION NOT NULL,
    used_excerpt TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(query_id, document_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_assistant_queries_ticket ON ai_assistant_queries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_queries_user ON ai_assistant_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_queries_company ON ai_assistant_queries(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_queries_gap ON ai_assistant_queries(company_id, has_knowledge_gap);
CREATE INDEX IF NOT EXISTS idx_ai_query_sources_query ON ai_query_sources(query_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_sources_document ON ai_query_sources(document_id);

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
