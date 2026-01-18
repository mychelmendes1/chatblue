---
sidebar_position: 4
title: Logout
description: Endpoint para encerrar sessao do usuario na API do ChatBlue
---

# Logout

Encerra a sessao do usuario e invalida os tokens de acesso.

## Endpoint

```
POST /api/auth/logout
```

## Descricao

Este endpoint encerra a sessao do usuario, invalidando o refresh token armazenado no servidor. Apos o logout:

- O refresh token e removido do Redis
- O status online do usuario e atualizado para offline
- O horario de ultimo acesso e registrado

## Autenticacao

Este endpoint **requer autenticacao** com um access token valido.

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |
| `Authorization` | `Bearer {accessToken}` | Sim |

### Body

Este endpoint nao requer body.

## Response

### Sucesso (200 OK)

```json
{
  "message": "Logged out successfully"
}
```

## Erros

### 401 Unauthorized - Token Invalido

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

Ocorre quando:
- O access token e invalido
- O access token esta expirado
- O header Authorization nao foi enviado

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### JavaScript (Fetch)

```javascript
async function logout() {
  const accessToken = localStorage.getItem('accessToken');

  try {
    const response = await fetch('https://api.chatblue.io/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro no logout:', error.error);
    }
  } catch (error) {
    console.error('Erro de rede:', error);
  } finally {
    // Sempre limpar dados locais, mesmo se a requisicao falhar
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Redirecionar para login
    window.location.href = '/login';
  }
}

// Uso
document.getElementById('logoutBtn').addEventListener('click', logout);
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.chatblue.io/api',
});

async function logout() {
  const token = localStorage.getItem('accessToken');

  try {
    await api.post('/auth/logout', null, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log('Logout realizado com sucesso');
  } catch (error) {
    console.error('Erro no logout:', error.response?.data?.error);
  } finally {
    // Limpar estado local
    localStorage.clear();
    delete api.defaults.headers.common['Authorization'];
  }
}
```

### Python

```python
import requests

def logout(access_token):
    url = 'https://api.chatblue.io/api/auth/logout'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.post(url, headers=headers)

    if response.status_code == 200:
        print('Logout realizado com sucesso')
        return True
    else:
        error = response.json()
        print(f'Erro no logout: {error.get("error")}')
        return False

# Uso
access_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
logout(access_token)
```

### React Hook

```typescript
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    const token = localStorage.getItem('accessToken');

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Ignorar erros de rede no logout
      console.warn('Logout request failed:', error);
    } finally {
      // Sempre limpar estado local
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // Limpar estado da aplicacao (ex: Redux, Context)
      // dispatch(clearUserState());

      // Redirecionar para login
      navigate('/login');
    }
  }, [navigate]);

  return { logout };
}

// Uso no componente
function Header() {
  const { logout } = useAuth();

  return (
    <button onClick={logout}>
      Sair
    </button>
  );
}
```

## Fluxo de Logout

```
+--------+                                +--------+                 +-------+
| Client |                                | Server |                 | Redis |
+--------+                                +--------+                 +-------+
    |                                          |                         |
    | 1. POST /auth/logout                     |                         |
    |   Authorization: Bearer {token}          |                         |
    |----------------------------------------->|                         |
    |                                          |                         |
    |                                          | 2. Validar token        |
    |                                          |------------------------>|
    |                                          |                         |
    |                                          | 3. Deletar refresh token|
    |                                          |------------------------>|
    |                                          |                         |
    |                                          |<------------------------|
    |                                          |                         |
    |                                          | 4. Atualizar status     |
    |                                          |   isOnline: false       |
    |                                          |   lastSeen: now()       |
    |                                          |                         |
    | 5. Response 200 OK                       |                         |
    |<-----------------------------------------|                         |
    |                                          |                         |
    | 6. Limpar localStorage                   |                         |
    | 7. Redirecionar para /login              |                         |
    |                                          |                         |
```

## Boas Praticas

### 1. Sempre Limpar Estado Local

Mesmo se a requisicao de logout falhar (ex: servidor indisponivel), limpe os dados locais:

```javascript
async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    // SEMPRE executar, mesmo com erro
    clearLocalData();
    redirectToLogin();
  }
}
```

### 2. Logout em Todas as Abas

Para fazer logout em todas as abas do navegador:

```javascript
// Escutar eventos de storage
window.addEventListener('storage', (event) => {
  if (event.key === 'logout-event') {
    // Outra aba fez logout
    localStorage.clear();
    window.location.href = '/login';
  }
});

async function logout() {
  await api.post('/auth/logout');

  // Notificar outras abas
  localStorage.setItem('logout-event', Date.now().toString());
  localStorage.removeItem('logout-event');

  localStorage.clear();
  window.location.href = '/login';
}
```

### 3. Logout em Multi-Empresa

Se o usuario esta logado em multiplas empresas, o logout so invalida o refresh token da empresa ativa. Para logout completo:

```javascript
async function fullLogout() {
  const companies = JSON.parse(localStorage.getItem('companies') || '[]');

  // Fazer logout em cada empresa
  for (const company of companies) {
    try {
      await switchCompany(company.id);
      await api.post('/auth/logout');
    } catch (e) {
      // Ignorar erros
    }
  }

  localStorage.clear();
  window.location.href = '/login';
}
```

## Notas Importantes

1. **Token Invalido Apos Logout**: Apos o logout, o refresh token e invalidado no servidor. Mesmo que o access token ainda nao tenha expirado, novas requisicoes de refresh falharao.

2. **Status Offline**: O logout automaticamente atualiza o status do usuario para offline, refletindo em tempo real para outros usuarios via WebSocket.

3. **Sessao por Empresa**: Em ambientes multi-empresa, cada empresa tem seu proprio refresh token. O logout so afeta a sessao da empresa ativa.

4. **Cleanup Local**: O servidor nao tem controle sobre dados armazenados localmente. E responsabilidade do cliente limpar localStorage, sessionStorage e cookies.

## Endpoints Relacionados

- [Login](/docs/api/autenticacao/login) - Iniciar nova sessao
- [Refresh Token](/docs/api/autenticacao/refresh-token) - Renovar token (falha apos logout)
