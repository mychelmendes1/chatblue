---
sidebar_position: 3
title: Detalhes do Departamento
description: Endpoint para obter detalhes de um departamento especifico no ChatBlue
---

# Detalhes do Departamento

Retorna informacoes detalhadas de um departamento especifico.

## Endpoint

```
GET /api/departments/:id
```

## Descricao

Este endpoint retorna as informacoes completas de um departamento, incluindo seus usuarios e estatisticas de tickets.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem visualizar departamentos da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do departamento (CUID) |

### Exemplo de URL

```
GET /api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Suporte Tecnico",
  "description": "Departamento responsavel por suporte tecnico aos clientes",
  "color": "#10B981",
  "isActive": true,
  "isDefault": false,
  "companyId": "clcompxxxxxxxxxxxxxxxxxxxxxx",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z",
  "users": [
    {
      "user": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Joao Silva",
        "email": "joao@empresa.com",
        "avatar": "https://exemplo.com/avatar1.jpg",
        "role": "AGENT",
        "isOnline": true,
        "isActive": true
      }
    },
    {
      "user": {
        "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
        "name": "Maria Santos",
        "email": "maria@empresa.com",
        "avatar": null,
        "role": "SUPERVISOR",
        "isOnline": false,
        "isActive": true
      }
    }
  ],
  "_count": {
    "users": 2,
    "tickets": 85
  },
  "stats": {
    "ticketsByStatus": {
      "PENDING": 20,
      "IN_PROGRESS": 45,
      "WAITING": 15,
      "RESOLVED": 5
    },
    "averageResponseTime": 180,
    "averageResolutionTime": 3600
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do departamento (CUID) |
| `name` | string | Nome do departamento |
| `description` | string/null | Descricao |
| `color` | string | Cor em hexadecimal |
| `isActive` | boolean | Status de ativacao |
| `isDefault` | boolean | Se e o departamento padrao |
| `companyId` | string | ID da empresa |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Data da ultima atualizacao |
| `users` | array | Lista de usuarios do departamento |
| `_count` | object | Contadores |
| `stats` | object | Estatisticas do departamento |

### Objeto `stats`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `ticketsByStatus` | object | Contagem de tickets por status |
| `averageResponseTime` | number | Tempo medio de primeira resposta (segundos) |
| `averageResolutionTime` | number | Tempo medio de resolucao (segundos) |

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
  "error": "Department not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
curl -X GET https://api.chatblue.io/api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getDepartment(departmentId) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/departments/${departmentId}`, {
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
  const department = await getDepartment('cldeptxxxxxxxxxxxxxxxxxxxxxx');

  console.log('Departamento:', department.name);
  console.log('Usuarios:', department._count.users);
  console.log('Tickets pendentes:', department.stats.ticketsByStatus.PENDING);

  // Listar usuarios online
  const onlineUsers = department.users.filter(u => u.user.isOnline);
  console.log('Usuarios online:', onlineUsers.length);

  // Tempo medio de resposta em minutos
  const avgResponseMin = Math.round(department.stats.averageResponseTime / 60);
  console.log(`Tempo medio de resposta: ${avgResponseMin} minutos`);
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

async function getDepartment(id) {
  try {
    const { data } = await api.get(`/departments/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    return data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Departamento nao encontrado');
    }
    throw error;
  }
}
```

### Python

```python
import requests

def get_department(access_token, department_id):
    url = f'https://api.chatblue.io/api/departments/{department_id}'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        raise Exception('Departamento nao encontrado')
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
dept = get_department(token, 'cldeptxxxxxxxxxxxxxxxxxxxxxx')
print(f"Departamento: {dept['name']}")
print(f"Usuarios: {dept['_count']['users']}")
print(f"Tickets ativos: {dept['_count']['tickets']}")

# Estatisticas
print(f"Tickets pendentes: {dept['stats']['ticketsByStatus']['PENDING']}")
print(f"Tempo medio de resposta: {dept['stats']['averageResponseTime']}s")
```

### React Component

```typescript
import { useState, useEffect } from 'react';

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  users: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      isOnline: boolean;
    };
  }>;
  _count: {
    users: number;
    tickets: number;
  };
  stats: {
    ticketsByStatus: Record<string, number>;
    averageResponseTime: number;
    averageResolutionTime: number;
  };
}

function useDepartment(departmentId: string) {
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDepartment() {
      try {
        setLoading(true);
        const response = await fetch(`/api/departments/${departmentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar departamento');
        }

        const data = await response.json();
        setDepartment(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    fetchDepartment();
  }, [departmentId]);

  return { department, loading, error };
}

// Uso
function DepartmentDetails({ departmentId }: { departmentId: string }) {
  const { department, loading, error } = useDepartment(departmentId);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!department) return <div>Departamento nao encontrado</div>;

  return (
    <div>
      <h1 style={{ color: department.color }}>{department.name}</h1>
      <p>{department.description}</p>

      <h2>Usuarios ({department._count.users})</h2>
      <ul>
        {department.users.map(({ user }) => (
          <li key={user.id}>
            {user.name}
            {user.isOnline && <span className="online-badge">Online</span>}
          </li>
        ))}
      </ul>

      <h2>Estatisticas</h2>
      <p>Tickets ativos: {department._count.tickets}</p>
      <p>Pendentes: {department.stats.ticketsByStatus.PENDING}</p>
      <p>Em progresso: {department.stats.ticketsByStatus.IN_PROGRESS}</p>
    </div>
  );
}
```

## Notas Importantes

1. **Acesso Restrito a Empresa**: O departamento deve pertencer a mesma empresa do usuario autenticado.

2. **Usuarios Ativos**: A lista de usuarios inclui apenas usuarios ativos do departamento.

3. **Estatisticas em Tempo Real**: Os valores em `stats` sao calculados em tempo real e podem variar.

4. **Tempos em Segundos**: `averageResponseTime` e `averageResolutionTime` sao retornados em segundos.

## Endpoints Relacionados

- [Listar Departamentos](/docs/api/departamentos/listar) - Ver todos os departamentos
- [Atualizar Departamento](/docs/api/departamentos/atualizar) - Modificar departamento
- [Usuarios do Departamento](/docs/api/departamentos/usuarios) - Gerenciar usuarios
