---
sidebar_position: 1
title: Introducao a API
description: Visao geral da API do ChatBlue, autenticacao e tratamento de erros
---

# Introducao a API

A API do ChatBlue permite integrar sua aplicacao com a plataforma de atendimento ao cliente, possibilitando automacao de processos, integracao com sistemas externos e desenvolvimento de funcionalidades personalizadas.

## URL Base

```
https://api.chatblue.io/api
```

Para ambientes de desenvolvimento local:

```
http://localhost:3001/api
```

## Autenticacao

A API utiliza autenticacao baseada em **JWT (JSON Web Tokens)**. Para acessar endpoints protegidos, voce precisa incluir o token de acesso no header `Authorization` de cada requisicao.

### Obtendo Tokens

Para obter tokens de acesso, utilize o endpoint de [login](/docs/api/autenticacao/login):

```bash
curl -X POST https://api.chatblue.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@empresa.com",
    "password": "sua_senha"
  }'
```

### Usando o Token

Inclua o token JWT no header `Authorization` com o prefixo `Bearer`:

```bash
curl -X GET https://api.chatblue.io/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Tipos de Token

| Tipo | Duracao | Uso |
|------|---------|-----|
| Access Token | 15 minutos | Autenticacao em requisicoes da API |
| Refresh Token | 7 dias | Renovacao do Access Token |

### Renovando Tokens

Quando o access token expirar, utilize o endpoint de [refresh](/docs/api/autenticacao/refresh-token) para obter um novo token sem necessidade de novo login.

## Headers Obrigatorios

| Header | Valor | Descricao |
|--------|-------|-----------|
| `Content-Type` | `application/json` | Tipo de conteudo para requisicoes com body |
| `Authorization` | `Bearer {token}` | Token JWT para endpoints protegidos |

## Tratamento de Erros

A API retorna erros em um formato padronizado JSON:

```json
{
  "error": "Descricao do erro",
  "code": "CODIGO_DO_ERRO",
  "details": {}
}
```

### Codigos de Status HTTP

| Codigo | Significado | Descricao |
|--------|-------------|-----------|
| `200` | OK | Requisicao bem-sucedida |
| `201` | Created | Recurso criado com sucesso |
| `400` | Bad Request | Erro de validacao ou parametros invalidos |
| `401` | Unauthorized | Token invalido ou expirado |
| `403` | Forbidden | Sem permissao para acessar o recurso |
| `404` | Not Found | Recurso nao encontrado |
| `409` | Conflict | Conflito com estado atual do recurso |
| `422` | Unprocessable Entity | Erro de validacao de dados |
| `429` | Too Many Requests | Limite de requisicoes excedido |
| `500` | Internal Server Error | Erro interno do servidor |

### Erros de Validacao

Erros de validacao retornam detalhes sobre os campos invalidos:

```json
{
  "error": "Validation error: email: Email invalido, password: Senha deve ter pelo menos 6 caracteres",
  "code": "VALIDATION_ERROR"
}
```

### Erros de Autenticacao

```json
{
  "error": "Invalid credentials",
  "code": "UNAUTHORIZED"
}
```

```json
{
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

## Rate Limiting

A API possui limites de requisicoes para garantir estabilidade:

| Plano | Limite | Janela |
|-------|--------|--------|
| BASIC | 100 requisicoes | por minuto |
| PRO | 500 requisicoes | por minuto |
| ENTERPRISE | 2000 requisicoes | por minuto |

Headers de rate limiting:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## Multi-Tenancy

O ChatBlue suporta multiplas empresas (tenants) em uma unica instalacao. Cada usuario pode ter acesso a multiplas empresas com diferentes roles.

### Contexto de Empresa

O token JWT inclui o `companyId` ativo. Para trocar de empresa, utilize o endpoint de [switch-company](/docs/api/usuarios/acesso-empresas#trocar-empresa-ativa).

### Roles de Usuario

| Role | Descricao |
|------|-----------|
| `SUPER_ADMIN` | Acesso total ao sistema, gerencia todas as empresas |
| `ADMIN` | Administrador da empresa, gerencia usuarios e configuracoes |
| `SUPERVISOR` | Supervisor de equipe, visualiza metricas e gerencia tickets |
| `AGENT` | Atendente, gerencia seus proprios tickets |

## Paginacao

Endpoints que retornam listas suportam paginacao via query parameters:

```
GET /api/users?page=1&limit=20
```

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `page` | number | 1 | Numero da pagina |
| `limit` | number | 20 | Itens por pagina (max: 100) |

Resposta paginada:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Filtros

Muitos endpoints suportam filtros via query parameters:

```
GET /api/users?isActive=true&departmentId=clxxxx
```

## Formato de Datas

Todas as datas sao retornadas no formato **ISO 8601**:

```
2024-01-15T14:30:00.000Z
```

## IDs

O ChatBlue utiliza **CUID** (Collision-resistant Unique Identifier) para todos os IDs:

```
clxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Exemplos de Integracao

### JavaScript/TypeScript

```typescript
const API_URL = 'https://api.chatblue.io/api';

class ChatBlueAPI {
  private accessToken: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    this.accessToken = data.accessToken;
    return data;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  }

  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }
}

// Uso
const api = new ChatBlueAPI();
await api.login('admin@empresa.com', 'senha123');
const users = await api.getUsers();
```

### Python

```python
import requests

class ChatBlueAPI:
    def __init__(self, base_url='https://api.chatblue.io/api'):
        self.base_url = base_url
        self.access_token = None

    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        data = response.json()
        self.access_token = data['accessToken']
        return data

    def request(self, method, endpoint, **kwargs):
        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f'Bearer {self.access_token}'

        response = requests.request(
            method,
            f'{self.base_url}{endpoint}',
            headers=headers,
            **kwargs
        )
        response.raise_for_status()
        return response.json()

    def get_users(self):
        return self.request('GET', '/users')

    def create_user(self, user_data):
        return self.request('POST', '/users', json=user_data)

# Uso
api = ChatBlueAPI()
api.login('admin@empresa.com', 'senha123')
users = api.get_users()
```

## Webhooks

O ChatBlue pode enviar webhooks para URLs configuradas quando eventos ocorrem. Consulte a documentacao de [Webhooks](/docs/api/webhooks) para mais detalhes.

## Suporte

Para duvidas ou problemas com a API:

- Email: suporte@chatblue.io
- Documentacao: https://docs.chatblue.io
- Status da API: https://status.chatblue.io
