---
sidebar_position: 5
title: Usuarios do Departamento
description: Endpoints para gerenciar usuarios de um departamento no ChatBlue
---

# Usuarios do Departamento

Gerencia os usuarios vinculados a um departamento.

## Endpoints

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/departments/:id/users` | Listar usuarios do departamento |
| POST | `/api/departments/:id/users` | Adicionar usuarios ao departamento |
| DELETE | `/api/departments/:id/users/:userId` | Remover usuario do departamento |

---

## Listar Usuarios do Departamento

### Endpoint

```
GET /api/departments/:id/users
```

### Descricao

Retorna a lista de todos os usuarios vinculados a um departamento especifico.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

Todos os usuarios autenticados podem listar usuarios de departamentos da sua empresa.

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do departamento (CUID) |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `isOnline` | boolean | - | Filtrar por status online |
| `isActive` | boolean | true | Filtrar por status de ativacao |

### Response (200 OK)

```json
{
  "departmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "departmentName": "Suporte Tecnico",
  "users": [
    {
      "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Joao Silva",
      "email": "joao@empresa.com",
      "avatar": "https://exemplo.com/avatar1.jpg",
      "role": "AGENT",
      "isOnline": true,
      "isActive": true,
      "lastSeen": "2024-01-15T14:30:00.000Z",
      "_count": {
        "tickets": 8
      }
    },
    {
      "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
      "name": "Maria Santos",
      "email": "maria@empresa.com",
      "avatar": null,
      "role": "SUPERVISOR",
      "isOnline": false,
      "isActive": true,
      "lastSeen": "2024-01-15T12:00:00.000Z",
      "_count": {
        "tickets": 3
      }
    }
  ],
  "total": 2,
  "onlineCount": 1
}
```

### Exemplo cURL

```bash
curl -X GET https://api.chatblue.io/api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Exemplo JavaScript

```javascript
async function getDepartmentUsers(departmentId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.isOnline !== undefined) params.append('isOnline', filters.isOnline);
  if (filters.isActive !== undefined) params.append('isActive', filters.isActive);

  const response = await fetch(
    `https://api.chatblue.io/api/departments/${departmentId}/users?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
const data = await getDepartmentUsers('cldeptxxxxxxxxxxxxxxxxxxxxxx');
console.log(`Usuarios: ${data.total}, Online: ${data.onlineCount}`);
```

---

## Adicionar Usuarios ao Departamento

### Endpoint

```
POST /api/departments/:id/users
```

### Descricao

Adiciona um ou mais usuarios a um departamento. Usuarios ja vinculados sao ignorados.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

- **ADMIN**: Pode adicionar usuarios
- **SUPER_ADMIN**: Pode adicionar usuarios

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do departamento (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `userIds` | array | Sim | Lista de IDs de usuarios |

### Exemplo de Request

```json
{
  "userIds": [
    "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "cluseryyyyyyyyyyyyyyyyyyyyyy",
    "cluserzzzzzzzzzzzzzzzzzzzzzz"
  ]
}
```

### Response (200 OK)

```json
{
  "message": "Users added successfully",
  "added": 2,
  "skipped": 1,
  "details": {
    "addedUsers": [
      {
        "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
        "name": "Maria Santos"
      },
      {
        "id": "cluserzzzzzzzzzzzzzzzzzzzzzz",
        "name": "Pedro Lima"
      }
    ],
    "skippedUsers": [
      {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Joao Silva",
        "reason": "Already in department"
      }
    ]
  }
}
```

### Erros

#### 400 Bad Request - Lista Vazia

```json
{
  "error": "userIds array cannot be empty",
  "code": "VALIDATION_ERROR"
}
```

#### 404 Not Found - Usuario Nao Encontrado

```json
{
  "error": "One or more users not found",
  "code": "USER_NOT_FOUND",
  "invalidIds": ["cluserinvalidxxxxxxxxxxxxxxx"]
}
```

### Exemplo cURL

```bash
curl -X POST https://api.chatblue.io/api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["cluseryyyyyyyyyyyyyyyyyyyyyy", "cluserzzzzzzzzzzzzzzzzzzzzzz"]
  }'
```

### Exemplo JavaScript

```javascript
async function addUsersToDepartment(departmentId, userIds) {
  const response = await fetch(
    `https://api.chatblue.io/api/departments/${departmentId}/users`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userIds }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
try {
  const result = await addUsersToDepartment('cldeptxxxxxxxxxxxxxxxxxxxxxx', [
    'cluseryyyyyyyyyyyyyyyyyyyyyy',
    'cluserzzzzzzzzzzzzzzzzzzzzzz',
  ]);

  console.log(`Adicionados: ${result.added}, Ignorados: ${result.skipped}`);

  if (result.skipped > 0) {
    console.log('Usuarios ja estavam no departamento:');
    result.details.skippedUsers.forEach(u => {
      console.log(`- ${u.name}: ${u.reason}`);
    });
  }
} catch (error) {
  console.error('Erro:', error.message);
}
```

### Python

```python
import requests

def add_users_to_department(access_token, department_id, user_ids):
    url = f'https://api.chatblue.io/api/departments/{department_id}/users'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payload = {'userIds': user_ids}

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
result = add_users_to_department(token, 'cldeptxxx', ['cluseryyy', 'cluserzzz'])
print(f"Adicionados: {result['added']}")
```

---

## Remover Usuario do Departamento

### Endpoint

```
DELETE /api/departments/:id/users/:userId
```

### Descricao

Remove um usuario especifico de um departamento.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

- **ADMIN**: Pode remover usuarios
- **SUPER_ADMIN**: Pode remover usuarios

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do departamento (CUID) |
| `userId` | string | ID do usuario a remover (CUID) |

### Response (200 OK)

```json
{
  "message": "User removed from department successfully",
  "user": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Joao Silva"
  },
  "department": {
    "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Suporte Tecnico"
  }
}
```

### Erros

#### 404 Not Found - Usuario Nao Esta no Departamento

```json
{
  "error": "User is not a member of this department",
  "code": "NOT_MEMBER"
}
```

#### 400 Bad Request - Ultimo Usuario

```json
{
  "error": "Cannot remove the last user from a department with active tickets",
  "code": "LAST_USER_WITH_TICKETS"
}
```

### Exemplo cURL

```bash
curl -X DELETE https://api.chatblue.io/api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx/users/cluserxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Exemplo JavaScript

```javascript
async function removeUserFromDepartment(departmentId, userId) {
  const response = await fetch(
    `https://api.chatblue.io/api/departments/${departmentId}/users/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
try {
  const result = await removeUserFromDepartment(
    'cldeptxxxxxxxxxxxxxxxxxxxxxx',
    'cluserxxxxxxxxxxxxxxxxxxxxxx'
  );
  console.log(`Usuario ${result.user.name} removido de ${result.department.name}`);
} catch (error) {
  console.error('Erro:', error.message);
}
```

### Python

```python
import requests

def remove_user_from_department(access_token, department_id, user_id):
    url = f'https://api.chatblue.io/api/departments/{department_id}/users/{user_id}'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.delete(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
result = remove_user_from_department(token, 'cldeptxxx', 'cluserxxx')
print(f"Usuario {result['user']['name']} removido")
```

---

## Casos de Uso Comuns

### Transferir Usuario Entre Departamentos

```javascript
async function transferUser(userId, fromDeptId, toDeptId) {
  // Adicionar ao novo departamento primeiro
  await addUsersToDepartment(toDeptId, [userId]);

  // Remover do departamento anterior
  await removeUserFromDepartment(fromDeptId, userId);

  console.log('Usuario transferido com sucesso');
}
```

### Sincronizar Usuarios do Departamento

```javascript
async function syncDepartmentUsers(departmentId, desiredUserIds) {
  // Obter usuarios atuais
  const current = await getDepartmentUsers(departmentId);
  const currentIds = current.users.map(u => u.id);

  // Usuarios a adicionar
  const toAdd = desiredUserIds.filter(id => !currentIds.includes(id));

  // Usuarios a remover
  const toRemove = currentIds.filter(id => !desiredUserIds.includes(id));

  // Executar operacoes
  if (toAdd.length > 0) {
    await addUsersToDepartment(departmentId, toAdd);
  }

  for (const userId of toRemove) {
    await removeUserFromDepartment(departmentId, userId);
  }

  console.log(`Adicionados: ${toAdd.length}, Removidos: ${toRemove.length}`);
}
```

## Notas Importantes

1. **Multiplos Departamentos**: Um usuario pode pertencer a multiplos departamentos simultaneamente.

2. **Tickets Ativos**: Remover um usuario de um departamento nao reatribui automaticamente seus tickets.

3. **Departamento Padrao**: Todo usuario recebe tickets do departamento em que esta. Se estiver em multiplos, o roteamento considera a disponibilidade.

4. **Notificacoes**: Usuarios sao notificados via Socket.io quando sao adicionados ou removidos de departamentos.

5. **Performance**: A operacao de adicionar usuarios suporta ate 100 usuarios por requisicao.

## Endpoints Relacionados

- [Listar Departamentos](/docs/api/departamentos/listar) - Ver todos os departamentos
- [Detalhes do Departamento](/docs/api/departamentos/detalhes) - Obter departamento
- [Departamentos do Usuario](/docs/api/usuarios/departamentos) - Gerenciar pelo lado do usuario
