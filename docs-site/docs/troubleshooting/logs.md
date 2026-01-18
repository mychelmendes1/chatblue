---
sidebar_position: 2
title: Analise de Logs
description: Guia para analise e debug de logs do ChatBlue
---

# Analise de Logs e Debug

Este guia detalha como analisar logs do ChatBlue para identificar e resolver problemas.

## Estrutura de Logs

### Localizacao dos Logs

```
/var/log/chatblue/
├── api-error.log        # Erros do backend
├── api-out.log          # Saida padrao do backend
├── api-combined.log     # Todos os logs do backend
├── web-error.log        # Erros do frontend
├── web-out.log          # Saida padrao do frontend
├── worker-error.log     # Erros do worker
├── worker-out.log       # Saida do worker
├── health-check.log     # Logs de health check
└── backup.log           # Logs de backup

/var/log/nginx/
├── access.log                   # Acessos gerais
├── error.log                    # Erros do Nginx
├── chatblue-frontend-access.log # Acessos ao frontend
├── chatblue-frontend-error.log  # Erros do frontend
├── chatblue-api-access.log      # Acessos a API
└── chatblue-api-error.log       # Erros da API

/var/log/postgresql/
└── postgresql-16-main.log       # Logs do PostgreSQL
```

### Formato dos Logs

Os logs da aplicacao seguem o formato JSON estruturado:

```json
{
  "level": "info",
  "message": "Request completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "chatblue-api",
  "requestId": "abc123",
  "method": "GET",
  "path": "/api/tickets",
  "statusCode": 200,
  "responseTime": 45,
  "userId": "user_123"
}
```

## Visualizacao de Logs

### PM2 Logs

```bash
# Ver todos os logs em tempo real
pm2 logs

# Ver logs de processo especifico
pm2 logs chatblue-api
pm2 logs chatblue-web

# Ver apenas erros
pm2 logs chatblue-api --err

# Ver ultimas N linhas
pm2 logs --lines 100

# Ver logs formatados como JSON
pm2 logs --json

# Limpar logs
pm2 flush
```

### Usando tail

```bash
# Ver logs em tempo real
tail -f /var/log/chatblue/api-combined.log

# Ver ultimas linhas
tail -100 /var/log/chatblue/api-error.log

# Multiplos arquivos
tail -f /var/log/chatblue/*.log

# Com timestamp
tail -f /var/log/chatblue/api-combined.log | while read line; do echo "$(date): $line"; done
```

### Usando less

```bash
# Navegar pelo arquivo
less /var/log/chatblue/api-combined.log

# Comandos dentro do less:
# G - ir para o final
# g - ir para o inicio
# /texto - buscar texto
# n - proxima ocorrencia
# N - ocorrencia anterior
# q - sair
```

## Filtragem e Busca

### Usando grep

```bash
# Buscar por nivel de erro
grep '"level":"error"' /var/log/chatblue/api-combined.log

# Buscar por mensagem especifica
grep -i "database" /var/log/chatblue/api-error.log

# Buscar por usuario
grep '"userId":"user_123"' /var/log/chatblue/api-combined.log

# Buscar por periodo (usando timestamps)
grep "2024-01-15T10:" /var/log/chatblue/api-combined.log

# Excluir linhas
grep -v '"level":"debug"' /var/log/chatblue/api-combined.log

# Contar ocorrencias
grep -c '"level":"error"' /var/log/chatblue/api-combined.log

# Mostrar linhas antes e depois
grep -B 5 -A 5 "error" /var/log/chatblue/api-error.log
```

### Usando jq (para logs JSON)

```bash
# Instalar jq
sudo apt install -y jq

# Filtrar por nivel
cat /var/log/chatblue/api-combined.log | jq 'select(.level == "error")'

# Mostrar apenas mensagens
cat /var/log/chatblue/api-combined.log | jq '.message'

# Filtrar por path
cat /var/log/chatblue/api-combined.log | jq 'select(.path == "/api/tickets")'

# Erros com mais de 500ms
cat /var/log/chatblue/api-combined.log | jq 'select(.responseTime > 500)'

# Agrupar por status
cat /var/log/chatblue/api-combined.log | jq -s 'group_by(.statusCode) | map({status: .[0].statusCode, count: length})'
```

### Usando awk

```bash
# Extrair campos especificos do Nginx
awk '{print $1, $7, $9}' /var/log/nginx/chatblue-api-access.log

# Contar requisicoes por IP
awk '{print $1}' /var/log/nginx/chatblue-api-access.log | sort | uniq -c | sort -rn | head -20

# Contar status codes
awk '{print $9}' /var/log/nginx/chatblue-api-access.log | sort | uniq -c | sort -rn

# Requisicoes lentas (>2s)
awk '$NF > 2' /var/log/nginx/chatblue-api-access.log
```

## Analise de Erros

### Identificar Erros Frequentes

```bash
# Top 10 erros mais frequentes
grep '"level":"error"' /var/log/chatblue/api-combined.log | \
    jq -r '.message' | sort | uniq -c | sort -rn | head -10

# Erros por hora
grep '"level":"error"' /var/log/chatblue/api-combined.log | \
    jq -r '.timestamp[:13]' | sort | uniq -c

# Stack traces recentes
grep -A 20 '"stack":' /var/log/chatblue/api-error.log | tail -50
```

### Rastrear Request Especifico

```bash
# Buscar por requestId
REQUEST_ID="abc123"
grep "$REQUEST_ID" /var/log/chatblue/api-combined.log | jq .

# Ver toda a jornada do request
grep "$REQUEST_ID" /var/log/chatblue/*.log
```

### Analise de Tempo de Resposta

```bash
# Requisicoes mais lentas
cat /var/log/chatblue/api-combined.log | \
    jq -r 'select(.responseTime != null) | "\(.responseTime)ms \(.method) \(.path)"' | \
    sort -rn | head -20

# Media de tempo por endpoint
cat /var/log/chatblue/api-combined.log | \
    jq -r 'select(.responseTime != null) | "\(.path) \(.responseTime)"' | \
    awk '{sum[$1]+=$2; count[$1]++} END {for (path in sum) print path, sum[path]/count[path]}' | \
    sort -k2 -rn
```

## Logs do Nginx

### Analisar Acessos

```bash
# Requisicoes por minuto
awk '{print $4}' /var/log/nginx/chatblue-api-access.log | \
    cut -d: -f1-3 | sort | uniq -c | tail -20

# Top endpoints
awk '{print $7}' /var/log/nginx/chatblue-api-access.log | \
    sort | uniq -c | sort -rn | head -20

# Requisicoes com erro 5xx
awk '$9 ~ /^5/' /var/log/nginx/chatblue-api-access.log

# Tempo de resposta do upstream
grep "upstream_response_time" /var/log/nginx/chatblue-api-access.log | \
    awk -F'urt=' '{print $2}' | cut -d'"' -f1 | sort -rn | head -20
```

### Identificar Problemas

```bash
# 502 Bad Gateway
grep " 502 " /var/log/nginx/chatblue-api-error.log

# 504 Gateway Timeout
grep " 504 " /var/log/nginx/chatblue-api-error.log

# Conexoes recusadas
grep "Connection refused" /var/log/nginx/error.log

# Upstream timeouts
grep "upstream timed out" /var/log/nginx/error.log
```

## Logs do PostgreSQL

### Habilitar Logs Detalhados

```bash
# Editar configuracao
sudo nano /etc/postgresql/16/main/postgresql.conf
```

```ini
# Logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_statement = 'all'           # 'none', 'ddl', 'mod', 'all'
log_duration = on
log_min_duration_statement = 500  # Logar queries >500ms
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

```bash
# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### Analisar Queries Lentas

```bash
# Ver queries que demoraram mais de 1s
grep "duration:" /var/log/postgresql/postgresql-*.log | \
    awk '{if ($NF > 1000) print}'

# Queries mais frequentes
grep "LOG:  statement:" /var/log/postgresql/postgresql-*.log | \
    awk -F'statement: ' '{print $2}' | sort | uniq -c | sort -rn | head -20

# Erros de conexao
grep "FATAL" /var/log/postgresql/postgresql-*.log
```

## Logs de Debug

### Habilitar Debug no Backend

```bash
# Adicionar ao .env
LOG_LEVEL=debug
DEBUG=chatblue:*

# Reiniciar aplicacao
pm2 restart chatblue-api
```

### Debug Especifico

```typescript
// No codigo
import debug from 'debug';

const log = debug('chatblue:whatsapp');

log('Conectando sessao: %s', sessionId);
log('Mensagem recebida: %O', message);
```

```bash
# Ver logs de debug
DEBUG=chatblue:* pm2 logs chatblue-api
```

## Scripts de Analise

### Script de Relatorio Diario

```bash
sudo nano /usr/local/bin/chatblue-log-report.sh
```

```bash
#!/bin/bash

LOG_FILE="/var/log/chatblue/api-combined.log"
REPORT_FILE="/var/log/chatblue/daily-report-$(date +%Y%m%d).txt"

echo "ChatBlue - Relatorio de Logs" > $REPORT_FILE
echo "Data: $(date)" >> $REPORT_FILE
echo "========================================" >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "RESUMO DE REQUISICOES:" >> $REPORT_FILE
total=$(wc -l < $LOG_FILE)
errors=$(grep -c '"level":"error"' $LOG_FILE)
echo "Total de requisicoes: $total" >> $REPORT_FILE
echo "Total de erros: $errors" >> $REPORT_FILE
echo "Taxa de erro: $(echo "scale=2; $errors * 100 / $total" | bc)%" >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "TOP 10 ERROS:" >> $REPORT_FILE
grep '"level":"error"' $LOG_FILE | \
    jq -r '.message' 2>/dev/null | sort | uniq -c | sort -rn | head -10 >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "ENDPOINTS MAIS ACESSADOS:" >> $REPORT_FILE
cat $LOG_FILE | jq -r '.path' 2>/dev/null | sort | uniq -c | sort -rn | head -10 >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "REQUISICOES LENTAS (>1s):" >> $REPORT_FILE
cat $LOG_FILE | jq -r 'select(.responseTime > 1000) | "\(.responseTime)ms \(.method) \(.path)"' 2>/dev/null | \
    head -20 >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "USUARIOS MAIS ATIVOS:" >> $REPORT_FILE
cat $LOG_FILE | jq -r '.userId' 2>/dev/null | sort | uniq -c | sort -rn | head -10 >> $REPORT_FILE

echo "Relatorio salvo em: $REPORT_FILE"
```

### Script de Monitoramento em Tempo Real

```bash
sudo nano /usr/local/bin/chatblue-log-monitor.sh
```

```bash
#!/bin/bash

# Monitorar logs em tempo real com alertas

THRESHOLD_ERRORS=10
THRESHOLD_LATENCY=2000
CHECK_INTERVAL=60

while true; do
    # Contar erros no ultimo minuto
    errors=$(grep '"level":"error"' /var/log/chatblue/api-combined.log | \
        grep "$(date -d '1 minute ago' '+%Y-%m-%dT%H:%M')" | wc -l)

    if [ $errors -gt $THRESHOLD_ERRORS ]; then
        echo "[ALERTA] $errors erros no ultimo minuto!"
        # Enviar notificacao
    fi

    # Verificar latencia
    slow=$(cat /var/log/chatblue/api-combined.log | \
        jq -r "select(.responseTime > $THRESHOLD_LATENCY) | .timestamp" | \
        grep "$(date -d '1 minute ago' '+%Y-%m-%dT%H:%M')" | wc -l)

    if [ $slow -gt 5 ]; then
        echo "[ALERTA] $slow requisicoes lentas no ultimo minuto!"
    fi

    sleep $CHECK_INTERVAL
done
```

## Ferramentas Adicionais

### GoAccess para Nginx

```bash
# Instalar GoAccess
sudo apt install -y goaccess

# Gerar relatorio HTML
goaccess /var/log/nginx/chatblue-api-access.log -o /var/www/html/report.html --log-format=COMBINED

# Monitoramento em tempo real
goaccess /var/log/nginx/chatblue-api-access.log -c
```

### Logrotate Customizado

```bash
sudo nano /etc/logrotate.d/chatblue
```

```
/var/log/chatblue/*.log {
    daily
    rotate 14
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

## Boas Praticas

:::tip Recomendacoes
1. **Estruture os logs**: Use formato JSON para facilitar analise
2. **Inclua contexto**: RequestId, userId, timestamp
3. **Defina niveis apropriados**: error, warn, info, debug
4. **Configure rotacao**: Evite discos cheios
5. **Centralize logs**: Considere usar ELK Stack ou similar
6. **Monitore proativamente**: Configure alertas para erros
:::

## Proximos Passos

- [Problemas de WhatsApp](/troubleshooting/whatsapp)
- [Problemas de Banco de Dados](/troubleshooting/banco-dados)
- [Performance](/troubleshooting/performance)
