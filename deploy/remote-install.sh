#!/usr/bin/expect -f
# Script para executar instalação remota via SSH
# Uso: ./remote-install.sh

set timeout 600
set server "84.247.191.105"
set user "root"
set pass "fjykwePMThmj6nav"

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

# Enviar o script de instalação via heredoc
send "bash << 'INSTALLSCRIPT'\r"
send "set -e\r"
send "echo '=========================================='\r"
send "echo '  ChatBlue - Limpeza e Instalação'\r"
send "echo '=========================================='\r"
send "echo ''\r"

# ... (o script completo seria muito longo para expect)
# Em vez disso, vou fazer upload do arquivo primeiro

expect "# "

# Criar arquivo no servidor usando cat e heredoc
send "cat > /tmp/chatblue-install.sh << 'ENDOFFILE'\r"

# Ler o conteúdo do install.sh e enviar linha por linha
set install_script [open "deploy/install.sh" r]
set script_content [read $install_script]
close $install_script

# Enviar o conteúdo
send "$script_content\r"
send "ENDOFFILE\r"

expect "# "
send "chmod +x /tmp/chatblue-install.sh\r"
expect "# "
send "/tmp/chatblue-install.sh\r"

expect {
    "PRÓXIMOS PASSOS:" {
        send_user "\n✅ Instalação concluída!\n"
    }
    timeout {
        send_user "\n⏱️  Instalação demorando mais que o esperado...\n"
    }
}

expect "# "
send "exit\r"
expect eof







