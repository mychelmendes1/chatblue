---
sidebar_position: 2
title: Detalhes do Contato
description: Endpoint para obter detalhes de um contato especifico no ChatBlue
---

# Detalhes do Contato

Retorna informacoes detalhadas de um contato especifico.

## Endpoint

```
GET /api/contacts/:id
```

## Descricao

Este endpoint retorna todas as informacoes de um contato, incluindo historico de tickets, tags, campos personalizados e dados de sincronizacao com Notion.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem ver contatos da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do contato (CUID) ou telefone |

### Exemplos de URL

```
# Por ID
GET /api/contacts/clcontactxxxxxxxxxxxxxxxxxx

# Por telefone
GET /api/contacts/+5511999999999
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clcontactxxxxxxxxxxxxxxxxxx",
  "name": "Joao Silva",
  "phone": "+5511999999999",
  "email": "joao@email.com",
  "profilePicUrl": "https://exemplo.com/pic.jpg",
  "isBlocked": false,
  "notes": "Cliente desde 2023. Prefere contato por WhatsApp.",
  "notionPageId": "abc123def456",
  "notionSyncedAt": "2024-01-15T10:00:00.000Z",
  "customFields": {
    "cpf": "123.456.789-00",
    "empresa": "Tech Corp",
    "cargo": "Gerente de TI",
    "dataNascimento": "1985-05-15"
  },
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z",
  "lastContactAt": "2024-01-15T14:28:00.000Z",
  "tags": [
    {
      "id": "cltagxxxxxxxxxxxxxxxxxxxxxx",
      "name": "VIP",
      "color": "#FFD700"
    },
    {
      "id": "cltagyyyyyyyyyyyyyyyyyyyyyy",
      "name": "B2B",
      "color": "#3B82F6"
    }
  ],
  "activeTicket": {
    "id": "clticketxxxxxxxxxxxxxxxxxx",
    "number": 1234,
    "status": "IN_PROGRESS",
    "subject": "Suporte tecnico",
    "assignedTo": {
      "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Maria Atendente"
    },
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "ticketHistory": [
    {
      "id": "cltickethistory1xxxxxxxxxx",
      "number": 1234,
      "status": "IN_PROGRESS",
      "subject": "Suporte tecnico",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "resolvedAt": null
    },
    {
      "id": "cltickethistory2xxxxxxxxxx",
      "number": 1100,
      "status": "CLOSED",
      "subject": "Duvida sobre fatura",
      "createdAt": "2024-01-05T08:00:00.000Z",
      "resolvedAt": "2024-01-05T09:30:00.000Z"
    },
    {
      "id": "cltickethistory3xxxxxxxxxx",
      "number": 980,
      "status": "CLOSED",
      "subject": "Problema no login",
      "createdAt": "2023-12-20T14:00:00.000Z",
      "resolvedAt": "2023-12-20T15:00:00.000Z"
    }
  ],
  "stats": {
    "totalTickets": 3,
    "resolvedTickets": 2,
    "averageResolutionTime": 4500,
    "totalMessages": 150,
    "firstContactAt": "2023-12-20T14:00:00.000Z"
  },
  "_count": {
    "tickets": 3,
    "messages": 150
  }
}
```

### Campos da Resposta

#### Informacoes Basicas

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do contato |
| `name` | string | Nome do contato |
| `phone` | string | Telefone |
| `email` | string/null | Email |
| `profilePicUrl` | string/null | URL da foto de perfil |
| `isBlocked` | boolean | Se esta bloqueado |
| `notes` | string/null | Notas internas sobre o contato |

#### Campos Personalizados e Notion

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `customFields` | object | Campos personalizados |
| `notionPageId` | string/null | ID da pagina no Notion |
| `notionSyncedAt` | string/null | Ultima sincronizacao com Notion |

#### Ticket Ativo

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `activeTicket` | object/null | Ticket atualmente ativo |

#### Estatisticas

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `stats.totalTickets` | number | Total de tickets |
| `stats.resolvedTickets` | number | Tickets resolvidos |
| `stats.averageResolutionTime` | number | Tempo medio de resolucao (segundos) |
| `stats.totalMessages` | number | Total de mensagens |
| `stats.firstContactAt` | string | Primeiro contato |

## Erros

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found

```json
{
  "error": "Contact not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
# Por ID
curl -X GET https://api.chatblue.io/api/contacts/clcontactxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Por telefone
curl -X GET "https://api.chatblue.io/api/contacts/+5511999999999" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getContact(contactIdOrPhone) {
  const accessToken = localStorage.getItem('accessToken');

  // Encode phone if necessary
  const param = contactIdOrPhone.startsWith('+')
    ? encodeURIComponent(contactIdOrPhone)
    : contactIdOrPhone;

  const response = await fetch(`https://api.chatblue.io/api/contacts/${param}`, {
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
  const contact = await getContact('clcontactxxxxxxxxxxxxxxxxxx');

  console.log(`Contato: ${contact.name}`);
  console.log(`Telefone: ${contact.phone}`);
  console.log(`Email: ${contact.email || 'Nao informado'}`);

  // Tags
  console.log('Tags:', contact.tags.map(t => t.name).join(', '));

  // Ticket ativo
  if (contact.activeTicket) {
    console.log(`Ticket ativo: #${contact.activeTicket.number}`);
  }

  // Estatisticas
  console.log('--- Estatisticas ---');
  console.log(`Total de tickets: ${contact.stats.totalTickets}`);
  console.log(`Resolvidos: ${contact.stats.resolvedTickets}`);
  console.log(`Tempo medio: ${Math.round(contact.stats.averageResolutionTime / 60)} min`);

  // Historico de tickets
  console.log('--- Historico ---');
  contact.ticketHistory.forEach(ticket => {
    console.log(`#${ticket.number}: ${ticket.subject} (${ticket.status})`);
  });
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Componente de Perfil do Contato

```typescript
import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  profilePicUrl: string | null;
  notes: string | null;
  customFields: Record<string, string>;
  tags: Array<{ id: string; name: string; color: string }>;
  activeTicket: {
    id: string;
    number: number;
    status: string;
    assignedTo: { name: string };
  } | null;
  ticketHistory: Array<{
    id: string;
    number: number;
    status: string;
    subject: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  stats: {
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTime: number;
    totalMessages: number;
    firstContactAt: string;
  };
}

function ContactProfile({ contactId }: { contactId: string }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContact() {
      try {
        setLoading(true);
        const response = await fetch(`/api/contacts/${contactId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) throw new Error('Erro ao carregar contato');

        const data = await response.json();
        setContact(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    fetchContact();
  }, [contactId]);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!contact) return <div>Contato nao encontrado</div>;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  };

  return (
    <div className="contact-profile">
      <header className="profile-header">
        <img
          src={contact.profilePicUrl || '/default-avatar.png'}
          alt={contact.name}
          className="profile-pic"
        />
        <div className="profile-info">
          <h1>{contact.name}</h1>
          <p className="phone">{contact.phone}</p>
          {contact.email && <p className="email">{contact.email}</p>}
        </div>
      </header>

      <section className="tags">
        {contact.tags.map(tag => (
          <span
            key={tag.id}
            className="tag"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </span>
        ))}
      </section>

      {contact.notes && (
        <section className="notes">
          <h3>Notas</h3>
          <p>{contact.notes}</p>
        </section>
      )}

      {Object.keys(contact.customFields).length > 0 && (
        <section className="custom-fields">
          <h3>Informacoes Adicionais</h3>
          <dl>
            {Object.entries(contact.customFields).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="stats">
        <h3>Estatisticas</h3>
        <div className="stats-grid">
          <div className="stat">
            <span className="value">{contact.stats.totalTickets}</span>
            <span className="label">Tickets</span>
          </div>
          <div className="stat">
            <span className="value">{contact.stats.resolvedTickets}</span>
            <span className="label">Resolvidos</span>
          </div>
          <div className="stat">
            <span className="value">{formatTime(contact.stats.averageResolutionTime)}</span>
            <span className="label">Tempo Medio</span>
          </div>
          <div className="stat">
            <span className="value">{contact.stats.totalMessages}</span>
            <span className="label">Mensagens</span>
          </div>
        </div>
      </section>

      {contact.activeTicket && (
        <section className="active-ticket">
          <h3>Ticket Ativo</h3>
          <div className="ticket-card">
            <span className="ticket-number">#{contact.activeTicket.number}</span>
            <span className={`status ${contact.activeTicket.status.toLowerCase()}`}>
              {contact.activeTicket.status}
            </span>
            <span className="assignee">
              Atendente: {contact.activeTicket.assignedTo.name}
            </span>
          </div>
        </section>
      )}

      <section className="ticket-history">
        <h3>Historico de Tickets</h3>
        <ul>
          {contact.ticketHistory.map(ticket => (
            <li key={ticket.id}>
              <div className="ticket-info">
                <span className="number">#{ticket.number}</span>
                <span className="subject">{ticket.subject}</span>
                <span className={`status ${ticket.status.toLowerCase()}`}>
                  {ticket.status}
                </span>
              </div>
              <div className="ticket-dates">
                <span>Criado: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                {ticket.resolvedAt && (
                  <span>Resolvido: {new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

### Python

```python
import requests
from urllib.parse import quote

def get_contact(access_token, contact_id_or_phone):
    # Encode phone if necessary
    param = quote(contact_id_or_phone, safe='') if contact_id_or_phone.startswith('+') else contact_id_or_phone

    url = f'https://api.chatblue.io/api/contacts/{param}'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        raise Exception('Contato nao encontrado')
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
contact = get_contact(token, 'clcontactxxx')
print(f"Contato: {contact['name']}")
print(f"Telefone: {contact['phone']}")
print(f"Tickets: {contact['stats']['totalTickets']}")

# Por telefone
contact = get_contact(token, '+5511999999999')
print(f"Encontrado: {contact['name']}")
```

## Notas Importantes

1. **Busca por Telefone**: O telefone deve incluir o codigo do pais (ex: +5511...).

2. **Historico de Tickets**: Retorna os ultimos 10 tickets do contato.

3. **Campos Personalizados**: Armazene qualquer dado adicional em `customFields`.

4. **Notion Sync**: `notionPageId` indica se o contato esta sincronizado com Notion.

5. **Notas**: Campo `notes` e visivel apenas para atendentes.

## Endpoints Relacionados

- [Listar Contatos](/docs/api/contatos/listar) - Ver todos os contatos
- [Atualizar Contato](/docs/api/contatos/atualizar) - Editar contato
- [Sincronizar Notion](/docs/api/contatos/sincronizar-notion) - Sincronizar com Notion
