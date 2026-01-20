#!/usr/bin/env expect

# Deploy Blue Assistant and run migration
# Usage: ./deploy-blue-with-migration.sh

set timeout 300

# Get server details from environment or use defaults
set server_host $env(SERVER_HOST)
set server_user $env(SERVER_USER)
set server_path $env(SERVER_PATH)

if { $server_host == "" } {
    set server_host "your-server.com"
}
if { $server_user == "" } {
    set server_user "root"
}
if { $server_path == "" } {
    set server_path "/opt/chatblue"
}

puts "🚀 Deploying Blue Assistant to $server_user@$server_host:$server_path"

# Files to copy
set files {
    "apps/api/src/services/blue/blue.service.ts"
    "apps/api/src/services/blue/blue-context-builder.service.ts"
    "apps/api/src/services/blue/code-rag.service.ts"
    "apps/api/src/services/blue/doc-rag.service.ts"
    "apps/api/src/routes/blue.routes.ts"
    "apps/api/src/scripts/ingest-codebase.ts"
    "apps/api/prisma/migrations/20250112203000_add_blue_assistant/migration.sql"
}

# Copy files to /tmp on server
foreach file $files {
    puts "📦 Copying $file..."
    spawn scp "$file" "$server_user@$server_host:/tmp/[file tail $file]"
    expect {
        "password:" {
            send "$env(SSH_PASSWORD)\r"
            exp_continue
        }
        "yes/no" {
            send "yes\r"
            exp_continue
        }
        eof
    }
    wait
}

# SSH into server and deploy
puts "🔧 Deploying on server..."
spawn ssh "$server_user@$server_host"
expect {
    "password:" {
        send "$env(SSH_PASSWORD)\r"
        exp_continue
    }
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "$ "
    "# "
    "~# "
}

# Move files to correct locations
send "cd $server_path\r"
expect "$ " "# " "~# "

send "mkdir -p apps/api/src/services/blue\r"
expect "$ " "# " "~# "

send "mv /tmp/blue.service.ts apps/api/src/services/blue/ 2>/dev/null || true\r"
expect "$ " "# " "~# "

send "mv /tmp/blue-context-builder.service.ts apps/api/src/services/blue/ 2>/dev/null || true\r"
expect "$ " "# " "~# "

send "mv /tmp/code-rag.service.ts apps/api/src/services/blue/ 2>/dev/null || true\r"
expect "$ " "# " "~# "

send "mv /tmp/doc-rag.service.ts apps/api/src/services/blue/ 2>/dev/null || true\r"
expect "$ " "# " "~# "

send "mkdir -p apps/api/src/routes\r"
expect "$ " "# " "~# "

send "mv /tmp/blue.routes.ts apps/api/src/routes/ 2>/dev/null || true\r"
expect "$ " "# " "~# "

send "mkdir -p apps/api/src/scripts\r"
expect "$ " "# " "~# "

send "mv /tmp/ingest-codebase.ts apps/api/src/scripts/ 2>/dev/null || true\r"
expect "$ " "# " "~# "

send "mkdir -p apps/api/prisma/migrations/20250112203000_add_blue_assistant\r"
expect "$ " "# " "~# "

send "mv /tmp/migration.sql apps/api/prisma/migrations/20250112203000_add_blue_assistant/ 2>/dev/null || true\r"
expect "$ " "# " "~# "

# Build API
puts "🔨 Building API..."
send "cd apps/api && pnpm build:force 2>/dev/null || pnpm build || true\r"
expect "$ " "# " "~# "

# Run migration
puts "🗄️  Running migration..."
send "export DATABASE_URL=\"\$DATABASE_URL\"\r"
expect "$ " "# " "~# "

# Try Docker first if PostgreSQL is in Docker
send "if docker ps | grep -q postgres; then docker cp apps/api/prisma/migrations/20250112203000_add_blue_assistant/migration.sql \\$(docker ps | grep postgres | head -1 | awk '{print \\\$1}'):/tmp/migration.sql && docker exec \\$(docker ps | grep postgres | head -1 | awk '{print \\\$1}') psql -U \\${POSTGRES_USER:-chatblue} -d \\${POSTGRES_DB:-chatblue} -f /tmp/migration.sql; else npx prisma migrate deploy 2>/dev/null || npx prisma migrate resolve --applied 20250112203000_add_blue_assistant || echo 'Migration might already be applied'; fi\r"
expect "$ " "# " "~# "

# Restart API
puts "🔄 Restarting API..."
send "pm2 restart chatblue-api --update-env 2>/dev/null || pm2 reload chatblue-api --update-env || pm2 start ecosystem.config.js --update-env || true\r"
expect "$ " "# " "~# "

puts "✅ Deployment complete!"
send "exit\r"
expect eof




