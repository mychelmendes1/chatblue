---
sidebar_position: 5
title: Departamentos do Usuario
description: Endpoints para gerenciar departamentos de usuarios no ChatBlue
---

# Departamentos do Usuario

Endpoints para gerenciar a associacao de usuarios a departamentos.

## Visao Geral

Os departamentos organizam os usuarios em equipes para roteamento de atendimentos. Um usuario pode pertencer a multiplos departamentos e pode ser gerente de um departamento.

---

## Listar Departamentos

Retorna todos os departamentos da empresa com seus usuarios.

### Endpoint

```
GET /api/departments
```

### Response (200 OK)

```json
[
  {
    "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Atendimento",
    "description": "Departamento de atendimento ao cliente",
    "color": "#3B82F6",
    "order": 1,
    "isActive": true,
    "parentId": null,
    "parent": null,
    "children": [],
    "users": [
      {
        "user": {
          "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Maria Silva",
          "avatar": "https://exemplo.com/avatar.jpg",
          "isOnline": true,
          "isAI": false
        }
      }
    ],
    "_count": {
      "tickets": 45
    }
  },
  {
    "id": "cldeptzzzzzzzzzzzzzzzzzzzzzz",
    "name": "Suporte Tecnico",
    "description": "Suporte tecnico especializado",
    "color": "#10B981",
    "order": 2,
    "isActive": true,
    "parentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "parent": {
      "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Atendimento"
    },
    "children": [],
    "users": [...],
    "_count": {
      "tickets": 23
    }
  }
]
```

### Campos

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID do departamento |
| `name` | string | Nome do departamento |
| `description` | string/null | Descricao |
| `color` | string | Cor hexadecimal |
| `order` | number | Ordem de exibicao |
| `isActive` | boolean | Se esta ativo |
| `parentId` | string/null | ID do departamento pai |
| `parent` | object/null | Dados do departamento pai |
| `children` | array | Subdepartamentos |
| `users` | array | Usuarios do departamento |
| `_count.tickets` | number | Tickets ativos no departamento |

### Exemplo cURL

```bash
curl -X GET https://api.chatblue.io/api/departments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Obter Arvore de Departamentos

Retorna os departamentos em formato hierarquico.

### Endpoint

```
GET /api/departments/tree
```

### Response

```json
[
  {
    "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Atendimento",
    "children": [
      {
        "id": "cldeptzzzzzzzzzzzzzzzzzzzzzz",
        "name": "Suporte Tecnico",
        "children": [
          {
            "id": "cldeptwwwwwwwwwwwwwwwwwwwww",
            "name": "Nivel 3",
            "children": []
          }
        ]
      }
    ]
  }
]
```

---

## Criar Departamento

### Endpoint

```
POST /api/departments
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome (min. 2 caracteres) |
| `description` | string | Nao | Descricao |
| `color` | string | Nao | Cor hexadecimal (#XXXXXX) |
| `order` | number | Nao | Ordem de exibicao |
| `parentId` | string/null | Nao | ID do departamento pai |

### Exemplo

```json
{
  "name": "Vendas",
  "description": "Departamento comercial",
  "color": "#F59E0B",
  "order": 3
}
```

### Response (201 Created)

```json
{
  "id": "cldeptnewwwwwwwwwwwwwwwwwwww",
  "name": "Vendas",
  "description": "Departamento comercial",
  "color": "#F59E0B",
  "order": 3,
  "isActive": true,
  "parentId": null,
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Exemplo cURL

```bash
curl -X POST https://api.chatblue.io/api/departments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vendas",
    "color": "#F59E0B"
  }'
```

---

## Adicionar Usuarios ao Departamento

### Endpoint

```
POST /api/departments/:id/users
```

### Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `userIds` | string[] | Sim | IDs dos usuarios a adicionar |
| `isManager` | boolean | Nao | Se sao gerentes do departamento |

### Exemplo

```json
{
  "userIds": [
    "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "cluseryyyyyyyyyyyyyyyyyyyyyy"
  ],
  "isManager": false
}
```

### Response (200 OK)

```json
{
  "message": "Users added successfully"
}
```

### Exemplo cURL

```bash
curl -X POST https://api.chatblue.io/api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["cluserxxx", "cluseryyy"],
    "isManager": false
  }'
```

---

## Remover Usuario do Departamento

### Endpoint

```
DELETE /api/departments/:id/users/:userId
```

### Response (200 OK)

```json
{
  "message": "User removed from department"
}
```

### Exemplo cURL

```bash
curl -X DELETE https://api.chatblue.io/api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx/users/cluserxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Atualizar Departamento

### Endpoint

```
PUT /api/departments/:id
```

### Body

Todos os campos sao opcionais.

```json
{
  "name": "Novo Nome",
  "description": "Nova descricao",
  "color": "#EF4444",
  "order": 5,
  "parentId": null
}
```

### Response (200 OK)

```json
{
  "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Novo Nome",
  "description": "Nova descricao",
  "color": "#EF4444",
  "order": 5,
  "isActive": true,
  "parentId": null,
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

## Deletar Departamento

### Endpoint

```
DELETE /api/departments/:id
```

:::warning Atencao
Nao e possivel deletar um departamento que tenha tickets ativos.
:::

### Response (200 OK)

```json
{
  "message": "Department deleted successfully"
}
```

### Erro - Tickets Ativos

```json
{
  "error": "Cannot delete department with active tickets",
  "code": "NOT_FOUND"
}
```

---

## Exemplos de Codigo

### JavaScript

```javascript
// Listar departamentos
async function listDepartments() {
  const response = await fetch('/api/departments', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.json();
}

// Criar departamento
async function createDepartment(data) {
  const response = await fetch('/api/departments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Adicionar usuarios ao departamento
async function addUsersToDepartment(departmentId, userIds, isManager = false) {
  const response = await fetch(`/api/departments/${departmentId}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ userIds, isManager }),
  });
  return response.json();
}

// Remover usuario do departamento
async function removeUserFromDepartment(departmentId, userId) {
  const response = await fetch(`/api/departments/${departmentId}/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.json();
}

// Uso
const departments = await listDepartments();
console.log('Departamentos:', departments.length);

const newDept = await createDepartment({
  name: 'Marketing',
  color: '#8B5CF6',
});
console.log('Departamento criado:', newDept.id);

await addUsersToDepartment(newDept.id, ['cluserxxx', 'cluseryyy']);
console.log('Usuarios adicionados');
```

### Python

```python
import requests

class DepartmentAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}

    def list(self):
        response = requests.get(
            f'{self.base_url}/departments',
            headers=self.headers
        )
        return response.json()

    def create(self, name, color=None, description=None, parent_id=None):
        data = {'name': name}
        if color:
            data['color'] = color
        if description:
            data['description'] = description
        if parent_id:
            data['parentId'] = parent_id

        response = requests.post(
            f'{self.base_url}/departments',
            json=data,
            headers={**self.headers, 'Content-Type': 'application/json'}
        )
        return response.json()

    def add_users(self, dept_id, user_ids, is_manager=False):
        response = requests.post(
            f'{self.base_url}/departments/{dept_id}/users',
            json={'userIds': user_ids, 'isManager': is_manager},
            headers={**self.headers, 'Content-Type': 'application/json'}
        )
        return response.json()

    def remove_user(self, dept_id, user_id):
        response = requests.delete(
            f'{self.base_url}/departments/{dept_id}/users/{user_id}',
            headers=self.headers
        )
        return response.json()

# Uso
api = DepartmentAPI('https://api.chatblue.io/api', token)

departments = api.list()
print(f"Total de departamentos: {len(departments)}")

new_dept = api.create('Financeiro', color='#22C55E')
print(f"Departamento criado: {new_dept['id']}")

api.add_users(new_dept['id'], ['cluserxxx'])
```

### React Hook

```typescript
import { useState, useEffect, useCallback } from 'react';

interface Department {
  id: string;
  name: string;
  color: string;
  users: Array<{ user: { id: string; name: string } }>;
  _count: { tickets: number };
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    const response = await fetch('/api/departments', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    });
    const data = await response.json();
    setDepartments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const addUserToDepartment = async (deptId: string, userId: string) => {
    await fetch(`/api/departments/${deptId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ userIds: [userId] }),
    });
    fetchDepartments();
  };

  const removeUserFromDepartment = async (deptId: string, userId: string) => {
    await fetch(`/api/departments/${deptId}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    });
    fetchDepartments();
  };

  return {
    departments,
    loading,
    addUserToDepartment,
    removeUserFromDepartment,
    refetch: fetchDepartments,
  };
}
```

---

## Notas Importantes

1. **Departamentos Hierarquicos**: Departamentos podem ter subdepartamentos ate 3 niveis de profundidade.

2. **Usuarios Multiplos**: Um usuario pode pertencer a varios departamentos simultaneamente.

3. **Gerentes**: O campo `isManager` indica se o usuario e gerente do departamento (para permissoes especiais).

4. **Cores**: Use cores hexadecimais no formato `#XXXXXX` para melhor visualizacao.

5. **Soft Delete**: Ao deletar um departamento, ele e desativado (`isActive: false`), nao excluido permanentemente.

6. **Tickets Ativos**: Departamentos com tickets ativos (PENDING, IN_PROGRESS, WAITING) nao podem ser deletados.

## Endpoints Relacionados

- [Listar Usuarios](/docs/api/usuarios/listar) - Ver usuarios com departamentos
- [Atualizar Usuario](/docs/api/usuarios/atualizar) - Modificar departamentos do usuario
