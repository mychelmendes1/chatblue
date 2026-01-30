#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_base "/Users/mychel/Downloads/Projetos/chatblue/chatblue"

# Copy SQL file
spawn scp -o StrictHostKeyChecking=no \
    ${local_base}/apps/api/prisma/migrations/create_notifications_table.sql \
    ${user}@${server}:/tmp/

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

expect eof

# SSH and apply SQL
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
send "cd /opt/chatblue/app/apps/api\r"
expect "# "

send "echo '=== Verificando variáveis de ambiente do banco ==='\r"
expect "# "
send "grep DATABASE_URL .env | head -1\r"
expect "# "

send "echo '=== Aplicando SQL da tabela de notificações ==='\r"
expect "# "
send "export PGPASSWORD=\$(grep DATABASE_URL .env | cut -d'@' -f1 | cut -d':' -f3 | cut -d'/' -f1)\r"
expect "# "
send "export DB_HOST=\$(grep DATABASE_URL .env | cut -d'@' -f2 | cut -d':' -f1)\r"
expect "# "
send "export DB_PORT=\$(grep DATABASE_URL .env | cut -d'@' -f2 | cut -d':' -f2 | cut -d'/' -f1)\r"
expect "# "
send "export DB_NAME=\$(grep DATABASE_URL .env | cut -d'/' -f4 | cut -d'?' -f1)\r"
expect "# "
send "export DB_USER=\$(grep DATABASE_URL .env | cut -d'/' -f3 | cut -d':' -f1)\r"
expect "# "

send "echo 'Host: '\$DB_HOST', Port: '\$DB_PORT', DB: '\$DB_NAME', User: '\$DB_USER\r"
expect "# "

send "if [ -z \"\$DB_HOST\" ] || [ \"\$DB_HOST\" = \"localhost\" ]; then\r"
expect "# "
send "  echo 'Tentando conectar via Docker...'\r"
expect "# "
send "  docker exec -i chatblue-db psql -U chatblue -d chatblue < /tmp/create_notifications_table.sql 2>&1 || docker exec -i chatblue-postgres psql -U chatblue -d chatblue < /tmp/create_notifications_table.sql 2>&1 || echo 'Container não encontrado, tentando conexão direta...'\r"
expect "# "
send "else\r"
expect "# "
send "  echo 'Aplicando SQL diretamente no banco...'\r"
expect "# "
send "  psql -h \$DB_HOST -p \${DB_PORT:-5432} -U \$DB_USER -d \$DB_NAME -f /tmp/create_notifications_table.sql 2>&1\r"
expect "# "
send "fi\r"
expect "# "

send "echo '=== Verificando se a tabela foi criada ==='\r"
expect "# "
send "if [ -z \"\$DB_HOST\" ] || [ \"\$DB_HOST\" = \"localhost\" ]; then\r"
expect "# "
send "  docker exec -i chatblue-db psql -U chatblue -d chatblue -c 'SELECT COUNT(*) FROM notifications;' 2>&1 || docker exec -i chatblue-postgres psql -U chatblue -d chatblue -c 'SELECT COUNT(*) FROM notifications;' 2>&1\r"
expect "# "
send "else\r"
expect "# "
send "  psql -h \$DB_HOST -p \${DB_PORT:-5432} -U \$DB_USER -d \$DB_NAME -c 'SELECT COUNT(*) FROM notifications;' 2>&1\r"
expect "# "
send "fi\r"
expect "# "

send "echo '=== Reiniciando API para aplicar mudanças ==='\r"
expect "# "
send "pm2 reload chatblue-api --update-env\r"
expect "# "

send "sleep 3\r"
expect "# "

send "pm2 status\r"
expect "# "

send "exit\r"
expect eof








