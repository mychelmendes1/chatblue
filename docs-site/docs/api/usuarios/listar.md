---
sidebar_position: 1
title: Listar Usuarios
description: Endpoint para listar usuarios da empresa no ChatBlue
---

# Listar Usuarios

Retorna a lista de usuarios da empresa.

## Endpoint

```
GET /api/users
```

## Descricao

Este endpoint retorna todos os usuarios da empresa do usuario autenticado. Por padrao, retorna apenas usuarios ativos. Suporta filtros por departamento, tipo (humano ou IA) e status de ativacao.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem listar usuarios da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `departmentId` | string | - | Filtrar por departamento |
| `isAI` | boolean | - | Filtrar agentes de IA (true) ou humanos (false) |
| `isActive` | boolean | true | Filtrar por status de ativacao |

### Exemplos de URL

```
# Listar todos os usuarios ativos
GET /api/users

# Listar usuarios de um departamento
GET /api/users?departmentId=cldeptxxxxxxxxxxxxxxxxxxxxxx

# Listar apenas agentes de IA
GET /api/users?isAI=true

# Listar usuarios inativos
GET /api/users?isActive=false

# Combinar filtros
GET /api/users?departmentId=cldeptxxxxxxxxxxxxxxxxxxxxxx&isAI=false&isActive=true
```

## Response

### Sucesso (200 OK)

```json
[
  {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "email": "admin@empresa.com",
    "name": "Administrador",
    "avatar": "https://exemplo.com/avatar1.jpg",
    "role": "ADMIN",
    "isAI": false,
    "isActive": true,
    "isOnline": true,
    "lastSeen": "2024-01-15T14:30:00.000Z",
    "departments": [
      {
        "department": {
          "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Atendimento",
          "color": "#3B82F6"
        }
      }
    ],
    "_count": {
      "tickets": 5
    }
  },
  {
    "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
    "email": "agente@empresa.com",
    "name": "Agente de Suporte",
    "avatar": null,
    "role": "AGENT",
    "isAI": false,
    "isActive": true,
    "isOnline": false,
    "lastSeen": "2024-01-15T12:00:00.000Z",
    "departments": [
      {
        "department": {
          "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Atendimento",
          "color": "#3B82F6"
        }
      },
      {
        "department": {
          "id": "cldeptzzzzzzzzzzzzzzzzzzzzzz",
          "name": "Suporte Tecnico",
          "color": "#10B981"
        }
      }
    ],
    "_count": {
      "tickets": 12
    }
  },
  {
    "id": "cluseraaaaaaaaaaaaaaaaaaaaa",
    "email": "ai.assistente@empresa.com",
    "name": "Assistente Virtual",
    "avatar": "https://exemplo.com/bot-avatar.png",
    "role": "AGENT",
    "isAI": true,
    "isActive": true,
    "isOnline": true,
    "lastSeen": null,
    "departments": [],
    "_count": {
      "tickets": 150
    }
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do usuario (CUID) |
| `email` | string | Email do usuario |
| `name` | string | Nome completo |
| `avatar` | string/null | URL da foto de perfil |
| `role` | string | Role (SUPER_ADMIN, ADMIN, SUPERVISOR, AGENT) |
| `isAI` | boolean | Se e um agente de IA |
| `isActive` | boolean | Status de ativacao |
| `isOnline` | boolean | Se esta online no momento |
| `lastSeen` | string/null | Ultimo acesso (ISO 8601) |
| `departments` | array | Lista de departamentos |
| `_count.tickets` | number | Tickets ativos atribuidos |

### Roles Disponiveis

| Role | Descricao |
|------|-----------|
| `SUPER_ADMIN` | Administrador do sistema (todas empresas) |
| `ADMIN` | Administrador da empresa |
| `SUPERVISOR` | Supervisor de equipe |
| `AGENT` | Atendente |

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
# Listar todos usuarios ativos
curl -X GET https://api.chatblue.io/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por departamento
curl -X GET "https://api.chatblue.io/api/users?departmentId=cldeptxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar agentes de IA
curl -X GET "https://api.chatblue.io/api/users?isAI=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function listUsers(filters = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (filters.departmentId) params.append('departmentId', filters.departmentId);
  if (filters.isAI !== undefined) params.append('isAI', filters.isAI.toString());
  if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());

  const queryString = params.toString();
  const url = `https://api.chatblue.io/api/users${queryString ? `?${queryString}` : ''}`;

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
  // Listar todos usuarios
  const allUsers = await listUsers();
  console.log(`Total de usuarios: ${allUsers.length}`);

  // Filtrar por departamento
  const deptUsers = await listUsers({ departmentId: 'cldeptxxx' });

  // Listar apenas agentes de IA
  const aiAgents = await listUsers({ isAI: true });

  // Listar usuarios inativos
  const inactiveUsers = await listUsers({ isActive: false });
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Funcoes Utilitarias

```javascript
// Agrupar usuarios por departamento
function groupByDepartment(users) {
  const grouped = {};

  users.forEach(user => {
    user.departments.forEach(({ department }) => {
      if (!grouped[department.id]) {
        grouped[department.id] = {
          department,
          users: [],
        };
      }
      grouped[department.id].users.push(user);
    });
  });

  return Object.values(grouped);
}

// Filtrar usuarios online
function getOnlineUsers(users) {
  return users.filter(user => user.isOnline);
}

// Ordenar por tickets atribuidos
function sortByTicketCount(users, ascending = true) {
  return [...users].sort((a, b) => {
    const diff = a._count.tickets - b._count.tickets;
    return ascending ? diff : -diff;
  });
}

// Uso
const users = await listUsers();

const byDepartment = groupByDepartment(users);
console.log('Usuarios por departamento:', byDepartment);

const online = getOnlineUsers(users);
console.log('Usuarios online:', online.length);

const sorted = sortByTicketCount(users);
console.log('Usuario com menos tickets:', sorted[0]?.name);
```

### Python

```python
import requests

def list_users(access_token, department_id=None, is_ai=None, is_active=None):
    url = 'https://api.chatblue.io/api/users'

    params = {}
    if department_id:
        params['departmentId'] = department_id
    if is_ai is not None:
        params['isAI'] = str(is_ai).lower()
    if is_active is not None:
        params['isActive'] = str(is_active).lower()

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
users = list_users(token)
print(f"Total de usuarios: {len(users)}")

# Filtrar agentes de IA
ai_agents = list_users(token, is_ai=True)
print(f"Agentes de IA: {len(ai_agents)}")

# Usuarios de um departamento
dept_users = list_users(token, department_id='cldeptxxx')
```

### React Hook

```typescript
import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  isAI: boolean;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  departments: Array<{
    department: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  _count: {
    tickets: number;
  };
}

interface UseUsersOptions {
  departmentId?: string;
  isAI?: boolean;
  isActive?: boolean;
}

export function useUsers(options: UseUsersOptions = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.departmentId) params.append('departmentId', options.departmentId);
      if (options.isAI !== undefined) params.append('isAI', String(options.isAI));
      if (options.isActive !== undefined) params.append('isActive', String(options.isActive));

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.departmentId, options.isAI, options.isActive]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onlineUsers = users.filter(u => u.isOnline);
  const aiAgents = users.filter(u => u.isAI);
  const humanUsers = users.filter(u => !u.isAI);

  return {
    users,
    onlineUsers,
    aiAgents,
    humanUsers,
    loading,
    error,
    refetch: fetchUsers,
  };
}

// Uso no componente
function UserList() {
  const { users, onlineUsers, loading, error } = useUsers({ isActive: true });

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2>Usuarios ({users.length})</h2>
      <p>Online: {onlineUsers.length}</p>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} - {user.role}
            {user.isOnline && <span> (Online)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Endpoint Relacionado: Listar Agentes de IA

Para listar apenas agentes de IA com suas configuracoes, existe um endpoint dedicado:

### Endpoint

```
GET /api/users/ai-agents
```

### Response

```json
[
  {
    "id": "cluseraaaaaaaaaaaaaaaaaaaaa",
    "email": "ai.assistente@empresa.com",
    "name": "Assistente Virtual",
    "avatar": "https://exemplo.com/bot-avatar.png",
    "isAI": true,
    "isActive": true,
    "aiModel": "gpt-4-turbo-preview",
    "aiTemperature": 0.7,
    "aiMaxTokens": 1000,
    "aiSystemPrompt": "Voce e um assistente...",
    "aiPersonalityTone": "friendly",
    "aiPersonalityStyle": "conversational",
    "aiUseEmojis": true,
    "aiUseClientName": true,
    "aiGuardrailsEnabled": true,
    "transferKeywords": ["humano", "atendente", "falar com pessoa"],
    "trainingData": "Dados de treinamento...",
    "departments": [...],
    "_count": {
      "assignedTickets": 150
    }
  }
]
```

## Notas Importantes

1. **Escopo da Empresa**: Apenas usuarios da mesma empresa sao retornados. O `companyId` e obtido do token JWT.

2. **Filtro Padrao de Ativos**: Por padrao, apenas usuarios ativos sao retornados. Para ver inativos, use `?isActive=false`.

3. **Contagem de Tickets**: O campo `_count.tickets` mostra apenas tickets ativos (PENDING, IN_PROGRESS, WAITING).

4. **Ordenacao**: A lista e ordenada por nome em ordem alfabetica.

5. **Departamentos Multiplos**: Um usuario pode pertencer a multiplos departamentos.

## Endpoints Relacionados

- [Criar Usuario](/docs/api/usuarios/criar) - Adicionar novo usuario
- [Detalhes do Usuario](/docs/api/usuarios/detalhes) - Ver usuario especifico
- [Departamentos do Usuario](/docs/api/usuarios/departamentos) - Gerenciar departamentos
