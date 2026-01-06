# ChatBlue - Deploy em Produção

## 📋 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX                                    │
│              (Reverse Proxy + SSL + Load Balancer)              │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │ seudominio.com      │    │ api.seudominio.com  │            │
│  │ (porta 443)         │    │ (porta 443)         │            │
│  └─────────────────────┘    └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
              │                          │
              ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│     NEXT.JS          │    │           EXPRESS API            │
│   (Frontend Web)     │    │         + Socket.io              │
│                      │    │                                  │
│   PM2 Cluster        │    │   PM2 Cluster (max CPUs)        │
│   porta 3000         │    │   porta 3001                    │
└──────────────────────┘    └──────────────────────────────────┘
                                        │
                      ┌─────────────────┼─────────────────┐
                      ▼                 ▼                 ▼
              ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
              │  PostgreSQL  │ │    Redis     │ │   WhatsApp   │
              │   (Docker)   │ │   (Docker)   │ │   Baileys    │
              │   porta 5432 │ │  porta 6379  │ │              │
              └──────────────┘ └──────────────┘ └──────────────┘
                      │                 │               │
              ┌───────┴─────────────────┴───────────────┴─────┐
              │            /opt/chatblue/data/                │
              │   postgres/   redis/   uploads/   sessions/   │
              └───────────────────────────────────────────────┘
```

## 🚀 Instalação Rápida

### 1. Conectar no servidor via SSH
```bash
ssh root@SEU_IP
```

### 2. Baixar e executar o script de setup
```bash
curl -O https://raw.githubusercontent.com/seu-repo/chatblue/main/deploy/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

### 3. Configurar domínio no Nginx
```bash
nano /etc/nginx/sites-available/chatblue
# Substitua SEU_DOMINIO.com pelo seu domínio real
nginx -t && systemctl reload nginx
```

### 4. Configurar SSL
```bash
certbot --nginx -d seudominio.com -d api.seudominio.com
```

### 5. Configurar variáveis de ambiente
```bash
cp /opt/chatblue/.env.example /opt/chatblue/.env
nano /opt/chatblue/.env
```

### 6. Iniciar banco de dados
```bash
cd /opt/chatblue
docker-compose up -d
```

### 7. Clonar e buildar o projeto
```bash
cd /opt/chatblue/app
git clone https://github.com/seu-repo/chatblue.git .
pnpm install
cd apps/api
pnpm prisma migrate deploy
cd ../..
pnpm build
```

### 8. Iniciar com PM2
```bash
cp deploy/ecosystem.config.js /opt/chatblue/
cd /opt/chatblue
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📁 Estrutura de Diretórios

```
/opt/chatblue/
├── app/                    # Código fonte da aplicação
│   ├── apps/
│   │   ├── api/           # Backend Express
│   │   └── web/           # Frontend Next.js
│   └── packages/          # Pacotes compartilhados
├── data/
│   ├── postgres/          # Dados do PostgreSQL
│   ├── redis/             # Dados do Redis
│   ├── uploads/           # Arquivos enviados
│   └── whatsapp-sessions/ # Sessões do WhatsApp
├── logs/                   # Logs da aplicação
├── backups/               # Backups do banco
├── .env                   # Variáveis de ambiente
├── docker-compose.yml     # Containers
└── ecosystem.config.js    # Configuração PM2
```

## 🔧 Comandos Úteis

### PM2
```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs

# Reiniciar todos
pm2 reload all

# Reiniciar API
pm2 reload chatblue-api

# Monitoramento
pm2 monit
```

### Docker
```bash
# Ver containers
docker ps

# Ver logs do Postgres
docker logs chatblue_postgres

# Acessar banco
docker exec -it chatblue_postgres psql -U chatblue
```

### Deploy
```bash
cd /opt/chatblue/app
./deploy/deploy.sh
```

## 🔒 Segurança

### Firewall (UFW)
```bash
# Ver status
ufw status

# Portas abertas:
# - 22 (SSH)
# - 80 (HTTP - redirect para HTTPS)
# - 443 (HTTPS)
```

### Fail2Ban
```bash
# Ver status
fail2ban-client status

# Ver IPs banidos
fail2ban-client status sshd
```

### Trocar senha do servidor
```bash
passwd root
```

## 📊 Monitoramento

### Verificar saúde
```bash
# API
curl http://localhost:3001/health

# Web
curl -I http://localhost:3000
```

### Uso de recursos
```bash
htop
docker stats
```

## 🔄 Backup

### Manual
```bash
# Backup do banco
docker exec chatblue_postgres pg_dump -U chatblue chatblue > backup.sql

# Backup dos uploads
tar -czf uploads-backup.tar.gz /opt/chatblue/data/uploads
```

### Automático (Cron)
```bash
# Adicionar ao cron (executa diariamente às 3h)
crontab -e

# Adicionar linha:
0 3 * * * /opt/chatblue/app/deploy/backup.sh
```

## ⚠️ Troubleshooting

### API não inicia
```bash
# Ver logs
pm2 logs chatblue-api --lines 100

# Verificar variáveis
cat /opt/chatblue/.env

# Verificar banco
docker logs chatblue_postgres
```

### WebSocket não conecta
```bash
# Verificar Nginx
nginx -t
tail -f /var/log/nginx/error.log

# Verificar se porta está aberta
netstat -tlnp | grep 3001
```

### Problemas com WhatsApp
```bash
# Ver logs do Baileys
pm2 logs chatblue-api --lines 100 | grep -i whatsapp

# Limpar sessão (reconectar)
rm -rf /opt/chatblue/data/whatsapp-sessions/*
pm2 reload chatblue-api
```

## 📞 Suporte

- Documentação: [link]
- Issues: [link]
- Email: suporte@chatblue.com







