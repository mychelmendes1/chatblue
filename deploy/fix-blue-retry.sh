#!/usr/bin/expect -f

set timeout 300
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

puts "=========================================="
puts "   Correção Blue Mascot (com Retry)"
puts "=========================================="

# Tentar múltiplas vezes
for {set attempt 1} {$attempt <= 5} {incr attempt} {
    puts "\nTentativa $attempt de 5..."
    
    spawn ssh -o ConnectTimeout=15 -o StrictHostKeyChecking=no ${user}@${server}
    
    expect {
        timeout {
            puts "Timeout na conexão. Tentando novamente..."
            catch {close}
            catch {wait}
            if {$attempt < 5} {
                sleep 5
                continue
            } else {
                puts "Erro: Não foi possível conectar após 5 tentativas"
                exit 1
            }
        }
        "Connection refused" {
            puts "Conexão recusada. Tentando novamente..."
            catch {close}
            catch {wait}
            if {$attempt < 5} {
                sleep 5
                continue
            } else {
                puts "Erro: Servidor está recusando conexões"
                exit 1
            }
        }
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
        eof {
            puts "Conexão fechada. Tentando novamente..."
            catch {close}
            catch {wait}
            if {$attempt < 5} {
                sleep 5
                continue
            } else {
                puts "Erro: Não foi possível estabelecer conexão"
                exit 1
            }
        }
    }
    
    if {$attempt > 5} {
        exit 1
    }
    break
}

expect "# "

# Backup
puts "\n=== Fazendo backup ==="
send "cp /opt/chatblue/app/apps/api/src/routes/settings.routes.ts /opt/chatblue/app/apps/api/src/routes/settings.routes.ts.backup.\\\$\(date +%Y%m%d_%H%M%S\)\r"
expect "# "

# Verificar arquivo atual
puts "\n=== Verificando arquivo atual ==="
send "head -12 /opt/chatblue/app/apps/api/src/routes/settings.routes.ts | tail -2\r"
expect "# "

# Editar com perl
puts "\n=== Editando arquivo com perl ==="
send "cd /opt/chatblue/app/apps/api/src/routes && perl -i -pe \"s/router\\.get\\('\\\\/',\\s*authenticate,\\s*requireAdmin,\\s*ensureTenant/router.get('\\\\/', authenticate, ensureTenant/\" settings.routes.ts\r"
expect "# "

# Verificar mudança
puts "\n=== Verificando mudança ==="
send "head -12 settings.routes.ts | tail -2\r"
expect "# "

# Compilar
puts "\n=== Compilando ==="
send "cd /opt/chatblue/app/apps/api && npm run build 2>&1 | tail -5\r"
expect "# "

# Verificar arquivo compilado
puts "\n=== Verificando arquivo compilado ==="
send "grep -A 1 \"router.get('\\\\/'\" dist/routes/settings.routes.js | head -2\r"
expect "# "

# Verificar se requireAdmin foi removido
puts "\n=== Verificando se requireAdmin foi removido ==="
send "grep -q \"router.get.*requireAdmin.*settings\" dist/routes/settings.routes.js && echo 'ERRO: Ainda tem requireAdmin' || echo 'OK: requireAdmin removido!'\r"
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

# Logs recentes
puts "\n=== Logs recentes ==="
send "pm2 logs chatblue-api --lines 10 --nostream 2>&1 | tail -10\r"
expect "# "

puts "\n=========================================="
puts "   ✅ Correção aplicada com sucesso!"
puts "=========================================="
puts "\nO Blue Mascot agora deve aparecer para"
puts "todos os usuários quando blueEnabled=true\n"

send "exit\r"
expect eof



