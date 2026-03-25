---
sidebar_position: 1
title: Busca no Chat
description: Endpoint de busca full-text em tickets, contatos e mensagens no ChatBlue
---

# Busca no Chat

Endpoint de busca unificada que pesquisa tickets (por protocolo, nome/email/telefone do contato) e contatos simultaneamente.

## Endpoint

```
GET /api/chat/search
```

## Descricao

Realiza busca full-text unificada em tickets e contatos. A busca e case-insensitive e, quando a extensao `unaccent` do PostgreSQL esta disponivel, tambem ignora acentos.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Request

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `q` | string | - | Termo de busca (minimo 2 caracteres) |
| `limit` | number | 30 | Maximo de resultados por tipo (max: 50) |

### Exemplos de URL

```
# Busca por nome
GET /api/chat/search?q=Maria

# Busca por protocolo
GET /api/chat/search?q=ATD-2024

# Busca por telefone
GET /api/chat/search?q=11999

# Com limite customizado
GET /api/chat/search?q=joao&limit=10
```

## Response

### Sucesso (200 OK)

```json
{
  "tickets": [
    {
      "id": "clticket001",
      "protocol": "ATD-20240115-0042",
      "status": "IN_PROGRESS",
      "priority": "MEDIUM",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "contact": {
        "id": "clcontact001",
        "name": "Maria Oliveira",
        "phone": "5511999887766",
        "avatar": null,
        "isClient": true,
        "lastMessageAt": "2024-01-15T14:30:00.000Z"
      },
      "assignedTo": {
        "id": "cluser001",
        "name": "Ana Silva",
        "avatar": "https://storage.example.com/avatar.jpg",
        "isAI": false
      },
      "department": {
        "id": "cldept001",
        "name": "Suporte",
        "color": "#3B82F6"
      },
      "connection": {
        "id": "clconn001",
        "name": "WhatsApp Principal",
        "type": "WHATSAPP"
      },
      "messages": [
        {
          "content": "Preciso de ajuda com minha fatura",
          "type": "TEXT",
          "createdAt": "2024-01-15T14:30:00.000Z",
          "isFromMe": false
        }
      ],
      "_count": {
        "messages": 2
      }
    }
  ],
  "contacts": [
    {
      "contact": {
        "id": "clcontact002",
        "phone": "5511988776655",
        "name": "Maria Santos",
        "email": "maria.santos@email.com",
        "avatar": null,
        "isClient": true
      },
      "openTicketId": "clticket005"
    }
  ]
}
```

### Busca vazia (termo menor que 2 caracteres)

```json
{
  "tickets": [],
  "contacts": []
}
```

### Campos da Resposta

#### Tickets

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID do ticket |
| `protocol` | string | Protocolo do atendimento |
| `status` | string | Status: `PENDING`, `IN_PROGRESS`, `WAITING`, `RESOLVED`, `CLOSED` |
| `contact` | object | Dados do contato vinculado |
| `assignedTo` | object/null | Atendente atribuido |
| `department` | object/null | Departamento |
| `connection` | object | Conexao utilizada |
| `messages` | array | Ultima mensagem do ticket |
| `_count.messages` | number | Quantidade de mensagens nao lidas (do contato) |

#### Contacts

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `contact` | object | Dados do contato |
| `contact.id` | string | ID do contato |
| `contact.phone` | string | Telefone |
| `contact.name` | string/null | Nome |
| `contact.email` | string/null | E-mail |
| `contact.avatar` | string/null | URL do avatar |
| `contact.isClient` | boolean | Se e cliente |
| `openTicketId` | string/undefined | ID do ticket aberto mais recente do contato |

---

## Criterios de Busca

### Tickets

A busca em tickets verifica os seguintes campos:

| Campo | Descricao |
|-------|-----------|
| `protocol` | Protocolo do ticket |
| `contact.name` | Nome do contato |
| `contact.email` | E-mail do contato |
| `contact.phone` | Telefone do contato |

### Contatos

A busca em contatos verifica:

| Campo | Descricao |
|-------|-----------|
| `name` | Nome do contato |
| `email` | E-mail do contato |
| `phone` | Telefone do contato |

Apenas contatos ativos (`isActive: true`) sao retornados.

---

## Exemplos de Codigo

### cURL

```bash
curl -X GET "https://api.chatblue.io/api/chat/search?q=Maria&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### JavaScript (Fetch)

```javascript
async function searchChat(accessToken, query, limit = 30) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });

  const response = await fetch(`https://api.chatblue.io/api/chat/search?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
const results = await searchChat(token, 'Maria');
console.log(`${results.tickets.length} tickets encontrados`);
console.log(`${results.contacts.length} contatos encontrados`);

results.contacts.forEach(c => {
  const status = c.openTicketId ? 'com ticket aberto' : 'sem ticket aberto';
  console.log(`${c.contact.name} - ${status}`);
});
```

### Python

```python
import requests

def search_chat(access_token, query, limit=30):
    url = 'https://api.chatblue.io/api/chat/search'
    params = {'q': query, 'limit': limit}
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(response.json().get('error', 'Erro'))

# Uso
results = search_chat(token, 'Maria')
print(f"Tickets: {len(results['tickets'])}")
print(f"Contatos: {len(results['contacts'])}")
```

## Notas Importantes

1. **Minimo 2 caracteres**: Buscas com menos de 2 caracteres retornam arrays vazios sem erro.

2. **Unaccent**: Quando a extensao PostgreSQL `unaccent` esta instalada, a busca ignora acentos (ex: "Maria" encontra "Maria"). Caso contrario, usa busca case-insensitive via Prisma.

3. **Tickets abertos**: Para cada contato retornado, o campo `openTicketId` indica o ticket aberto mais recente (status `PENDING`, `IN_PROGRESS` ou `WAITING`), facilitando a navegacao direta.

4. **Escopo**: A busca e restrita aos dados da empresa do usuario autenticado (multi-tenant).

5. **Limite**: O parametro `limit` controla o maximo de resultados por tipo (tickets e contatos separadamente), com teto de 50.

## Endpoints Relacionados

- [Listar Tickets](/docs/api/tickets/listar) - Listagem com filtros avancados
- [Listar Contatos](/docs/api/contatos/listar) - Listagem de contatos
- [Mensagens](/docs/api/mensagens/listar) - Mensagens de um ticket
