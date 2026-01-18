---
sidebar_position: 2
title: Configuracao Nginx
description: Configuracao do Nginx como reverse proxy para o ChatBlue
---

# Configuracao do Nginx

O Nginx atua como reverse proxy, direcionando requisicoes HTTP/HTTPS para os servicos do ChatBlue (frontend e backend).

## Instalacao do Nginx

```bash
# Instalar Nginx
sudo apt update
sudo apt install -y nginx

# Verificar instalacao
nginx -v

# Iniciar e habilitar servico
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

## Estrutura de Configuracao

```
/etc/nginx/
├── nginx.conf              # Configuracao principal
├── sites-available/        # Configuracoes disponiveis
│   ├── default
│   └── chatblue
├── sites-enabled/          # Configuracoes ativas (symlinks)
│   └── chatblue -> ../sites-available/chatblue
├── snippets/               # Trechos reutilizaveis
│   ├── ssl-params.conf
│   └── proxy-params.conf
└── conf.d/                 # Configuracoes adicionais
```

## Configuracao Principal

### Otimizar nginx.conf

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Configuracoes basicas
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Tamanho maximo de upload
    client_max_body_size 50M;
    client_body_buffer_size 10M;

    # Buffers
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/rss+xml application/atom+xml image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn:10m;

    # Includes
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

## Snippets Reutilizaveis

### Parametros de Proxy

```bash
sudo nano /etc/nginx/snippets/proxy-params.conf
```

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### Parametros de WebSocket

```bash
sudo nano /etc/nginx/snippets/websocket-params.conf
```

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 7d;
proxy_send_timeout 7d;
proxy_read_timeout 7d;
```

### Parametros de Seguranca

```bash
sudo nano /etc/nginx/snippets/security-headers.conf
```

```nginx
# Seguranca
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

# HSTS (ativar apos SSL estar funcionando)
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Configuracao do ChatBlue

### Criar Configuracao do Site

```bash
sudo nano /etc/nginx/sites-available/chatblue
```

```nginx
# Upstream para o Backend
upstream chatblue_api {
    server 127.0.0.1:3001;
    keepalive 32;
}

# Upstream para o Frontend
upstream chatblue_web {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Redirecionar HTTP para HTTPS (Frontend)
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    # Para Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Redirecionar HTTP para HTTPS (API)
server {
    listen 80;
    listen [::]:80;
    server_name api.seu-dominio.com.br;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Frontend HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    # SSL (sera configurado pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Seguranca
    include /etc/nginx/snippets/security-headers.conf;

    # Logs
    access_log /var/log/nginx/chatblue-frontend-access.log main;
    error_log /var/log/nginx/chatblue-frontend-error.log warn;

    # Root para arquivos estaticos
    root /var/www/chatblue/apps/web/.next;

    # Proxy para Next.js
    location / {
        include /etc/nginx/snippets/proxy-params.conf;
        proxy_pass http://chatblue_web;
    }

    # Arquivos estaticos do Next.js
    location /_next/static {
        alias /var/www/chatblue/apps/web/.next/static;
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # Arquivos publicos
    location /public {
        alias /var/www/chatblue/apps/web/public;
        expires 1d;
        access_log off;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}

# Backend API HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.seu-dominio.com.br;

    # SSL
    ssl_certificate /etc/letsencrypt/live/api.seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.seu-dominio.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Seguranca
    include /etc/nginx/snippets/security-headers.conf;

    # CORS headers
    add_header Access-Control-Allow-Origin "https://seu-dominio.com.br" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Logs
    access_log /var/log/nginx/chatblue-api-access.log main;
    error_log /var/log/nginx/chatblue-api-error.log warn;

    # Rate limiting para API
    limit_req zone=api burst=20 nodelay;
    limit_conn conn 10;

    # Preflight requests
    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://seu-dominio.com.br";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With";
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        include /etc/nginx/snippets/proxy-params.conf;
        proxy_pass http://chatblue_api;
    }

    # WebSocket para Socket.IO
    location /socket.io {
        include /etc/nginx/snippets/websocket-params.conf;
        proxy_pass http://chatblue_api;
    }

    # Uploads
    location /uploads {
        alias /var/www/chatblue/uploads;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Health check
    location /health {
        access_log off;
        include /etc/nginx/snippets/proxy-params.conf;
        proxy_pass http://chatblue_api;
    }
}
```

### Ativar Configuracao

```bash
# Remover site default
sudo rm -f /etc/nginx/sites-enabled/default

# Criar symlink para a configuracao do ChatBlue
sudo ln -s /etc/nginx/sites-available/chatblue /etc/nginx/sites-enabled/

# Testar configuracao
sudo nginx -t

# Se OK, recarregar Nginx
sudo systemctl reload nginx
```

## Configuracao Inicial (Sem SSL)

Antes de configurar o SSL, use esta configuracao inicial:

```bash
sudo nano /etc/nginx/sites-available/chatblue-inicial
```

```nginx
# Upstream para o Backend
upstream chatblue_api {
    server 127.0.0.1:3001;
    keepalive 32;
}

# Upstream para o Frontend
upstream chatblue_web {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Frontend HTTP
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    # Para Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        include /etc/nginx/snippets/proxy-params.conf;
        proxy_pass http://chatblue_web;
    }
}

# Backend API HTTP
server {
    listen 80;
    listen [::]:80;
    server_name api.seu-dominio.com.br;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        include /etc/nginx/snippets/proxy-params.conf;
        proxy_pass http://chatblue_api;
    }

    location /socket.io {
        include /etc/nginx/snippets/websocket-params.conf;
        proxy_pass http://chatblue_api;
    }
}
```

## Comandos Uteis

### Gerenciamento do Nginx

```bash
# Verificar sintaxe da configuracao
sudo nginx -t

# Recarregar configuracao (sem downtime)
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Verificar status
sudo systemctl status nginx

# Parar Nginx
sudo systemctl stop nginx
```

### Logs

```bash
# Ver logs de acesso em tempo real
sudo tail -f /var/log/nginx/chatblue-frontend-access.log

# Ver logs de erro
sudo tail -f /var/log/nginx/chatblue-api-error.log

# Analisar logs
sudo cat /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

## Otimizacoes de Performance

### Cache de Arquivos Estaticos

```nginx
# Adicionar ao bloco server do frontend
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

### Compressao Brotli (Opcional)

```bash
# Instalar modulo Brotli
sudo apt install -y libnginx-mod-brotli

# Adicionar ao nginx.conf
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css text/xml application/json application/javascript
             application/rss+xml application/atom+xml image/svg+xml;
```

## Erros Comuns

### 502 Bad Gateway

```bash
# Verificar se os servicos estao rodando
sudo systemctl status pm2-chatblue

# Verificar portas
sudo netstat -tlnp | grep -E '3000|3001'

# Verificar logs do upstream
sudo tail -f /var/log/nginx/error.log
```

### 504 Gateway Timeout

```nginx
# Aumentar timeouts no proxy
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### WebSocket Nao Conecta

```bash
# Verificar se o upgrade esta funcionando
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
     https://api.seu-dominio.com.br/socket.io/
```

### 413 Request Entity Too Large

```nginx
# Aumentar limite de upload
client_max_body_size 100M;
```

## Seguranca Adicional

### Limitar Metodos HTTP

```nginx
location / {
    limit_except GET POST PUT DELETE PATCH OPTIONS {
        deny all;
    }
    # ... resto da configuracao
}
```

### Bloquear User-Agents Maliciosos

```nginx
# No bloco http ou server
if ($http_user_agent ~* (wget|curl|libwww-perl|python|nikto|sqlmap)) {
    return 403;
}
```

### Proteger Arquivos Sensiveis

```nginx
# Bloquear acesso a arquivos ocultos e sensiveis
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

location ~ \.(env|git|gitignore|dockerignore)$ {
    deny all;
}
```

## Proximos Passos

- [Configurar SSL com Let's Encrypt](/deploy/ssl)
- [Configurar PM2](/deploy/pm2)
