---
sidebar_position: 1
title: Listar Departamentos
description: Endpoint para listar departamentos da empresa no ChatBlue
---

# Listar Departamentos

Retorna a lista de departamentos da empresa.

## Endpoint

```
GET /api/departments
```

## Descricao

Este endpoint retorna todos os departamentos cadastrados na empresa do usuario autenticado. Os departamentos sao utilizados para organizar o atendimento e rotear tickets para equipes especificas.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem listar departamentos da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `isActive` | boolean | - | Filtrar por status de ativacao |
| `includeUsers` | boolean | false | Incluir lista de usuarios do departamento |

### Exemplos de URL

```
# Listar todos os departamentos
GET /api/departments

# Listar apenas departamentos ativos
GET /api/departments?isActive=true

# Incluir usuarios de cada departamento
GET /api/departments?includeUsers=true
```

## Response

### Sucesso (200 OK)

```json
[
  {
    "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Atendimento",
    "description": "Departamento de atendimento ao cliente",
    "color": "#3B82F6",
    "isActive": true,
    "isDefault": true,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z",
    "_count": {
      "users": 5,
      "tickets": 120
    }
  },
  {
    "id": "cldeptzzzzzzzzzzzzzzzzzzzzzz",
    "name": "Suporte Tecnico",
    "description": "Suporte tecnico especializado",
    "color": "#10B981",
    "isActive": true,
    "isDefault": false,
    "createdAt": "2024-01-11T08:00:00.000Z",
    "updatedAt": "2024-01-14T16:45:00.000Z",
    "_count": {
      "users": 3,
      "tickets": 85
    }
  },
  {
    "id": "cldeptaaaaaaaaaaaaaaaaaaaaa",
    "name": "Vendas",
    "description": "Equipe comercial",
    "color": "#F59E0B",
    "isActive": true,
    "isDefault": false,
    "createdAt": "2024-01-12T09:00:00.000Z",
    "updatedAt": "2024-01-13T11:20:00.000Z",
    "_count": {
      "users": 4,
      "tickets": 200
    }
  }
]
```

### Com `includeUsers=true`

```json
[
  {
    "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Atendimento",
    "description": "Departamento de atendimento ao cliente",
    "color": "#3B82F6",
    "isActive": true,
    "isDefault": true,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z",
    "users": [
      {
        "user": {
          "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Maria Silva",
          "email": "maria@empresa.com",
          "avatar": "https://exemplo.com/avatar1.jpg",
          "isOnline": true
        }
      },
      {
        "user": {
          "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
          "name": "Joao Santos",
          "email": "joao@empresa.com",
          "avatar": null,
          "isOnline": false
        }
      }
    ],
    "_count": {
      "users": 2,
      "tickets": 120
    }
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do departamento (CUID) |
| `name` | string | Nome do departamento |
| `description` | string/null | Descricao do departamento |
| `color` | string | Cor em formato hexadecimal |
| `isActive` | boolean | Status de ativacao |
| `isDefault` | boolean | Se e o departamento padrao |
| `createdAt` | string | Data de criacao (ISO 8601) |
| `updatedAt` | string | Data da ultima atualizacao |
| `users` | array | Lista de usuarios (se includeUsers=true) |
| `_count.users` | number | Total de usuarios no departamento |
| `_count.tickets` | number | Total de tickets ativos |

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
# Listar todos departamentos
curl -X GET https://api.chatblue.io/api/departments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar com usuarios
curl -X GET "https://api.chatblue.io/api/departments?includeUsers=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function listDepartments(options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (options.isActive !== undefined) params.append('isActive', options.isActive.toString());
  if (options.includeUsers) params.append('includeUsers', 'true');

  const queryString = params.toString();
  const url = `https://api.chatblue.io/api/departments${queryString ? `?${queryString}` : ''}`;

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
  const departments = await listDepartments();
  console.log(`Total de departamentos: ${departments.length}`);

  // Encontrar departamento padrao
  const defaultDept = departments.find(d => d.isDefault);
  console.log('Departamento padrao:', defaultDept?.name);

  // Listar com usuarios
  const deptWithUsers = await listDepartments({ includeUsers: true });
  deptWithUsers.forEach(dept => {
    console.log(`${dept.name}: ${dept._count.users} usuarios`);
  });
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.chatblue.io/api',
});

async function listDepartments(includeUsers = false) {
  const { data } = await api.get('/departments', {
    params: { includeUsers },
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });
  return data;
}

// Uso
const departments = await listDepartments(true);
```

### Python

```python
import requests

def list_departments(access_token, is_active=None, include_users=False):
    url = 'https://api.chatblue.io/api/departments'

    params = {}
    if is_active is not None:
        params['isActive'] = str(is_active).lower()
    if include_users:
        params['includeUsers'] = 'true'

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
departments = list_departments(token)
for dept in departments:
    print(f"{dept['name']}: {dept['_count']['users']} usuarios, {dept['_count']['tickets']} tickets")
```

## Notas Importantes

1. **Departamento Padrao**: Cada empresa tem um departamento marcado como `isDefault`. Novos tickets sao atribuidos a este departamento se nenhum outro for especificado.

2. **Cores**: As cores sao usadas na interface para identificar visualmente os departamentos.

3. **Contagem de Tickets**: O `_count.tickets` inclui apenas tickets ativos (PENDING, IN_PROGRESS, WAITING).

4. **Ordenacao**: Os departamentos sao retornados em ordem alfabetica por nome.

## Endpoints Relacionados

- [Criar Departamento](/docs/api/departamentos/criar) - Cadastrar novo departamento
- [Detalhes do Departamento](/docs/api/departamentos/detalhes) - Obter departamento especifico
- [Atualizar Departamento](/docs/api/departamentos/atualizar) - Modificar departamento
- [Usuarios do Departamento](/docs/api/departamentos/usuarios) - Gerenciar usuarios
