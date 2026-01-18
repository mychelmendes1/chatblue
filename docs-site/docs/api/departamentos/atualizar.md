---
sidebar_position: 4
title: Atualizar Departamento
description: Endpoint para atualizar um departamento existente no ChatBlue
---

# Atualizar Departamento

Atualiza as informacoes de um departamento existente.

## Endpoint

```
PUT /api/departments/:id
```

## Descricao

Este endpoint permite atualizar os dados de um departamento existente, incluindo nome, descricao, cor, status e configuracao de departamento padrao.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode atualizar departamentos
- **SUPER_ADMIN**: Pode atualizar departamentos

:::warning Acesso Restrito
Apenas usuarios com role `ADMIN` ou `SUPER_ADMIN` podem atualizar departamentos.
:::

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do departamento (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Nao | Nome do departamento (max 100 caracteres) |
| `description` | string | Nao | Descricao do departamento (max 500 caracteres) |
| `color` | string | Nao | Cor em hexadecimal |
| `isActive` | boolean | Nao | Status de ativacao |
| `isDefault` | boolean | Nao | Definir como departamento padrao |

### Exemplo de Request

```json
{
  "name": "Suporte Premium",
  "description": "Suporte tecnico para clientes premium",
  "color": "#8B5CF6",
  "isActive": true,
  "isDefault": false
}
```

Atualizacao parcial (apenas campos desejados):

```json
{
  "name": "Novo Nome do Departamento"
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Suporte Premium",
  "description": "Suporte tecnico para clientes premium",
  "color": "#8B5CF6",
  "isActive": true,
  "isDefault": false,
  "companyId": "clcompxxxxxxxxxxxxxxxxxxxxxx",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T16:45:00.000Z",
  "_count": {
    "users": 3,
    "tickets": 45
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do departamento (CUID) |
| `name` | string | Nome atualizado |
| `description` | string/null | Descricao |
| `color` | string | Cor em hexadecimal |
| `isActive` | boolean | Status de ativacao |
| `isDefault` | boolean | Se e o departamento padrao |
| `companyId` | string | ID da empresa |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Data da ultima atualizacao |
| `_count` | object | Contadores |

## Erros

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: name: Nome nao pode estar vazio",
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

### 400 Bad Request - Desativar Departamento Padrao

```json
{
  "error": "Cannot deactivate default department. Set another department as default first.",
  "code": "CANNOT_DEACTIVATE_DEFAULT"
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
  "error": "Department not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
# Atualizar nome e cor
curl -X PUT https://api.chatblue.io/api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Suporte Premium",
    "color": "#8B5CF6"
  }'

# Desativar departamento
curl -X PUT https://api.chatblue.io/api/departments/cldeptxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### JavaScript (Fetch)

```javascript
async function updateDepartment(departmentId, updates) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/departments/${departmentId}`, {
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

// Uso
try {
  // Atualizar nome e descricao
  const updated = await updateDepartment('cldeptxxxxxxxxxxxxxxxxxxxxxx', {
    name: 'Suporte Premium',
    description: 'Atendimento prioritario para clientes premium',
  });

  console.log('Departamento atualizado:', updated.name);
  console.log('Ultima atualizacao:', updated.updatedAt);

  // Definir como padrao
  await updateDepartment('cldeptxxxxxxxxxxxxxxxxxxxxxx', {
    isDefault: true,
  });
  console.log('Departamento definido como padrao');

  // Desativar departamento
  await updateDepartment('cldeptyyyyyyyyyyyyyyyyyyy', {
    isActive: false,
  });
  console.log('Departamento desativado');
} catch (error) {
  console.error('Erro ao atualizar departamento:', error.message);
}
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.chatblue.io/api',
});

async function updateDepartment(id, updates) {
  try {
    const { data } = await api.put(`/departments/${id}`, updates, {
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

// Exemplo de uso com validacao
async function changeDepartmentColor(id, newColor) {
  // Validar formato da cor
  if (!/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
    throw new Error('Cor deve estar no formato hexadecimal (#RRGGBB)');
  }

  return updateDepartment(id, { color: newColor });
}
```

### Python

```python
import requests

def update_department(access_token, department_id, **updates):
    url = f'https://api.chatblue.io/api/departments/{department_id}'

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
    dept = update_department(token, 'cldeptxxxxxxxxxxxxxxxxxxxxxx', name='Suporte Premium')
    print(f"Nome atualizado: {dept['name']}")

    # Atualizar multiplos campos
    dept = update_department(
        token,
        'cldeptxxxxxxxxxxxxxxxxxxxxxx',
        name='Suporte VIP',
        description='Atendimento VIP',
        color='#8B5CF6'
    )
    print(f"Departamento atualizado: {dept['name']}")

    # Desativar
    dept = update_department(token, 'cldeptyyyyyyyyyyyyyyyyyyy', isActive=False)
    print(f"Departamento desativado: {dept['isActive']}")
except Exception as e:
    print(f"Erro: {e}")
```

### PHP

```php
<?php

function updateDepartment($accessToken, $departmentId, $updates) {
    $url = "https://api.chatblue.io/api/departments/{$departmentId}";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($updates));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $accessToken
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true);

    if ($httpCode === 200) {
        return $data;
    }

    throw new Exception($data['error'] ?? 'Erro desconhecido');
}

// Uso
try {
    $dept = updateDepartment($token, 'cldeptxxxxxxxxxxxxxxxxxxxxxx', [
        'name' => 'Suporte Premium',
        'color' => '#8B5CF6'
    ]);
    echo "Departamento atualizado: " . $dept['name'] . "\n";
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Casos de Uso Comuns

### Renomear Departamento

```javascript
await updateDepartment(deptId, {
  name: 'Novo Nome',
});
```

### Mudar Cor do Departamento

```javascript
await updateDepartment(deptId, {
  color: '#EF4444', // Vermelho
});
```

### Definir como Departamento Padrao

```javascript
// O departamento anterior sera automaticamente desmarcado
await updateDepartment(deptId, {
  isDefault: true,
});
```

### Desativar Departamento

```javascript
// Certifique-se de que nao e o departamento padrao
await updateDepartment(deptId, {
  isActive: false,
});
```

## Notas Importantes

1. **Nome Unico**: O nome do departamento deve ser unico dentro da empresa.

2. **Departamento Padrao**:
   - Ao definir `isDefault: true`, o departamento anterior sera desmarcado automaticamente.
   - Nao e possivel desativar (`isActive: false`) o departamento padrao. Primeiro defina outro como padrao.

3. **Tickets Ativos**: Desativar um departamento nao afeta os tickets ja atribuidos. Novos tickets nao poderao ser atribuidos.

4. **Usuarios**: Esta rota nao altera os usuarios do departamento. Use o endpoint [Usuarios do Departamento](/docs/api/departamentos/usuarios) para isso.

5. **Atualizacao Parcial**: Apenas os campos enviados serao atualizados. Campos omitidos mantem seus valores.

## Endpoints Relacionados

- [Listar Departamentos](/docs/api/departamentos/listar) - Ver todos os departamentos
- [Detalhes do Departamento](/docs/api/departamentos/detalhes) - Obter departamento especifico
- [Usuarios do Departamento](/docs/api/departamentos/usuarios) - Gerenciar usuarios
