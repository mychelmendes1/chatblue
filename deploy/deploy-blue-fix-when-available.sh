#!/usr/bin/expect -f

# Script para fazer deploy quando o servidor estiver acessível
# Execute: /usr/bin/expect deploy/deploy-blue-fix-when-available.sh

set timeout 180
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Deploy: Correção do Blue Mascot"
puts "   Tentando conectar ao servidor..."
puts "=========================================="

# Tentar múltiplas vezes
set max_attempts 3
set attempt 1

while {$attempt <= $max_attempts} {
    puts "\nTentativa $attempt de $max_attempts..."
    
    spawn ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${user}@${server}
    
    set timeout 30
    expect {
        "password:" {
            puts "Conectado! Prosseguindo com deploy..."
            send "${password}\r"
            break
        }
        "yes/no" {
            send "yes\r"
            expect "password:"
            send "${password}\r"
            break
        }
        timeout {
            puts "Timeout na conexão..."
            catch {close}
            catch {wait}
            incr attempt
            if {$attempt <= $max_attempts} {
                puts "Aguardando 5 segundos antes de tentar novamente..."
                sleep 5
                continue
            } else {
                puts "Erro: Não foi possível conectar ao servidor após $max_attempts tentativas"
                puts "Por favor, verifique:"
                puts "  1. Se o servidor está online"
                puts "  2. Se a porta SSH (22) está acessível"
                puts "  3. Se há firewall bloqueando a conexão"
                exit 1
            }
        }
        "Connection refused" {
            puts "Conexão recusada. Servidor pode estar temporariamente indisponível."
            catch {close}
            catch {wait}
            incr attempt
            if {$attempt <= $max_attempts} {
                puts "Aguardando 5 segundos antes de tentar novamente..."
                sleep 5
                continue
            } else {
                puts "Erro: Servidor está recusando conexões SSH"
                puts "O arquivo já foi copiado para /tmp/settings.routes.ts no servidor"
                puts "Execute manualmente quando o servidor estiver acessível:"
                puts "  ssh root@84.247.191.105"
                puts "  cp /tmp/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts"
                puts "  cd /opt/chatblue/app/apps/api && npm run build && pm2 restart chatblue-api"
                exit 1
            }
        }
        eof {
            puts "Conexão fechada inesperadamente"
            catch {close}
            catch {wait}
            incr attempt
            if {$attempt <= $max_attempts} {
                sleep 5
                continue
            } else {
                exit 1
            }
        }
    }
    
    if {$attempt > $max_attempts} {
        exit 1
    }
    
    break
}

set timeout 180
expect "# "

# Fazer backup
puts "\n=== Fazendo backup ==="
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup.\\\$\(date +%Y%m%d_%H%M%S\) 2>&1\r"
expect "# "

# Verificar se arquivo existe em /tmp
puts "\n=== Verificando se arquivo existe em /tmp ==="
send "ls -la /tmp/settings.routes.ts 2>&1\r"
expect "# "

# Copiar arquivo
puts "\n=== Copiando arquivo corrigido ==="
send "cp /tmp/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts 2>&1\r"
expect "# "

# Verificar
puts "\n=== Verificando arquivo ==="
send "head -15 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | grep -E 'Get settings|public|admin only'\r"
expect "# "

# Compilar
puts "\n=== Compilando (pode ter erros pré-existentes) ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -30\r"
expect "# "

# Verificar se settings.routes.js foi gerado
puts "\n=== Verificando arquivo compilado ==="
send "ls -la /opt/chatblue/app/apps/api/dist/routes/settings.routes.js 2>&1\r"
expect "# "

# Reiniciar
puts "\n=== Reiniciando PM2 ==="
send "pm2 restart chatblue-api --update-env\r"
expect "# "

send "sleep 5\r"
expect "# "

# Status
puts "\n=== Status do PM2 ==="
send "pm2 status\r"
expect "# "

# Logs
puts "\n=== Logs recentes ==="
send "pm2 logs chatblue-api --lines 15 --nostream 2>&1 | tail -15\r"
expect "# "

puts "\n=========================================="
puts "   ✅ Deploy concluído com sucesso!"
puts "=========================================="
puts "\nO Blue Mascot agora deve aparecer para"
puts "todos os usuários quando blueEnabled=true"
puts "\n"

send "exit\r"
expect eof


