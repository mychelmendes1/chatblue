---
sidebar_position: 1
title: Problemas Comuns
description: Guia de resolucao de problemas comuns do ChatBlue
---

# Problemas Comuns e Solucoes

Este guia apresenta os problemas mais frequentes encontrados no ChatBlue e suas solucoes.

## Problemas de Instalacao

### Erro: pnpm install falha

**Sintomas:**
```
ERR_PNPM_PEER_DEP_ISSUES
```

**Solucao:**
```bash
# Limpar cache do pnpm
pnpm store prune

# Remover node_modules e lockfile
rm -rf node_modules pnpm-lock.yaml

# Reinstalar com flag para ignorar peers
pnpm install --shamefully-hoist
```

### Erro: Prisma Generate falha

**Sintomas:**
```
Error: Generator "prisma-client-js" failed to run
```

**Solucoes:**
```bash
# Verificar versao do Prisma
pnpm prisma --version

# Limpar cache do Prisma
rm -rf node_modules/.prisma

# Regenerar cliente
pnpm prisma generate

# Se persistir, reinstalar Prisma
pnpm remove @prisma/client prisma
pnpm add @prisma/client prisma
pnpm prisma generate
```

### Erro: Node version incompatible

**Sintomas:**
```
error: The engine "node" is incompatible
```

**Solucao:**
```bash
# Verificar versao atual
node --version

# Instalar versao correta com nvm
nvm install 20
nvm use 20
nvm alias default 20

# Verificar novamente
node --version
```

## Problemas de Inicializacao

### Backend nao inicia

**Sintomas:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solucoes:**
```bash
# Encontrar processo usando a porta
sudo lsof -i :3001

# Matar processo
sudo kill -9 <PID>

# Ou matar diretamente
sudo fuser -k 3001/tcp

# Reiniciar aplicacao
pm2 restart chatblue-api
```

### Frontend nao carrega

**Sintomas:**
- Pagina em branco
- Erro 500

**Solucoes:**
```bash
# Verificar build
cd /var/www/chatblue/apps/web
ls -la .next/

# Rebuild se necessario
pnpm build

# Verificar logs
pm2 logs chatblue-web --lines 50

# Verificar variaveis de ambiente
cat .env | grep NEXT_PUBLIC
```

### Erro de conexao com banco de dados

**Sintomas:**
```
Error: Can't reach database server at `localhost:5432`
```

**Solucoes:**
```bash
# Verificar se PostgreSQL esta rodando
sudo systemctl status postgresql

# Iniciar se necessario
sudo systemctl start postgresql

# Verificar conexao
sudo -u postgres psql -c "SELECT 1"

# Verificar string de conexao no .env
cat /var/www/chatblue/apps/api/.env | grep DATABASE_URL

# Testar conexao com a string
psql "postgresql://chatblue:senha@localhost:5432/chatblue_production"
```

## Problemas de Autenticacao

### Token JWT invalido

**Sintomas:**
```
401 Unauthorized - Invalid token
```

**Solucoes:**
```bash
# Verificar se JWT_SECRET esta configurado
cat /var/www/chatblue/apps/api/.env | grep JWT

# Limpar cookies do navegador

# Verificar expiracao do token no frontend
# Fazer logout e login novamente
```

### Sessao expira muito rapido

**Sintomas:**
- Usuario deslogado frequentemente

**Solucao:**
```bash
# Ajustar tempo de expiracao no .env
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Reiniciar aplicacao
pm2 restart chatblue-api
```

### Senha nao aceita no login

**Solucoes:**
```bash
# Verificar se o usuario existe no banco
sudo -u postgres psql -d chatblue_production -c "SELECT email FROM users WHERE email = 'usuario@email.com'"

# Resetar senha via Prisma
cd /var/www/chatblue/apps/api
pnpm prisma studio
# Ou via script
```

```typescript
// Script para resetar senha
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword(email: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });
}
```

## Problemas de WebSocket

### WebSocket nao conecta

**Sintomas:**
```
WebSocket connection failed
```

**Solucoes:**
```bash
# Verificar configuracao do Nginx para WebSocket
sudo nginx -t

# Verificar se a rota socket.io esta configurada
grep -A 10 "socket.io" /etc/nginx/sites-available/chatblue

# Testar WebSocket diretamente
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
     http://localhost:3001/socket.io/

# Verificar logs do backend
pm2 logs chatblue-api --lines 50 | grep -i socket
```

### Mensagens nao atualizam em tempo real

**Solucoes:**
```bash
# Verificar conexao WebSocket no navegador (DevTools > Network > WS)

# Verificar se Redis esta funcionando (usado para pub/sub)
redis-cli ping

# Verificar logs de erros
pm2 logs chatblue-api --err --lines 30

# Reiniciar aplicacao
pm2 restart all
```

## Problemas de Performance

### API lenta

**Sintomas:**
- Requisicoes demoram mais de 2 segundos

**Solucoes:**
```bash
# Verificar uso de recursos
htop

# Verificar queries lentas no PostgreSQL
sudo -u postgres psql -d chatblue_production
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

# Verificar indices
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

# Verificar uso de memoria do Node
pm2 monit
```

### Frontend travando

**Solucoes:**
```bash
# Limpar cache do Next.js
cd /var/www/chatblue/apps/web
rm -rf .next/cache

# Rebuild
pnpm build

# Aumentar memoria se necessario
pm2 restart chatblue-web --max-memory-restart 1G
```

## Problemas de Upload

### Upload de arquivos falha

**Sintomas:**
```
413 Request Entity Too Large
```

**Solucao:**
```nginx
# Editar configuracao do Nginx
sudo nano /etc/nginx/sites-available/chatblue

# Aumentar limite
client_max_body_size 100M;

# Recarregar Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### Arquivos nao sao salvos

**Solucoes:**
```bash
# Verificar permissoes do diretorio
ls -la /var/www/chatblue/uploads/

# Corrigir permissoes
sudo chown -R chatblue:chatblue /var/www/chatblue/uploads/
sudo chmod -R 755 /var/www/chatblue/uploads/

# Verificar espaco em disco
df -h /var/www/chatblue/uploads/
```

## Problemas de Email

### Emails nao sao enviados

**Solucoes:**
```bash
# Verificar configuracao SMTP no .env
cat /var/www/chatblue/apps/api/.env | grep SMTP

# Testar conexao SMTP
telnet smtp.gmail.com 587

# Verificar logs de erro
pm2 logs chatblue-api --err | grep -i mail

# Testar envio manual
```

```typescript
// Script para testar email
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.sendMail({
  from: 'test@seu-dominio.com',
  to: 'admin@seu-dominio.com',
  subject: 'Teste',
  text: 'Email de teste',
});
```

## Problemas de SSL

### Certificado expirado

**Solucoes:**
```bash
# Verificar data de expiracao
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Forcar renovacao
sudo certbot renew --force-renewal

# Recarregar Nginx
sudo systemctl reload nginx
```

### Erro de certificado invalido

**Solucoes:**
```bash
# Verificar se o dominio aponta para o servidor correto
dig +short seu-dominio.com.br

# Verificar certificado
openssl s_client -connect seu-dominio.com.br:443 -servername seu-dominio.com.br

# Revogar e obter novo certificado
sudo certbot delete --cert-name seu-dominio.com.br
sudo certbot --nginx -d seu-dominio.com.br
```

## Problemas de Rede

### Timeout nas requisicoes

**Solucoes:**
```bash
# Verificar latencia de rede
ping seu-dominio.com.br

# Verificar DNS
dig seu-dominio.com.br

# Verificar firewall
sudo ufw status

# Aumentar timeouts no Nginx
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### CORS errors

**Solucoes:**
```bash
# Verificar configuracao CORS no backend
grep -i cors /var/www/chatblue/apps/api/src/app.ts

# Verificar headers no Nginx
grep -i "Access-Control" /etc/nginx/sites-available/chatblue

# Adicionar headers se faltando
```

```nginx
# No Nginx
add_header Access-Control-Allow-Origin "https://seu-dominio.com.br" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
add_header Access-Control-Allow-Credentials "true" always;
```

## Comandos de Diagnostico Rapido

```bash
# Status geral do sistema
sudo systemctl status postgresql redis-server nginx

# Status da aplicacao
pm2 status

# Uso de recursos
htop
df -h
free -m

# Portas em uso
sudo netstat -tlnp | grep -E '3000|3001|5432|6379'

# Logs recentes
pm2 logs --lines 50

# Testar conectividade
curl -I http://localhost:3001/health
curl -I http://localhost:3000

# Verificar processos Node
ps aux | grep node
```

## Quando Escalar para Suporte

Se os problemas persistirem apos tentar as solucoes acima:

1. Colete logs relevantes:
```bash
pm2 logs chatblue-api --lines 200 > api-logs.txt
pm2 logs chatblue-web --lines 200 > web-logs.txt
sudo tail -100 /var/log/nginx/error.log > nginx-logs.txt
```

2. Documente:
   - Passos para reproduzir o problema
   - Mensagens de erro exatas
   - Horario de ocorrencia
   - Mudancas recentes no sistema

3. Abra um issue no repositorio com todas as informacoes coletadas

## Proximos Passos

- [Analise de Logs](/troubleshooting/logs)
- [Problemas de WhatsApp](/troubleshooting/whatsapp)
- [Problemas de Banco de Dados](/troubleshooting/banco-dados)
