---
sidebar_position: 3
title: Atualizar Contato
description: Endpoint para atualizar informacoes de um contato no ChatBlue
---

# Atualizar Contato

Atualiza as informacoes de um contato.

## Endpoint

```
PUT /api/contacts/:id
```

## Descricao

Este endpoint permite atualizar as informacoes de um contato existente, incluindo nome, email, notas, campos personalizados, tags e status de bloqueio.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem atualizar contatos da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do contato (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Nao | Nome do contato |
| `email` | string | Nao | Email do contato |
| `notes` | string | Nao | Notas internas |
| `isBlocked` | boolean | Nao | Bloquear/desbloquear contato |
| `customFields` | object | Nao | Campos personalizados |
| `tagIds` | array | Nao | IDs das tags a atribuir |

### Exemplo de Request

```json
{
  "name": "Joao Silva Santos",
  "email": "joao.santos@email.com",
  "notes": "Cliente VIP. Prefere contato por WhatsApp no horario comercial.",
  "customFields": {
    "cpf": "123.456.789-00",
    "empresa": "Tech Corp LTDA",
    "cargo": "Diretor de TI",
    "dataNascimento": "1985-05-15",
    "plano": "Enterprise"
  },
  "tagIds": [
    "cltagxxxxxxxxxxxxxxxxxxxxxx",
    "cltagyyyyyyyyyyyyyyyyyyyyyy"
  ]
}
```

Atualizacao parcial:

```json
{
  "name": "Novo Nome"
}
```

Bloquear contato:

```json
{
  "isBlocked": true
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clcontactxxxxxxxxxxxxxxxxxx",
  "name": "Joao Silva Santos",
  "phone": "+5511999999999",
  "email": "joao.santos@email.com",
  "profilePicUrl": "https://exemplo.com/pic.jpg",
  "isBlocked": false,
  "notes": "Cliente VIP. Prefere contato por WhatsApp no horario comercial.",
  "customFields": {
    "cpf": "123.456.789-00",
    "empresa": "Tech Corp LTDA",
    "cargo": "Diretor de TI",
    "dataNascimento": "1985-05-15",
    "plano": "Enterprise"
  },
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T16:30:00.000Z",
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
  ]
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID do contato |
| `name` | string | Nome atualizado |
| `phone` | string | Telefone (imutavel) |
| `email` | string/null | Email atualizado |
| `isBlocked` | boolean | Status de bloqueio |
| `notes` | string/null | Notas |
| `customFields` | object | Campos personalizados |
| `tags` | array | Tags atualizadas |
| `updatedAt` | string | Data da atualizacao |

## Erros

### 400 Bad Request - Email Invalido

```json
{
  "error": "Validation error: email: Email invalido",
  "code": "VALIDATION_ERROR"
}
```

### 400 Bad Request - Tag Nao Encontrada

```json
{
  "error": "One or more tags not found",
  "code": "TAG_NOT_FOUND",
  "invalidTagIds": ["cltagnotfoundxxxxxxxxxxx"]
}
```

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
# Atualizar nome e email
curl -X PUT https://api.chatblue.io/api/contacts/clcontactxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Joao Silva Santos",
    "email": "joao@email.com"
  }'

# Adicionar campos personalizados
curl -X PUT https://api.chatblue.io/api/contacts/clcontactxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "customFields": {
      "cpf": "123.456.789-00",
      "empresa": "Tech Corp"
    }
  }'

# Bloquear contato
curl -X PUT https://api.chatblue.io/api/contacts/clcontactxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"isBlocked": true}'
```

### JavaScript (Fetch)

```javascript
async function updateContact(contactId, updates) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Atualizar nome e email
try {
  const contact = await updateContact('clcontactxxxxxxxxxxxxxxxxxx', {
    name: 'Joao Silva Santos',
    email: 'joao@email.com',
  });
  console.log('Contato atualizado:', contact.name);
} catch (error) {
  console.error('Erro:', error.message);
}

// Adicionar campos personalizados
try {
  const contact = await updateContact('clcontactxxxxxxxxxxxxxxxxxx', {
    customFields: {
      cpf: '123.456.789-00',
      empresa: 'Tech Corp',
      plano: 'Premium',
    },
  });
  console.log('Campos atualizados:', contact.customFields);
} catch (error) {
  console.error('Erro:', error.message);
}

// Atualizar tags
try {
  const contact = await updateContact('clcontactxxxxxxxxxxxxxxxxxx', {
    tagIds: ['cltagvipxxxxxxxxxxxxxxxxxx', 'cltagb2bxxxxxxxxxxxxxxxxxx'],
  });
  console.log('Tags:', contact.tags.map(t => t.name).join(', '));
} catch (error) {
  console.error('Erro:', error.message);
}

// Bloquear contato
try {
  await updateContact('clcontactxxxxxxxxxxxxxxxxxx', { isBlocked: true });
  console.log('Contato bloqueado');
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Formulario de Edicao React

```typescript
import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  customFields: Record<string, string>;
  tags: Array<{ id: string; name: string; color: string }>;
  isBlocked: boolean;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface EditContactFormProps {
  contact: Contact;
  availableTags: Tag[];
  onSave: (contact: Contact) => void;
}

function EditContactForm({ contact, availableTags, onSave }: EditContactFormProps) {
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email || '',
    notes: contact.notes || '',
    isBlocked: contact.isBlocked,
    tagIds: contact.tags.map(t => t.id),
  });
  const [customFields, setCustomFields] = useState(contact.customFields);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          notes: form.notes || null,
          isBlocked: form.isBlocked,
          customFields,
          tagIds: form.tagIds,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const updatedContact = await response.json();
      onSave(updatedContact);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    if (newFieldKey && newFieldValue) {
      setCustomFields(prev => ({
        ...prev,
        [newFieldKey]: newFieldValue,
      }));
      setNewFieldKey('');
      setNewFieldValue('');
    }
  };

  const removeCustomField = (key: string) => {
    setCustomFields(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const toggleTag = (tagId: string) => {
    setForm(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="edit-contact-form">
      <div className="form-group">
        <label>Nome</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Telefone</label>
        <input type="text" value={contact.phone} disabled />
        <small>O telefone nao pode ser alterado</small>
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="email@exemplo.com"
        />
      </div>

      <div className="form-group">
        <label>Notas</label>
        <textarea
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="Notas internas sobre o contato..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Tags</label>
        <div className="tags-selector">
          {availableTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              className={`tag-btn ${form.tagIds.includes(tag.id) ? 'selected' : ''}`}
              style={{ backgroundColor: form.tagIds.includes(tag.id) ? tag.color : 'transparent' }}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Campos Personalizados</label>
        <div className="custom-fields-list">
          {Object.entries(customFields).map(([key, value]) => (
            <div key={key} className="custom-field-item">
              <span className="field-key">{key}:</span>
              <span className="field-value">{value}</span>
              <button type="button" onClick={() => removeCustomField(key)}>×</button>
            </div>
          ))}
        </div>
        <div className="add-custom-field">
          <input
            type="text"
            value={newFieldKey}
            onChange={e => setNewFieldKey(e.target.value)}
            placeholder="Campo"
          />
          <input
            type="text"
            value={newFieldValue}
            onChange={e => setNewFieldValue(e.target.value)}
            placeholder="Valor"
          />
          <button type="button" onClick={addCustomField}>Adicionar</button>
        </div>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={form.isBlocked}
            onChange={e => setForm({ ...form, isBlocked: e.target.checked })}
          />
          Bloquear contato
        </label>
        <small>Contatos bloqueados nao podem iniciar novas conversas</small>
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```

### Python

```python
import requests

def update_contact(access_token, contact_id, **updates):
    url = f'https://api.chatblue.io/api/contacts/{contact_id}'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.put(url, json=updates, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    # Atualizar nome
    contact = update_contact(token, 'clcontactxxx', name='Joao Silva')
    print(f"Nome atualizado: {contact['name']}")

    # Adicionar campos personalizados
    contact = update_contact(
        token,
        'clcontactxxx',
        customFields={
            'cpf': '123.456.789-00',
            'empresa': 'Tech Corp'
        }
    )
    print(f"Campos: {contact['customFields']}")

    # Atualizar tags
    contact = update_contact(
        token,
        'clcontactxxx',
        tagIds=['cltagvipxxx', 'cltagb2bxxx']
    )
    print(f"Tags: {[t['name'] for t in contact['tags']]}")

    # Bloquear
    contact = update_contact(token, 'clcontactxxx', isBlocked=True)
    print(f"Bloqueado: {contact['isBlocked']}")
except Exception as e:
    print(f"Erro: {e}")
```

## Comportamento de Campos Personalizados

### Merge vs Replace

Por padrao, `customFields` faz merge com os campos existentes:

```javascript
// Estado atual: { cpf: "123", empresa: "ABC" }

await updateContact(id, {
  customFields: { cargo: "Gerente" }
});

// Resultado: { cpf: "123", empresa: "ABC", cargo: "Gerente" }
```

Para substituir completamente, envie `customFieldsReplace: true`:

```javascript
await updateContact(id, {
  customFields: { novosCampos: "apenas" },
  customFieldsReplace: true
});

// Resultado: { novosCampos: "apenas" }
```

## Notas Importantes

1. **Telefone Imutavel**: O numero de telefone nao pode ser alterado.

2. **Tags Replace**: O array `tagIds` substitui todas as tags existentes.

3. **Bloqueio**: Contatos bloqueados nao podem iniciar conversas, mas conversas existentes continuam.

4. **Atualizacao Parcial**: Apenas campos enviados sao atualizados.

5. **Notion Sync**: Alteracoes podem ser sincronizadas com Notion automaticamente.

## Endpoints Relacionados

- [Listar Contatos](/docs/api/contatos/listar) - Ver todos os contatos
- [Detalhes do Contato](/docs/api/contatos/detalhes) - Ver contato especifico
- [Sincronizar Notion](/docs/api/contatos/sincronizar-notion) - Sincronizar com Notion
