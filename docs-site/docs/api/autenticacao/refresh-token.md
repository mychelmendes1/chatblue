---
sidebar_position: 3
title: Refresh Token
description: Endpoint para renovacao de tokens de acesso na API do ChatBlue
---

# Refresh Token

Renova o token de acesso utilizando um refresh token valido.

## Endpoint

```
POST /api/auth/refresh
```

## Descricao

Este endpoint permite obter um novo access token sem necessidade de refazer o login. O refresh token deve ser enviado no corpo da requisicao.

O access token tem duracao curta (15 minutos) por questoes de seguranca. Quando expirar, utilize este endpoint para obter um novo token.

## Autenticacao

Este endpoint **nao requer autenticacao** via header, mas requer um refresh token valido no body.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `refreshToken` | string | Sim | Refresh token obtido no login |

### Exemplo de Request

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Response

### Sucesso (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `accessToken` | string | Novo token de acesso (valido por 15 minutos) |

## Erros

### 400 Bad Request - Token Ausente

```json
{
  "error": "Refresh token required",
  "code": "VALIDATION_ERROR"
}
```

Ocorre quando o refresh token nao e enviado no body.

### 401 Unauthorized - Token Invalido

```json
{
  "error": "Invalid refresh token",
  "code": "UNAUTHORIZED"
}
```

Ocorre quando:
- O refresh token e invalido ou foi alterado
- O refresh token ja foi utilizado e revogado
- O refresh token foi invalidado por logout

### 401 Unauthorized - Token Expirado

```json
{
  "error": "jwt expired",
  "code": "UNAUTHORIZED"
}
```

Ocorre quando o refresh token expirou (apos 7 dias). Neste caso, o usuario deve fazer login novamente.

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### JavaScript (Fetch)

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://api.chatblue.io/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data.accessToken;
}

// Uso
try {
  const refreshToken = localStorage.getItem('refreshToken');
  const newAccessToken = await refreshAccessToken(refreshToken);

  localStorage.setItem('accessToken', newAccessToken);
  console.log('Token renovado com sucesso');
} catch (error) {
  console.error('Erro ao renovar token:', error.message);
  // Redirecionar para login
  window.location.href = '/login';
}
```

### JavaScript (Axios com Interceptor)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.chatblue.io/api',
});

// Interceptor para renovar token automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se o erro for 401 e nao for retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        const { data } = await axios.post(
          'https://api.chatblue.io/api/auth/refresh',
          { refreshToken }
        );

        localStorage.setItem('accessToken', data.accessToken);

        // Atualizar header e retentar requisicao original
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh falhou, redirecionar para login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Interceptor para adicionar token em todas requisicoes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Python

```python
import requests
import time

class ChatBlueClient:
    def __init__(self, base_url='https://api.chatblue.io/api'):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.token_expiry = 0

    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        data = response.json()
        self.access_token = data['accessToken']
        self.refresh_token = data['refreshToken']
        self.token_expiry = time.time() + (14 * 60)  # 14 minutos
        return data

    def refresh_access_token(self):
        response = requests.post(
            f'{self.base_url}/auth/refresh',
            json={'refreshToken': self.refresh_token}
        )

        if response.status_code == 200:
            data = response.json()
            self.access_token = data['accessToken']
            self.token_expiry = time.time() + (14 * 60)
            return True
        return False

    def request(self, method, endpoint, **kwargs):
        # Verificar se token esta proximo de expirar
        if time.time() > self.token_expiry:
            if not self.refresh_access_token():
                raise Exception('Sessao expirada. Faca login novamente.')

        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f'Bearer {self.access_token}'

        response = requests.request(
            method,
            f'{self.base_url}{endpoint}',
            headers=headers,
            **kwargs
        )

        # Se receber 401, tentar refresh
        if response.status_code == 401:
            if self.refresh_access_token():
                headers['Authorization'] = f'Bearer {self.access_token}'
                response = requests.request(
                    method,
                    f'{self.base_url}{endpoint}',
                    headers=headers,
                    **kwargs
                )

        response.raise_for_status()
        return response.json()

# Uso
client = ChatBlueClient()
client.login('usuario@empresa.com', 'senha123')

# O token sera renovado automaticamente quando necessario
users = client.request('GET', '/users')
```

### React Hook

```typescript
import { useCallback, useRef } from 'react';

export function useAuth() {
  const refreshPromise = useRef<Promise<string> | null>(null);

  const refreshToken = useCallback(async (): Promise<string> => {
    // Evitar multiplas requisicoes de refresh simultaneas
    if (refreshPromise.current) {
      return refreshPromise.current;
    }

    refreshPromise.current = (async () => {
      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');

        if (!storedRefreshToken) {
          throw new Error('No refresh token');
        }

        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!response.ok) {
          throw new Error('Refresh failed');
        }

        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);

        return data.accessToken;
      } finally {
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  const fetchWithAuth = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    let token = localStorage.getItem('accessToken');

    const makeRequest = (accessToken: string) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    };

    let response = await makeRequest(token!);

    // Se 401, tentar refresh e refazer requisicao
    if (response.status === 401) {
      try {
        const newToken = await refreshToken();
        response = await makeRequest(newToken);
      } catch {
        // Refresh falhou, limpar e redirecionar
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return response;
  }, [refreshToken]);

  return { refreshToken, fetchWithAuth };
}
```

## Fluxo de Renovacao

```
+--------+                                +--------+
| Client |                                | Server |
+--------+                                +--------+
    |                                          |
    | 1. Request com access token expirado     |
    |----------------------------------------->|
    |                                          |
    | 2. Response 401 Unauthorized             |
    |<-----------------------------------------|
    |                                          |
    | 3. POST /auth/refresh com refresh token  |
    |----------------------------------------->|
    |                                          |
    | 4. Novo access token                     |
    |<-----------------------------------------|
    |                                          |
    | 5. Retry request com novo token          |
    |----------------------------------------->|
    |                                          |
    | 6. Response 200 OK                       |
    |<-----------------------------------------|
    |                                          |
```

## Notas Importantes

1. **Refresh Token Unico**: Cada combinacao usuario/empresa tem seu proprio refresh token armazenado no Redis.

2. **Invalidacao por Logout**: O refresh token e invalidado quando o usuario faz logout.

3. **Duracao do Refresh Token**: O refresh token tem duracao de 7 dias. Apos esse periodo, o usuario deve fazer login novamente.

4. **Renovacao Proativa**: Recomendamos renovar o token alguns minutos antes de expirar para evitar falhas em requisicoes.

5. **Seguranca**: Nunca exponha o refresh token em URLs ou logs. Armazene-o de forma segura.

## Endpoints Relacionados

- [Login](/docs/api/autenticacao/login) - Obter tokens iniciais
- [Logout](/docs/api/autenticacao/logout) - Invalidar tokens
