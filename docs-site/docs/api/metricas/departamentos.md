---
sidebar_position: 4
title: Metricas de Departamentos
description: Endpoint para obter metricas de desempenho por departamento no ChatBlue
---

# Metricas de Departamentos

Retorna metricas de desempenho por departamento.

## Endpoint

```
GET /api/metrics/departments
```

## Descricao

Este endpoint retorna metricas agregadas por departamento, permitindo comparar o desempenho entre diferentes equipes e identificar gargalos no atendimento.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Role | Acesso |
|------|--------|
| SUPERVISOR | Departamentos supervisionados |
| ADMIN | Todos os departamentos |
| SUPER_ADMIN | Todos os departamentos |

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `startDate` | string | 30 dias atras | Data inicial |
| `endDate` | string | hoje | Data final |
| `departmentId` | string | - | Filtrar departamento especifico |
| `includeAgents` | boolean | false | Incluir metricas de agentes |

## Response

### Sucesso (200 OK)

```json
{
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z"
  },
  "summary": {
    "totalDepartments": 5,
    "totalTickets": 1250,
    "totalAgents": 25,
    "averageResolutionTime": 18000,
    "overallSatisfaction": 4.2
  },
  "departments": [
    {
      "department": {
        "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Suporte Tecnico",
        "color": "#3B82F6",
        "isDefault": false
      },
      "team": {
        "totalAgents": 8,
        "activeAgents": 7,
        "onlineNow": 5
      },
      "tickets": {
        "total": 450,
        "open": 35,
        "pending": 12,
        "inProgress": 18,
        "waiting": 5,
        "resolved": 320,
        "closed": 95,
        "transferredIn": 25,
        "transferredOut": 15,
        "averagePerDay": 15.0,
        "resolutionRate": 82.5
      },
      "responseTimes": {
        "firstResponse": {
          "average": 240,
          "median": 180,
          "p90": 600,
          "slaCompliance": 88.0
        },
        "resolution": {
          "average": 14400,
          "median": 10800,
          "p90": 36000,
          "slaCompliance": 82.0
        }
      },
      "messages": {
        "total": 8500,
        "sent": 4200,
        "received": 4300,
        "averagePerTicket": 18.9
      },
      "satisfaction": {
        "average": 4.3,
        "count": 280,
        "nps": 45,
        "distribution": {
          "1": 8,
          "2": 15,
          "3": 35,
          "4": 95,
          "5": 127
        }
      },
      "workload": {
        "ticketsPerAgent": 56.3,
        "messagesPerAgent": 1062.5,
        "utilizationRate": 85.0
      },
      "trend": [
        { "date": "2024-01-01", "tickets": 42, "resolved": 35, "satisfaction": 4.2 },
        { "date": "2024-01-02", "tickets": 48, "resolved": 40, "satisfaction": 4.4 }
      ],
      "topIssues": [
        { "tag": "Instalacao", "count": 120 },
        { "tag": "Configuracao", "count": 85 },
        { "tag": "Bug", "count": 65 }
      ]
    },
    {
      "department": {
        "id": "cldeptzzzzzzzzzzzzzzzzzzzzzz",
        "name": "Atendimento Geral",
        "color": "#10B981",
        "isDefault": true
      },
      "team": {
        "totalAgents": 12,
        "activeAgents": 10,
        "onlineNow": 8
      },
      "tickets": {
        "total": 650,
        "resolved": 520,
        "resolutionRate": 80.0
      },
      "responseTimes": {
        "firstResponse": {
          "average": 300,
          "slaCompliance": 85.0
        },
        "resolution": {
          "average": 21600,
          "slaCompliance": 78.0
        }
      },
      "satisfaction": {
        "average": 4.1,
        "count": 380
      }
    }
  ],
  "comparison": {
    "bestFirstResponse": {
      "departmentId": "cldeptxxx",
      "name": "Suporte Tecnico",
      "value": 240
    },
    "bestResolutionRate": {
      "departmentId": "cldeptxxx",
      "name": "Suporte Tecnico",
      "value": 82.5
    },
    "bestSatisfaction": {
      "departmentId": "cldeptxxx",
      "name": "Suporte Tecnico",
      "value": 4.3
    },
    "highestVolume": {
      "departmentId": "cldeptzzz",
      "name": "Atendimento Geral",
      "value": 650
    }
  }
}
```

### Campos da Resposta

#### Equipe

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `totalAgents` | number | Total de agentes |
| `activeAgents` | number | Agentes ativos no periodo |
| `onlineNow` | number | Online no momento |

#### Tickets

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `transferredIn` | number | Recebidos de outros departamentos |
| `transferredOut` | number | Enviados para outros departamentos |
| `averagePerDay` | number | Media diaria |
| `resolutionRate` | number | Taxa de resolucao (%) |

#### Workload

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `ticketsPerAgent` | number | Tickets por agente |
| `messagesPerAgent` | number | Mensagens por agente |
| `utilizationRate` | number | Taxa de utilizacao (%) |

## Exemplos de Codigo

### cURL

```bash
# Todos os departamentos
curl -X GET "https://api.chatblue.io/api/metrics/departments" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Departamento especifico com agentes
curl -X GET "https://api.chatblue.io/api/metrics/departments?departmentId=cldeptxxx&includeAgents=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getDepartmentMetrics(options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.departmentId) params.append('departmentId', options.departmentId);
  if (options.includeAgents) params.append('includeAgents', 'true');

  const response = await fetch(`https://api.chatblue.io/api/metrics/departments?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Uso
const data = await getDepartmentMetrics();

console.log('=== Comparacao de Departamentos ===\n');

// Ordenar por satisfacao
const sorted = [...data.departments].sort(
  (a, b) => b.satisfaction.average - a.satisfaction.average
);

sorted.forEach(item => {
  const { department, tickets, satisfaction, responseTimes } = item;
  console.log(`${department.name}`);
  console.log(`  Tickets: ${tickets.total} (${tickets.resolutionRate}% resolucao)`);
  console.log(`  Satisfacao: ${satisfaction.average}/5`);
  console.log(`  Tempo resposta: ${Math.round(responseTimes.firstResponse.average / 60)}min`);
  console.log('');
});

// Destaques
console.log('=== Destaques ===');
console.log(`Melhor satisfacao: ${data.comparison.bestSatisfaction.name}`);
console.log(`Mais rapido: ${data.comparison.bestFirstResponse.name}`);
```

### Python

```python
import requests

def get_department_metrics(access_token, **kwargs):
    url = 'https://api.chatblue.io/api/metrics/departments'
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(url, params=kwargs, headers=headers)

    if response.status_code == 200:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
data = get_department_metrics(token)

print("=== Departamentos ===\n")
for item in data['departments']:
    dept = item['department']
    tickets = item['tickets']
    sat = item['satisfaction']

    print(f"{dept['name']}")
    print(f"  Tickets: {tickets['total']}")
    print(f"  Resolucao: {tickets['resolutionRate']}%")
    print(f"  Satisfacao: {sat['average']}/5")
    print()
```

## Grafico Comparativo

```javascript
// Dados para grafico de barras
const chartData = data.departments.map(d => ({
  name: d.department.name,
  color: d.department.color,
  tickets: d.tickets.total,
  resolution: d.tickets.resolutionRate,
  satisfaction: d.satisfaction.average,
  responseTime: d.responseTimes.firstResponse.average / 60,
}));

// Usar com Chart.js, Recharts, etc.
```

## Exportar Relatorio

```
GET /api/metrics/departments/export?format=csv
GET /api/metrics/departments/export?format=xlsx
GET /api/metrics/departments/export?format=pdf
```

## Notas Importantes

1. **Departamento Padrao**: Tickets sem departamento especifico vao para o `isDefault: true`.

2. **Transferencias**: `transferredIn` e `transferredOut` ajudam a identificar gargalos.

3. **NPS**: Net Promoter Score e calculado como (promotores - detratores) / total * 100.

4. **Top Issues**: Baseado nas tags mais frequentes dos tickets.

5. **Workload**: Ajuda a balancear a distribuicao de trabalho entre equipes.

## Endpoints Relacionados

- [Dashboard](/docs/api/metricas/dashboard) - Metricas gerais
- [SLA](/docs/api/metricas/sla) - Metricas de SLA
- [Agentes](/docs/api/metricas/agentes) - Por agente
