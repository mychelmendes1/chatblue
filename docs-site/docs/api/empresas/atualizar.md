---
sidebar_position: 4
title: Atualizar Empresa
description: Endpoint para atualizar dados de uma empresa no ChatBlue
---

# Atualizar Empresa

Atualiza os dados de uma empresa existente.

## Endpoint

```
PUT /api/companies/:id
```

## Descricao

Este endpoint permite atualizar os dados basicos de uma empresa, como nome, slug, logo e plano. Para configuracoes mais especificas (IA, Notion, SLA), utilize os [endpoints de configuracoes](/docs/api/empresas/configuracoes).

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **SUPER_ADMIN**: Pode atualizar qualquer empresa
- **ADMIN**: Pode atualizar apenas a propria empresa

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da empresa (CUID) |

### Body Parameters

Todos os campos sao opcionais. Envie apenas os campos que deseja atualizar.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Nao | Nome da empresa (min. 2 caracteres) |
| `slug` | string | Nao | Identificador URL-friendly |
| `logo` | string | Nao | URL do logo da empresa |
| `plan` | string | Nao | Plano (BASIC, PRO, ENTERPRISE) |

### Exemplo de Request

Atualizar apenas o nome:

```json
{
  "name": "Empresa Atualizada LTDA"
}
```

Atualizar multiplos campos:

```json
{
  "name": "Nova Razao Social",
  "logo": "https://novo-dominio.com/logo.png",
  "plan": "ENTERPRISE"
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Empresa Atualizada LTDA",
  "slug": "minha-empresa",
  "logo": "https://exemplo.com/logo.png",
  "plan": "PRO",
  "isActive": true,
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T16:45:00.000Z"
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID da empresa |
| `name` | string | Nome atualizado |
| `slug` | string | Slug da empresa |
| `logo` | string/null | URL do logo |
| `plan` | string | Plano atual |
| `isActive` | boolean | Status de ativacao |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Data da ultima atualizacao |

## Erros

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: name: Nome deve ter pelo menos 2 caracteres",
  "code": "VALIDATION_ERROR"
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
  "error": "Company not found",
  "code": "NOT_FOUND"
}
```

Ocorre quando:
- A empresa nao existe
- O usuario nao tem permissao para atualizar a empresa (ADMIN tentando atualizar outra empresa)

## Exemplos de Codigo

### cURL

```bash
# Atualizar nome
curl -X PUT https://api.chatblue.io/api/companies/clxxxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Empresa Atualizada LTDA"
  }'

# Atualizar plano (SUPER_ADMIN)
curl -X PUT https://api.chatblue.io/api/companies/clxxxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "ENTERPRISE"
  }'
```

### JavaScript (Fetch)

```javascript
async function updateCompany(companyId, updates) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/companies/${companyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso - Atualizar nome
try {
  const updated = await updateCompany('clxxxxxxxxxxxxxxxxxxxxxxxx', {
    name: 'Empresa Atualizada LTDA',
  });
  console.log('Empresa atualizada:', updated.name);
} catch (error) {
  console.error('Erro:', error.message);
}

// Uso - Atualizar logo
async function updateCompanyLogo(companyId, logoUrl) {
  return updateCompany(companyId, { logo: logoUrl });
}

// Uso - Upgrade de plano (SUPER_ADMIN)
async function upgradeCompanyPlan(companyId, newPlan) {
  return updateCompany(companyId, { plan: newPlan });
}
```

### Python

```python
import requests

def update_company(access_token, company_id, **updates):
    url = f'https://api.chatblue.io/api/companies/{company_id}'

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
company = update_company(
    token,
    'clxxxxxxxxxxxxxxxxxxxxxxxx',
    name='Nova Razao Social',
    plan='ENTERPRISE'
)
print(f"Empresa atualizada: {company['name']}")
```

### React Component

```typescript
import { useState } from 'react';

interface CompanyFormData {
  name?: string;
  slug?: string;
  logo?: string;
  plan?: 'BASIC' | 'PRO' | 'ENTERPRISE';
}

function CompanyEditForm({ company, onSave }) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: company.name,
    logo: company.logo || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const updated = await response.json();
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Nome da Empresa</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          minLength={2}
          required
        />
      </div>

      <div>
        <label>URL do Logo</label>
        <input
          type="url"
          value={formData.logo}
          onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
          placeholder="https://exemplo.com/logo.png"
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```

## Desativar Empresa

Para desativar uma empresa (soft delete), use o endpoint DELETE:

### Endpoint

```
DELETE /api/companies/:id
```

### Permissoes

- **SUPER_ADMIN** apenas

### Response

```json
{
  "message": "Company deactivated successfully"
}
```

### Exemplo

```bash
curl -X DELETE https://api.chatblue.io/api/companies/clxxxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

:::warning Cuidado
Desativar uma empresa impede que todos os usuarios facam login. Os dados nao sao excluidos, mas a empresa fica inacessivel.
:::

## Notas Importantes

1. **Atualizacao Parcial**: Voce pode enviar apenas os campos que deseja atualizar. Campos nao enviados permanecem inalterados.

2. **Validacao de Slug**: Se atualizar o slug, ele deve ser unico e seguir o padrao (letras minusculas, numeros e hifens).

3. **Mudanca de Plano**: Apenas SUPER_ADMIN pode alterar o plano. Mudancas de plano podem afetar limites de recursos.

4. **Logo**: A URL do logo deve ser valida e acessivel publicamente.

5. **Historico**: A data `updatedAt` e atualizada automaticamente a cada modificacao.

## Endpoints Relacionados

- [Detalhes da Empresa](/docs/api/empresas/detalhes) - Ver dados atuais
- [Configuracoes](/docs/api/empresas/configuracoes) - Atualizar settings
- [Listar Empresas](/docs/api/empresas/listar) - Ver todas as empresas
