---
sidebar_position: 2
title: Criar Ticket
description: Endpoint para criar um novo ticket de atendimento no ChatBlue
---

# Criar Ticket

Cria um novo ticket de atendimento.

## Endpoint

```
POST /api/tickets
```

## Descricao

Este endpoint cria um novo ticket de atendimento. Tickets sao criados automaticamente quando uma nova conversa e iniciada via WhatsApp, mas tambem podem ser criados manualmente para iniciar uma conversa proativa.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **AGENT**: Pode criar tickets
- **SUPERVISOR**: Pode criar tickets
- **ADMIN**: Pode criar tickets
- **SUPER_ADMIN**: Pode criar tickets

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `contactId` | string | Sim* | ID do contato existente |
| `contactPhone` | string | Sim* | Telefone para criar/encontrar contato |
| `contactName` | string | Nao | Nome do contato (se criando novo) |
| `connectionId` | string | Nao | ID da conexao (usa padrao se omitido) |
| `departmentId` | string | Nao | ID do departamento (usa padrao se omitido) |
| `assignedToId` | string | Nao | ID do atendente para atribuir |
| `subject` | string | Nao | Assunto do ticket |
| `priority` | string | Nao | Prioridade (LOW, NORMAL, HIGH, URGENT) |
| `initialMessage` | string | Nao | Mensagem inicial a enviar |
| `tags` | array | Nao | IDs de tags a adicionar |

*Obrigatorio: `contactId` OU `contactPhone`

### Exemplo de Request

```json
{
  "contactPhone": "+5511999999999",
  "contactName": "Joao Silva",
  "departmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "assignedToId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "subject": "Acompanhamento de pedido",
  "priority": "NORMAL",
  "initialMessage": "Ola! Gostaríamos de saber como foi sua experiencia com nosso produto.",
  "tags": ["cltagxxxxxxxxxxxxxxxxxxxxxx"]
}
```

Exemplo com contato existente:

```json
{
  "contactId": "clcontactxxxxxxxxxxxxxxxxxx",
  "subject": "Retorno de atendimento"
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clticketxxxxxxxxxxxxxxxxxx",
  "number": 1235,
  "status": "IN_PROGRESS",
  "priority": "NORMAL",
  "subject": "Acompanhamento de pedido",
  "createdAt": "2024-01-15T15:00:00.000Z",
  "updatedAt": "2024-01-15T15:00:00.000Z",
  "lastMessageAt": "2024-01-15T15:00:00.000Z",
  "contact": {
    "id": "clcontactxxxxxxxxxxxxxxxxxx",
    "name": "Joao Silva",
    "phone": "+5511999999999",
    "profilePicUrl": null,
    "isNew": true
  },
  "assignedTo": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Maria Atendente",
    "avatar": "https://exemplo.com/avatar.jpg"
  },
  "department": {
    "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Atendimento",
    "color": "#3B82F6"
  },
  "connection": {
    "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
    "name": "WhatsApp Principal",
    "phone": "+5511888888888"
  },
  "initialMessageSent": true,
  "initialMessageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do ticket |
| `number` | number | Numero sequencial |
| `status` | string | Status inicial |
| `priority` | string | Prioridade |
| `subject` | string/null | Assunto |
| `contact` | object | Dados do contato |
| `contact.isNew` | boolean | Se o contato foi criado nesta requisicao |
| `assignedTo` | object/null | Atendente atribuido |
| `department` | object | Departamento |
| `connection` | object | Conexao WhatsApp usada |
| `initialMessageSent` | boolean | Se a mensagem inicial foi enviada |
| `initialMessageId` | string/null | ID da mensagem inicial |

## Erros

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: contactId or contactPhone is required",
  "code": "VALIDATION_ERROR"
}
```

### 400 Bad Request - Contato Nao Encontrado

```json
{
  "error": "Contact not found",
  "code": "CONTACT_NOT_FOUND"
}
```

### 400 Bad Request - Ticket Existente

```json
{
  "error": "Active ticket already exists for this contact",
  "code": "TICKET_EXISTS",
  "existingTicketId": "clticketxxxxxxxxxxxxxxxxxx"
}
```

### 400 Bad Request - Conexao Offline

```json
{
  "error": "Connection is not connected. Cannot send messages.",
  "code": "CONNECTION_OFFLINE"
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
  "error": "Cannot assign ticket to user outside your departments",
  "code": "FORBIDDEN"
}
```

## Exemplos de Codigo

### cURL

```bash
# Criar ticket com novo contato
curl -X POST https://api.chatblue.io/api/tickets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contactPhone": "+5511999999999",
    "contactName": "Joao Silva",
    "subject": "Acompanhamento",
    "initialMessage": "Ola! Como podemos ajudar?"
  }'

# Criar ticket com contato existente
curl -X POST https://api.chatblue.io/api/tickets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "clcontactxxxxxxxxxxxxxxxxxx"
  }'
```

### JavaScript (Fetch)

```javascript
async function createTicket(ticketData) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('https://api.chatblue.io/api/tickets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ticketData),
  });

  if (!response.ok) {
    const error = await response.json();

    // Tratar ticket existente
    if (error.code === 'TICKET_EXISTS') {
      return {
        isExisting: true,
        ticketId: error.existingTicketId,
      };
    }

    throw new Error(error.error);
  }

  return response.json();
}

// Criar ticket para novo contato
try {
  const ticket = await createTicket({
    contactPhone: '+5511999999999',
    contactName: 'Joao Silva',
    subject: 'Suporte tecnico',
    priority: 'HIGH',
    initialMessage: 'Ola! Recebemos sua solicitacao e estamos entrando em contato.',
  });

  if (ticket.isExisting) {
    console.log('Ticket ja existe:', ticket.ticketId);
    // Redirecionar para ticket existente
  } else {
    console.log('Ticket criado:', ticket.number);
    console.log('Mensagem enviada:', ticket.initialMessageSent);
  }
} catch (error) {
  console.error('Erro:', error.message);
}

// Criar ticket com contato existente e atribuir
try {
  const ticket = await createTicket({
    contactId: 'clcontactxxxxxxxxxxxxxxxxxx',
    departmentId: 'cldeptxxxxxxxxxxxxxxxxxxxxxx',
    assignedToId: 'cluserxxxxxxxxxxxxxxxxxxxxxx',
    priority: 'URGENT',
    tags: ['cltagxxxxxxxxxxxxxxxxxxxxxx'],
  });

  console.log(`Ticket #${ticket.number} criado e atribuido a ${ticket.assignedTo.name}`);
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Formulario React

```typescript
import { useState } from 'react';

interface CreateTicketForm {
  contactPhone: string;
  contactName: string;
  subject: string;
  priority: string;
  departmentId: string;
  initialMessage: string;
}

function CreateTicketForm({ onSuccess }: { onSuccess: (ticket: any) => void }) {
  const [form, setForm] = useState<CreateTicketForm>({
    contactPhone: '',
    contactName: '',
    subject: '',
    priority: 'NORMAL',
    departmentId: '',
    initialMessage: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          // Limpar campos vazios
          departmentId: form.departmentId || undefined,
          initialMessage: form.initialMessage || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const ticket = await response.json();
      onSuccess(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Telefone *</label>
        <input
          type="tel"
          value={form.contactPhone}
          onChange={e => setForm({ ...form, contactPhone: e.target.value })}
          placeholder="+5511999999999"
          required
        />
      </div>

      <div>
        <label>Nome do Contato</label>
        <input
          type="text"
          value={form.contactName}
          onChange={e => setForm({ ...form, contactName: e.target.value })}
          placeholder="Nome do cliente"
        />
      </div>

      <div>
        <label>Assunto</label>
        <input
          type="text"
          value={form.subject}
          onChange={e => setForm({ ...form, subject: e.target.value })}
          placeholder="Assunto do atendimento"
        />
      </div>

      <div>
        <label>Prioridade</label>
        <select
          value={form.priority}
          onChange={e => setForm({ ...form, priority: e.target.value })}
        >
          <option value="LOW">Baixa</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">Alta</option>
          <option value="URGENT">Urgente</option>
        </select>
      </div>

      <div>
        <label>Mensagem Inicial</label>
        <textarea
          value={form.initialMessage}
          onChange={e => setForm({ ...form, initialMessage: e.target.value })}
          placeholder="Mensagem a ser enviada ao cliente"
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Criando...' : 'Criar Ticket'}
      </button>
    </form>
  );
}
```

### Python

```python
import requests

def create_ticket(access_token, contact_phone=None, contact_id=None, **kwargs):
    url = 'https://api.chatblue.io/api/tickets'

    payload = {}

    if contact_phone:
        payload['contactPhone'] = contact_phone
    elif contact_id:
        payload['contactId'] = contact_id
    else:
        raise ValueError('contact_phone ou contact_id e obrigatorio')

    # Adicionar campos opcionais
    for key, value in kwargs.items():
        if value is not None:
            # Converter snake_case para camelCase
            camel_key = ''.join(
                word.capitalize() if i > 0 else word
                for i, word in enumerate(key.split('_'))
            )
            payload[camel_key] = value

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 201:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    ticket = create_ticket(
        token,
        contact_phone='+5511999999999',
        contact_name='Joao Silva',
        subject='Suporte',
        priority='HIGH',
        initial_message='Ola! Como podemos ajudar?'
    )
    print(f"Ticket #{ticket['number']} criado")
    print(f"Status: {ticket['status']}")
    print(f"Mensagem enviada: {ticket.get('initialMessageSent', False)}")
except Exception as e:
    print(f"Erro: {e}")
```

## Comportamentos Especiais

### Ticket Existente

Se ja existir um ticket ativo para o contato, a API retorna erro com o ID do ticket existente:

```javascript
try {
  await createTicket({ contactPhone: '+5511999999999' });
} catch (error) {
  if (error.code === 'TICKET_EXISTS') {
    // Abrir ticket existente
    navigateToTicket(error.existingTicketId);
  }
}
```

### Contato Automatico

Se `contactPhone` for fornecido e o contato nao existir, ele e criado automaticamente.

### Mensagem Inicial

Se `initialMessage` for fornecido e a conexao estiver online, a mensagem e enviada imediatamente.

## Notas Importantes

1. **Numero Unico**: O numero do ticket e sequencial e unico por empresa.

2. **Status Inicial**: Se `assignedToId` for fornecido, o status inicial e `IN_PROGRESS`. Caso contrario, e `PENDING`.

3. **Conexao Padrao**: Se `connectionId` nao for especificado, usa a conexao marcada como padrao.

4. **Departamento Padrao**: Se `departmentId` nao for especificado, usa o departamento padrao.

5. **Validacao de Telefone**: O telefone deve estar no formato internacional com DDI.

## Endpoints Relacionados

- [Listar Tickets](/docs/api/tickets/listar) - Ver todos os tickets
- [Detalhes do Ticket](/docs/api/tickets/detalhes) - Obter ticket especifico
- [Enviar Mensagem](/docs/api/mensagens/enviar-texto) - Enviar mensagem no ticket
