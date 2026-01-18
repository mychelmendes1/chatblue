---
sidebar_position: 1
title: Listar Contatos
description: Endpoint para listar contatos da empresa no ChatBlue
---

# Listar Contatos

Retorna a lista de contatos da empresa.

## Endpoint

```
GET /api/contacts
```

## Descricao

Este endpoint retorna todos os contatos cadastrados na empresa. Contatos sao criados automaticamente quando uma nova conversa e iniciada via WhatsApp. Suporta filtros, busca e paginacao.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem listar contatos da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `search` | string | - | Busca por nome, telefone ou email |
| `tagId` | string | - | Filtrar por tag |
| `hasActiveTicket` | boolean | - | Filtrar contatos com ticket ativo |
| `notionSynced` | boolean | - | Filtrar por sincronizacao com Notion |
| `page` | number | 1 | Numero da pagina |
| `limit` | number | 20 | Itens por pagina (max 100) |
| `sortBy` | string | updatedAt | Campo para ordenacao |
| `sortOrder` | string | desc | Ordem (asc ou desc) |

### Exemplos de URL

```
# Listar todos os contatos
GET /api/contacts

# Buscar por nome ou telefone
GET /api/contacts?search=joao

# Contatos com ticket ativo
GET /api/contacts?hasActiveTicket=true

# Contatos de uma tag
GET /api/contacts?tagId=cltagxxxxxxxxxxxxxxxxxxxxxx

# Paginacao
GET /api/contacts?page=2&limit=50
```

## Response

### Sucesso (200 OK)

```json
{
  "contacts": [
    {
      "id": "clcontactxxxxxxxxxxxxxxxxxx",
      "name": "Joao Silva",
      "phone": "+5511999999999",
      "email": "joao@email.com",
      "profilePicUrl": "https://exemplo.com/pic.jpg",
      "isBlocked": false,
      "notionPageId": "abc123",
      "customFields": {
        "cpf": "123.456.789-00",
        "empresa": "Tech Corp"
      },
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-15T14:30:00.000Z",
      "lastContactAt": "2024-01-15T14:28:00.000Z",
      "tags": [
        {
          "id": "cltagxxxxxxxxxxxxxxxxxxxxxx",
          "name": "VIP",
          "color": "#FFD700"
        }
      ],
      "activeTicket": {
        "id": "clticketxxxxxxxxxxxxxxxxxx",
        "number": 1234,
        "status": "IN_PROGRESS"
      },
      "_count": {
        "tickets": 5,
        "messages": 150
      }
    },
    {
      "id": "clcontactyyyyyyyyyyyyyyyy",
      "name": "Maria Santos",
      "phone": "+5511888888888",
      "email": null,
      "profilePicUrl": null,
      "isBlocked": false,
      "notionPageId": null,
      "customFields": {},
      "createdAt": "2024-01-12T08:00:00.000Z",
      "updatedAt": "2024-01-14T16:45:00.000Z",
      "lastContactAt": "2024-01-14T16:40:00.000Z",
      "tags": [],
      "activeTicket": null,
      "_count": {
        "tickets": 2,
        "messages": 45
      }
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

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do contato (CUID) |
| `name` | string | Nome do contato |
| `phone` | string | Telefone (formato internacional) |
| `email` | string/null | Email do contato |
| `profilePicUrl` | string/null | URL da foto de perfil |
| `isBlocked` | boolean | Se esta bloqueado |
| `notionPageId` | string/null | ID da pagina no Notion |
| `customFields` | object | Campos personalizados |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Ultima atualizacao |
| `lastContactAt` | string | Ultima interacao |
| `tags` | array | Tags do contato |
| `activeTicket` | object/null | Ticket ativo atual |
| `_count.tickets` | number | Total de tickets |
| `_count.messages` | number | Total de mensagens |

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
# Listar contatos
curl -X GET https://api.chatblue.io/api/contacts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Buscar contato
curl -X GET "https://api.chatblue.io/api/contacts?search=joao" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function listContacts(filters = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });

  const url = `https://api.chatblue.io/api/contacts?${params}`;

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
  // Listar todos
  const { contacts, pagination } = await listContacts();
  console.log(`Total de contatos: ${pagination.total}`);

  // Buscar por nome
  const search = await listContacts({ search: 'joao' });

  // Contatos VIP
  const vip = await listContacts({ tagId: 'cltagxxx' });

  // Com ticket ativo
  const active = await listContacts({ hasActiveTicket: true });
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Hook React com Busca

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  profilePicUrl: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
  activeTicket: { id: string; number: number; status: string } | null;
  _count: { tickets: number; messages: number };
}

interface UseContactsOptions {
  tagId?: string;
  hasActiveTicket?: boolean;
  limit?: number;
}

export function useContacts(options: UseContactsOptions = {}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchContacts = useCallback(async (searchTerm: string, pageNum: number, reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: (options.limit || 20).toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (options.tagId) params.append('tagId', options.tagId);
      if (options.hasActiveTicket !== undefined) {
        params.append('hasActiveTicket', options.hasActiveTicket.toString());
      }

      const response = await fetch(`/api/contacts?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) throw new Error('Erro ao carregar contatos');

      const data = await response.json();

      if (reset) {
        setContacts(data.contacts);
      } else {
        setContacts(prev => [...prev, ...data.contacts]);
      }

      setHasMore(data.pagination.hasNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [options.tagId, options.hasActiveTicket, options.limit]);

  // Debounce para busca
  const debouncedFetch = useMemo(
    () => debounce((term: string) => {
      setPage(1);
      fetchContacts(term, 1, true);
    }, 300),
    [fetchContacts]
  );

  // Busca inicial
  useEffect(() => {
    fetchContacts('', 1, true);
  }, [fetchContacts]);

  // Quando busca muda
  useEffect(() => {
    if (search) {
      debouncedFetch(search);
    } else {
      setPage(1);
      fetchContacts('', 1, true);
    }
  }, [search, debouncedFetch, fetchContacts]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchContacts(search, nextPage, false);
    }
  }, [loading, hasMore, page, search, fetchContacts]);

  return {
    contacts,
    loading,
    error,
    search,
    setSearch,
    hasMore,
    loadMore,
  };
}

// Componente de lista
function ContactList() {
  const { contacts, loading, search, setSearch, hasMore, loadMore } = useContacts();

  return (
    <div className="contact-list">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar contatos..."
      />

      <ul>
        {contacts.map(contact => (
          <li key={contact.id}>
            <img src={contact.profilePicUrl || '/default-avatar.png'} alt="" />
            <div>
              <strong>{contact.name}</strong>
              <span>{contact.phone}</span>
              {contact.activeTicket && (
                <span className="active-ticket">
                  Ticket #{contact.activeTicket.number}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {loading && <div>Carregando...</div>}

      {hasMore && !loading && (
        <button onClick={loadMore}>Carregar mais</button>
      )}
    </div>
  );
}
```

### Python

```python
import requests

def list_contacts(access_token, search=None, tag_id=None, has_active_ticket=None, page=1, limit=20):
    url = 'https://api.chatblue.io/api/contacts'

    params = {'page': page, 'limit': limit}
    if search:
        params['search'] = search
    if tag_id:
        params['tagId'] = tag_id
    if has_active_ticket is not None:
        params['hasActiveTicket'] = str(has_active_ticket).lower()

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
data = list_contacts(token)
print(f"Total de contatos: {data['pagination']['total']}")

for contact in data['contacts']:
    print(f"{contact['name']} - {contact['phone']}")
    if contact['activeTicket']:
        print(f"  Ticket ativo: #{contact['activeTicket']['number']}")

# Buscar
search_result = list_contacts(token, search='joao')
print(f"Encontrados: {len(search_result['contacts'])}")
```

## Notas Importantes

1. **Criacao Automatica**: Contatos sao criados automaticamente na primeira mensagem recebida.

2. **Foto de Perfil**: `profilePicUrl` e sincronizado do WhatsApp periodicamente.

3. **Campos Personalizados**: `customFields` permite armazenar dados adicionais.

4. **Busca**: A busca funciona em nome, telefone e email.

5. **Ticket Ativo**: Apenas um ticket pode estar ativo por contato.

## Endpoints Relacionados

- [Detalhes do Contato](/docs/api/contatos/detalhes) - Ver contato especifico
- [Atualizar Contato](/docs/api/contatos/atualizar) - Editar contato
- [Sincronizar Notion](/docs/api/contatos/sincronizar-notion) - Sincronizar com Notion
