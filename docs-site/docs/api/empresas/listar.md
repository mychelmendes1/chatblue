---
sidebar_position: 1
title: Listar Empresas
description: Endpoint para listar todas as empresas cadastradas no ChatBlue
---

# Listar Empresas

Retorna a lista de todas as empresas cadastradas no sistema.

## Endpoint

```
GET /api/companies
```

## Descricao

Este endpoint retorna todas as empresas cadastradas no sistema, incluindo contagem de usuarios, conexoes e tickets. Este endpoint e restrito a usuarios com role `SUPER_ADMIN`.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **SUPER_ADMIN**: Pode listar todas as empresas

:::warning Acesso Restrito
Apenas usuarios com role `SUPER_ADMIN` podem acessar este endpoint. Usuarios com outras roles receberao erro 403 Forbidden.
:::

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

Este endpoint nao possui query parameters.

## Response

### Sucesso (200 OK)

```json
[
  {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Empresa Alpha",
    "slug": "empresa-alpha",
    "logo": "https://exemplo.com/logo-alpha.png",
    "plan": "PRO",
    "isActive": true,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z",
    "_count": {
      "users": 15,
      "connections": 3,
      "tickets": 1250
    }
  },
  {
    "id": "clyyyyyyyyyyyyyyyyyyyyyyyy",
    "name": "Empresa Beta",
    "slug": "empresa-beta",
    "logo": null,
    "plan": "BASIC",
    "isActive": true,
    "createdAt": "2024-01-12T08:00:00.000Z",
    "updatedAt": "2024-01-14T16:45:00.000Z",
    "_count": {
      "users": 5,
      "connections": 1,
      "tickets": 320
    }
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da empresa (CUID) |
| `name` | string | Nome da empresa |
| `slug` | string | Identificador unico URL-friendly |
| `logo` | string/null | URL do logo da empresa |
| `plan` | string | Plano contratado (BASIC, PRO, ENTERPRISE) |
| `isActive` | boolean | Status de ativacao |
| `createdAt` | string | Data de criacao (ISO 8601) |
| `updatedAt` | string | Data da ultima atualizacao |
| `_count.users` | number | Total de usuarios |
| `_count.connections` | number | Total de conexoes WhatsApp |
| `_count.tickets` | number | Total de tickets |

### Planos Disponiveis

| Plano | Descricao |
|-------|-----------|
| `BASIC` | Plano basico com recursos essenciais |
| `PRO` | Plano profissional com recursos avancados |
| `ENTERPRISE` | Plano empresarial com recursos ilimitados |

## Erros

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
  "error": "Access denied. Super Admin required.",
  "code": "FORBIDDEN"
}
```

Ocorre quando o usuario nao tem role `SUPER_ADMIN`.

## Exemplos de Codigo

### cURL

```bash
curl -X GET https://api.chatblue.io/api/companies \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function listCompanies() {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('https://api.chatblue.io/api/companies', {
    method: 'GET',
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
  const companies = await listCompanies();
  console.log(`Total de empresas: ${companies.length}`);

  companies.forEach(company => {
    console.log(`${company.name} (${company.plan}): ${company._count.users} usuarios`);
  });
} catch (error) {
  console.error('Erro ao listar empresas:', error.message);
}
```

### Python

```python
import requests

def list_companies(access_token):
    url = 'https://api.chatblue.io/api/companies'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
companies = list_companies(access_token)
for company in companies:
    print(f"{company['name']}: {company['_count']['users']} usuarios")
```

## Endpoint Alternativo: Listar Empresas Ativas

Para administradores que precisam listar apenas empresas ativas (ex: para atribuir acesso a usuarios), existe um endpoint alternativo:

### Endpoint

```
GET /api/companies/all/active
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Response

```json
[
  {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Empresa Alpha",
    "slug": "empresa-alpha",
    "logo": "https://exemplo.com/logo-alpha.png",
    "plan": "PRO"
  }
]
```

### Exemplo

```javascript
async function listActiveCompanies() {
  const response = await fetch('/api/companies/all/active', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.json();
}
```

## Notas Importantes

1. **Ordenacao**: A lista e ordenada por data de criacao, mais recentes primeiro.

2. **Performance**: Para sistemas com muitas empresas, considere implementar paginacao no lado do cliente.

3. **Contadores**: Os contadores (`_count`) sao calculados em tempo real e podem impactar a performance em grandes volumes.

4. **Empresas Inativas**: Empresas inativas tambem sao listadas. Filtre por `isActive: true` se necessario.

## Endpoints Relacionados

- [Criar Empresa](/docs/api/empresas/criar) - Cadastrar nova empresa
- [Detalhes da Empresa](/docs/api/empresas/detalhes) - Obter empresa especifica
- [Atualizar Empresa](/docs/api/empresas/atualizar) - Modificar dados da empresa
