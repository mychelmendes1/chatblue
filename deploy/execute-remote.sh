#!/usr/bin/expect -f
# Script para transferir e executar instalação remota

set timeout 1800
set server "84.247.191.105"
set user "root"
set pass "fjykwePMThmj6nav"

# Obter caminho do script
set script_dir [file dirname [file normalize [info script]]]
set script_file "$script_dir/install.sh"

puts "Transferindo script de instalação..."

# Transferir arquivo via scp
spawn scp -o StrictHostKeyChecking=no $script_file ${user}@${server}:/tmp/chatblue-install.sh

expect {
    "password:" {
        send "${pass}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${pass}\r"
    }
}

expect {
    "100%" {
        puts "Transferência concluída"
    }
    timeout {
        puts "Timeout na transferência"
        exit 1
    }
    eof
}

puts "\nExecutando instalação no servidor..."
puts "Isso pode levar 10-15 minutos...\n"

# Conectar e executar
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${pass}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${pass}\r"
    }
}

expect "# "
send "chmod +x /tmp/chatblue-install.sh && /tmp/chatblue-install.sh\r"

# Esperar pela conclusão (timeout de 30 minutos)
expect {
    "PRÓXIMOS PASSOS:" {
        puts "\n✅ Instalação concluída com sucesso!"
        expect "# "
    }
    "# " {
        puts "\n✅ Comando executado. Verificando resultado..."
    }
    timeout {
        puts "\n⚠️  Timeout esperando instalação. Ela pode ainda estar em andamento."
        puts "Conecte manualmente ao servidor para verificar: ssh root@$server"
    }
}

send "echo 'Instalação finalizada' && exit\r"
expect eof

puts "\n✅ Processo concluído!"
puts "Conecte ao servidor para ver os próximos passos: ssh root@$server"

