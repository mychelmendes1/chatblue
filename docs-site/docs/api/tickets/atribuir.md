---
sidebar_position: 5
title: Atribuir Ticket
description: Endpoint para atribuir um ticket a um atendente no ChatBlue
---

# Atribuir Ticket

Atribui um ticket a um atendente.

## Endpoint

```
POST /api/tickets/:id/assign
```

## Descricao

Este endpoint permite atribuir um ticket a um atendente especifico. A atribuicao muda automaticamente o status do ticket para `IN_PROGRESS` se estiver `PENDING`.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Role | Acesso |
|------|--------|
| AGENT | Pode se auto-atribuir tickets nao atribuidos |
| SUPERVISOR | Pode atribuir a si ou membros do departamento |
| ADMIN | Pode atribuir a qualquer usuario |
| SUPER_ADMIN | Pode atribuir a qualquer usuario |

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do ticket (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `userId` | string | Nao | ID do usuario a atribuir (omitir para auto-atribuicao) |
| `note` | string | Nao | Nota sobre a atribuicao |

### Exemplo de Request

Atribuir a outro usuario:

```json
{
  "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "note": "Especialista em problemas tecnicos"
}
```

Auto-atribuicao:

```json
{}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clticketxxxxxxxxxxxxxxxxxx",
  "number": 1234,
  "status": "IN_PROGRESS",
  "previousStatus": "PENDING",
  "previousAssignee": null,
  "assignedTo": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Maria Atendente",
    "email": "maria@empresa.com",
    "avatar": "https://exemplo.com/avatar.jpg",
    "role": "AGENT",
    "isAI": false
  },
  "assignedBy": {
    "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
    "name": "Carlos Supervisor"
  },
  "assignedAt": "2024-01-15T14:00:00.000Z",
  "note": "Especialista em problemas tecnicos",
  "isFirstResponse": true
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID do ticket |
| `number` | number | Numero do ticket |
| `status` | string | Status apos atribuicao |
| `previousStatus` | string | Status anterior |
| `previousAssignee` | object/null | Atendente anterior |
| `assignedTo` | object | Novo atendente |
| `assignedBy` | object | Quem fez a atribuicao |
| `assignedAt` | string | Data/hora da atribuicao |
| `note` | string/null | Nota da atribuicao |
| `isFirstResponse` | boolean | Se e a primeira atribuicao |

## Erros

### 400 Bad Request - Ja Atribuido

```json
{
  "error": "Ticket is already assigned to this user",
  "code": "ALREADY_ASSIGNED"
}
```

### 400 Bad Request - Usuario Inativo

```json
{
  "error": "Cannot assign to inactive user",
  "code": "USER_INACTIVE"
}
```

### 400 Bad Request - Fora do Departamento

```json
{
  "error": "User is not a member of the ticket's department",
  "code": "USER_NOT_IN_DEPARTMENT"
}
```

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
  "error": "You can only assign tickets to yourself or your team members",
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
# Auto-atribuicao
curl -X POST https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx/assign \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{}'

# Atribuir a outro usuario
curl -X POST https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx/assign \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "note": "Atendente especializado"
  }'
```

### JavaScript (Fetch)

```javascript
async function assignTicket(ticketId, userId = null, note = null) {
  const accessToken = localStorage.getItem('accessToken');

  const body = {};
  if (userId) body.userId = userId;
  if (note) body.note = note;

  const response = await fetch(`https://api.chatblue.io/api/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Auto-atribuicao
try {
  const result = await assignTicket('clticketxxxxxxxxxxxxxxxxxx');
  console.log(`Ticket atribuido a ${result.assignedTo.name}`);
} catch (error) {
  console.error('Erro:', error.message);
}

// Atribuir a colega
try {
  const result = await assignTicket(
    'clticketxxxxxxxxxxxxxxxxxx',
    'cluserxxxxxxxxxxxxxxxxxxxxxx',
    'Especialista em financeiro'
  );

  console.log(`Ticket #${result.number} atribuido a ${result.assignedTo.name}`);
  console.log(`Status: ${result.status}`);
} catch (error) {
  if (error.message.includes('not a member')) {
    console.error('Usuario nao pertence ao departamento do ticket');
  } else {
    console.error('Erro:', error.message);
  }
}
```

### JavaScript - Componente de Atribuicao

```typescript
import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  avatar: string | null;
  isOnline: boolean;
  _count: { tickets: number };
}

interface AssignTicketProps {
  ticketId: string;
  departmentId: string;
  currentAssignee: User | null;
  onAssign: (user: User) => void;
}

function AssignTicket({ ticketId, departmentId, currentAssignee, onAssign }: AssignTicketProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Carregar usuarios do departamento
  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const response = await fetch(`/api/departments/${departmentId}/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        const data = await response.json();
        setUsers(data.users);
      } catch (err) {
        console.error('Erro ao carregar usuarios:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [departmentId]);

  const handleAssign = async (userId: string) => {
    setAssigning(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      onAssign(result.assignedTo);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atribuir');
    } finally {
      setAssigning(false);
    }
  };

  // Ordenar: online primeiro, depois por menos tickets
  const sortedUsers = [...users].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return b.isOnline ? 1 : -1;
    return a._count.tickets - b._count.tickets;
  });

  if (loading) return <div>Carregando usuarios...</div>;

  return (
    <div className="assign-ticket">
      <h3>Atribuir Ticket</h3>

      {currentAssignee && (
        <div className="current-assignee">
          Atual: {currentAssignee.name}
        </div>
      )}

      <div className="user-list">
        {sortedUsers.map(user => (
          <button
            key={user.id}
            onClick={() => handleAssign(user.id)}
            disabled={assigning || user.id === currentAssignee?.id}
            className={`user-item ${user.isOnline ? 'online' : 'offline'}`}
          >
            <img src={user.avatar || '/default-avatar.png'} alt="" />
            <div className="user-info">
              <span className="name">{user.name}</span>
              <span className="status">
                {user.isOnline ? '● Online' : '○ Offline'}
              </span>
              <span className="tickets">{user._count.tickets} tickets</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => handleAssign('')}
        disabled={assigning || !currentAssignee}
        className="unassign-btn"
      >
        Remover Atribuicao
      </button>
    </div>
  );
}
```

### Python

```python
import requests

def assign_ticket(access_token, ticket_id, user_id=None, note=None):
    url = f'https://api.chatblue.io/api/tickets/{ticket_id}/assign'

    payload = {}
    if user_id:
        payload['userId'] = user_id
    if note:
        payload['note'] = note

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Auto-atribuicao
result = assign_ticket(token, 'clticketxxx')
print(f"Ticket atribuido a: {result['assignedTo']['name']}")

# Atribuir a outro usuario
result = assign_ticket(token, 'clticketxxx', user_id='cluserxxx', note='Especialista')
print(f"Atribuido a: {result['assignedTo']['name']}")
```

## Remover Atribuicao

Para remover a atribuicao de um ticket, envie `userId: null`:

```json
{
  "userId": null,
  "note": "Retornando para fila"
}
```

Isso muda o status para `PENDING` se estava `IN_PROGRESS`.

## Balanceamento Automatico

Para distribuir tickets automaticamente, use o endpoint de transferencia com `auto: true`:

```json
POST /api/tickets/:id/transfer
{
  "departmentId": "cldeptxxx",
  "auto": true
}
```

Isso atribui ao usuario online com menos tickets no departamento.

## Eventos WebSocket

Quando um ticket e atribuido:

```javascript
socket.on('ticket:assigned', (data) => {
  console.log(`Ticket #${data.ticketNumber} atribuido`);
  console.log(`De: ${data.previousAssignee?.name || 'Ninguem'}`);
  console.log(`Para: ${data.assignedTo.name}`);
});
```

## Notas Importantes

1. **Mudanca de Status**: Se o ticket estiver `PENDING`, a atribuicao muda para `IN_PROGRESS`.

2. **Departamento**: O usuario deve pertencer ao departamento do ticket.

3. **Usuarios Inativos**: Nao e possivel atribuir a usuarios inativos.

4. **First Response**: A primeira atribuicao registra o `firstResponseAt`.

5. **Historico**: A atribuicao e registrada no historico do ticket.

## Endpoints Relacionados

- [Transferir Ticket](/docs/api/tickets/transferir) - Transferir para outro departamento
- [Atualizar Status](/docs/api/tickets/status) - Mudar status do ticket
- [Usuarios do Departamento](/docs/api/departamentos/usuarios) - Listar usuarios
