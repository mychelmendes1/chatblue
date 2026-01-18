---
sidebar_position: 1
title: Metricas do Dashboard
description: Endpoint para obter metricas gerais do dashboard no ChatBlue
---

# Metricas do Dashboard

Retorna metricas gerais para o dashboard de atendimento.

## Endpoint

```
GET /api/metrics/dashboard
```

## Descricao

Este endpoint retorna um resumo das metricas de atendimento da empresa, incluindo contadores de tickets, tempos de resposta, volume de mensagens e desempenho por periodo.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Role | Acesso |
|------|--------|
| AGENT | Apenas metricas proprias |
| SUPERVISOR | Metricas do departamento |
| ADMIN | Todas as metricas da empresa |
| SUPER_ADMIN | Todas as metricas |

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `startDate` | string | 7 dias atras | Data inicial (ISO 8601) |
| `endDate` | string | hoje | Data final (ISO 8601) |
| `departmentId` | string | - | Filtrar por departamento |
| `connectionId` | string | - | Filtrar por conexao |

### Exemplos de URL

```
# Ultimos 7 dias (padrao)
GET /api/metrics/dashboard

# Periodo personalizado
GET /api/metrics/dashboard?startDate=2024-01-01&endDate=2024-01-31

# Por departamento
GET /api/metrics/dashboard?departmentId=cldeptxxxxxxxxxxxxxxxxxxxxxx
```

## Response

### Sucesso (200 OK)

```json
{
  "period": {
    "startDate": "2024-01-08T00:00:00.000Z",
    "endDate": "2024-01-15T23:59:59.999Z",
    "days": 7
  },
  "tickets": {
    "total": 450,
    "open": 85,
    "pending": 25,
    "inProgress": 45,
    "waiting": 15,
    "resolved": 280,
    "closed": 85,
    "newToday": 32,
    "resolvedToday": 28,
    "change": {
      "total": 12.5,
      "resolved": 8.3
    }
  },
  "responseTimes": {
    "firstResponse": {
      "average": 180,
      "median": 120,
      "min": 15,
      "max": 1800,
      "p90": 600
    },
    "resolution": {
      "average": 7200,
      "median": 5400,
      "min": 300,
      "max": 86400,
      "p90": 21600
    }
  },
  "messages": {
    "total": 8500,
    "sent": 4200,
    "received": 4300,
    "averagePerTicket": 18.9,
    "todayTotal": 320
  },
  "contacts": {
    "total": 1250,
    "new": 85,
    "returning": 365,
    "newToday": 12
  },
  "satisfaction": {
    "average": 4.2,
    "total": 180,
    "distribution": {
      "1": 5,
      "2": 10,
      "3": 25,
      "4": 60,
      "5": 80
    }
  },
  "hourlyDistribution": [
    { "hour": 0, "tickets": 5, "messages": 20 },
    { "hour": 1, "tickets": 3, "messages": 12 },
    { "hour": 8, "tickets": 45, "messages": 180 },
    { "hour": 9, "tickets": 62, "messages": 250 },
    { "hour": 10, "tickets": 58, "messages": 230 }
  ],
  "dailyTrend": [
    { "date": "2024-01-08", "tickets": 58, "resolved": 45, "messages": 980 },
    { "date": "2024-01-09", "tickets": 62, "resolved": 52, "messages": 1100 },
    { "date": "2024-01-10", "tickets": 55, "resolved": 48, "messages": 920 }
  ],
  "topTags": [
    { "id": "cltagxxx", "name": "Suporte", "count": 120 },
    { "id": "cltagyyy", "name": "Vendas", "count": 85 },
    { "id": "cltagzzz", "name": "Financeiro", "count": 65 }
  ]
}
```

### Campos da Resposta

#### Tickets

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `total` | number | Total de tickets no periodo |
| `open` | number | Tickets abertos atualmente |
| `pending` | number | Aguardando atendimento |
| `inProgress` | number | Em atendimento |
| `waiting` | number | Aguardando cliente |
| `resolved` | number | Resolvidos no periodo |
| `closed` | number | Encerrados no periodo |
| `newToday` | number | Novos hoje |
| `resolvedToday` | number | Resolvidos hoje |
| `change` | object | Variacao percentual vs periodo anterior |

#### Response Times (em segundos)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `average` | number | Media |
| `median` | number | Mediana |
| `min` | number | Minimo |
| `max` | number | Maximo |
| `p90` | number | Percentil 90 |

## Exemplos de Codigo

### cURL

```bash
curl -X GET "https://api.chatblue.io/api/metrics/dashboard?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getDashboardMetrics(options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.departmentId) params.append('departmentId', options.departmentId);

  const response = await fetch(`https://api.chatblue.io/api/metrics/dashboard?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
const metrics = await getDashboardMetrics();

console.log(`Tickets abertos: ${metrics.tickets.open}`);
console.log(`Tempo medio de primeira resposta: ${Math.round(metrics.responseTimes.firstResponse.average / 60)} min`);
console.log(`Taxa de resolucao: ${Math.round((metrics.tickets.resolved / metrics.tickets.total) * 100)}%`);
```

### Python

```python
import requests
from datetime import datetime, timedelta

def get_dashboard_metrics(access_token, start_date=None, end_date=None, department_id=None):
    url = 'https://api.chatblue.io/api/metrics/dashboard'

    params = {}
    if start_date:
        params['startDate'] = start_date
    if end_date:
        params['endDate'] = end_date
    if department_id:
        params['departmentId'] = department_id

    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(response.json().get('error', 'Erro'))

# Uso
metrics = get_dashboard_metrics(token)
print(f"Tickets abertos: {metrics['tickets']['open']}")
print(f"Tempo medio resposta: {metrics['responseTimes']['firstResponse']['average'] / 60:.1f} min")
```

## Notas Importantes

1. **Cache**: Resultados sao cacheados por 5 minutos para melhorar performance.

2. **Periodos**: Dados historicos estao disponiveis por ate 90 dias.

3. **Fuso Horario**: Datas sao processadas no fuso horario da empresa.

4. **Change**: A variacao e calculada comparando com o periodo anterior de mesma duracao.

## Endpoints Relacionados

- [Metricas SLA](/docs/api/metricas/sla) - Metricas de SLA
- [Metricas Agentes](/docs/api/metricas/agentes) - Por agente
- [Metricas Departamentos](/docs/api/metricas/departamentos) - Por departamento
