---
sidebar_position: 3
title: Detalhes do Ticket
description: Endpoint para obter detalhes de um ticket especifico no ChatBlue
---

# Detalhes do Ticket

Retorna informacoes detalhadas de um ticket especifico.

## Endpoint

```
GET /api/tickets/:id
```

## Descricao

Este endpoint retorna todas as informacoes de um ticket, incluindo contato, atendente, departamento, historico de status e metricas de atendimento.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Role | Acesso |
|------|--------|
| SUPER_ADMIN | Qualquer ticket |
| ADMIN | Qualquer ticket da empresa |
| SUPERVISOR | Tickets dos departamentos supervisionados |
| AGENT | Apenas tickets atribuidos ou de seus departamentos |

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do ticket (CUID) ou numero do ticket |

### Exemplos de URL

```
# Por ID
GET /api/tickets/clticketxxxxxxxxxxxxxxxxxx

# Por numero
GET /api/tickets/1234
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clticketxxxxxxxxxxxxxxxxxx",
  "number": 1234,
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "subject": "Problema com pedido #12345",
  "notes": "Cliente VIP, priorizar atendimento",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z",
  "lastMessageAt": "2024-01-15T14:28:00.000Z",
  "firstResponseAt": "2024-01-15T10:05:00.000Z",
  "resolvedAt": null,
  "closedAt": null,
  "contact": {
    "id": "clcontactxxxxxxxxxxxxxxxxxx",
    "name": "Joao Silva",
    "phone": "+5511999999999",
    "email": "joao@email.com",
    "profilePicUrl": "https://exemplo.com/pic.jpg",
    "customFields": {
      "cpf": "123.456.789-00",
      "clienteSince": "2023-01-15"
    },
    "tags": [
      {
        "id": "cltagcontactxxxxxxxxxx",
        "name": "VIP",
        "color": "#FFD700"
      }
    ]
  },
  "assignedTo": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Maria Atendente",
    "email": "maria@empresa.com",
    "avatar": "https://exemplo.com/avatar.jpg",
    "role": "AGENT",
    "isAI": false,
    "isOnline": true
  },
  "department": {
    "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Suporte",
    "color": "#3B82F6"
  },
  "connection": {
    "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
    "name": "WhatsApp Principal",
    "phone": "+5511888888888",
    "status": "CONNECTED"
  },
  "tags": [
    {
      "id": "cltagxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Urgente",
      "color": "#EF4444"
    },
    {
      "id": "cltagyyyyyyyyyyyyyyyyyyyyyy",
      "name": "Pedido",
      "color": "#8B5CF6"
    }
  ],
  "metrics": {
    "firstResponseTime": 300,
    "averageResponseTime": 180,
    "totalResponseTime": 1800,
    "resolutionTime": null,
    "messagesCount": 15,
    "agentMessagesCount": 8,
    "contactMessagesCount": 7,
    "transfers": 1,
    "reopens": 0
  },
  "statusHistory": [
    {
      "status": "PENDING",
      "changedAt": "2024-01-15T10:00:00.000Z",
      "changedBy": null,
      "duration": 300
    },
    {
      "status": "IN_PROGRESS",
      "changedAt": "2024-01-15T10:05:00.000Z",
      "changedBy": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente"
      },
      "duration": null
    }
  ],
  "previousTickets": [
    {
      "id": "clticketpreviousxxxxxxxxxx",
      "number": 1100,
      "status": "CLOSED",
      "subject": "Duvida sobre produto",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "resolvedAt": "2024-01-10T09:30:00.000Z"
    }
  ],
  "_count": {
    "messages": 15
  }
}
```

### Campos da Resposta

#### Informacoes Principais

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do ticket |
| `number` | number | Numero sequencial |
| `status` | string | Status atual |
| `priority` | string | Prioridade |
| `subject` | string/null | Assunto |
| `notes` | string/null | Notas internas (visiveis apenas para atendentes) |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Ultima atualizacao |
| `lastMessageAt` | string | Ultima mensagem |
| `firstResponseAt` | string/null | Primeira resposta |
| `resolvedAt` | string/null | Data de resolucao |
| `closedAt` | string/null | Data de encerramento |

#### Objeto `metrics`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `firstResponseTime` | number | Tempo ate primeira resposta (segundos) |
| `averageResponseTime` | number | Tempo medio de resposta (segundos) |
| `totalResponseTime` | number | Tempo total de resposta (segundos) |
| `resolutionTime` | number/null | Tempo de resolucao (segundos) |
| `messagesCount` | number | Total de mensagens |
| `agentMessagesCount` | number | Mensagens dos atendentes |
| `contactMessagesCount` | number | Mensagens do contato |
| `transfers` | number | Numero de transferencias |
| `reopens` | number | Numero de reaberturas |

#### Objeto `statusHistory`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `status` | string | Status |
| `changedAt` | string | Data da mudanca |
| `changedBy` | object/null | Quem alterou |
| `duration` | number/null | Duracao neste status (segundos) |

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
  "error": "Access denied. You can only view tickets assigned to you.",
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
# Por ID
curl -X GET https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Por numero
curl -X GET https://api.chatblue.io/api/tickets/1234 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getTicket(ticketIdOrNumber) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/tickets/${ticketIdOrNumber}`, {
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
  const ticket = await getTicket('clticketxxxxxxxxxxxxxxxxxx');

  console.log(`Ticket #${ticket.number}`);
  console.log(`Status: ${ticket.status}`);
  console.log(`Contato: ${ticket.contact.name}`);
  console.log(`Atendente: ${ticket.assignedTo?.name || 'Nao atribuido'}`);

  // Metricas
  console.log('--- Metricas ---');
  console.log(`Primeira resposta: ${ticket.metrics.firstResponseTime}s`);
  console.log(`Tempo medio: ${ticket.metrics.averageResponseTime}s`);
  console.log(`Total mensagens: ${ticket.metrics.messagesCount}`);

  // Tickets anteriores do contato
  if (ticket.previousTickets.length > 0) {
    console.log(`--- ${ticket.previousTickets.length} tickets anteriores ---`);
    ticket.previousTickets.forEach(t => {
      console.log(`#${t.number}: ${t.subject} (${t.status})`);
    });
  }
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Hook React

```typescript
import { useState, useEffect, useCallback } from 'react';

interface Ticket {
  id: string;
  number: number;
  status: string;
  priority: string;
  subject: string | null;
  contact: {
    id: string;
    name: string;
    phone: string;
    profilePicUrl: string | null;
  };
  assignedTo: {
    id: string;
    name: string;
    avatar: string | null;
    isOnline: boolean;
  } | null;
  department: {
    id: string;
    name: string;
    color: string;
  };
  metrics: {
    firstResponseTime: number;
    messagesCount: number;
  };
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export function useTicket(ticketId: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const data = await response.json();
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  return { ticket, loading, error, refetch: fetchTicket };
}

// Uso no componente
function TicketDetails({ ticketId }: { ticketId: string }) {
  const { ticket, loading, error } = useTicket(ticketId);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!ticket) return <div>Ticket nao encontrado</div>;

  return (
    <div>
      <header>
        <h1>Ticket #{ticket.number}</h1>
        <span className={`status ${ticket.status.toLowerCase()}`}>
          {ticket.status}
        </span>
        <span className={`priority ${ticket.priority.toLowerCase()}`}>
          {ticket.priority}
        </span>
      </header>

      <section className="contact">
        <img src={ticket.contact.profilePicUrl || '/default-avatar.png'} alt="" />
        <div>
          <h2>{ticket.contact.name}</h2>
          <p>{ticket.contact.phone}</p>
        </div>
      </section>

      <section className="assignment">
        <p>Departamento: {ticket.department.name}</p>
        <p>Atendente: {ticket.assignedTo?.name || 'Nao atribuido'}</p>
      </section>

      <section className="tags">
        {ticket.tags.map(tag => (
          <span key={tag.id} style={{ backgroundColor: tag.color }}>
            {tag.name}
          </span>
        ))}
      </section>

      <section className="metrics">
        <p>Primeira resposta: {formatTime(ticket.metrics.firstResponseTime)}</p>
        <p>Total mensagens: {ticket.metrics.messagesCount}</p>
      </section>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
}
```

### Python

```python
import requests

def get_ticket(access_token, ticket_id_or_number):
    url = f'https://api.chatblue.io/api/tickets/{ticket_id_or_number}'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        raise Exception('Ticket nao encontrado')
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
ticket = get_ticket(token, 1234)
print(f"Ticket #{ticket['number']}: {ticket['subject']}")
print(f"Status: {ticket['status']}")
print(f"Contato: {ticket['contact']['name']}")
print(f"Mensagens: {ticket['metrics']['messagesCount']}")

# Formatar tempo de resposta
first_response = ticket['metrics']['firstResponseTime']
print(f"Primeira resposta: {first_response // 60}min {first_response % 60}s")
```

## Notas Importantes

1. **Busca por ID ou Numero**: O endpoint aceita tanto o ID (CUID) quanto o numero do ticket.

2. **Tickets Anteriores**: O campo `previousTickets` mostra os ultimos 5 tickets encerrados do mesmo contato.

3. **Metricas em Tempo Real**: As metricas sao calculadas em tempo real e refletem o estado atual do ticket.

4. **Notas Internas**: O campo `notes` e visivel apenas para atendentes, nao para o contato.

5. **Status History**: O historico mostra todas as mudancas de status com duracao em cada um.

## Endpoints Relacionados

- [Listar Tickets](/docs/api/tickets/listar) - Ver todos os tickets
- [Atualizar Status](/docs/api/tickets/status) - Mudar status do ticket
- [Historico](/docs/api/tickets/historico) - Historico detalhado
- [Mensagens](/docs/api/mensagens/listar) - Listar mensagens do ticket
