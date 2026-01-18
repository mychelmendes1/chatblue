---
sidebar_position: 4
title: PM2 Process Manager
description: Configuracao do PM2 para gerenciamento de processos Node.js em producao
---

# PM2 Process Manager

O PM2 e um gerenciador de processos para aplicacoes Node.js que fornece recursos essenciais para producao como reinicio automatico, balanceamento de carga, monitoramento e logs.

## Instalacao

### Instalar PM2 Globalmente

```bash
# Instalar PM2
npm install -g pm2

# Verificar instalacao
pm2 --version

# Instalar complemento de monitoramento (opcional)
pm2 install pm2-logrotate
```

### Instalar com pnpm

```bash
# Se preferir usar pnpm
pnpm add -g pm2
```

## Configuracao do Ecosystem

Crie um arquivo de configuracao para gerenciar todos os processos:

```bash
nano /var/www/chatblue/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'chatblue-api',
      cwd: '/var/www/chatblue/apps/api',
      script: 'dist/index.js',
      instances: 'max', // Usar todos os CPUs
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_file: '/var/www/chatblue/apps/api/.env',
      error_file: '/var/log/chatblue/api-error.log',
      out_file: '/var/log/chatblue/api-out.log',
      log_file: '/var/log/chatblue/api-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Configuracoes de reinicio
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Variaveis de ambiente especificas
      node_args: '--max-old-space-size=2048',
    },
    {
      name: 'chatblue-web',
      cwd: '/var/www/chatblue/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '/var/www/chatblue/apps/web/.env',
      error_file: '/var/log/chatblue/web-error.log',
      out_file: '/var/log/chatblue/web-out.log',
      log_file: '/var/log/chatblue/web-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000,
    },
    {
      name: 'chatblue-worker',
      cwd: '/var/www/chatblue/apps/api',
      script: 'dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      env_file: '/var/www/chatblue/apps/api/.env',
      error_file: '/var/log/chatblue/worker-error.log',
      out_file: '/var/log/chatblue/worker-out.log',
      time: true,

      // Cron para reiniciar diariamente as 4:00 AM
      cron_restart: '0 4 * * *',
    }
  ],

  deploy: {
    production: {
      user: 'chatblue',
      host: ['seu-servidor.com.br'],
      ref: 'origin/main',
      repo: 'git@github.com:sua-org/chatblue.git',
      path: '/var/www/chatblue',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
```

## Iniciar Aplicacao

### Usando Ecosystem File

```bash
# Iniciar todos os processos
pm2 start /var/www/chatblue/ecosystem.config.js

# Iniciar processo especifico
pm2 start /var/www/chatblue/ecosystem.config.js --only chatblue-api

# Iniciar com ambiente especifico
pm2 start ecosystem.config.js --env production
```

### Iniciar Diretamente

```bash
# Backend
pm2 start /var/www/chatblue/apps/api/dist/index.js --name chatblue-api

# Frontend
pm2 start npm --name chatblue-web -- start --cwd /var/www/chatblue/apps/web
```

## Comandos Essenciais

### Gerenciamento de Processos

```bash
# Listar processos
pm2 list
pm2 ls
pm2 status

# Reiniciar processos
pm2 restart all
pm2 restart chatblue-api
pm2 restart chatblue-api chatblue-web

# Recarregar (zero-downtime)
pm2 reload all
pm2 reload chatblue-api

# Parar processos
pm2 stop all
pm2 stop chatblue-api

# Deletar processos
pm2 delete all
pm2 delete chatblue-api

# Reiniciar com novo codigo
pm2 startOrRestart ecosystem.config.js
```

### Monitoramento

```bash
# Monitor em tempo real
pm2 monit

# Informacoes detalhadas
pm2 show chatblue-api
pm2 describe chatblue-api

# Metricas de todos os processos
pm2 prettylist
```

### Logs

```bash
# Ver logs em tempo real
pm2 logs

# Logs de processo especifico
pm2 logs chatblue-api

# Logs com linhas especificas
pm2 logs --lines 100

# Limpar logs
pm2 flush

# Logs formatados como JSON
pm2 logs --json
```

## Startup Automatico

### Configurar Startup

```bash
# Gerar script de startup (detecta automaticamente o init system)
pm2 startup

# O comando acima vai mostrar um comando para executar com sudo
# Exemplo: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u chatblue --hp /home/chatblue

# Executar o comando mostrado
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u chatblue --hp /home/chatblue

# Salvar lista de processos atual
pm2 save
```

### Verificar Startup

```bash
# Verificar se o servico foi criado
sudo systemctl status pm2-chatblue

# Testar reiniciando o servidor
sudo reboot

# Apos reiniciar, verificar se os processos estao rodando
pm2 list
```

### Remover Startup

```bash
# Remover startup script
pm2 unstartup systemd
```

## Configuracao de Log Rotation

### Usando pm2-logrotate

```bash
# Instalar modulo
pm2 install pm2-logrotate

# Configurar parametros
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:rotateModule true
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Verificar configuracoes
pm2 conf pm2-logrotate
```

### Usando Logrotate do Sistema

```bash
sudo nano /etc/logrotate.d/chatblue
```

```
/var/log/chatblue/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 chatblue chatblue
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Deploy com PM2

### Configurar Deploy

Adicione a configuracao de deploy no `ecosystem.config.js` (ja incluida acima).

### Primeiro Deploy

```bash
# Configurar servidor remoto (executar localmente)
pm2 deploy production setup

# Fazer deploy
pm2 deploy production
```

### Deploys Subsequentes

```bash
# Deploy normal
pm2 deploy production

# Deploy com update
pm2 deploy production update

# Reverter para commit anterior
pm2 deploy production revert 1
```

## Cluster Mode

### Balanceamento de Carga

```javascript
// ecosystem.config.js
{
  name: 'chatblue-api',
  script: 'dist/index.js',
  instances: 'max',      // Usar todos os CPUs
  exec_mode: 'cluster',  // Modo cluster
  // ...
}
```

### Escalar Processos

```bash
# Escalar para 4 instancias
pm2 scale chatblue-api 4

# Escalar adicionando 2 instancias
pm2 scale chatblue-api +2

# Escalar removendo 1 instancia
pm2 scale chatblue-api -1
```

## Variaveis de Ambiente

### Usando .env File

```javascript
// ecosystem.config.js
{
  name: 'chatblue-api',
  env_file: '/var/www/chatblue/apps/api/.env',
  // ...
}
```

### Definindo Inline

```javascript
// ecosystem.config.js
{
  name: 'chatblue-api',
  env: {
    NODE_ENV: 'production',
    PORT: 3001,
    DATABASE_URL: 'postgresql://...'
  },
  // ...
}
```

### Multiplos Ambientes

```javascript
// ecosystem.config.js
{
  name: 'chatblue-api',
  env: {
    NODE_ENV: 'development',
    PORT: 3001
  },
  env_production: {
    NODE_ENV: 'production',
    PORT: 3001
  },
  env_staging: {
    NODE_ENV: 'staging',
    PORT: 3001
  }
}
```

```bash
# Iniciar com ambiente especifico
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging
```

## Graceful Shutdown

### No Codigo da Aplicacao

```javascript
// apps/api/src/index.ts
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

async function gracefulShutdown() {
  console.log('Recebido sinal de shutdown...');

  // Parar de aceitar novas conexoes
  server.close(async () => {
    console.log('Servidor HTTP fechado');

    // Fechar conexoes de banco
    await prisma.$disconnect();
    console.log('Conexao com banco fechada');

    // Fechar Redis
    await redis.quit();
    console.log('Conexao Redis fechada');

    // Sinalizar que esta pronto para morrer
    process.exit(0);
  });

  // Forcar shutdown apos timeout
  setTimeout(() => {
    console.error('Shutdown forcado apos timeout');
    process.exit(1);
  }, 10000);
}

// Sinalizar que esta pronto (para PM2 wait_ready)
process.send?.('ready');
```

### Configuracao no ecosystem.config.js

```javascript
{
  name: 'chatblue-api',
  kill_timeout: 10000,    // Tempo para graceful shutdown
  wait_ready: true,       // Aguardar sinal 'ready'
  listen_timeout: 10000,  // Timeout para sinal ready
  // ...
}
```

## Metricas e Monitoramento

### PM2 Plus (Monitoramento na Nuvem)

```bash
# Conectar ao PM2 Plus
pm2 plus

# Ou usar chave publica
pm2 link <secret> <public>
```

### Metricas Customizadas

```javascript
// No codigo da aplicacao
const io = require('@pm2/io');

// Contador
const requestCounter = io.counter({
  name: 'Requisicoes',
  id: 'app/requests'
});

// Incrementar
requestCounter.inc();

// Metrica customizada
io.metric({
  name: 'Usuarios Online',
  id: 'app/users',
  value: () => getOnlineUsersCount()
});

// Histogram
const responseTime = io.histogram({
  name: 'Response Time',
  id: 'app/response-time',
  measurement: 'mean'
});

responseTime.update(42); // ms
```

## Troubleshooting

### Processo Nao Inicia

```bash
# Ver logs de erro
pm2 logs chatblue-api --err --lines 50

# Ver informacoes do processo
pm2 show chatblue-api

# Verificar se a porta esta em uso
sudo lsof -i :3001
```

### Reinicializacoes Constantes

```bash
# Verificar motivo dos restarts
pm2 show chatblue-api | grep -A 5 "restart"

# Verificar logs de erro
pm2 logs chatblue-api --err

# Aumentar memoria se necessario
pm2 restart chatblue-api --max-memory-restart 2G
```

### Memoria Vazando

```bash
# Monitorar uso de memoria
pm2 monit

# Configurar limite de memoria
pm2 restart chatblue-api --max-memory-restart 1G

# Forcar GC (requer --expose-gc)
pm2 restart chatblue-api --node-args="--expose-gc --max-old-space-size=2048"
```

### Portas em Conflito

```bash
# Verificar portas em uso
sudo netstat -tlnp | grep -E '3000|3001'

# Matar processo na porta
sudo fuser -k 3001/tcp
```

## Comandos de Referencia Rapida

```bash
# Iniciar
pm2 start ecosystem.config.js

# Parar tudo
pm2 stop all

# Reiniciar com zero-downtime
pm2 reload all

# Ver status
pm2 status

# Monitor interativo
pm2 monit

# Ver logs
pm2 logs

# Salvar estado atual
pm2 save

# Ressuscitar processos salvos
pm2 resurrect

# Atualizar PM2
pm2 update

# Resetar contadores
pm2 reset all

# Gerar relatorio
pm2 report
```

## Proximos Passos

- [Configurar Monitoramento](/deploy/monitoramento)
- [Configurar Backup](/deploy/backup)
