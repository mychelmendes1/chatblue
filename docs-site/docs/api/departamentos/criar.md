---
sidebar_position: 2
title: Criar Departamento
description: Endpoint para criar um novo departamento no ChatBlue
---

# Criar Departamento

Cria um novo departamento na empresa.

## Endpoint

```
POST /api/departments
```

## Descricao

Este endpoint permite criar um novo departamento na empresa do usuario autenticado. Os departamentos sao usados para organizar equipes de atendimento e rotear tickets automaticamente.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode criar departamentos
- **SUPER_ADMIN**: Pode criar departamentos

:::warning Acesso Restrito
Apenas usuarios com role `ADMIN` ou `SUPER_ADMIN` podem criar departamentos.
:::

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome do departamento (max 100 caracteres) |
| `description` | string | Nao | Descricao do departamento (max 500 caracteres) |
| `color` | string | Nao | Cor em hexadecimal (padrao: #3B82F6) |
| `isDefault` | boolean | Nao | Definir como departamento padrao |
| `userIds` | array | Nao | IDs dos usuarios a serem adicionados |

### Exemplo de Request

```json
{
  "name": "Suporte Tecnico",
  "description": "Departamento responsavel por suporte tecnico aos clientes",
  "color": "#10B981",
  "isDefault": false,
  "userIds": [
    "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "cluseryyyyyyyyyyyyyyyyyyyyyy"
  ]
}
```

Exemplo minimo:

```json
{
  "name": "Vendas"
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Suporte Tecnico",
  "description": "Departamento responsavel por suporte tecnico aos clientes",
  "color": "#10B981",
  "isActive": true,
  "isDefault": false,
  "companyId": "clcompxxxxxxxxxxxxxxxxxxxxxx",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "users": [
    {
      "user": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Joao Silva",
        "email": "joao@empresa.com"
      }
    },
    {
      "user": {
        "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
        "name": "Maria Santos",
        "email": "maria@empresa.com"
      }
    }
  ],
  "_count": {
    "users": 2,
    "tickets": 0
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
| `isActive` | boolean | Status de ativacao (sempre true ao criar) |
| `isDefault` | boolean | Se e o departamento padrao |
| `companyId` | string | ID da empresa |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Data da ultima atualizacao |
| `users` | array | Lista de usuarios adicionados |
| `_count` | object | Contadores |

## Erros

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: name: Nome e obrigatorio",
  "code": "VALIDATION_ERROR"
}
```

### 400 Bad Request - Nome Duplicado

```json
{
  "error": "Department with this name already exists",
  "code": "DUPLICATE_NAME"
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

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/departments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Suporte Tecnico",
    "description": "Departamento de suporte tecnico",
    "color": "#10B981",
    "userIds": ["cluserxxxxxxxxxxxxxxxxxxxxxx"]
  }'
```

### JavaScript (Fetch)

```javascript
async function createDepartment(departmentData) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('https://api.chatblue.io/api/departments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(departmentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
try {
  const newDepartment = await createDepartment({
    name: 'Suporte Tecnico',
    description: 'Departamento de suporte tecnico',
    color: '#10B981',
    userIds: ['cluserxxxxxxxxxxxxxxxxxxxxxx', 'cluseryyyyyyyyyyyyyyyyyyyyyy'],
  });

  console.log('Departamento criado:', newDepartment.id);
  console.log('Usuarios adicionados:', newDepartment._count.users);
} catch (error) {
  console.error('Erro ao criar departamento:', error.message);
}
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.chatblue.io/api',
});

async function createDepartment(name, description, color, userIds = []) {
  try {
    const { data } = await api.post('/departments', {
      name,
      description,
      color,
      userIds,
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}
```

### Python

```python
import requests

def create_department(access_token, name, description=None, color='#3B82F6', user_ids=None):
    url = 'https://api.chatblue.io/api/departments'

    payload = {
        'name': name,
        'color': color
    }

    if description:
        payload['description'] = description
    if user_ids:
        payload['userIds'] = user_ids

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 201:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    dept = create_department(
        token,
        name='Suporte Tecnico',
        description='Suporte tecnico especializado',
        color='#10B981',
        user_ids=['cluserxxx', 'cluseryyy']
    )
    print(f"Departamento criado: {dept['name']} (ID: {dept['id']})")
except Exception as e:
    print(f"Erro: {e}")
```

### PHP

```php
<?php

function createDepartment($accessToken, $name, $description = null, $color = '#3B82F6', $userIds = []) {
    $url = 'https://api.chatblue.io/api/departments';

    $payload = [
        'name' => $name,
        'color' => $color
    ];

    if ($description) {
        $payload['description'] = $description;
    }
    if (!empty($userIds)) {
        $payload['userIds'] = $userIds;
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $accessToken
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true);

    if ($httpCode === 201) {
        return $data;
    }

    throw new Exception($data['error'] ?? 'Erro desconhecido');
}

// Uso
try {
    $dept = createDepartment($token, 'Vendas', 'Equipe comercial', '#F59E0B');
    echo "Departamento criado: " . $dept['name'] . "\n";
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Notas Importantes

1. **Nome Unico**: Cada departamento deve ter um nome unico dentro da empresa.

2. **Departamento Padrao**: Se `isDefault: true` for passado, o departamento anterior que era padrao sera desmarcado automaticamente.

3. **Cores Sugeridas**: Use cores contrastantes para facilitar a identificacao visual:
   - Azul: `#3B82F6`
   - Verde: `#10B981`
   - Amarelo: `#F59E0B`
   - Vermelho: `#EF4444`
   - Roxo: `#8B5CF6`
   - Rosa: `#EC4899`

4. **Usuarios**: Os usuarios especificados em `userIds` serao automaticamente adicionados ao departamento.

## Endpoints Relacionados

- [Listar Departamentos](/docs/api/departamentos/listar) - Ver todos os departamentos
- [Atualizar Departamento](/docs/api/departamentos/atualizar) - Modificar departamento
- [Usuarios do Departamento](/docs/api/departamentos/usuarios) - Gerenciar usuarios
