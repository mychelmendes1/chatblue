---
sidebar_position: 6
title: Alertas de Metricas
description: Endpoints para gerenciar alertas automaticos baseados em metricas de atendimento no ChatBlue
---

# Alertas de Metricas

Endpoints para criar, listar, atualizar, remover e verificar alertas automaticos vinculados a metricas de atendimento.

## Listar Alertas

```
GET /api/metrics/alerts
```

Retorna todos os alertas configurados para a empresa.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Response - Sucesso (200 OK)

```json
[
  {
    "id": "clalert001",
    "name": "SLA abaixo de 90%",
    "metric": "slaCompliance",
    "condition": "below",
    "threshold": 90,
    "isActive": true,
    "notifyEmail": true,
    "notifyInApp": true,
    "notifyWebhook": null,
    "lastTriggeredAt": "2024-01-14T15:30:00.000Z",
    "triggerCount": 3,
    "companyId": "clcompany001",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-14T15:30:00.000Z"
  },
  {
    "id": "clalert002",
    "name": "Tempo de resposta alto",
    "metric": "avgResponseTime",
    "condition": "above",
    "threshold": 300,
    "isActive": true,
    "notifyEmail": true,
    "notifyInApp": true,
    "notifyWebhook": "https://hooks.example.com/alerts",
    "lastTriggeredAt": null,
    "triggerCount": 0,
    "companyId": "clcompany001",
    "createdAt": "2024-01-12T08:00:00.000Z",
    "updatedAt": "2024-01-12T08:00:00.000Z"
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do alerta |
| `name` | string | Nome descritivo do alerta |
| `metric` | string | Metrica monitorada (ver tabela abaixo) |
| `condition` | string | Condicao de disparo: `below`, `above`, `equals` |
| `threshold` | number | Valor limite para disparo |
| `isActive` | boolean | Se o alerta esta ativo |
| `notifyEmail` | boolean | Notificar por e-mail |
| `notifyInApp` | boolean | Notificar no painel |
| `notifyWebhook` | string/null | URL de webhook para notificacao |
| `lastTriggeredAt` | string/null | Data/hora do ultimo disparo |
| `triggerCount` | number | Quantidade total de disparos |

### Metricas Disponiveis

| Metrica | Descricao | Exemplo de uso |
|---------|-----------|----------------|
| `totalTickets` | Total de tickets | Acima de 500 tickets no mes |
| `slaCompliance` | Conformidade SLA (%) | Abaixo de 90% |
| `avgResponseTime` | Tempo medio de resposta (seg) | Acima de 300 segundos |
| `avgRating` | Nota media de avaliacao | Abaixo de 4.0 |
| `nps` | Net Promoter Score | Abaixo de 50 |
| `fcrRate` | Taxa de resolucao no primeiro contato (%) | Abaixo de 70% |
| `abandonRate` | Taxa de abandono (%) | Acima de 10% |

---

## Criar Alerta

```
POST /api/metrics/alerts
```

Cria um novo alerta de metrica.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

Requer role `SUPERVISOR` ou superior.

### Request Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome descritivo do alerta |
| `metric` | string | Sim | Metrica a monitorar |
| `condition` | string | Sim | Condicao: `below`, `above`, `equals` |
| `threshold` | number | Sim | Valor limite |
| `notifyEmail` | boolean | Nao | Notificar por e-mail (padrao: true) |
| `notifyInApp` | boolean | Nao | Notificar no painel (padrao: true) |
| `notifyWebhook` | string | Nao | URL de webhook para notificacao |

```json
{
  "name": "SLA abaixo de 90%",
  "metric": "slaCompliance",
  "condition": "below",
  "threshold": 90,
  "notifyEmail": true,
  "notifyInApp": true,
  "notifyWebhook": "https://hooks.example.com/alerts"
}
```

### Response - Sucesso (201 Created)

```json
{
  "id": "clalert003",
  "name": "SLA abaixo de 90%",
  "metric": "slaCompliance",
  "condition": "below",
  "threshold": 90,
  "isActive": true,
  "notifyEmail": true,
  "notifyInApp": true,
  "notifyWebhook": "https://hooks.example.com/alerts",
  "lastTriggeredAt": null,
  "triggerCount": 0,
  "companyId": "clcompany001",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

---

## Atualizar Alerta

```
PUT /api/metrics/alerts/:id
```

Atualiza um alerta existente.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

Requer role `SUPERVISOR` ou superior.

### Parametros de Rota

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do alerta |

### Request Body

Todos os campos sao opcionais. Envie apenas os campos que deseja alterar.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `name` | string | Nome descritivo |
| `metric` | string | Metrica monitorada |
| `condition` | string | Condicao de disparo |
| `threshold` | number | Valor limite |
| `isActive` | boolean | Ativar/desativar alerta |
| `notifyEmail` | boolean | Notificar por e-mail |
| `notifyInApp` | boolean | Notificar no painel |
| `notifyWebhook` | string | URL de webhook |

```json
{
  "threshold": 85,
  "isActive": false
}
```

### Response - Sucesso (200 OK)

```json
{
  "id": "clalert003",
  "name": "SLA abaixo de 90%",
  "metric": "slaCompliance",
  "condition": "below",
  "threshold": 85,
  "isActive": false,
  "notifyEmail": true,
  "notifyInApp": true,
  "notifyWebhook": "https://hooks.example.com/alerts",
  "lastTriggeredAt": null,
  "triggerCount": 0,
  "companyId": "clcompany001",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

---

## Deletar Alerta

```
DELETE /api/metrics/alerts/:id
```

Remove permanentemente um alerta.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

Requer role `SUPERVISOR` ou superior.

### Parametros de Rota

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do alerta |

### Response - Sucesso (204 No Content)

Sem corpo na resposta.

### Erros

| Status | Descricao |
|--------|-----------|
| 404 | Alerta nao encontrado ou nao pertence a empresa |

---

## Verificar Alertas

```
POST /api/metrics/alerts/check
```

Executa a verificacao de todos os alertas ativos da empresa. Compara os valores atuais das metricas com os limites configurados e dispara os alertas que atendem as condicoes.

Este endpoint pode ser chamado manualmente ou integrado a um cron job.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

Requer role `SUPERVISOR` ou superior.

### Request Body

Nenhum.

### Response - Sucesso (200 OK)

```json
{
  "checked": 5,
  "triggered": 2,
  "alerts": [
    {
      "alert": {
        "id": "clalert001",
        "name": "SLA abaixo de 90%",
        "metric": "slaCompliance",
        "condition": "below",
        "threshold": 90
      },
      "currentValue": 87.5,
      "message": "Alerta \"SLA abaixo de 90%\": slaCompliance esta abaixo 90 (atual: 87.5)"
    },
    {
      "alert": {
        "id": "clalert004",
        "name": "Taxa de abandono alta",
        "metric": "abandonRate",
        "condition": "above",
        "threshold": 10
      },
      "currentValue": 12.3,
      "message": "Alerta \"Taxa de abandono alta\": abandonRate esta acima 10 (atual: 12.3)"
    }
  ]
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `checked` | number | Quantidade de alertas verificados |
| `triggered` | number | Quantidade de alertas disparados |
| `alerts` | array | Lista de alertas que foram disparados |
| `alerts[].alert` | object | Dados do alerta disparado |
| `alerts[].currentValue` | number | Valor atual da metrica |
| `alerts[].message` | string | Mensagem descritiva do disparo |

### Comportamento

- Apenas alertas com `isActive: true` sao verificados.
- As metricas sao calculadas com base nos dados do mes atual.
- Alertas disparados tem `lastTriggeredAt` atualizado e `triggerCount` incrementado.
- A condicao `below` dispara quando o valor atual e menor que o threshold.
- A condicao `above` dispara quando o valor atual e maior que o threshold.
- A condicao `equals` dispara quando o valor atual e aproximadamente igual ao threshold (tolerancia de 0.01).

---

## Exemplos de Codigo

### cURL

```bash
# Listar alertas
curl -X GET "https://api.chatblue.io/api/metrics/alerts" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Criar alerta
curl -X POST "https://api.chatblue.io/api/metrics/alerts" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NPS abaixo de 50",
    "metric": "nps",
    "condition": "below",
    "threshold": 50,
    "notifyEmail": true,
    "notifyInApp": true
  }'

# Verificar alertas
curl -X POST "https://api.chatblue.io/api/metrics/alerts/check" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Desativar alerta
curl -X PUT "https://api.chatblue.io/api/metrics/alerts/clalert001" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# Deletar alerta
curl -X DELETE "https://api.chatblue.io/api/metrics/alerts/clalert001" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### JavaScript (Fetch)

```javascript
const API_BASE = 'https://api.chatblue.io/api/metrics';

async function checkAlerts(accessToken) {
  const response = await fetch(`${API_BASE}/alerts/check`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  return response.json();
}

async function createAlert(accessToken, alert) {
  const response = await fetch(`${API_BASE}/alerts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(alert),
  });
  return response.json();
}

// Uso
const result = await checkAlerts(token);
if (result.triggered > 0) {
  console.log(`${result.triggered} alertas disparados:`);
  result.alerts.forEach(a => console.log(a.message));
}
```

## Notas Importantes

1. **Verificacao manual vs automatica**: O endpoint `/alerts/check` pode ser integrado a um cron job para verificacao periodica.

2. **Webhook**: Quando `notifyWebhook` esta configurado, o sistema envia um POST para a URL com os dados do alerta disparado.

3. **Historico**: O `triggerCount` e `lastTriggeredAt` permitem acompanhar a frequencia de disparos.

4. **Janela de calculo**: As metricas sao calculadas com base no mes vigente (desde o primeiro dia do mes atual).

## Endpoints Relacionados

- [Metas de Metricas](/docs/api/metricas/metas) - Metas de desempenho
- [Metricas do Dashboard](/docs/api/metricas/dashboard) - Visao geral das metricas
- [Metricas SLA](/docs/api/metricas/sla) - Metricas de SLA
