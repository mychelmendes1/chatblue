---
sidebar_position: 4
title: Sincronizar com Notion
description: Endpoint para sincronizar um contato com o Notion no ChatBlue
---

# Sincronizar com Notion

Sincroniza os dados de um contato com uma pagina do Notion.

## Endpoint

```
POST /api/contacts/:id/sync-notion
```

## Descricao

Este endpoint sincroniza os dados de um contato do ChatBlue com uma pagina do Notion. Se o contato ja estiver vinculado a uma pagina, ela sera atualizada. Caso contrario, uma nova pagina sera criada no database configurado.

## Pre-requisitos

Para usar a sincronizacao com Notion, e necessario:

1. Configurar a integracao do Notion nas configuracoes da empresa
2. Selecionar o database de contatos no Notion
3. Mapear os campos do ChatBlue com as propriedades do Notion

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode sincronizar contatos
- **SUPER_ADMIN**: Pode sincronizar contatos

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Nao |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do contato (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `forceCreate` | boolean | Nao | Forcar criacao de nova pagina mesmo se ja existir |
| `customMapping` | object | Nao | Mapeamento personalizado de campos |

### Exemplo de Request

Sincronizacao simples:

```json
{}
```

Com mapeamento personalizado:

```json
{
  "customMapping": {
    "Nome": "name",
    "Telefone": "phone",
    "Email": "email",
    "Empresa": "customFields.empresa",
    "CPF": "customFields.cpf",
    "Total Tickets": "_count.tickets"
  }
}
```

## Response

### Sucesso (200 OK)

```json
{
  "contact": {
    "id": "clcontactxxxxxxxxxxxxxxxxxx",
    "name": "Joao Silva",
    "phone": "+5511999999999",
    "notionPageId": "abc123def456",
    "notionSyncedAt": "2024-01-15T14:30:00.000Z"
  },
  "notionPage": {
    "id": "abc123def456",
    "url": "https://notion.so/abc123def456",
    "created": false,
    "updated": true
  },
  "syncedFields": [
    { "chatblueField": "name", "notionProperty": "Nome", "value": "Joao Silva" },
    { "chatblueField": "phone", "notionProperty": "Telefone", "value": "+5511999999999" },
    { "chatblueField": "email", "notionProperty": "Email", "value": "joao@email.com" },
    { "chatblueField": "customFields.empresa", "notionProperty": "Empresa", "value": "Tech Corp" }
  ]
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `contact` | object | Dados do contato atualizados |
| `contact.notionPageId` | string | ID da pagina no Notion |
| `contact.notionSyncedAt` | string | Data/hora da sincronizacao |
| `notionPage` | object | Dados da pagina do Notion |
| `notionPage.id` | string | ID da pagina |
| `notionPage.url` | string | URL da pagina no Notion |
| `notionPage.created` | boolean | Se foi criada nova pagina |
| `notionPage.updated` | boolean | Se pagina foi atualizada |
| `syncedFields` | array | Campos sincronizados |

## Erros

### 400 Bad Request - Notion Nao Configurado

```json
{
  "error": "Notion integration is not configured for this company",
  "code": "NOTION_NOT_CONFIGURED"
}
```

### 400 Bad Request - Database Nao Selecionado

```json
{
  "error": "No Notion database selected for contacts",
  "code": "NO_DATABASE_SELECTED"
}
```

### 400 Bad Request - Erro de Mapeamento

```json
{
  "error": "Field mapping error: property 'Nome' not found in Notion database",
  "code": "MAPPING_ERROR"
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
  "error": "Access denied. Admin required.",
  "code": "FORBIDDEN"
}
```

### 404 Not Found

```json
{
  "error": "Contact not found",
  "code": "NOT_FOUND"
}
```

### 502 Bad Gateway - Erro Notion API

```json
{
  "error": "Notion API error: Rate limit exceeded",
  "code": "NOTION_API_ERROR"
}
```

## Exemplos de Codigo

### cURL

```bash
# Sincronizar contato
curl -X POST https://api.chatblue.io/api/contacts/clcontactxxxxxxxxxxxxxxxxxx/sync-notion \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Com mapeamento personalizado
curl -X POST https://api.chatblue.io/api/contacts/clcontactxxxxxxxxxxxxxxxxxx/sync-notion \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "customMapping": {
      "Nome Completo": "name",
      "WhatsApp": "phone"
    }
  }'
```

### JavaScript (Fetch)

```javascript
async function syncContactWithNotion(contactId, options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(
    `https://api.chatblue.io/api/contacts/${contactId}/sync-notion`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Sincronizar contato
try {
  const result = await syncContactWithNotion('clcontactxxxxxxxxxxxxxxxxxx');

  if (result.notionPage.created) {
    console.log('Nova pagina criada no Notion');
  } else {
    console.log('Pagina atualizada no Notion');
  }

  console.log('URL:', result.notionPage.url);
  console.log('Campos sincronizados:', result.syncedFields.length);
} catch (error) {
  if (error.message.includes('not configured')) {
    console.error('Configure a integracao do Notion primeiro');
  } else {
    console.error('Erro:', error.message);
  }
}

// Com mapeamento personalizado
try {
  const result = await syncContactWithNotion('clcontactxxxxxxxxxxxxxxxxxx', {
    customMapping: {
      'Nome': 'name',
      'Telefone': 'phone',
      'Email': 'email',
      'Empresa': 'customFields.empresa',
    },
  });
  console.log('Sincronizado com sucesso');
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Botao de Sincronizacao React

```typescript
import { useState } from 'react';

interface Contact {
  id: string;
  name: string;
  notionPageId: string | null;
  notionSyncedAt: string | null;
}

interface SyncNotionButtonProps {
  contact: Contact;
  onSync: (contact: Contact) => void;
}

function SyncNotionButton({ contact, onSync }: SyncNotionButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch(`/api/contacts/${contact.id}/sync-notion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const result = await response.json();

      // Abrir pagina no Notion em nova aba
      if (result.notionPage.created) {
        window.open(result.notionPage.url, '_blank');
      }

      // Atualizar contato na UI
      onSync(result.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('pt-BR');
  };

  return (
    <div className="sync-notion">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="sync-btn"
      >
        {syncing ? 'Sincronizando...' : 'Sincronizar com Notion'}
      </button>

      {contact.notionPageId && (
        <div className="sync-info">
          <span>Ultima sincronizacao: {formatDate(contact.notionSyncedAt)}</span>
          <a
            href={`https://notion.so/${contact.notionPageId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no Notion
          </a>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Python

```python
import requests

def sync_contact_notion(access_token, contact_id, custom_mapping=None):
    url = f'https://api.chatblue.io/api/contacts/{contact_id}/sync-notion'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payload = {}
    if custom_mapping:
        payload['customMapping'] = custom_mapping

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    result = sync_contact_notion(token, 'clcontactxxx')

    if result['notionPage']['created']:
        print('Nova pagina criada no Notion')
    else:
        print('Pagina atualizada')

    print(f"URL: {result['notionPage']['url']}")
    print(f"Campos sincronizados: {len(result['syncedFields'])}")

    for field in result['syncedFields']:
        print(f"  {field['chatblueField']} -> {field['notionProperty']}: {field['value']}")
except Exception as e:
    print(f"Erro: {e}")
```

## Sincronizacao em Lote

Para sincronizar multiplos contatos:

```
POST /api/contacts/sync-notion/batch
```

```json
{
  "contactIds": [
    "clcontactxxxxxxxxxxxxxxxxxx",
    "clcontactyyyyyyyyyyyyyyyy",
    "clcontactzzzzzzzzzzzzzzzz"
  ]
}
```

### Response

```json
{
  "total": 3,
  "success": 2,
  "failed": 1,
  "results": [
    { "contactId": "clcontactxxx", "status": "success", "notionPageId": "abc123" },
    { "contactId": "clcontactyyy", "status": "success", "notionPageId": "def456" },
    { "contactId": "clcontactzzz", "status": "failed", "error": "Rate limit exceeded" }
  ]
}
```

## Mapeamento de Campos

### Campos Padrao

| Campo ChatBlue | Tipo Notion Recomendado |
|----------------|------------------------|
| `name` | Title |
| `phone` | Phone |
| `email` | Email |
| `notes` | Text |
| `lastContactAt` | Date |
| `_count.tickets` | Number |
| `_count.messages` | Number |
| `tags` | Multi-select |

### Campos Personalizados

Acesse campos personalizados com `customFields.`:

```json
{
  "customMapping": {
    "CPF": "customFields.cpf",
    "Empresa": "customFields.empresa",
    "Cargo": "customFields.cargo"
  }
}
```

## Notas Importantes

1. **Configuracao Necessaria**: A integracao do Notion deve estar configurada nas configuracoes da empresa.

2. **Rate Limits**: O Notion API tem rate limits. Sincronizacoes em lote sao processadas com delay.

3. **Mapeamento Bi-direcional**: Por padrao, a sincronizacao e unidirecional (ChatBlue -> Notion).

4. **Paginas Existentes**: Se `notionPageId` existir, a pagina e atualizada ao inves de criar nova.

5. **Webhook Notion**: Configure webhooks no Notion para sincronizacao reversa.

## Endpoints Relacionados

- [Detalhes do Contato](/docs/api/contatos/detalhes) - Ver contato
- [Atualizar Contato](/docs/api/contatos/atualizar) - Editar contato
- [Configuracoes da Empresa](/docs/api/empresas/configuracoes) - Configurar integracao
