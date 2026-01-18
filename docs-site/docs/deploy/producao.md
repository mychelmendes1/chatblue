---
sidebar_position: 1
title: Deploy em Producao
description: Guia completo para deploy do ChatBlue em ambiente de producao
---

# Deploy em Producao

Este guia detalha o processo completo de deploy do ChatBlue em um servidor de producao Linux.

## Pre-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- Servidor Linux (Ubuntu 22.04 LTS recomendado)
- Acesso root ou usuario com privilegios sudo
- Dominio configurado apontando para o IP do servidor
- Portas 80, 443, 3000 e 3001 liberadas no firewall

## Preparacao do Servidor

### Atualizacao do Sistema

```bash
# Atualizar lista de pacotes
sudo apt update

# Atualizar pacotes instalados
sudo apt upgrade -y

# Instalar dependencias basicas
sudo apt install -y curl wget git build-essential
```

### Configuracao de Firewall

```bash
# Instalar UFW (se nao estiver instalado)
sudo apt install -y ufw

# Configurar regras basicas
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ativar firewall
sudo ufw enable

# Verificar status
sudo ufw status verbose
```

### Criar Usuario da Aplicacao

```bash
# Criar usuario dedicado para a aplicacao
sudo adduser --system --group --home /home/chatblue chatblue

# Adicionar usuario ao grupo sudo (se necessario)
sudo usermod -aG sudo chatblue
```

## Instalacao do Node.js

### Usando NVM (Recomendado)

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Carregar NVM
source ~/.bashrc

# Instalar Node.js LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verificar instalacao
node --version
npm --version
```

### Usando NodeSource

```bash
# Adicionar repositorio NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalacao
node --version
npm --version
```

### Instalar pnpm

```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Verificar instalacao
pnpm --version
```

## Instalacao do PostgreSQL

### Instalar PostgreSQL 16

```bash
# Adicionar repositorio oficial PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Importar chave GPG
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Atualizar lista de pacotes
sudo apt update

# Instalar PostgreSQL
sudo apt install -y postgresql-16 postgresql-contrib-16

# Iniciar e habilitar servico
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Configurar Banco de Dados

```bash
# Acessar como usuario postgres
sudo -u postgres psql

# Criar usuario da aplicacao
CREATE USER chatblue WITH PASSWORD 'sua_senha_segura_aqui';

# Criar banco de dados
CREATE DATABASE chatblue_production OWNER chatblue;

# Conceder privilegios
GRANT ALL PRIVILEGES ON DATABASE chatblue_production TO chatblue;

# Sair do psql
\q
```

### Configurar Acesso Remoto (Opcional)

```bash
# Editar postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Alterar linha:
listen_addresses = 'localhost'  # ou '*' para acesso remoto

# Editar pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Adicionar linha para acesso remoto (se necessario):
# host    all    all    0.0.0.0/0    md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

## Instalacao do Redis

```bash
# Instalar Redis
sudo apt install -y redis-server

# Configurar Redis
sudo nano /etc/redis/redis.conf

# Alterar configuracoes recomendadas:
# supervised systemd
# maxmemory 256mb
# maxmemory-policy allkeys-lru

# Iniciar e habilitar servico
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar status
sudo systemctl status redis-server

# Testar conexao
redis-cli ping
# Deve retornar: PONG
```

### Configurar Senha no Redis

```bash
# Editar configuracao
sudo nano /etc/redis/redis.conf

# Descomentar e definir senha:
requirepass sua_senha_redis_segura

# Reiniciar Redis
sudo systemctl restart redis-server

# Testar com senha
redis-cli -a sua_senha_redis_segura ping
```

## Clone e Configuracao da Aplicacao

### Clonar Repositorio

```bash
# Navegar para diretorio de aplicacoes
cd /var/www

# Clonar repositorio
sudo git clone https://github.com/sua-org/chatblue.git

# Ajustar permissoes
sudo chown -R chatblue:chatblue /var/www/chatblue
```

### Configurar Variaveis de Ambiente

```bash
# Navegar para o diretorio da aplicacao
cd /var/www/chatblue

# Criar arquivo .env para o backend
cp apps/api/.env.example apps/api/.env

# Editar variaveis de ambiente
nano apps/api/.env
```

Conteudo do arquivo `.env` para producao:

```env
# Ambiente
NODE_ENV=production

# Servidor
PORT=3001
HOST=0.0.0.0

# Banco de Dados
DATABASE_URL="postgresql://chatblue:sua_senha@localhost:5432/chatblue_production?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua_senha_redis

# JWT
JWT_SECRET=sua_chave_jwt_muito_segura_com_pelo_menos_32_caracteres
JWT_REFRESH_SECRET=outra_chave_jwt_muito_segura_para_refresh

# URLs
FRONTEND_URL=https://seu-dominio.com.br
BACKEND_URL=https://api.seu-dominio.com.br

# WhatsApp (Baileys)
WHATSAPP_SESSION_PATH=/var/www/chatblue/sessions

# OpenAI (Opcional)
OPENAI_API_KEY=sk-...

# Anthropic (Opcional)
ANTHROPIC_API_KEY=sk-ant-...

# Logs
LOG_LEVEL=info
LOG_FORMAT=json
```

```bash
# Criar arquivo .env para o frontend
cp apps/web/.env.example apps/web/.env
nano apps/web/.env
```

```env
# URLs da API
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com.br
NEXT_PUBLIC_WS_URL=wss://api.seu-dominio.com.br

# Analytics (Opcional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Instalar Dependencias

```bash
# Navegar para o diretorio da aplicacao
cd /var/www/chatblue

# Instalar dependencias
pnpm install --frozen-lockfile

# Gerar cliente Prisma
pnpm --filter api prisma generate
```

### Executar Migrations

```bash
# Executar migrations do banco
pnpm --filter api prisma migrate deploy

# (Opcional) Seed do banco com dados iniciais
pnpm --filter api prisma db seed
```

### Build da Aplicacao

```bash
# Build de todos os pacotes
pnpm build

# Ou build individual:
# Backend
pnpm --filter api build

# Frontend
pnpm --filter web build
```

## Configuracao de Diretorios

### Criar Diretorios Necessarios

```bash
# Diretorio para sessoes WhatsApp
sudo mkdir -p /var/www/chatblue/sessions
sudo chown -R chatblue:chatblue /var/www/chatblue/sessions

# Diretorio para logs
sudo mkdir -p /var/log/chatblue
sudo chown -R chatblue:chatblue /var/log/chatblue

# Diretorio para uploads
sudo mkdir -p /var/www/chatblue/uploads
sudo chown -R chatblue:chatblue /var/www/chatblue/uploads
```

### Configurar Permissoes

```bash
# Definir permissoes corretas
sudo chmod -R 755 /var/www/chatblue
sudo chmod -R 700 /var/www/chatblue/sessions
sudo chmod 600 /var/www/chatblue/apps/api/.env
sudo chmod 600 /var/www/chatblue/apps/web/.env
```

## Verificacao da Instalacao

### Testar Backend

```bash
# Navegar para o diretorio
cd /var/www/chatblue

# Iniciar backend em modo teste
NODE_ENV=production node apps/api/dist/index.js

# Em outro terminal, testar endpoint
curl http://localhost:3001/health
# Deve retornar: {"status":"ok"}
```

### Testar Frontend

```bash
# Iniciar frontend em modo teste
cd /var/www/chatblue/apps/web
NODE_ENV=production pnpm start

# Em outro terminal, testar
curl http://localhost:3000
```

## Proximos Passos

Apos concluir a instalacao base, continue com:

1. [Configurar Nginx como Reverse Proxy](/deploy/nginx)
2. [Configurar SSL com Let's Encrypt](/deploy/ssl)
3. [Configurar PM2 para Gerenciamento de Processos](/deploy/pm2)
4. [Configurar Monitoramento](/deploy/monitoramento)
5. [Configurar Backup](/deploy/backup)

## Checklist de Deploy

- [ ] Sistema operacional atualizado
- [ ] Firewall configurado
- [ ] Node.js 20.x instalado
- [ ] pnpm instalado
- [ ] PostgreSQL instalado e configurado
- [ ] Redis instalado e configurado
- [ ] Repositorio clonado
- [ ] Variaveis de ambiente configuradas
- [ ] Dependencias instaladas
- [ ] Migrations executadas
- [ ] Build realizado
- [ ] Diretorios criados com permissoes corretas

## Erros Comuns

### Erro: EACCES permission denied

```bash
# Problema: Permissoes incorretas
# Solucao:
sudo chown -R chatblue:chatblue /var/www/chatblue
```

### Erro: Connection refused PostgreSQL

```bash
# Problema: PostgreSQL nao esta rodando
# Solucao:
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Erro: ECONNREFUSED Redis

```bash
# Problema: Redis nao esta rodando
# Solucao:
sudo systemctl start redis-server
sudo systemctl status redis-server
```

### Erro: Cannot find module

```bash
# Problema: Dependencias nao instaladas ou build nao realizado
# Solucao:
pnpm install --frozen-lockfile
pnpm build
```

## Consideracoes de Seguranca

:::warning Importante
- Nunca exponha as portas do banco de dados (5432) e Redis (6379) diretamente para a internet
- Use senhas fortes e unicas para todos os servicos
- Mantenha o sistema e pacotes atualizados
- Configure backups automaticos
- Monitore logs de acesso e erros
:::

## Recursos Adicionais

- [Documentacao do Node.js](https://nodejs.org/docs/)
- [Documentacao do PostgreSQL](https://www.postgresql.org/docs/)
- [Documentacao do Redis](https://redis.io/docs/)
- [Guia de Seguranca Linux](https://www.linuxfoundation.org/security/)
