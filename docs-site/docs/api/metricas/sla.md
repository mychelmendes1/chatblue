---
sidebar_position: 2
title: Metricas de SLA
description: Endpoint para obter metricas de SLA no ChatBlue
---

# Metricas de SLA

Retorna metricas de SLA (Service Level Agreement) da empresa.

## Endpoint

```
GET /api/metrics/sla
```

## Descricao

Este endpoint retorna metricas detalhadas de cumprimento de SLA, incluindo tempos de primeira resposta, resolucao e percentuais de conformidade por prioridade e departamento.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **SUPERVISOR**: Metricas do departamento
- **ADMIN**: Todas as metricas
- **SUPER_ADMIN**: Todas as metricas

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
| `departmentId` | string | - | Filtrar por departamento |
| `priority` | string | - | Filtrar por prioridade |

## Response

### Sucesso (200 OK)

```json
{
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z"
  },
  "slaConfig": {
    "firstResponse": {
      "LOW": 3600,
      "NORMAL": 1800,
      "HIGH": 900,
      "URGENT": 300
    },
    "resolution": {
      "LOW": 86400,
      "NORMAL": 43200,
      "HIGH": 21600,
      "URGENT": 7200
    }
  },
  "overall": {
    "firstResponse": {
      "compliance": 85.5,
      "totalTickets": 450,
      "withinSla": 385,
      "breached": 65,
      "averageTime": 720,
      "medianTime": 480
    },
    "resolution": {
      "compliance": 78.2,
      "totalTickets": 380,
      "withinSla": 297,
      "breached": 83,
      "averageTime": 18000,
      "medianTime": 14400
    }
  },
  "byPriority": {
    "URGENT": {
      "tickets": 45,
      "firstResponse": {
        "compliance": 92.0,
        "withinSla": 41,
        "breached": 4,
        "averageTime": 180
      },
      "resolution": {
        "compliance": 88.0,
        "withinSla": 35,
        "breached": 5,
        "averageTime": 5400
      }
    },
    "HIGH": {
      "tickets": 120,
      "firstResponse": {
        "compliance": 88.0,
        "withinSla": 106,
        "breached": 14,
        "averageTime": 540
      },
      "resolution": {
        "compliance": 82.0,
        "withinSla": 92,
        "breached": 20,
        "averageTime": 16200
      }
    },
    "NORMAL": {
      "tickets": 200,
      "firstResponse": {
        "compliance": 85.0,
        "withinSla": 170,
        "breached": 30,
        "averageTime": 900
      },
      "resolution": {
        "compliance": 76.0,
        "withinSla": 140,
        "breached": 45,
        "averageTime": 25200
      }
    },
    "LOW": {
      "tickets": 85,
      "firstResponse": {
        "compliance": 80.0,
        "withinSla": 68,
        "breached": 17,
        "averageTime": 1800
      },
      "resolution": {
        "compliance": 70.0,
        "withinSla": 55,
        "breached": 25,
        "averageTime": 43200
      }
    }
  },
  "byDepartment": [
    {
      "department": {
        "id": "cldeptxxx",
        "name": "Suporte Tecnico",
        "color": "#3B82F6"
      },
      "tickets": 180,
      "firstResponse": {
        "compliance": 90.0,
        "averageTime": 600
      },
      "resolution": {
        "compliance": 85.0,
        "averageTime": 14400
      }
    },
    {
      "department": {
        "id": "cldeptyyy",
        "name": "Atendimento",
        "color": "#10B981"
      },
      "tickets": 270,
      "firstResponse": {
        "compliance": 82.0,
        "averageTime": 840
      },
      "resolution": {
        "compliance": 73.0,
        "averageTime": 21600
      }
    }
  ],
  "trend": [
    {
      "date": "2024-01-01",
      "firstResponseCompliance": 82.0,
      "resolutionCompliance": 75.0,
      "tickets": 45
    },
    {
      "date": "2024-01-02",
      "firstResponseCompliance": 88.0,
      "resolutionCompliance": 80.0,
      "tickets": 52
    }
  ],
  "breachedTickets": [
    {
      "id": "clticketxxx",
      "number": 1234,
      "priority": "HIGH",
      "breachType": "firstResponse",
      "slaTarget": 900,
      "actualTime": 1200,
      "breachAmount": 300,
      "assignedTo": {
        "id": "cluserxxx",
        "name": "Maria Atendente"
      }
    }
  ]
}
```

### Campos da Resposta

#### SLA Config (em segundos)

| Prioridade | Primeira Resposta | Resolucao |
|------------|-------------------|-----------|
| URGENT | 5 min | 2 horas |
| HIGH | 15 min | 6 horas |
| NORMAL | 30 min | 12 horas |
| LOW | 1 hora | 24 horas |

#### Compliance (percentual)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `compliance` | number | Percentual de conformidade (0-100) |
| `totalTickets` | number | Total de tickets avaliados |
| `withinSla` | number | Dentro do SLA |
| `breached` | number | Fora do SLA |
| `averageTime` | number | Tempo medio (segundos) |

## Exemplos de Codigo

### cURL

```bash
curl -X GET "https://api.chatblue.io/api/metrics/sla?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getSlaMetrics(options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.departmentId) params.append('departmentId', options.departmentId);

  const response = await fetch(`https://api.chatblue.io/api/metrics/sla?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Uso
const sla = await getSlaMetrics();

console.log('=== SLA Geral ===');
console.log(`Primeira Resposta: ${sla.overall.firstResponse.compliance}% conformidade`);
console.log(`Resolucao: ${sla.overall.resolution.compliance}% conformidade`);

console.log('\n=== Por Prioridade ===');
Object.entries(sla.byPriority).forEach(([priority, data]) => {
  console.log(`${priority}: ${data.firstResponse.compliance}% / ${data.resolution.compliance}%`);
});

console.log('\n=== Tickets Fora do SLA ===');
sla.breachedTickets.forEach(ticket => {
  const breach = Math.round(ticket.breachAmount / 60);
  console.log(`#${ticket.number}: ${ticket.breachType} - ${breach}min acima do SLA`);
});
```

### Python

```python
import requests

def get_sla_metrics(access_token, start_date=None, end_date=None):
    url = 'https://api.chatblue.io/api/metrics/sla'
    params = {}
    if start_date:
        params['startDate'] = start_date
    if end_date:
        params['endDate'] = end_date

    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
sla = get_sla_metrics(token, '2024-01-01', '2024-01-31')

print(f"Conformidade Primeira Resposta: {sla['overall']['firstResponse']['compliance']}%")
print(f"Conformidade Resolucao: {sla['overall']['resolution']['compliance']}%")

print("\nTickets fora do SLA:")
for ticket in sla['breachedTickets'][:5]:
    print(f"  #{ticket['number']} - {ticket['breachType']}")
```

## Notas Importantes

1. **Configuracao SLA**: Os valores de SLA podem ser personalizados nas configuracoes da empresa.

2. **Horario Comercial**: O calculo de SLA considera apenas horario comercial configurado.

3. **Tickets Excluidos**: Tickets fechados pelo cliente ou duplicados nao contam no SLA.

4. **Breached Tickets**: Lista os ultimos 50 tickets fora do SLA.

## Endpoints Relacionados

- [Dashboard](/docs/api/metricas/dashboard) - Metricas gerais
- [Agentes](/docs/api/metricas/agentes) - Por agente
- [Departamentos](/docs/api/metricas/departamentos) - Por departamento
