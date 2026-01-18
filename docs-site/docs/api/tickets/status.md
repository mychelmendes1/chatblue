---
sidebar_position: 4
title: Atualizar Status do Ticket
description: Endpoint para alterar o status de um ticket no ChatBlue
---

# Atualizar Status do Ticket

Altera o status de um ticket.

## Endpoint

```
PUT /api/tickets/:id/status
```

## Descricao

Este endpoint permite alterar o status de um ticket. A mudanca de status e registrada no historico e pode disparar eventos automaticos como notificacoes e calculos de SLA.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Role | Acesso |
|------|--------|
| AGENT | Apenas tickets atribuidos |
| SUPERVISOR | Tickets dos departamentos supervisionados |
| ADMIN | Qualquer ticket da empresa |
| SUPER_ADMIN | Qualquer ticket |

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
| `status` | string | Sim | Novo status |
| `reason` | string | Nao | Motivo da mudanca |
| `sendNotification` | boolean | Nao | Enviar notificacao ao contato (padrao: false) |
| `notificationMessage` | string | Nao | Mensagem personalizada para notificacao |

### Status Disponiveis

| Status | Descricao | Transicoes Permitidas |
|--------|-----------|----------------------|
| `PENDING` | Aguardando atendimento | IN_PROGRESS |
| `IN_PROGRESS` | Em atendimento | WAITING, RESOLVED, CLOSED |
| `WAITING` | Aguardando cliente | IN_PROGRESS, RESOLVED, CLOSED |
| `RESOLVED` | Resolvido | CLOSED, IN_PROGRESS (reabrir) |
| `CLOSED` | Encerrado | IN_PROGRESS (reabrir) |

### Exemplo de Request

```json
{
  "status": "RESOLVED",
  "reason": "Problema resolvido pelo suporte",
  "sendNotification": true,
  "notificationMessage": "Seu atendimento foi resolvido! Obrigado pelo contato."
}
```

Mudanca simples:

```json
{
  "status": "IN_PROGRESS"
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clticketxxxxxxxxxxxxxxxxxx",
  "number": 1234,
  "status": "RESOLVED",
  "previousStatus": "IN_PROGRESS",
  "updatedAt": "2024-01-15T16:00:00.000Z",
  "resolvedAt": "2024-01-15T16:00:00.000Z",
  "statusChange": {
    "from": "IN_PROGRESS",
    "to": "RESOLVED",
    "changedBy": {
      "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Maria Atendente"
    },
    "reason": "Problema resolvido pelo suporte",
    "duration": 21600
  },
  "notificationSent": true,
  "metrics": {
    "resolutionTime": 21600,
    "firstResponseTime": 300,
    "totalResponseTime": 1800
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID do ticket |
| `number` | number | Numero do ticket |
| `status` | string | Novo status |
| `previousStatus` | string | Status anterior |
| `updatedAt` | string | Data da atualizacao |
| `resolvedAt` | string/null | Data de resolucao (se status RESOLVED) |
| `statusChange` | object | Detalhes da mudanca |
| `statusChange.duration` | number | Tempo no status anterior (segundos) |
| `notificationSent` | boolean | Se notificacao foi enviada |
| `metrics` | object | Metricas atualizadas |

## Erros

### 400 Bad Request - Transicao Invalida

```json
{
  "error": "Invalid status transition from PENDING to RESOLVED",
  "code": "INVALID_TRANSITION",
  "allowedTransitions": ["IN_PROGRESS"]
}
```

### 400 Bad Request - Status Invalido

```json
{
  "error": "Invalid status: INVALID",
  "code": "VALIDATION_ERROR",
  "validStatuses": ["PENDING", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]
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
  "error": "You can only change status of tickets assigned to you",
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
# Resolver ticket
curl -X PUT https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RESOLVED",
    "reason": "Problema resolvido"
  }'

# Colocar em espera
curl -X PUT https://api.chatblue.io/api/tickets/clticketxxxxxxxxxxxxxxxxxx/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "WAITING",
    "sendNotification": true,
    "notificationMessage": "Aguardamos seu retorno para dar continuidade ao atendimento."
  }'
```

### JavaScript (Fetch)

```javascript
async function updateTicketStatus(ticketId, status, options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/tickets/${ticketId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      reason: options.reason,
      sendNotification: options.sendNotification,
      notificationMessage: options.notificationMessage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Iniciar atendimento
try {
  const result = await updateTicketStatus('clticketxxxxxxxxxxxxxxxxxx', 'IN_PROGRESS');
  console.log(`Ticket #${result.number} em atendimento`);
} catch (error) {
  console.error('Erro:', error.message);
}

// Resolver com notificacao
try {
  const result = await updateTicketStatus('clticketxxxxxxxxxxxxxxxxxx', 'RESOLVED', {
    reason: 'Duvida esclarecida',
    sendNotification: true,
    notificationMessage: 'Seu atendimento foi concluido. Obrigado!',
  });

  console.log('Ticket resolvido');
  console.log(`Tempo de resolucao: ${result.metrics.resolutionTime}s`);
  console.log(`Notificacao enviada: ${result.notificationSent}`);
} catch (error) {
  console.error('Erro:', error.message);
}

// Colocar em espera
try {
  await updateTicketStatus('clticketxxxxxxxxxxxxxxxxxx', 'WAITING', {
    reason: 'Aguardando informacoes do cliente',
  });
  console.log('Ticket em espera');
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Componente de Acoes

```typescript
import { useState } from 'react';

type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';

interface StatusActionProps {
  ticketId: string;
  currentStatus: TicketStatus;
  onStatusChange: (newStatus: TicketStatus) => void;
}

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['WAITING', 'RESOLVED', 'CLOSED'],
  WAITING: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'],
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Atendimento',
  WAITING: 'Aguardando',
  RESOLVED: 'Resolvido',
  CLOSED: 'Encerrado',
};

function StatusActions({ ticketId, currentStatus, onStatusChange }: StatusActionProps) {
  const [loading, setLoading] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | null>(null);
  const [reason, setReason] = useState('');
  const [sendNotification, setSendNotification] = useState(false);

  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];

  const handleStatusClick = (status: TicketStatus) => {
    if (['RESOLVED', 'CLOSED'].includes(status)) {
      setSelectedStatus(status);
      setShowReasonModal(true);
    } else {
      changeStatus(status);
    }
  };

  const changeStatus = async (status: TicketStatus, opts = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, ...opts }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      onStatusChange(result.status);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao mudar status');
    } finally {
      setLoading(false);
      setShowReasonModal(false);
      setReason('');
    }
  };

  const handleConfirm = () => {
    if (selectedStatus) {
      changeStatus(selectedStatus, {
        reason,
        sendNotification,
        notificationMessage: sendNotification
          ? `Seu atendimento foi ${selectedStatus === 'RESOLVED' ? 'resolvido' : 'encerrado'}. Obrigado!`
          : undefined,
      });
    }
  };

  return (
    <div className="status-actions">
      <span className="current-status">{STATUS_LABELS[currentStatus]}</span>

      <div className="actions">
        {allowedTransitions.map(status => (
          <button
            key={status}
            onClick={() => handleStatusClick(status)}
            disabled={loading}
            className={`status-btn ${status.toLowerCase()}`}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {showReasonModal && (
        <div className="modal">
          <h3>Confirmar mudanca para {STATUS_LABELS[selectedStatus!]}</h3>

          <label>
            Motivo (opcional):
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Descreva o motivo..."
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={e => setSendNotification(e.target.checked)}
            />
            Notificar cliente
          </label>

          <div className="modal-actions">
            <button onClick={() => setShowReasonModal(false)}>Cancelar</button>
            <button onClick={handleConfirm} disabled={loading}>
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Python

```python
import requests

def update_ticket_status(access_token, ticket_id, status, reason=None, send_notification=False, notification_message=None):
    url = f'https://api.chatblue.io/api/tickets/{ticket_id}/status'

    payload = {'status': status}

    if reason:
        payload['reason'] = reason
    if send_notification:
        payload['sendNotification'] = True
        if notification_message:
            payload['notificationMessage'] = notification_message

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.put(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    # Iniciar atendimento
    result = update_ticket_status(token, 'clticketxxx', 'IN_PROGRESS')
    print(f"Ticket em atendimento")

    # Resolver com notificacao
    result = update_ticket_status(
        token,
        'clticketxxx',
        'RESOLVED',
        reason='Problema resolvido com sucesso',
        send_notification=True,
        notification_message='Obrigado pelo contato!'
    )
    print(f"Ticket resolvido em {result['metrics']['resolutionTime']}s")
except Exception as e:
    print(f"Erro: {e}")
```

## Transicoes de Status

```
    PENDING
       ↓
  IN_PROGRESS ←──────────┐
    ↓    ↓               │
WAITING  RESOLVED ───────┤
    ↓        ↓           │
    └──→ CLOSED ─────────┘
              (reabrir)
```

## Eventos Disparados

| Transicao | Eventos |
|-----------|---------|
| * → IN_PROGRESS | `ticket:assigned` (se atribuido) |
| * → RESOLVED | `ticket:resolved`, calculo de `resolutionTime` |
| * → CLOSED | `ticket:closed` |
| RESOLVED/CLOSED → IN_PROGRESS | `ticket:reopened`, incrementa `reopens` |

## Notas Importantes

1. **Transicoes Validas**: Nem todas as mudancas de status sao permitidas. Veja a tabela acima.

2. **Primeira Resposta**: Ao mudar de PENDING para IN_PROGRESS, o `firstResponseAt` e registrado.

3. **Metricas de SLA**: A mudanca de status afeta calculos de SLA e relatorios.

4. **Historico**: Todas as mudancas sao registradas em `statusHistory`.

5. **Notificacao**: Se `sendNotification: true`, uma mensagem e enviada ao contato via WhatsApp.

## Endpoints Relacionados

- [Detalhes do Ticket](/docs/api/tickets/detalhes) - Ver ticket
- [Historico](/docs/api/tickets/historico) - Ver historico completo
- [Atribuir Ticket](/docs/api/tickets/atribuir) - Atribuir a atendente
