# Status da Instalação do ChatBlue

## ✅ Etapas Concluídas

1. **Conexão SSH estabelecida** ✅
2. **Script transferido para o servidor** ✅
3. **Limpeza do sistema iniciada** ✅
   - Serviços antigos parados
   - Containers Docker removidos
   - Diretórios antigos limpos
4. **Atualização do sistema em andamento** ⏳

## 📋 Processo de Instalação

O script `install.sh` está executando as seguintes etapas:

1. ✅ Limpeza do sistema
2. ⏳ Atualização do sistema (apt update/upgrade)
3. ⏳ Instalação de dependências (curl, git, nginx, etc)
4. ⏳ Instalação do Docker
5. ⏳ Instalação do Node.js e pnpm
6. ⏳ Criação da estrutura de diretórios
7. ⏳ Configuração do firewall (UFW)
8. ⏳ Configuração do Fail2Ban
9. ⏳ Configuração do Nginx
10. ⏳ Criação do docker-compose.yml
11. ⏳ Criação do .env.example
12. ⏳ Criação do ecosystem.config.js (PM2)
13. ⏳ Criação do script de deploy

## ⏱️ Tempo Estimado

A instalação completa leva aproximadamente **10-15 minutos**, dependendo da velocidade de download e processamento do servidor.

## 🔍 Verificar Status

Para verificar o progresso da instalação, conecte ao servidor:

```bash
ssh root@84.247.191.105
```

E execute:

```bash
tail -f /var/log/syslog
# ou
ps aux | grep chatblue-install
```

## 📝 Próximos Passos (Após Instalação)

Após a instalação automática concluir, você precisará:

1. **Configurar o arquivo .env:**
   ```bash
   cp /opt/chatblue/.env.example /opt/chatblue/.env
   nano /opt/chatblue/.env
   ```

2. **Configurar seu domínio no Nginx:**
   ```bash
   nano /etc/nginx/sites-available/chatblue
   # Substitua SEU_DOMINIO.com pelo seu domínio real
   nginx -t && systemctl reload nginx
   ```

3. **Configurar SSL (após configurar DNS):**
   ```bash
   certbot --nginx -d seudominio.com -d api.seudominio.com
   ```

4. **Iniciar os containers:**
   ```bash
   cd /opt/chatblue
   docker-compose up -d
   ```

5. **Clonar o repositório e fazer deploy:**
   ```bash
   cd /opt/chatblue/app
   git clone SEU_REPOSITORIO_GIT .
   pnpm install
   cd apps/api
   pnpm prisma migrate deploy
   cd ../..
   pnpm build
   pm2 start /opt/chatblue/ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## 🔒 IMPORTANTE - Segurança

⚠️ **TROQUE A SENHA DO ROOT IMEDIATAMENTE APÓS A INSTALAÇÃO:**

```bash
ssh root@84.247.191.105
passwd root
```

A senha atual foi compartilhada em texto plano e precisa ser alterada!

## 📊 Estrutura Criada

```
/opt/chatblue/
├── app/                    # Código da aplicação (você precisa clonar)
├── data/
│   ├── postgres/          # Dados do PostgreSQL
│   ├── redis/             # Dados do Redis
│   ├── uploads/           # Arquivos enviados
│   └── whatsapp-sessions/ # Sessões do WhatsApp
├── logs/                   # Logs da aplicação
├── backups/               # Backups
├── .env                   # Variáveis de ambiente (criar a partir do .env.example)
├── docker-compose.yml     # Containers Docker
└── ecosystem.config.js    # Configuração PM2
```

## 🆘 Troubleshooting

Se a instalação falhar ou travar:

1. Conecte via SSH
2. Verifique os logs: `journalctl -xe`
3. Execute manualmente: `/tmp/chatblue-install.sh`
4. Verifique se há processos rodando: `ps aux | grep install`



