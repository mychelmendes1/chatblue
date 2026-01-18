---
sidebar_position: 6
title: Transferir Ticket
description: Endpoint para transferir um ticket para outro departamento ou atendente no ChatBlue
---

# Transferir Ticket

Transfere um ticket para outro departamento ou atendente.

## Endpoint

```
POST /api/tickets/:id/transfer
```

## Descricao

Este endpoint permite transferir um ticket para outro departamento ou atendente. A transferencia mantem todo o historico de mensagens e registra a mudanca no historico do ticket.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Role | Acesso |
|------|--------|
| AGENT | Pode transferir tickets atribuidos a si |
| SUPERVISOR | Pode transferir tickets do departamento |
| ADMIN | Pode transferir qualquer ticket |
| SUPER_ADMIN | Pode transferir qualquer ticket |

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
| `departmentId` | string | Nao* | ID do departamento destino |
| `userId` | string | Nao* | ID do usuario destino |
| `reason` | string | Nao | Motivo da transferencia |
| `auto` | boolean | Nao | Atribuir automaticamente ao usuario disponivel |
| `sendNotification` | boolean | Nao | Notificar o contato sobre a transferencia |
| `notificationMessage` | string | Nao | Mensagem de notificacao personalizada |

*Obrigatorio: pelo menos `departmentId` ou `userId`

### Exemplo de Request

Transferir para departamento (com atribuicao automatica):

```json
{
  "departmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "auto": true,
  "reason": "Ticket requer conhecimento tecnico especializado",
  "sendNotification": true,
  "notificationMessage": "Seu atendimento foi transferido para nossa equipe tecnica."
}
```

Transferir para usuario especifico:

```json
{
  "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "reason": "Especialista no assunto"
}
```

Transferir para departamento sem atribuir:

```json
{
  "departmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "reason": "Redirecionar para fila correta"
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clticketxxxxxxxxxxxxxxxxxx",
  "number": 1234,
  "status": "IN_PROGRESS",
  "transfer": {
    "from": {
      "department": {
        "id": "cldeptoldxxxxxxxxxxxxxxxxx",
        "name": "Atendimento"
      },
      "user": {
        "id": "cluseroldxxxxxxxxxxxxxxxxx",
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
    "reason": "Ticket requer conhecimento tecnico especializado",
    "transferredBy": {
      "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Maria Atendente"
    },
    "transferredAt": "2024-01-15T14:30:00.000Z"
  },
  "department": {
    "id": "cldeptnewxxxxxxxxxxxxxxxxx",
    "name": "Suporte Tecnico",
    "color": "#10B981"
  },
  "assignedTo": {
    "id": "clusernewxxxxxxxxxxxxxxxxx",
    "name": "Joao Tecnico",
    "avatar": "https://exemplo.com/avatar.jpg",
    "isOnline": true
  },
  "notificationSent": true
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID do ticket |
| `number` | number | Numero do ticket |
| `status` | string | Status apos transferencia |
| `transfer` | object | Detalhes da transferencia |
| `transfer.from` | object | Origem (departamento e usuario anterior) |
| `transfer.to` | object | Destino (novo departamento e usuario) |
| `transfer.reason` | string/null | Motivo informado |
| `transfer.transferredBy` | object | Quem transferiu |
| `transfer.transferredAt` | string | Data/hora da transferencia |
| `department` | object | Departamento atual |
| `assignedTo` | object/null | Atendente atual |
| `notificationSent` | boolean | Se notificacao foi enviada |

## Erros

### 400 Bad Request - Mesmo Departamento

```json
{
  "error": "Ticket is already in this department",
  "code": "SAME_DEPARTMENT"
}
```

### 400 Bad Request - Usuario Fora do Departamento

```json
{
  "error": "Target user is not a member of the specified department",
  "code": "USER_NOT_IN_DEPARTMENT"
}
```

### 400 Bad Request - Sem Usuarios Disponiveis

```json
{
  "error": "No available users in the target department",
  "code": "NO_AVAILABLE_USERS"
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
  "error": "You can only transfer tickets assigned to you",
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
# Transferir para departamento com auto-atribuicao
curl -X POST https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx/transfer \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "auto": true,
    "reason": "Requer suporte tecnico"
  }'

# Transferir para usuario especifico
curl -X POST https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx/transfer \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "reason": "Especialista"
  }'
```

### JavaScript (Fetch)

```javascript
async function transferTicket(ticketId, options) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/tickets/${ticketId}/transfer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Transferir para departamento com auto-atribuicao
try {
  const result = await transferTicket('clticketxxxxxxxxxxxxxxxxxx', {
    departmentId: 'cldeptxxxxxxxxxxxxxxxxxxxxxx',
    auto: true,
    reason: 'Cliente precisa de suporte tecnico',
    sendNotification: true,
    notificationMessage: 'Transferindo voce para nossa equipe tecnica!',
  });

  console.log(`Ticket transferido para ${result.department.name}`);
  console.log(`Atribuido a ${result.assignedTo?.name || 'fila'}`);
} catch (error) {
  console.error('Erro:', error.message);
}

// Transferir para usuario especifico
try {
  const result = await transferTicket('clticketxxxxxxxxxxxxxxxxxx', {
    userId: 'cluserxxxxxxxxxxxxxxxxxxxxxx',
    reason: 'Especialista em financeiro',
  });

  console.log(`Transferido para ${result.assignedTo.name}`);
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Modal de Transferencia

```typescript
import { useState, useEffect } from 'react';

interface Department {
  id: string;
  name: string;
  color: string;
  _count: { users: number };
}

interface User {
  id: string;
  name: string;
  avatar: string | null;
  isOnline: boolean;
  _count: { tickets: number };
}

interface TransferModalProps {
  ticketId: string;
  currentDepartmentId: string;
  onTransfer: (result: any) => void;
  onClose: () => void;
}

function TransferModal({ ticketId, currentDepartmentId, onTransfer, onClose }: TransferModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [reason, setReason] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);
  const [notify, setNotify] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar departamentos
  useEffect(() => {
    async function loadDepartments() {
      const response = await fetch('/api/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setDepartments(data.filter((d: Department) => d.id !== currentDepartmentId));
    }
    loadDepartments();
  }, [currentDepartmentId]);

  // Carregar usuarios do departamento selecionado
  useEffect(() => {
    if (!selectedDept || autoAssign) {
      setUsers([]);
      setSelectedUser('');
      return;
    }

    async function loadUsers() {
      const response = await fetch(`/api/departments/${selectedDept}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setUsers(data.users);
    }
    loadUsers();
  }, [selectedDept, autoAssign]);

  const handleTransfer = async () => {
    if (!selectedDept && !selectedUser) {
      alert('Selecione um departamento ou usuario');
      return;
    }

    setLoading(true);
    try {
      const body: any = { reason };

      if (selectedDept) {
        body.departmentId = selectedDept;
        body.auto = autoAssign;
      }
      if (selectedUser) {
        body.userId = selectedUser;
      }
      if (notify) {
        body.sendNotification = true;
        body.notificationMessage = 'Seu atendimento foi transferido para outro especialista.';
      }

      const response = await fetch(`/api/tickets/${ticketId}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      onTransfer(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao transferir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Transferir Ticket</h2>

        <div className="form-group">
          <label>Departamento</label>
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
          >
            <option value="">Selecione...</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept._count.users} usuarios)
              </option>
            ))}
          </select>
        </div>

        {selectedDept && (
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={autoAssign}
                onChange={e => setAutoAssign(e.target.checked)}
              />
              Atribuir automaticamente
            </label>
          </div>
        )}

        {selectedDept && !autoAssign && (
          <div className="form-group">
            <label>Usuario</label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
            >
              <option value="">Selecione...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.isOnline ? '(Online)' : '(Offline)'} - {user._count.tickets} tickets
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Motivo</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Informe o motivo da transferencia..."
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={notify}
              onChange={e => setNotify(e.target.checked)}
            />
            Notificar cliente sobre a transferencia
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button onClick={handleTransfer} disabled={loading || (!selectedDept && !selectedUser)}>
            {loading ? 'Transferindo...' : 'Transferir'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Python

```python
import requests

def transfer_ticket(access_token, ticket_id, department_id=None, user_id=None, reason=None, auto=False):
    url = f'https://api.chatblue.io/api/tickets/{ticket_id}/transfer'

    payload = {}

    if department_id:
        payload['departmentId'] = department_id
        payload['auto'] = auto

    if user_id:
        payload['userId'] = user_id

    if reason:
        payload['reason'] = reason

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

# Transferir para departamento
result = transfer_ticket(
    token,
    'clticketxxx',
    department_id='cldeptxxx',
    auto=True,
    reason='Suporte tecnico necessario'
)
print(f"Transferido para: {result['department']['name']}")

# Transferir para usuario
result = transfer_ticket(
    token,
    'clticketxxx',
    user_id='cluserxxx',
    reason='Especialista'
)
print(f"Atribuido a: {result['assignedTo']['name']}")
```

## Algoritmo de Auto-Atribuicao

Quando `auto: true`, o sistema seleciona o usuario assim:

1. Filtra usuarios ativos do departamento
2. Prioriza usuarios online
3. Seleciona o com menos tickets ativos
4. Em caso de empate, seleciona aleatoriamente

```javascript
// Pseudo-codigo do algoritmo
const eligibleUsers = departmentUsers
  .filter(u => u.isActive)
  .sort((a, b) => {
    // Online primeiro
    if (a.isOnline !== b.isOnline) return b.isOnline - a.isOnline;
    // Menos tickets
    return a.ticketCount - b.ticketCount;
  });

return eligibleUsers[0];
```

## Eventos WebSocket

```javascript
socket.on('ticket:transferred', (data) => {
  console.log(`Ticket #${data.ticketNumber} transferido`);
  console.log(`De: ${data.from.department.name}`);
  console.log(`Para: ${data.to.department.name}`);
});
```

## Notas Importantes

1. **Historico Preservado**: Todas as mensagens e historico sao mantidos.

2. **Contagem de Transferencias**: Cada transferencia incrementa `metrics.transfers`.

3. **Status Atualizado**: Se `auto: true` e um usuario for atribuido, o status muda para `IN_PROGRESS`.

4. **Sem Usuario Disponivel**: Se `auto: true` e nao houver usuarios, o ticket fica sem atribuicao (PENDING).

5. **Multiplas Transferencias**: Um ticket pode ser transferido varias vezes.

## Endpoints Relacionados

- [Atribuir Ticket](/docs/api/tickets/atribuir) - Atribuir dentro do departamento
- [Historico](/docs/api/tickets/historico) - Ver transferencias anteriores
- [Departamentos](/docs/api/departamentos/listar) - Listar departamentos
