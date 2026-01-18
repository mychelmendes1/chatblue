---
sidebar_position: 3
title: Detalhes do Usuario
description: Endpoint para obter detalhes de um usuario especifico no ChatBlue
---

# Detalhes do Usuario

Retorna informacoes detalhadas de um usuario especifico.

## Endpoint

```
GET /api/users/:id
```

## Descricao

Este endpoint retorna informacoes completas de um usuario, incluindo seus departamentos, configuracoes de IA (se aplicavel) e acesso a outras empresas.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem ver detalhes de usuarios da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do usuario (CUID) |

### Exemplo de URL

```
GET /api/users/cluserxxxxxxxxxxxxxxxxxxxxxx
```

## Response

### Sucesso (200 OK) - Usuario Humano

```json
{
  "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "email": "agente@empresa.com",
  "name": "Agente de Suporte",
  "avatar": "https://exemplo.com/avatar.jpg",
  "role": "AGENT",
  "isAI": false,
  "aiConfig": null,
  "isActive": true,
  "isOnline": true,
  "lastSeen": "2024-01-15T14:30:00.000Z",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "departments": [
    {
      "department": {
        "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Atendimento",
        "color": "#3B82F6",
        "description": "Departamento de atendimento ao cliente"
      }
    },
    {
      "department": {
        "id": "cldeptzzzzzzzzzzzzzzzzzzzzzz",
        "name": "Suporte Tecnico",
        "color": "#10B981",
        "description": "Suporte tecnico especializado"
      }
    }
  ],
  "_count": {
    "tickets": 12
  },
  "companyAccess": [
    {
      "id": "clucaxxxxxxxxxxxxxxxxxxxxxxx",
      "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
      "companyId": "clcompyyyyyyyyyyyyyyyyyyyyyy",
      "role": "USER",
      "status": "APPROVED",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "approvedAt": "2024-01-10T09:00:00.000Z",
      "company": {
        "id": "clcompyyyyyyyyyyyyyyyyyyyyyy",
        "name": "Outra Empresa",
        "slug": "outra-empresa",
        "logo": null,
        "isActive": true
      }
    }
  ]
}
```

### Sucesso (200 OK) - Agente de IA

```json
{
  "id": "cluseraaaaaaaaaaaaaaaaaaaaa",
  "email": "ai.assistente@empresa.com",
  "name": "Assistente Virtual",
  "avatar": "https://exemplo.com/bot-avatar.png",
  "role": "AGENT",
  "isAI": true,
  "aiConfig": {
    "provider": "openai",
    "model": "gpt-4-turbo-preview",
    "systemPrompt": "Voce e um assistente de atendimento...",
    "temperature": 0.7,
    "maxTokens": 1000,
    "triggerKeywords": ["humano", "atendente", "falar com pessoa"],
    "trainingData": "Dados de treinamento...",
    "personalityTone": "friendly",
    "personalityStyle": "conversational",
    "useEmojis": true,
    "useClientName": true,
    "guardrailsEnabled": true
  },
  "isActive": true,
  "isOnline": true,
  "lastSeen": null,
  "createdAt": "2024-01-05T12:00:00.000Z",
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
    "tickets": 150
  },
  "companyAccess": []
}
```

### Campos da Resposta

#### Dados do Usuario

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do usuario (CUID) |
| `email` | string | Email do usuario |
| `name` | string | Nome completo |
| `avatar` | string/null | URL da foto de perfil |
| `role` | string | Role (SUPER_ADMIN, ADMIN, SUPERVISOR, AGENT) |
| `isAI` | boolean | Se e um agente de IA |
| `aiConfig` | object/null | Configuracoes de IA (se isAI: true) |
| `isActive` | boolean | Status de ativacao |
| `isOnline` | boolean | Se esta online |
| `lastSeen` | string/null | Ultimo acesso (ISO 8601) |
| `createdAt` | string | Data de criacao |
| `_count.tickets` | number | Tickets ativos atribuidos |

#### Objeto `aiConfig`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `provider` | string | Provedor de IA |
| `model` | string | Modelo utilizado |
| `systemPrompt` | string | Prompt do sistema |
| `temperature` | number | Temperatura (0-2) |
| `maxTokens` | number | Maximo de tokens |
| `triggerKeywords` | string[] | Palavras para transferencia |
| `trainingData` | string | Dados de treinamento |
| `personalityTone` | string | Tom da personalidade |
| `personalityStyle` | string | Estilo de resposta |
| `useEmojis` | boolean | Usa emojis |
| `useClientName` | boolean | Usa nome do cliente |
| `guardrailsEnabled` | boolean | Guardrails habilitados |

#### Array `companyAccess`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID do registro de acesso |
| `companyId` | string | ID da empresa |
| `role` | string | Role na empresa (ADMIN, USER) |
| `status` | string | Status (PENDING, APPROVED, REJECTED) |
| `company` | object | Dados da empresa |

## Erros

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found

```json
{
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

Ocorre quando:
- O usuario nao existe
- O usuario pertence a outra empresa

## Exemplos de Codigo

### cURL

```bash
curl -X GET https://api.chatblue.io/api/users/cluserxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getUser(userId) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/users/${userId}`, {
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
  const user = await getUser('cluserxxxxxxxxxxxxxxxxxxxxxx');

  console.log('Usuario:', user.name);
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('Online:', user.isOnline);
  console.log('Tickets ativos:', user._count.tickets);

  if (user.isAI) {
    console.log('Modelo IA:', user.aiConfig.model);
    console.log('Temperatura:', user.aiConfig.temperature);
  }

  console.log('Departamentos:', user.departments.map(d => d.department.name).join(', '));
  console.log('Acesso a outras empresas:', user.companyAccess.length);
} catch (error) {
  console.error('Erro:', error.message);
}
```

### Python

```python
import requests

def get_user(access_token, user_id):
    url = f'https://api.chatblue.io/api/users/{user_id}'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
user = get_user(token, 'cluserxxxxxxxxxxxxxxxxxxxxxx')

print(f"Usuario: {user['name']}")
print(f"Email: {user['email']}")
print(f"Role: {user['role']}")
print(f"Tickets: {user['_count']['tickets']}")

if user['isAI']:
    print(f"Modelo IA: {user['aiConfig']['model']}")

for dept in user['departments']:
    print(f"Departamento: {dept['department']['name']}")
```

### React Component

```typescript
import { useState, useEffect } from 'react';

interface UserDetails {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  isAI: boolean;
  aiConfig: any;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  departments: Array<{ department: { id: string; name: string; color: string } }>;
  _count: { tickets: number };
  companyAccess: Array<{
    company: { id: string; name: string };
    role: string;
    status: string;
  }>;
}

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!user) return <div>Usuario nao encontrado</div>;

  return (
    <div className="user-profile">
      <div className="header">
        {user.avatar && <img src={user.avatar} alt={user.name} />}
        <h1>{user.name}</h1>
        <span className={`status ${user.isOnline ? 'online' : 'offline'}`}>
          {user.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="info">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Tipo:</strong> {user.isAI ? 'Agente de IA' : 'Humano'}</p>
        <p><strong>Tickets Ativos:</strong> {user._count.tickets}</p>
      </div>

      {user.isAI && user.aiConfig && (
        <div className="ai-config">
          <h2>Configuracoes de IA</h2>
          <p><strong>Modelo:</strong> {user.aiConfig.model}</p>
          <p><strong>Temperatura:</strong> {user.aiConfig.temperature}</p>
          <p><strong>Tom:</strong> {user.aiConfig.personalityTone}</p>
        </div>
      )}

      <div className="departments">
        <h2>Departamentos</h2>
        <ul>
          {user.departments.map(({ department }) => (
            <li key={department.id} style={{ borderColor: department.color }}>
              {department.name}
            </li>
          ))}
        </ul>
      </div>

      {user.companyAccess.length > 0 && (
        <div className="company-access">
          <h2>Acesso a Outras Empresas</h2>
          <ul>
            {user.companyAccess.map(access => (
              <li key={access.company.id}>
                {access.company.name} ({access.role}) - {access.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Endpoint Relacionado: Usuario Atual

Para obter informacoes do usuario autenticado, use:

### Endpoint

```
GET /api/auth/me
```

### Response

Retorna dados similares, mas do usuario do token JWT atual.

```json
{
  "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "email": "usuario@empresa.com",
  "name": "Usuario Atual",
  "avatar": null,
  "role": "ADMIN",
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "isAI": false,
  "company": {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Minha Empresa",
    "slug": "minha-empresa",
    "logo": null
  },
  "departments": [...],
  "activeCompany": {...},
  "companies": [...]
}
```

## Notas Importantes

1. **Escopo da Empresa**: Usuarios so podem ver detalhes de usuarios da mesma empresa.

2. **aiConfig Sensivel**: Configuracoes de IA sao retornadas completas. Em producao, considere mascarar dados sensiveis.

3. **Acesso Multi-Empresa**: O array `companyAccess` mostra todas as empresas que o usuario tem acesso aprovado.

4. **Tickets Ativos**: O contador `_count.tickets` inclui apenas tickets com status PENDING, IN_PROGRESS ou WAITING.

5. **LastSeen de IA**: Agentes de IA geralmente tem `lastSeen: null` pois nao fazem login tradicional.

## Endpoints Relacionados

- [Listar Usuarios](/docs/api/usuarios/listar) - Ver todos os usuarios
- [Atualizar Usuario](/docs/api/usuarios/atualizar) - Modificar usuario
- [Acesso a Empresas](/docs/api/usuarios/acesso-empresas) - Gerenciar acesso multi-empresa
