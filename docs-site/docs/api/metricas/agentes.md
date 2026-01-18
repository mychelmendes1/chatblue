---
sidebar_position: 3
title: Metricas de Agentes
description: Endpoint para obter metricas de desempenho de agentes no ChatBlue
---

# Metricas de Agentes

Retorna metricas de desempenho dos agentes de atendimento.

## Endpoint

```
GET /api/metrics/agents
```

## Descricao

Este endpoint retorna metricas detalhadas de desempenho individual dos agentes, incluindo tickets atendidos, tempos de resposta, satisfacao do cliente e produtividade.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Role | Acesso |
|------|--------|
| AGENT | Apenas metricas proprias |
| SUPERVISOR | Agentes do departamento |
| ADMIN | Todos os agentes |
| SUPER_ADMIN | Todos os agentes |

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
| `agentId` | string | - | Filtrar agente especifico |
| `sortBy` | string | ticketsResolved | Campo para ordenacao |
| `sortOrder` | string | desc | Ordem (asc ou desc) |

### Campos para Ordenacao

- `ticketsResolved` - Tickets resolvidos
- `firstResponseTime` - Tempo de primeira resposta
- `resolutionTime` - Tempo de resolucao
- `satisfaction` - Nota de satisfacao
- `messagesCount` - Mensagens enviadas

## Response

### Sucesso (200 OK)

```json
{
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z"
  },
  "summary": {
    "totalAgents": 15,
    "activeAgents": 12,
    "averageTicketsPerAgent": 25.3,
    "averageSatisfaction": 4.2
  },
  "agents": [
    {
      "agent": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente",
        "email": "maria@empresa.com",
        "avatar": "https://exemplo.com/avatar.jpg",
        "role": "AGENT",
        "isAI": false,
        "isOnline": true,
        "departments": [
          { "id": "cldeptxxx", "name": "Suporte", "color": "#3B82F6" }
        ]
      },
      "tickets": {
        "total": 85,
        "resolved": 72,
        "pending": 8,
        "inProgress": 5,
        "transferred": 3,
        "reopened": 2,
        "resolutionRate": 84.7
      },
      "responseTimes": {
        "firstResponse": {
          "average": 180,
          "median": 120,
          "min": 30,
          "max": 900
        },
        "resolution": {
          "average": 14400,
          "median": 10800
        },
        "averageReply": 120
      },
      "messages": {
        "sent": 420,
        "averagePerTicket": 4.9,
        "averageLength": 85
      },
      "satisfaction": {
        "average": 4.5,
        "count": 45,
        "distribution": {
          "1": 1,
          "2": 2,
          "3": 5,
          "4": 15,
          "5": 22
        }
      },
      "sla": {
        "firstResponseCompliance": 92.0,
        "resolutionCompliance": 88.0
      },
      "availability": {
        "totalHours": 160,
        "activeHours": 145,
        "utilizationRate": 90.6
      },
      "ranking": {
        "position": 1,
        "ticketsRank": 1,
        "satisfactionRank": 2,
        "responseTimeRank": 3
      }
    },
    {
      "agent": {
        "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
        "name": "Joao Suporte",
        "email": "joao@empresa.com",
        "avatar": null,
        "role": "AGENT",
        "isAI": false,
        "isOnline": false
      },
      "tickets": {
        "total": 72,
        "resolved": 65,
        "pending": 4,
        "inProgress": 3,
        "transferred": 5,
        "reopened": 1,
        "resolutionRate": 90.3
      },
      "responseTimes": {
        "firstResponse": {
          "average": 240,
          "median": 180
        },
        "resolution": {
          "average": 18000,
          "median": 14400
        }
      },
      "satisfaction": {
        "average": 4.3,
        "count": 38
      },
      "ranking": {
        "position": 2
      }
    }
  ],
  "comparison": {
    "topPerformers": [
      { "agentId": "cluserxxx", "name": "Maria", "metric": "satisfaction", "value": 4.5 },
      { "agentId": "cluseryyy", "name": "Joao", "metric": "resolutionRate", "value": 90.3 }
    ],
    "needsImprovement": [
      { "agentId": "cluserzzz", "name": "Pedro", "metric": "firstResponseTime", "value": 600 }
    ]
  }
}
```

### Campos da Resposta

#### Metricas de Tickets

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `total` | number | Total atendidos |
| `resolved` | number | Resolvidos |
| `pending` | number | Pendentes atualmente |
| `inProgress` | number | Em atendimento |
| `transferred` | number | Transferidos |
| `reopened` | number | Reabertos |
| `resolutionRate` | number | Taxa de resolucao (%) |

#### Metricas de Tempo (segundos)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `firstResponse.average` | number | Media primeira resposta |
| `resolution.average` | number | Media resolucao |
| `averageReply` | number | Media entre respostas |

#### Satisfacao

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `average` | number | Nota media (1-5) |
| `count` | number | Total de avaliacoes |
| `distribution` | object | Distribuicao por nota |

## Exemplos de Codigo

### cURL

```bash
# Todos os agentes
curl -X GET "https://api.chatblue.io/api/metrics/agents" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Ordenar por satisfacao
curl -X GET "https://api.chatblue.io/api/metrics/agents?sortBy=satisfaction&sortOrder=desc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Agente especifico
curl -X GET "https://api.chatblue.io/api/metrics/agents?agentId=cluserxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getAgentMetrics(options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.departmentId) params.append('departmentId', options.departmentId);
  if (options.agentId) params.append('agentId', options.agentId);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const response = await fetch(`https://api.chatblue.io/api/metrics/agents?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Uso
const data = await getAgentMetrics({ sortBy: 'satisfaction', sortOrder: 'desc' });

console.log('=== Ranking de Agentes ===');
data.agents.forEach((item, index) => {
  const { agent, tickets, satisfaction } = item;
  console.log(`${index + 1}. ${agent.name}`);
  console.log(`   Tickets: ${tickets.resolved}/${tickets.total} (${tickets.resolutionRate}%)`);
  console.log(`   Satisfacao: ${satisfaction.average}/5 (${satisfaction.count} avaliacoes)`);
});

console.log('\n=== Destaques ===');
data.comparison.topPerformers.forEach(p => {
  console.log(`Top ${p.metric}: ${p.name} (${p.value})`);
});
```

### Python

```python
import requests

def get_agent_metrics(access_token, **kwargs):
    url = 'https://api.chatblue.io/api/metrics/agents'
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(url, params=kwargs, headers=headers)

    if response.status_code == 200:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
data = get_agent_metrics(token, sortBy='ticketsResolved', sortOrder='desc')

print("=== Top 5 Agentes ===")
for i, item in enumerate(data['agents'][:5]):
    agent = item['agent']
    tickets = item['tickets']
    print(f"{i+1}. {agent['name']}: {tickets['resolved']} tickets resolvidos")
```

## Exportar Relatorio

Para exportar em CSV ou Excel:

```
GET /api/metrics/agents/export?format=csv
GET /api/metrics/agents/export?format=xlsx
```

## Notas Importantes

1. **Privacidade**: Agentes so veem suas proprias metricas, a menos que sejam supervisores/admins.

2. **Ranking**: A posicao geral e calculada com peso em diferentes metricas.

3. **Agentes IA**: Agentes de IA (`isAI: true`) sao incluidos separadamente.

4. **Disponibilidade**: Metricas de disponibilidade requerem integracao de ponto.

## Endpoints Relacionados

- [Dashboard](/docs/api/metricas/dashboard) - Metricas gerais
- [SLA](/docs/api/metricas/sla) - Metricas de SLA
- [Departamentos](/docs/api/metricas/departamentos) - Por departamento
