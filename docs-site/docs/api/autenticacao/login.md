---
sidebar_position: 1
title: Login
description: Endpoint para autenticacao de usuarios na API do ChatBlue
---

# Login

Autentica um usuario e retorna tokens de acesso JWT para utilizacao na API.

## Endpoint

```
POST /api/auth/login
```

## Descricao

Este endpoint permite que usuarios se autentiquem no sistema utilizando email e senha. Apos autenticacao bem-sucedida, retorna tokens JWT (access token e refresh token) juntamente com informacoes do usuario e empresas que ele tem acesso.

## Autenticacao

Este endpoint **nao requer autenticacao**.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `email` | string | Sim | Email do usuario |
| `password` | string | Sim | Senha do usuario (minimo 6 caracteres) |
| `companyId` | string | Nao | ID da empresa para login direto (CUID) |

### Exemplo de Request

```json
{
  "email": "usuario@empresa.com",
  "password": "senhaSegura123"
}
```

Com empresa especifica:

```json
{
  "email": "usuario@empresa.com",
  "password": "senhaSegura123",
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

## Response

### Sucesso (200 OK)

```json
{
  "user": {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
    "email": "usuario@empresa.com",
    "name": "Nome do Usuario",
    "avatar": "https://exemplo.com/avatar.jpg",
    "role": "ADMIN",
    "isAI": false,
    "company": {
      "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Minha Empresa",
      "slug": "minha-empresa",
      "logo": "https://exemplo.com/logo.png",
      "isActive": true
    }
  },
  "companies": [
    {
      "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Minha Empresa",
      "slug": "minha-empresa",
      "logo": "https://exemplo.com/logo.png",
      "isActive": true,
      "role": "ADMIN",
      "isPrimary": true
    },
    {
      "id": "clyyyyyyyyyyyyyyyyyyyyyyyy",
      "name": "Outra Empresa",
      "slug": "outra-empresa",
      "logo": null,
      "isActive": true,
      "role": "USER",
      "isPrimary": false
    }
  ],
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Campos da Resposta

#### Objeto `user`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do usuario (CUID) |
| `email` | string | Email do usuario |
| `name` | string | Nome completo do usuario |
| `avatar` | string/null | URL da foto de perfil |
| `role` | string | Role do usuario na empresa ativa |
| `isAI` | boolean | Indica se e um agente de IA |
| `company` | object | Empresa ativa do usuario |

#### Objeto `company`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da empresa (CUID) |
| `name` | string | Nome da empresa |
| `slug` | string | Slug unico da empresa |
| `logo` | string/null | URL do logo da empresa |
| `isActive` | boolean | Status de ativacao da empresa |

#### Array `companies`

Lista de todas as empresas que o usuario tem acesso aprovado:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da empresa |
| `name` | string | Nome da empresa |
| `slug` | string | Slug unico da empresa |
| `logo` | string/null | URL do logo |
| `isActive` | boolean | Status de ativacao |
| `role` | string | Role do usuario nesta empresa |
| `isPrimary` | boolean | Se e a empresa principal do usuario |

#### Tokens

| Campo | Tipo | Duracao | Descricao |
|-------|------|---------|-----------|
| `accessToken` | string | 15 min | Token para autenticar requisicoes |
| `refreshToken` | string | 7 dias | Token para renovar o accessToken |

## Erros

### 401 Unauthorized - Credenciais Invalidas

```json
{
  "error": "Invalid credentials",
  "code": "UNAUTHORIZED"
}
```

Ocorre quando:
- Email nao existe no sistema
- Senha incorreta

### 401 Unauthorized - Usuario Inativo

```json
{
  "error": "User is inactive",
  "code": "UNAUTHORIZED"
}
```

Ocorre quando o usuario foi desativado pelo administrador.

### 401 Unauthorized - Empresa Inativa

```json
{
  "error": "Company is inactive",
  "code": "UNAUTHORIZED"
}
```

Ocorre quando a empresa do usuario foi desativada.

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: email: Email invalido, password: Senha deve ter pelo menos 6 caracteres",
  "code": "VALIDATION_ERROR"
}
```

Ocorre quando os dados enviados nao passam na validacao.

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@empresa.com",
    "password": "senhaSegura123"
  }'
```

### JavaScript (Fetch)

```javascript
async function login(email, password, companyId = null) {
  const body = { email, password };
  if (companyId) body.companyId = companyId;

  const response = await fetch('https://api.chatblue.io/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();

  // Armazenar tokens para uso posterior
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data;
}

// Uso
try {
  const { user, companies, accessToken } = await login(
    'usuario@empresa.com',
    'senhaSegura123'
  );
  console.log('Usuario autenticado:', user.name);
  console.log('Empresas disponiveis:', companies.length);
} catch (error) {
  console.error('Erro no login:', error.message);
}
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.chatblue.io/api',
});

async function login(email, password) {
  try {
    const { data } = await api.post('/auth/login', {
      email,
      password,
    });

    // Configurar token para proximas requisicoes
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

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

def login(email, password, company_id=None):
    url = 'https://api.chatblue.io/api/auth/login'

    payload = {
        'email': email,
        'password': password
    }

    if company_id:
        payload['companyId'] = company_id

    response = requests.post(url, json=payload)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    data = login('usuario@empresa.com', 'senhaSegura123')
    print(f"Usuario: {data['user']['name']}")
    print(f"Token: {data['accessToken'][:20]}...")
except Exception as e:
    print(f"Erro: {e}")
```

### PHP

```php
<?php

function login($email, $password, $companyId = null) {
    $url = 'https://api.chatblue.io/api/auth/login';

    $payload = [
        'email' => $email,
        'password' => $password
    ];

    if ($companyId) {
        $payload['companyId'] = $companyId;
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
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
    $data = login('usuario@empresa.com', 'senhaSegura123');
    echo "Usuario: " . $data['user']['name'] . "\n";
    echo "Token: " . substr($data['accessToken'], 0, 20) . "...\n";
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Notas Importantes

1. **Armazenamento de Tokens**: Armazene os tokens de forma segura. Em aplicacoes web, considere usar `httpOnly cookies` em vez de `localStorage`.

2. **Expiracao do Token**: O access token expira em 15 minutos. Use o endpoint de [refresh](/docs/api/autenticacao/refresh-token) para obter um novo token.

3. **Multi-Empresa**: Usuarios podem ter acesso a multiplas empresas. O array `companies` lista todas as empresas disponiveis.

4. **Login Direto**: Use o parametro `companyId` para fazer login diretamente em uma empresa especifica (util para usuarios com acesso a multiplas empresas).

5. **Status Online**: O login automaticamente atualiza o status do usuario para online e registra o horario de ultimo acesso.

## Endpoints Relacionados

- [Refresh Token](/docs/api/autenticacao/refresh-token) - Renovar token expirado
- [Logout](/docs/api/autenticacao/logout) - Encerrar sessao
- [Trocar Empresa](/docs/api/usuarios/acesso-empresas#trocar-empresa-ativa) - Alternar entre empresas
