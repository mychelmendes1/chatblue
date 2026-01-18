---
sidebar_position: 7
title: Historico do Ticket
description: Endpoint para obter o historico completo de um ticket no ChatBlue
---

# Historico do Ticket

Retorna o historico completo de eventos de um ticket.

## Endpoint

```
GET /api/tickets/:id/history
```

## Descricao

Este endpoint retorna o historico completo de um ticket, incluindo mudancas de status, atribuicoes, transferencias, edicoes e outros eventos relevantes. O historico e util para auditoria e analise do fluxo de atendimento.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Mesmas permissoes do endpoint de [detalhes do ticket](/docs/api/tickets/detalhes).

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do ticket (CUID) |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `type` | string | - | Filtrar por tipo de evento |
| `startDate` | string | - | Data inicial (ISO 8601) |
| `endDate` | string | - | Data final (ISO 8601) |
| `limit` | number | 50 | Itens por pagina (max 100) |
| `offset` | number | 0 | Offset para paginacao |

### Tipos de Evento

| Tipo | Descricao |
|------|-----------|
| `created` | Ticket criado |
| `status_changed` | Status alterado |
| `assigned` | Atribuido a usuario |
| `unassigned` | Atribuicao removida |
| `transferred` | Transferido |
| `priority_changed` | Prioridade alterada |
| `tag_added` | Tag adicionada |
| `tag_removed` | Tag removida |
| `note_added` | Nota interna adicionada |
| `subject_changed` | Assunto alterado |
| `message_sent` | Mensagem enviada |
| `message_received` | Mensagem recebida |

### Exemplos de URL

```
# Historico completo
GET /api/tickets/clticketxxxxxxxxxxxxxxxxxx/history

# Apenas mudancas de status
GET /api/tickets/clticketxxxxxxxxxxxxxxxxxx/history?type=status_changed

# Periodo especifico
GET /api/tickets/clticketxxxxxxxxxxxxxxxxxx/history?startDate=2024-01-01&endDate=2024-01-31
```

## Response

### Sucesso (200 OK)

```json
{
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "ticketNumber": 1234,
  "history": [
    {
      "id": "clhistoryxxxxxxxxxxxxxxxxxx",
      "type": "created",
      "timestamp": "2024-01-15T10:00:00.000Z",
      "actor": null,
      "data": {
        "contact": {
          "id": "clcontactxxxxxxxxxxxxxxxxxx",
          "name": "Joao Silva",
          "phone": "+5511999999999"
        },
        "connection": {
          "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
          "name": "WhatsApp Principal"
        },
        "department": {
          "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Atendimento"
        },
        "firstMessage": "Ola, preciso de ajuda com meu pedido"
      }
    },
    {
      "id": "clhistoryyyyyyyyyyyyyyyyy",
      "type": "assigned",
      "timestamp": "2024-01-15T10:05:00.000Z",
      "actor": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente",
        "type": "user"
      },
      "data": {
        "assignedTo": {
          "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Maria Atendente"
        },
        "note": null
      }
    },
    {
      "id": "clhistoryzzzzzzzzzzzzzzzz",
      "type": "status_changed",
      "timestamp": "2024-01-15T10:05:00.000Z",
      "actor": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente",
        "type": "user"
      },
      "data": {
        "from": "PENDING",
        "to": "IN_PROGRESS",
        "duration": 300,
        "reason": null
      }
    },
    {
      "id": "clhistoryaaaaaaaaaaaaaaa",
      "type": "tag_added",
      "timestamp": "2024-01-15T10:10:00.000Z",
      "actor": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente",
        "type": "user"
      },
      "data": {
        "tag": {
          "id": "cltagxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Pedido",
          "color": "#8B5CF6"
        }
      }
    },
    {
      "id": "clhistorybbbbbbbbbbbbbb",
      "type": "priority_changed",
      "timestamp": "2024-01-15T10:15:00.000Z",
      "actor": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente",
        "type": "user"
      },
      "data": {
        "from": "NORMAL",
        "to": "HIGH",
        "reason": "Cliente VIP"
      }
    },
    {
      "id": "clhistorycccccccccccccc",
      "type": "transferred",
      "timestamp": "2024-01-15T12:00:00.000Z",
      "actor": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente",
        "type": "user"
      },
      "data": {
        "from": {
          "department": {
            "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
            "name": "Atendimento"
          },
          "user": {
            "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
            "name": "Maria Atendente"
          }
        },
        "to": {
          "department": {
            "id": "cldeptnewxxxxxxxxxxxxxxxxx",
            "name": "Suporte Tecnico"
          },
          "user": {
            "id": "clusernewxxxxxxxxxxxxxxxxx",
            "name": "Joao Tecnico"
          }
        },
        "reason": "Problema tecnico"
      }
    },
    {
      "id": "clhistorydddddddddddddd",
      "type": "note_added",
      "timestamp": "2024-01-15T14:00:00.000Z",
      "actor": {
        "id": "clusernewxxxxxxxxxxxxxxxxx",
        "name": "Joao Tecnico",
        "type": "user"
      },
      "data": {
        "note": "Cliente informou que o problema ocorre apenas no Safari"
      }
    },
    {
      "id": "clhistoryeeeeeeeeeeeee",
      "type": "status_changed",
      "timestamp": "2024-01-15T16:00:00.000Z",
      "actor": {
        "id": "clusernewxxxxxxxxxxxxxxxxx",
        "name": "Joao Tecnico",
        "type": "user"
      },
      "data": {
        "from": "IN_PROGRESS",
        "to": "RESOLVED",
        "duration": 14400,
        "reason": "Bug corrigido na versao 2.1.5"
      }
    }
  ],
  "summary": {
    "totalEvents": 8,
    "statusChanges": 2,
    "transfers": 1,
    "assignments": 1,
    "tagsAdded": 1,
    "tagsRemoved": 0,
    "notesAdded": 1,
    "totalDuration": 21600
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 8,
    "hasMore": false
  }
}
```

### Campos da Resposta

#### Objeto History Entry

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do evento |
| `type` | string | Tipo do evento |
| `timestamp` | string | Data/hora do evento (ISO 8601) |
| `actor` | object/null | Quem realizou a acao |
| `actor.type` | string | Tipo do ator (user, system, ai) |
| `data` | object | Dados especificos do evento |

#### Objeto Summary

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `totalEvents` | number | Total de eventos |
| `statusChanges` | number | Mudancas de status |
| `transfers` | number | Transferencias |
| `assignments` | number | Atribuicoes |
| `tagsAdded` | number | Tags adicionadas |
| `tagsRemoved` | number | Tags removidas |
| `notesAdded` | number | Notas adicionadas |
| `totalDuration` | number | Duracao total (segundos) |

## Erros

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden

```json
{
  "error": "Access denied",
  "code": "FORBIDDEN"
}
```

### 404 Not Found

```json
{
  "error": "Ticket not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
# Historico completo
curl -X GET https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx/history \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Apenas transferencias
curl -X GET "https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx/history?type=transferred" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getTicketHistory(ticketId, options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (options.type) params.append('type', options.type);
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());

  const url = `https://api.chatblue.io/api/tickets/${ticketId}/history?${params}`;

  const response = await fetch(url, {
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
try {
  const { history, summary } = await getTicketHistory('clticketxxxxxxxxxxxxxxxxxx');

  console.log(`Total de eventos: ${summary.totalEvents}`);
  console.log(`Transferencias: ${summary.transfers}`);
  console.log(`Duracao total: ${summary.totalDuration / 60} minutos`);

  // Mostrar timeline
  history.forEach(event => {
    const actor = event.actor?.name || 'Sistema';
    console.log(`[${event.timestamp}] ${event.type} por ${actor}`);
  });
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Componente Timeline

```typescript
import { useState, useEffect } from 'react';

interface HistoryEvent {
  id: string;
  type: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    type: string;
  } | null;
  data: any;
}

const EVENT_ICONS: Record<string, string> = {
  created: '📝',
  status_changed: '🔄',
  assigned: '👤',
  unassigned: '➖',
  transferred: '↗️',
  priority_changed: '⚡',
  tag_added: '🏷️',
  tag_removed: '🏷️',
  note_added: '📌',
  subject_changed: '✏️',
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Ticket criado',
  status_changed: 'Status alterado',
  assigned: 'Atribuido',
  unassigned: 'Atribuicao removida',
  transferred: 'Transferido',
  priority_changed: 'Prioridade alterada',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  note_added: 'Nota adicionada',
  subject_changed: 'Assunto alterado',
};

function TicketTimeline({ ticketId }: { ticketId: string }) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/history`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        const data = await response.json();
        setHistory(data.history);
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [ticketId]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const renderEventDetails = (event: HistoryEvent) => {
    switch (event.type) {
      case 'status_changed':
        return (
          <span>
            {event.data.from} → <strong>{event.data.to}</strong>
            {event.data.reason && <em> ({event.data.reason})</em>}
          </span>
        );

      case 'assigned':
        return <span>para <strong>{event.data.assignedTo.name}</strong></span>;

      case 'transferred':
        return (
          <span>
            {event.data.from.department.name} → <strong>{event.data.to.department.name}</strong>
          </span>
        );

      case 'priority_changed':
        return (
          <span>
            {event.data.from} → <strong>{event.data.to}</strong>
          </span>
        );

      case 'tag_added':
      case 'tag_removed':
        return (
          <span
            style={{
              backgroundColor: event.data.tag.color,
              padding: '2px 8px',
              borderRadius: '4px',
              color: 'white',
            }}
          >
            {event.data.tag.name}
          </span>
        );

      case 'note_added':
        return <em>"{event.data.note}"</em>;

      default:
        return null;
    }
  };

  if (loading) return <div>Carregando historico...</div>;

  return (
    <div className="ticket-timeline">
      <h3>Historico do Ticket</h3>

      <div className="timeline">
        {history.map(event => (
          <div key={event.id} className={`timeline-event ${event.type}`}>
            <span className="event-icon">{EVENT_ICONS[event.type]}</span>

            <div className="event-content">
              <div className="event-header">
                <strong>{EVENT_LABELS[event.type]}</strong>
                <span className="event-time">{formatDate(event.timestamp)}</span>
              </div>

              <div className="event-details">
                {renderEventDetails(event)}
              </div>

              <div className="event-actor">
                por {event.actor?.name || 'Sistema'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Python

```python
import requests
from datetime import datetime

def get_ticket_history(access_token, ticket_id, event_type=None, start_date=None, end_date=None):
    url = f'https://api.chatblue.io/api/tickets/{ticket_id}/history'

    params = {}
    if event_type:
        params['type'] = event_type
    if start_date:
        params['startDate'] = start_date
    if end_date:
        params['endDate'] = end_date

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
data = get_ticket_history(token, 'clticketxxx')
print(f"Ticket #{data['ticketNumber']}")
print(f"Total de eventos: {data['summary']['totalEvents']}")
print(f"Transferencias: {data['summary']['transfers']}")
print()

for event in data['history']:
    actor = event['actor']['name'] if event['actor'] else 'Sistema'
    timestamp = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00'))
    print(f"[{timestamp}] {event['type']} - {actor}")

# Filtrar por tipo
status_changes = get_ticket_history(token, 'clticketxxx', event_type='status_changed')
print(f"\nMudancas de status: {len(status_changes['history'])}")
```

## Notas Importantes

1. **Ordenacao**: Eventos sao retornados em ordem cronologica (mais antigo primeiro).

2. **Mensagens**: Eventos de mensagens (`message_sent`, `message_received`) nao sao incluidos por padrao para evitar volume excessivo. Use o endpoint de mensagens.

3. **Auditoria**: O historico e imutavel e serve como trilha de auditoria.

4. **Actor System**: Eventos automaticos (ex: timeout de SLA) tem `actor.type: 'system'`.

5. **Duracao**: O campo `duration` em `status_changed` indica quanto tempo o ticket ficou no status anterior.

## Endpoints Relacionados

- [Detalhes do Ticket](/docs/api/tickets/detalhes) - Informacoes atuais
- [Mensagens](/docs/api/mensagens/listar) - Historico de mensagens
- [Metricas](/docs/api/metricas/dashboard) - Metricas agregadas
