---
sidebar_position: 3
title: SSL/TLS com Let's Encrypt
description: Configuracao de certificados SSL/TLS gratuitos usando Let's Encrypt
---

# SSL/TLS com Let's Encrypt

Este guia detalha a configuracao de certificados SSL/TLS gratuitos usando Let's Encrypt e Certbot para o ChatBlue.

## Introducao ao SSL/TLS

SSL/TLS e essencial para:
- Criptografar dados em transito
- Proteger credenciais de usuarios
- Melhorar ranking no Google (SEO)
- Habilitar HTTP/2 para melhor performance
- Transmitir confianca aos usuarios

## Pre-requisitos

Antes de iniciar, certifique-se de que:

- [ ] DNS configurado e propagado para todos os dominios
- [ ] Nginx instalado e funcionando
- [ ] Portas 80 e 443 abertas no firewall
- [ ] Acesso root ou sudo no servidor

### Verificar DNS

```bash
# Verificar resolucao DNS
dig +short seu-dominio.com.br
dig +short api.seu-dominio.com.br
dig +short www.seu-dominio.com.br

# Ou usando nslookup
nslookup seu-dominio.com.br
```

## Instalacao do Certbot

### Ubuntu/Debian

```bash
# Instalar Certbot e plugin Nginx
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Verificar instalacao
certbot --version
```

### Usando Snap (Recomendado)

```bash
# Instalar Snapd (se nao estiver instalado)
sudo apt install -y snapd

# Instalar Certbot via Snap
sudo snap install --classic certbot

# Criar link simbolico
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Verificar instalacao
certbot --version
```

## Obter Certificados

### Metodo Automatico (Recomendado)

O Certbot pode configurar automaticamente o Nginx:

```bash
# Obter certificado e configurar Nginx automaticamente
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br

# Para o subdominio da API
sudo certbot --nginx -d api.seu-dominio.com.br
```

Durante o processo, voce sera perguntado:

1. **Email**: Informe um email valido para notificacoes de expiracao
2. **Termos de Servico**: Aceite os termos (A)
3. **Compartilhar email com EFF**: Opcional (N)
4. **Redirecionar HTTP para HTTPS**: Escolha 2 para redirecionar automaticamente

### Metodo Manual (Apenas Certificado)

Se preferir configurar o Nginx manualmente:

```bash
# Obter apenas o certificado
sudo certbot certonly --webroot -w /var/www/certbot \
    -d seu-dominio.com.br \
    -d www.seu-dominio.com.br \
    -d api.seu-dominio.com.br
```

Antes de executar, crie o diretorio:

```bash
sudo mkdir -p /var/www/certbot
```

### Metodo Standalone

Se o Nginx ainda nao estiver configurado:

```bash
# Parar Nginx temporariamente
sudo systemctl stop nginx

# Obter certificado
sudo certbot certonly --standalone \
    -d seu-dominio.com.br \
    -d www.seu-dominio.com.br \
    -d api.seu-dominio.com.br

# Iniciar Nginx
sudo systemctl start nginx
```

## Arquivos de Certificado

Apos obter os certificados, eles serao salvos em:

```
/etc/letsencrypt/live/seu-dominio.com.br/
├── cert.pem       # Certificado do dominio
├── chain.pem      # Certificados intermediarios
├── fullchain.pem  # cert.pem + chain.pem (usar no Nginx)
├── privkey.pem    # Chave privada (MANTER SEGURO!)
└── README
```

## Configuracao SSL no Nginx

### Configuracao Completa

```bash
sudo nano /etc/nginx/sites-available/chatblue
```

```nginx
# Frontend HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem;

    # Configuracoes SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/seu-dominio.com.br/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Session
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # DH Parameters
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Resto da configuracao...
    location / {
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/snippets/proxy-params.conf;
    }
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    # Challenge do Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirecionar todo o resto
    location / {
        return 301 https://$host$request_uri;
    }
}
```

### Gerar DH Parameters

```bash
# Gerar parametros Diffie-Hellman (pode demorar alguns minutos)
sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048

# Para maior seguranca (mais lento):
sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 4096
```

### Arquivo de Opcoes SSL

Criar arquivo com opcoes SSL padrao:

```bash
sudo nano /etc/letsencrypt/options-ssl-nginx.conf
```

```nginx
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
```

## Renovacao Automatica

### Verificar Timer do Certbot

```bash
# Verificar se o timer esta ativo
sudo systemctl status certbot.timer

# Ver proxima execucao
sudo systemctl list-timers | grep certbot
```

### Configurar Cron (Alternativa)

Se o timer nao estiver configurado:

```bash
# Editar crontab
sudo crontab -e

# Adicionar linha para renovacao diaria as 3:00 AM
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

### Testar Renovacao

```bash
# Simular renovacao (dry-run)
sudo certbot renew --dry-run

# Se tudo OK, a renovacao automatica funcionara
```

### Hook de Pos-Renovacao

Criar script para executar apos renovacao:

```bash
sudo nano /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

```bash
#!/bin/bash
systemctl reload nginx
```

```bash
# Tornar executavel
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

## Verificacao e Testes

### Verificar Certificado

```bash
# Ver informacoes do certificado
sudo certbot certificates

# Verificar validade
echo | openssl s_client -servername seu-dominio.com.br -connect seu-dominio.com.br:443 2>/dev/null | openssl x509 -noout -dates
```

### Testar SSL Online

Use ferramentas online para verificar a configuracao:

- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

### Testar via Linha de Comando

```bash
# Testar conexao SSL
openssl s_client -connect seu-dominio.com.br:443 -servername seu-dominio.com.br

# Verificar cadeia de certificados
openssl s_client -connect seu-dominio.com.br:443 -showcerts

# Testar protocolos
nmap --script ssl-enum-ciphers -p 443 seu-dominio.com.br
```

## Wildcards com DNS Challenge

Para certificados wildcard (*.seu-dominio.com.br):

### Usando Cloudflare DNS

```bash
# Instalar plugin Cloudflare
sudo apt install -y python3-certbot-dns-cloudflare

# Criar arquivo de credenciais
sudo mkdir -p /etc/letsencrypt
sudo nano /etc/letsencrypt/cloudflare.ini
```

```ini
dns_cloudflare_api_token = seu_token_api_cloudflare
```

```bash
# Definir permissoes
sudo chmod 600 /etc/letsencrypt/cloudflare.ini

# Obter certificado wildcard
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    -d seu-dominio.com.br \
    -d '*.seu-dominio.com.br'
```

### Usando DNS Manual

```bash
# Obter certificado com challenge DNS manual
sudo certbot certonly --manual --preferred-challenges dns \
    -d seu-dominio.com.br \
    -d '*.seu-dominio.com.br'
```

Voce precisara adicionar registros TXT no DNS quando solicitado.

## Multiplos Dominios

### Certificado SAN (Subject Alternative Name)

```bash
# Obter certificado para multiplos dominios
sudo certbot --nginx \
    -d seu-dominio.com.br \
    -d www.seu-dominio.com.br \
    -d api.seu-dominio.com.br \
    -d app.seu-dominio.com.br
```

### Certificados Separados

```bash
# Certificado para frontend
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br

# Certificado para API
sudo certbot --nginx -d api.seu-dominio.com.br
```

## Erros Comuns e Solucoes

### Challenge Failed

```
Error: Challenge failed for domain
```

**Solucoes:**
```bash
# Verificar se o dominio resolve para o IP do servidor
dig +short seu-dominio.com.br

# Verificar se a porta 80 esta acessivel
curl -I http://seu-dominio.com.br/.well-known/acme-challenge/test

# Verificar se o diretorio existe e tem permissoes
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

### Too Many Requests

```
Error: too many certificates already issued
```

**Solucoes:**
- Aguarde o reset do limite (geralmente 1 semana)
- Use o ambiente de staging para testes:

```bash
sudo certbot --staging -d seu-dominio.com.br
```

### Certificado Nao Encontrado

```
Error: Could not find certificate
```

**Solucoes:**
```bash
# Listar certificados disponiveis
sudo certbot certificates

# Verificar caminhos
ls -la /etc/letsencrypt/live/
```

### Erro de Permissao

```
Error: Permission denied
```

**Solucoes:**
```bash
# Verificar permissoes
sudo chmod 755 /etc/letsencrypt/live/
sudo chmod 755 /etc/letsencrypt/archive/
sudo chmod 644 /etc/letsencrypt/live/seu-dominio.com.br/*.pem
sudo chmod 600 /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem
```

## Revogacao e Remocao

### Revogar Certificado

```bash
# Revogar certificado
sudo certbot revoke --cert-path /etc/letsencrypt/live/seu-dominio.com.br/cert.pem

# Escolher motivo da revogacao quando solicitado
```

### Deletar Certificado

```bash
# Deletar certificado e configuracao
sudo certbot delete --cert-name seu-dominio.com.br
```

## Boas Praticas

### Seguranca

:::warning Importante
- Nunca compartilhe ou exponha a chave privada (`privkey.pem`)
- Use sempre TLSv1.2 ou superior
- Mantenha o Certbot atualizado
- Configure HSTS apos confirmar que SSL funciona
- Faca backup dos certificados antes de mudancas
:::

### Monitoramento

```bash
# Script para monitorar expiracao
cat << 'EOF' | sudo tee /usr/local/bin/check-ssl-expiry.sh
#!/bin/bash
DOMAIN=$1
EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

echo "Certificado de $DOMAIN expira em $DAYS_LEFT dias ($EXPIRY)"

if [ $DAYS_LEFT -lt 30 ]; then
    echo "ALERTA: Certificado expira em menos de 30 dias!"
    exit 1
fi
EOF

sudo chmod +x /usr/local/bin/check-ssl-expiry.sh

# Usar
/usr/local/bin/check-ssl-expiry.sh seu-dominio.com.br
```

## Proximos Passos

- [Configurar PM2 para Gerenciamento de Processos](/deploy/pm2)
- [Configurar Monitoramento](/deploy/monitoramento)
