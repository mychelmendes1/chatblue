#!/usr/bin/env python3
"""
Script para automatizar instalação remota do ChatBlue
"""
import subprocess
import sys
import os
import base64

SERVER = "84.247.191.105"
USER = "root"
PASSWORD = "fjykwePMThmj6nav"
INSTALL_SCRIPT = "deploy/install.sh"

def run_command(cmd):
    """Executa comando local"""
    print(f"Executando: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Erro: {result.stderr}")
        return False
    print(result.stdout)
    return True

def main():
    script_path = os.path.join(os.path.dirname(__file__), "..", INSTALL_SCRIPT)
    script_path = os.path.abspath(script_path)
    
    if not os.path.exists(script_path):
        print(f"Erro: Script não encontrado: {script_path}")
        sys.exit(1)
    
    # Ler o script
    with open(script_path, 'r') as f:
        script_content = f.read()
    
    # Codificar em base64 para facilitar transferência
    script_b64 = base64.b64encode(script_content.encode()).decode()
    
    # Criar comando SSH que decodifica e executa
    ssh_commands = f"""
cat > /tmp/chatblue-install.sh << 'EOF'
{script_content}
EOF
chmod +x /tmp/chatblue-install.sh
/tmp/chatblue-install.sh
"""
    
    # Usar sshpass para autenticação
    cmd = f"sshpass -p '{PASSWORD}' ssh -o StrictHostKeyChecking=no {USER}@{SERVER} '{ssh_commands.replace(chr(10), '; ')}'"
    
    print("Conectando ao servidor e executando instalação...")
    print("Isso pode levar alguns minutos...\n")
    
    # Executar em um subprocess com output em tempo real
    process = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # Mostrar output em tempo real
    for line in process.stdout:
        print(line, end='')
    
    process.wait()
    
    if process.returncode == 0:
        print("\n✅ Instalação concluída com sucesso!")
    else:
        print(f"\n❌ Erro na instalação (código: {process.returncode})")
        sys.exit(1)

if __name__ == "__main__":
    main()














