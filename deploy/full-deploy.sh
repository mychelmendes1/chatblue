#!/usr/bin/expect -f

set timeout 900
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=== Deploy completo do localhost para o servidor ==="
puts ""

# SSH e executar comandos
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

send "echo '=== Backup dos arquivos atuais ==='\r"
expect "# "

send "cd /opt/chatblue/app && BACKUP_DIR=\"backup_\$(date +%%Y%%m%%d_%%H%%M%%S)\" && mkdir -p \"\$BACKUP_DIR\" && cp -r apps \"\$BACKUP_DIR\" 2>/dev/null || true\r"
expect "# "

send "exit\r"
expect eof

puts "=== Copiando arquivos da API ==="
puts ""

# Copiar API src via tar
spawn sh -c "cd /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/api && tar czf - src prisma package.json tsconfig.json | ssh -o StrictHostKeyChecking=no ${user}@${server} 'cd /opt/chatblue/app/apps/api && tar xzf -'"

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

puts ""
puts "=== Copiando arquivos do Web ==="
puts ""

# Copiar Web via tar (excluindo node_modules e .next)
spawn sh -c "cd /Users/mychel/Downloads/Projetos/chatblue/chatblue/apps/web && tar czf - --exclude='node_modules' --exclude='.next' app components lib public stores hooks utils types package.json next.config.js tsconfig.json 2>/dev/null | ssh -o StrictHostKeyChecking=no ${user}@${server} 'cd /opt/chatblue/app/apps/web && tar xzf -'"

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

puts ""
puts "=== Compilando e reiniciando no servidor ==="
puts ""

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

send "echo '=== Atualizando dependências da API ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm install 2>&1 | tail -20\r"
expect "# "

send "echo '=== Compilando API ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/api && pnpm run build 2>&1 | tail -60\r"
expect "# "

send "echo '=== Atualizando dependências do Web ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/web && pnpm install 2>&1 | tail -20\r"
expect "# "

send "echo '=== Compilando Web ==='\r"
expect "# "

send "cd /opt/chatblue/app/apps/web && pnpm run build 2>&1 | tail -60\r"
expect "# "

send "echo '=== Reiniciando serviços ==='\r"
expect "# "

send "pm2 restart chatblue-api chatblue-web\r"
expect "# "

send "sleep 5\r"
expect "# "

send "echo '=== Status dos serviços ==='\r"
expect "# "

send "pm2 status\r"
expect "# "

send "echo ''\r"
expect "# "

send "echo '=== Testando API ==='\r"
expect "# "

send "curl -s http://localhost:3001/health 2>&1\r"
expect "# "

send "echo ''\r"
expect "# "

send "pm2 logs chatblue-api --err --lines 5 --nostream | tail -5\r"
expect "# "

send "exit\r"
expect eof

puts ""
puts "=== Deploy concluído! ==="
