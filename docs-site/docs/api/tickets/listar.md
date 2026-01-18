---
sidebar_position: 1
title: Listar Tickets
description: Endpoint para listar tickets de atendimento no ChatBlue
---

# Listar Tickets

Retorna a lista de tickets de atendimento da empresa.

## Endpoint

```
GET /api/tickets
```

## Descricao

Este endpoint retorna os tickets de atendimento da empresa, com suporte a filtros, ordenacao e paginacao. Os tickets representam conversas de atendimento com clientes via WhatsApp.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Role | Acesso |
|------|--------|
| SUPER_ADMIN | Todos os tickets |
| ADMIN | Todos os tickets da empresa |
| SUPERVISOR | Tickets dos departamentos supervisionados |
| AGENT | Apenas tickets atribuidos ou nao atribuidos |

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `status` | string | - | Filtrar por status (PENDING, IN_PROGRESS, WAITING, RESOLVED, CLOSED) |
| `departmentId` | string | - | Filtrar por departamento |
| `assignedToId` | string | - | Filtrar por atendente |
| `connectionId` | string | - | Filtrar por conexao WhatsApp |
| `contactId` | string | - | Filtrar por contato |
| `priority` | string | - | Filtrar por prioridade (LOW, NORMAL, HIGH, URGENT) |
| `unassigned` | boolean | - | Apenas tickets nao atribuidos |
| `search` | string | - | Busca por numero, nome ou telefone do contato |
| `startDate` | string | - | Data inicial (ISO 8601) |
| `endDate` | string | - | Data final (ISO 8601) |
| `page` | number | 1 | Numero da pagina |
| `limit` | number | 20 | Itens por pagina (max 100) |
| `sortBy` | string | updatedAt | Campo para ordenacao |
| `sortOrder` | string | desc | Ordem (asc ou desc) |

### Exemplos de URL

```
# Listar tickets pendentes
GET /api/tickets?status=PENDING

# Tickets de um departamento
GET /api/tickets?departmentId=cldeptxxxxxxxxxxxxxxxxxxxxxx

# Tickets nao atribuidos
GET /api/tickets?unassigned=true

# Busca por nome ou telefone
GET /api/tickets?search=joao

# Tickets urgentes
GET /api/tickets?priority=URGENT

# Paginacao
GET /api/tickets?page=2&limit=50

# Combinar filtros
GET /api/tickets?status=IN_PROGRESS&departmentId=cldeptxxx&sortBy=createdAt&sortOrder=asc
```

## Response

### Sucesso (200 OK)

```json
{
  "tickets": [
    {
      "id": "clticketxxxxxxxxxxxxxxxxxx",
      "number": 1234,
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "subject": "Problema com pedido",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T14:30:00.000Z",
      "lastMessageAt": "2024-01-15T14:28:00.000Z",
      "firstResponseAt": "2024-01-15T10:05:00.000Z",
      "resolvedAt": null,
      "contact": {
        "id": "clcontactxxxxxxxxxxxxxxxxxx",
        "name": "Joao Silva",
        "phone": "+5511999999999",
        "profilePicUrl": "https://exemplo.com/pic.jpg"
      },
      "assignedTo": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente",
        "avatar": "https://exemplo.com/avatar.jpg",
        "isAI": false
      },
      "department": {
        "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Suporte",
        "color": "#3B82F6"
      },
      "connection": {
        "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
        "name": "WhatsApp Principal",
        "phone": "+5511888888888"
      },
      "lastMessage": {
        "id": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
        "content": "Obrigado, vou verificar",
        "type": "text",
        "fromMe": false,
        "createdAt": "2024-01-15T14:28:00.000Z"
      },
      "_count": {
        "messages": 15
      },
      "tags": [
        {
          "id": "cltagxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Urgente",
          "color": "#EF4444"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Campos da Resposta

#### Objeto Ticket

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do ticket (CUID) |
| `number` | number | Numero sequencial do ticket |
| `status` | string | Status atual |
| `priority` | string | Prioridade |
| `subject` | string/null | Assunto do ticket |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Ultima atualizacao |
| `lastMessageAt` | string | Data da ultima mensagem |
| `firstResponseAt` | string/null | Data da primeira resposta |
| `resolvedAt` | string/null | Data de resolucao |
| `contact` | object | Dados do contato |
| `assignedTo` | object/null | Atendente atribuido |
| `department` | object | Departamento |
| `connection` | object | Conexao WhatsApp |
| `lastMessage` | object | Ultima mensagem |
| `_count.messages` | number | Total de mensagens |
| `tags` | array | Tags atribuidas |

### Status Disponiveis

| Status | Descricao |
|--------|-----------|
| `PENDING` | Aguardando atendimento |
| `IN_PROGRESS` | Em atendimento |
| `WAITING` | Aguardando cliente |
| `RESOLVED` | Resolvido |
| `CLOSED` | Encerrado |

### Prioridades

| Prioridade | Descricao |
|------------|-----------|
| `LOW` | Baixa |
| `NORMAL` | Normal |
| `HIGH` | Alta |
| `URGENT` | Urgente |

## Erros

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

## Exemplos de Codigo

### cURL

```bash
# Listar tickets pendentes
curl -X GET "https://api.chatblue.io/api/tickets?status=PENDING" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Buscar ticket por numero
curl -X GET "https://api.chatblue.io/api/tickets?search=1234" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function listTickets(filters = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();

  // Adicionar filtros
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });

  const url = `https://api.chatblue.io/api/tickets?${params}`;

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
  // Listar tickets pendentes
  const { tickets, pagination } = await listTickets({ status: 'PENDING' });
  console.log(`Tickets pendentes: ${pagination.total}`);

  // Listar tickets de um departamento
  const deptTickets = await listTickets({
    departmentId: 'cldeptxxxxxxxxxxxxxxxxxxxxxx',
    status: 'IN_PROGRESS',
  });

  // Busca com paginacao
  const page2 = await listTickets({
    page: 2,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Tickets nao atribuidos e urgentes
  const urgentUnassigned = await listTickets({
    unassigned: true,
    priority: 'URGENT',
  });
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Hook React com Paginacao

```typescript
import { useState, useEffect, useCallback } from 'react';

interface Ticket {
  id: string;
  number: number;
  status: string;
  priority: string;
  contact: {
    name: string;
    phone: string;
  };
  assignedTo: {
    name: string;
  } | null;
  lastMessage: {
    content: string;
    createdAt: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UseTicketsOptions {
  status?: string;
  departmentId?: string;
  assignedToId?: string;
  unassigned?: boolean;
  search?: string;
  limit?: number;
}

export function useTickets(options: UseTicketsOptions = {}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: (options.limit || 20).toString(),
      });

      if (options.status) params.append('status', options.status);
      if (options.departmentId) params.append('departmentId', options.departmentId);
      if (options.assignedToId) params.append('assignedToId', options.assignedToId);
      if (options.unassigned) params.append('unassigned', 'true');
      if (options.search) params.append('search', options.search);

      const response = await fetch(`/api/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) throw new Error('Erro ao carregar tickets');

      const data = await response.json();
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [page, options]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const nextPage = () => {
    if (pagination?.hasNext) setPage(p => p + 1);
  };

  const prevPage = () => {
    if (pagination?.hasPrev) setPage(p => p - 1);
  };

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= (pagination?.totalPages || 1)) {
      setPage(pageNum);
    }
  };

  return {
    tickets,
    pagination,
    loading,
    error,
    page,
    nextPage,
    prevPage,
    goToPage,
    refetch: fetchTickets,
  };
}
```

### Python

```python
import requests
from urllib.parse import urlencode

def list_tickets(access_token, **filters):
    url = 'https://api.chatblue.io/api/tickets'

    # Remover filtros vazios
    params = {k: v for k, v in filters.items() if v is not None}

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
data = list_tickets(token, status='PENDING')
print(f"Total de tickets pendentes: {data['pagination']['total']}")

for ticket in data['tickets']:
    print(f"#{ticket['number']} - {ticket['contact']['name']}: {ticket['status']}")

# Com paginacao
page = 1
all_tickets = []
while True:
    data = list_tickets(token, page=page, limit=100)
    all_tickets.extend(data['tickets'])
    if not data['pagination']['hasNext']:
        break
    page += 1

print(f"Total carregado: {len(all_tickets)}")
```

## Notas Importantes

1. **Visibilidade por Role**: Agentes so veem tickets atribuidos a eles ou sem atribuicao.

2. **Ordenacao Padrao**: Por padrao, tickets sao ordenados por `updatedAt` decrescente.

3. **Limite de Resultados**: Maximo de 100 tickets por requisicao.

4. **Busca**: O campo `search` busca por numero do ticket, nome ou telefone do contato.

5. **Performance**: Use filtros para melhorar a performance em empresas com muitos tickets.

## Endpoints Relacionados

- [Criar Ticket](/docs/api/tickets/criar) - Criar novo ticket
- [Detalhes do Ticket](/docs/api/tickets/detalhes) - Obter ticket especifico
- [Atualizar Status](/docs/api/tickets/status) - Mudar status do ticket
