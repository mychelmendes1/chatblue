---
sidebar_position: 2
title: Registro
description: Endpoint para registro de novos usuarios na API do ChatBlue
---

# Registro de Usuario

Registra um novo usuario no sistema vinculado a uma empresa existente.

## Endpoint

```
POST /api/auth/register
```

## Descricao

Este endpoint permite criar um novo usuario no sistema. O usuario deve ser vinculado a uma empresa existente atraves do `companyId`.

:::info Nota
O registro publico de usuarios pode estar desabilitado em algumas instalacoes. Neste caso, novos usuarios devem ser criados pelo administrador atraves do endpoint [POST /api/users](/docs/api/usuarios/criar).
:::

## Autenticacao

Este endpoint **nao requer autenticacao** quando o registro publico esta habilitado.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `email` | string | Sim | Email do usuario (unico por empresa) |
| `password` | string | Sim | Senha (minimo 6 caracteres) |
| `name` | string | Sim | Nome completo (minimo 2 caracteres) |
| `companyId` | string | Sim | ID da empresa (CUID) |

### Exemplo de Request

```json
{
  "email": "novo.usuario@empresa.com",
  "password": "senhaSegura123",
  "name": "Novo Usuario",
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "email": "novo.usuario@empresa.com",
  "name": "Novo Usuario",
  "role": "AGENT",
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "isActive": true,
  "createdAt": "2024-01-15T14:30:00.000Z"
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do usuario (CUID) |
| `email` | string | Email do usuario |
| `name` | string | Nome completo |
| `role` | string | Role atribuida (padrao: AGENT) |
| `companyId` | string | ID da empresa vinculada |
| `isActive` | boolean | Status de ativacao |
| `createdAt` | string | Data de criacao (ISO 8601) |

## Erros

### 400 Bad Request - Email ja Existe

```json
{
  "error": "Email already exists in this company",
  "code": "VALIDATION_ERROR"
}
```

Ocorre quando ja existe um usuario com o mesmo email na mesma empresa.

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: email: Email invalido",
  "code": "VALIDATION_ERROR"
}
```

Possiveis erros de validacao:
- `email`: Email invalido
- `password`: Senha deve ter pelo menos 6 caracteres
- `name`: Nome deve ter pelo menos 2 caracteres
- `companyId`: ID de empresa invalido

### 404 Not Found - Empresa Nao Encontrada

```json
{
  "error": "Company not found",
  "code": "NOT_FOUND"
}
```

Ocorre quando o `companyId` informado nao existe.

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo.usuario@empresa.com",
    "password": "senhaSegura123",
    "name": "Novo Usuario",
    "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

### JavaScript (Fetch)

```javascript
async function register(userData) {
  const response = await fetch('https://api.chatblue.io/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
try {
  const newUser = await register({
    email: 'novo.usuario@empresa.com',
    password: 'senhaSegura123',
    name: 'Novo Usuario',
    companyId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
  });

  console.log('Usuario criado:', newUser.id);

  // Apos registro, fazer login
  const loginData = await login(
    'novo.usuario@empresa.com',
    'senhaSegura123'
  );
} catch (error) {
  console.error('Erro no registro:', error.message);
}
```

### Python

```python
import requests

def register(email, password, name, company_id):
    url = 'https://api.chatblue.io/api/auth/register'

    payload = {
        'email': email,
        'password': password,
        'name': name,
        'companyId': company_id
    }

    response = requests.post(url, json=payload)

    if response.status_code == 201:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    user = register(
        email='novo.usuario@empresa.com',
        password='senhaSegura123',
        name='Novo Usuario',
        company_id='clxxxxxxxxxxxxxxxxxxxxxxxx'
    )
    print(f"Usuario criado: {user['id']}")
except Exception as e:
    print(f"Erro: {e}")
```

## Fluxo de Registro Completo

```javascript
async function registerAndLogin(userData) {
  // 1. Registrar usuario
  const user = await register(userData);
  console.log('Usuario registrado:', user.name);

  // 2. Fazer login
  const { accessToken, refreshToken } = await login(
    userData.email,
    userData.password
  );

  // 3. Armazenar tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  return { user, accessToken };
}
```

## Notas Importantes

1. **Email Unico por Empresa**: O mesmo email pode existir em empresas diferentes, mas deve ser unico dentro de cada empresa.

2. **Role Padrao**: Usuarios registrados recebem a role `AGENT` por padrao. Somente administradores podem alterar roles.

3. **Ativacao Automatica**: Usuarios registrados sao ativados automaticamente (`isActive: true`).

4. **Registro vs Criacao**: Para criar usuarios com configuracoes avancadas (role, departamentos, etc.), use o endpoint [POST /api/users](/docs/api/usuarios/criar) com autenticacao de administrador.

5. **Validacao de Senha**: A senha deve ter no minimo 6 caracteres. Recomendamos usar senhas mais fortes em producao.

## Endpoints Relacionados

- [Login](/docs/api/autenticacao/login) - Fazer login apos registro
- [Criar Usuario](/docs/api/usuarios/criar) - Criar usuario como administrador
