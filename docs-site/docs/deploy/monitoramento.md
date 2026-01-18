---
sidebar_position: 5
title: Monitoramento e Logging
description: Configuracao de monitoramento, metricas e sistema de logs para o ChatBlue
---

# Monitoramento e Logging

Este guia detalha a configuracao de monitoramento, metricas e sistema de logs para manter o ChatBlue funcionando de forma confiavel em producao.

## Visao Geral

Um sistema de monitoramento eficaz inclui:

- **Health Checks**: Verificacao de disponibilidade dos servicos
- **Metricas**: CPU, memoria, disco, rede
- **Logs**: Coleta e analise de logs da aplicacao
- **Alertas**: Notificacoes quando algo da errado

## Health Checks

### Endpoint de Health Check

O ChatBlue possui endpoints de health check que devem ser monitorados:

```bash
# Health check do backend
curl https://api.seu-dominio.com.br/health

# Resposta esperada:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "whatsapp": "connected"
  }
}

# Health check do frontend
curl https://seu-dominio.com.br/api/health
```

### Script de Health Check

```bash
sudo nano /usr/local/bin/chatblue-health-check.sh
```

```bash
#!/bin/bash

# Configuracoes
API_URL="https://api.seu-dominio.com.br/health"
WEB_URL="https://seu-dominio.com.br"
SLACK_WEBHOOK="https://hooks.slack.com/services/xxx/xxx/xxx"
EMAIL="admin@seu-dominio.com.br"
LOG_FILE="/var/log/chatblue/health-check.log"

# Funcao para enviar alerta
send_alert() {
    local service=$1
    local status=$2
    local message=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Log
    echo "[$timestamp] ALERT: $service - $status - $message" >> $LOG_FILE

    # Slack
    curl -s -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\":warning: *ChatBlue Alert*\n*Service:* $service\n*Status:* $status\n*Message:* $message\n*Time:* $timestamp\"}" \
        $SLACK_WEBHOOK

    # Email (requer mailutils)
    # echo "$message" | mail -s "ChatBlue Alert: $service $status" $EMAIL
}

# Verificar API
check_api() {
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 $API_URL)
    if [ "$response" != "200" ]; then
        send_alert "API" "DOWN" "HTTP Status: $response"
        return 1
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] API OK" >> $LOG_FILE
    return 0
}

# Verificar Frontend
check_web() {
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 $WEB_URL)
    if [ "$response" != "200" ]; then
        send_alert "Frontend" "DOWN" "HTTP Status: $response"
        return 1
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Frontend OK" >> $LOG_FILE
    return 0
}

# Verificar PostgreSQL
check_postgres() {
    if ! sudo -u postgres pg_isready -q; then
        send_alert "PostgreSQL" "DOWN" "Database not responding"
        return 1
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] PostgreSQL OK" >> $LOG_FILE
    return 0
}

# Verificar Redis
check_redis() {
    if ! redis-cli ping > /dev/null 2>&1; then
        send_alert "Redis" "DOWN" "Redis not responding"
        return 1
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Redis OK" >> $LOG_FILE
    return 0
}

# Verificar uso de disco
check_disk() {
    usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 85 ]; then
        send_alert "Disk" "WARNING" "Disk usage at ${usage}%"
        return 1
    fi
    return 0
}

# Verificar uso de memoria
check_memory() {
    usage=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
    if [ "$usage" -gt 90 ]; then
        send_alert "Memory" "WARNING" "Memory usage at ${usage}%"
        return 1
    fi
    return 0
}

# Executar verificacoes
check_api
check_web
check_postgres
check_redis
check_disk
check_memory
```

```bash
# Tornar executavel
sudo chmod +x /usr/local/bin/chatblue-health-check.sh

# Adicionar ao cron (a cada 5 minutos)
echo "*/5 * * * * root /usr/local/bin/chatblue-health-check.sh" | sudo tee /etc/cron.d/chatblue-health-check
```

## Configuracao de Logs

### Estrutura de Logs

```
/var/log/chatblue/
├── api-error.log      # Erros do backend
├── api-out.log        # Saida do backend
├── api-combined.log   # Logs combinados
├── web-error.log      # Erros do frontend
├── web-out.log        # Saida do frontend
├── worker-error.log   # Erros do worker
├── worker-out.log     # Saida do worker
├── health-check.log   # Logs de health check
└── access.log         # Logs de acesso (Nginx)
```

### Configuracao de Logging na Aplicacao

```typescript
// apps/api/src/lib/logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'chatblue-api' },
  transports: [
    // Erros
    new DailyRotateFile({
      filename: '/var/log/chatblue/api-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '50m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    // Todos os logs
    new DailyRotateFile({
      filename: '/var/log/chatblue/api-combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '7d',
      zippedArchive: true,
    }),
  ],
});

// Em desenvolvimento, tambem logar no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
```

### Logrotate para Nginx

```bash
sudo nano /etc/logrotate.d/nginx-chatblue
```

```
/var/log/nginx/chatblue-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
```

## Monitoramento com Prometheus e Grafana

### Instalar Prometheus

```bash
# Criar usuario
sudo useradd --no-create-home --shell /bin/false prometheus

# Criar diretorios
sudo mkdir /etc/prometheus
sudo mkdir /var/lib/prometheus

# Download Prometheus
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz

# Instalar
sudo cp prometheus-2.45.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.45.0.linux-amd64/promtool /usr/local/bin/
sudo cp -r prometheus-2.45.0.linux-amd64/consoles /etc/prometheus
sudo cp -r prometheus-2.45.0.linux-amd64/console_libraries /etc/prometheus

# Permissoes
sudo chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus
```

### Configurar Prometheus

```bash
sudo nano /etc/prometheus/prometheus.yml
```

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files: []

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'chatblue-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: /metrics

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
```

### Servico Systemd do Prometheus

```bash
sudo nano /etc/systemd/system/prometheus.service
```

```ini
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
    --config.file /etc/prometheus/prometheus.yml \
    --storage.tsdb.path /var/lib/prometheus/ \
    --web.console.templates=/etc/prometheus/consoles \
    --web.console.libraries=/etc/prometheus/console_libraries \
    --storage.tsdb.retention.time=15d

[Install]
WantedBy=multi-user.target
```

```bash
# Iniciar Prometheus
sudo systemctl daemon-reload
sudo systemctl start prometheus
sudo systemctl enable prometheus
```

### Instalar Node Exporter

```bash
# Download
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz

# Instalar
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter
```

```bash
sudo nano /etc/systemd/system/node_exporter.service
```

```ini
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

### Instalar Grafana

```bash
# Adicionar repositorio
sudo apt-get install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

# Instalar
sudo apt-get update
sudo apt-get install -y grafana

# Iniciar
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

### Configurar Nginx para Grafana

```nginx
# Adicionar ao seu arquivo de configuracao Nginx
server {
    listen 443 ssl http2;
    server_name grafana.seu-dominio.com.br;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket for live updates
    location /api/live {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Metricas na Aplicacao

### Expor Metricas do Node.js

```bash
# Instalar dependencias
cd /var/www/chatblue/apps/api
pnpm add prom-client
```

```typescript
// apps/api/src/lib/metrics.ts
import client from 'prom-client';

// Coletar metricas padrao
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'chatblue_' });

// Metricas customizadas
export const httpRequestsTotal = new client.Counter({
  name: 'chatblue_http_requests_total',
  help: 'Total de requisicoes HTTP',
  labelNames: ['method', 'path', 'status'],
});

export const httpRequestDuration = new client.Histogram({
  name: 'chatblue_http_request_duration_seconds',
  help: 'Duracao das requisicoes HTTP',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const activeConnections = new client.Gauge({
  name: 'chatblue_active_connections',
  help: 'Conexoes WebSocket ativas',
});

export const whatsappSessions = new client.Gauge({
  name: 'chatblue_whatsapp_sessions',
  help: 'Sessoes WhatsApp ativas',
  labelNames: ['status'],
});

export const messagesSent = new client.Counter({
  name: 'chatblue_messages_sent_total',
  help: 'Total de mensagens enviadas',
  labelNames: ['type', 'channel'],
});

export const messagesReceived = new client.Counter({
  name: 'chatblue_messages_received_total',
  help: 'Total de mensagens recebidas',
  labelNames: ['type', 'channel'],
});

export const databaseQueryDuration = new client.Histogram({
  name: 'chatblue_database_query_duration_seconds',
  help: 'Duracao das queries de banco',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Endpoint de metricas
export const metricsHandler = async (req: Request, res: Response) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
};
```

```typescript
// apps/api/src/app.ts
import { metricsHandler } from './lib/metrics';

// Endpoint de metricas (proteger em producao)
app.get('/metrics', metricsHandler);
```

## Alertas

### Configurar Alertmanager

```bash
# Download e instalar Alertmanager
cd /tmp
wget https://github.com/prometheus/alertmanager/releases/download/v0.26.0/alertmanager-0.26.0.linux-amd64.tar.gz
tar xvfz alertmanager-0.26.0.linux-amd64.tar.gz
sudo cp alertmanager-0.26.0.linux-amd64/alertmanager /usr/local/bin/
```

```bash
sudo nano /etc/prometheus/alertmanager.yml
```

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alertas@seu-dominio.com.br'
  smtp_auth_username: 'seu-email@gmail.com'
  smtp_auth_password: 'sua-senha-app'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx/xxx/xxx'
        channel: '#alertas-chatblue'
        send_resolved: true
        title: '{{ .Status | toUpper }}: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'

  - name: 'email-notifications'
    email_configs:
      - to: 'admin@seu-dominio.com.br'
        send_resolved: true
```

### Regras de Alerta

```bash
sudo nano /etc/prometheus/alert_rules.yml
```

```yaml
groups:
  - name: chatblue-alerts
    rules:
      # Servico indisponivel
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Servico {{ $labels.job }} indisponivel"
          description: "{{ $labels.instance }} esta offline ha mais de 1 minuto"

      # Alta latencia
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(chatblue_http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Alta latencia detectada"
          description: "95th percentile de latencia acima de 2s"

      # Alto uso de CPU
      - alert: HighCPUUsage
        expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Alto uso de CPU"
          description: "Uso de CPU acima de 80% por 5 minutos"

      # Alto uso de memoria
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Alto uso de memoria"
          description: "Uso de memoria acima de 85%"

      # Disco quase cheio
      - alert: DiskSpaceLow
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Espaco em disco baixo"
          description: "Disco {{ $labels.mountpoint }} com mais de 85% de uso"

      # Muitos erros 5xx
      - alert: HighErrorRate
        expr: rate(chatblue_http_requests_total{status=~"5.."}[5m]) / rate(chatblue_http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Alta taxa de erros"
          description: "Mais de 5% das requisicoes retornando erro 5xx"

      # WhatsApp desconectado
      - alert: WhatsAppDisconnected
        expr: chatblue_whatsapp_sessions{status="disconnected"} > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Sessao WhatsApp desconectada"
          description: "Uma ou mais sessoes WhatsApp estao desconectadas"
```

## Dashboards Grafana

### Dashboard de Visao Geral

Importe o dashboard ou crie manualmente com os seguintes paineis:

1. **Requisicoes por Segundo**: `rate(chatblue_http_requests_total[1m])`
2. **Latencia P95**: `histogram_quantile(0.95, rate(chatblue_http_request_duration_seconds_bucket[5m]))`
3. **Taxa de Erros**: `rate(chatblue_http_requests_total{status=~"5.."}[5m])`
4. **Conexoes Ativas**: `chatblue_active_connections`
5. **Uso de CPU**: `100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
6. **Uso de Memoria**: `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100`
7. **Mensagens Enviadas/Recebidas**: `rate(chatblue_messages_sent_total[1m])`, `rate(chatblue_messages_received_total[1m])`

## Comandos Uteis

### Verificar Status dos Servicos

```bash
# Status de todos os servicos de monitoramento
sudo systemctl status prometheus node_exporter grafana-server

# Verificar logs
sudo journalctl -u prometheus -f
sudo journalctl -u grafana-server -f
```

### Testar Configuracoes

```bash
# Validar configuracao do Prometheus
promtool check config /etc/prometheus/prometheus.yml

# Validar regras de alerta
promtool check rules /etc/prometheus/alert_rules.yml
```

## Boas Praticas

:::tip Recomendacoes
1. **Retencao de Dados**: Configure retencao adequada (15-30 dias para metricas)
2. **Alertas**: Comece com poucos alertas criticos, adicione mais conforme necessario
3. **Dashboards**: Crie dashboards especificos para diferentes equipes
4. **Documentacao**: Documente o significado de cada metrica e alerta
5. **Testes**: Teste regularmente os alertas para garantir que funcionam
:::

## Proximos Passos

- [Configurar Backup](/deploy/backup)
- [Troubleshooting - Logs](/troubleshooting/logs)
