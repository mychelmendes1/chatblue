---
sidebar_position: 3
title: Detalhes da Empresa
description: Endpoint para obter detalhes de uma empresa especifica no ChatBlue
---

# Detalhes da Empresa

Retorna informacoes detalhadas de uma empresa especifica.

## Endpoint

```
GET /api/companies/:id
```

## Descricao

Este endpoint retorna informacoes detalhadas de uma empresa, incluindo suas configuracoes e contadores de recursos. Usuarios podem visualizar detalhes da propria empresa ou, se forem SUPER_ADMIN, de qualquer empresa.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **SUPER_ADMIN**: Pode ver detalhes de qualquer empresa
- **Outros roles**: Podem ver apenas detalhes da propria empresa

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da empresa (CUID) |

### Exemplo de URL

```
GET /api/companies/clxxxxxxxxxxxxxxxxxxxxxxxx
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Minha Empresa LTDA",
  "slug": "minha-empresa",
  "logo": "https://exemplo.com/logo.png",
  "plan": "PRO",
  "isActive": true,
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z",
  "settings": {
    "id": "clzzzzzzzzzzzzzzzzzzzzzzzz",
    "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
    "autoAssign": true,
    "maxTicketsPerAgent": 10,
    "welcomeMessage": "Ola! Bem-vindo ao nosso atendimento.",
    "awayMessage": "Estamos fora do horario de atendimento.",
    "aiEnabled": true,
    "aiProvider": "openai",
    "aiDefaultModel": "gpt-4-turbo-preview",
    "notionSyncEnabled": false,
    "notionDatabaseId": null,
    "defaultTransferDepartmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx"
  },
  "_count": {
    "users": 15,
    "departments": 5,
    "connections": 3,
    "contacts": 2500,
    "tickets": 8750
  }
}
```

### Campos da Resposta

#### Dados da Empresa

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da empresa (CUID) |
| `name` | string | Nome da empresa |
| `slug` | string | Identificador URL-friendly |
| `logo` | string/null | URL do logo |
| `plan` | string | Plano contratado |
| `isActive` | boolean | Status de ativacao |
| `createdAt` | string | Data de criacao (ISO 8601) |
| `updatedAt` | string | Data da ultima atualizacao |

#### Objeto `settings`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID das configuracoes |
| `autoAssign` | boolean | Auto-atribuicao de tickets habilitada |
| `maxTicketsPerAgent` | number | Maximo de tickets por agente |
| `welcomeMessage` | string/null | Mensagem de boas-vindas |
| `awayMessage` | string/null | Mensagem de ausencia |
| `aiEnabled` | boolean | IA habilitada |
| `aiProvider` | string/null | Provedor de IA (openai, anthropic) |
| `aiDefaultModel` | string/null | Modelo padrao de IA |
| `notionSyncEnabled` | boolean | Sincronizacao com Notion |
| `notionDatabaseId` | string/null | ID do database Notion |
| `defaultTransferDepartmentId` | string/null | Departamento padrao para transferencias |

#### Objeto `_count`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `users` | number | Total de usuarios |
| `departments` | number | Total de departamentos |
| `connections` | number | Total de conexoes WhatsApp |
| `contacts` | number | Total de contatos |
| `tickets` | number | Total de tickets |

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
  "error": "Company not found",
  "code": "NOT_FOUND"
}
```

Ocorre quando:
- A empresa nao existe
- O usuario nao tem permissao para ver a empresa

## Exemplos de Codigo

### cURL

```bash
curl -X GET https://api.chatblue.io/api/companies/clxxxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getCompany(companyId) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/companies/${companyId}`, {
    method: 'GET',
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
  const company = await getCompany('clxxxxxxxxxxxxxxxxxxxxxxxx');

  console.log('Empresa:', company.name);
  console.log('Plano:', company.plan);
  console.log('Usuarios:', company._count.users);
  console.log('IA Habilitada:', company.settings.aiEnabled);
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Obter Empresa Atual do Token

```javascript
// Decodificar token JWT para obter companyId
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(window.atob(base64));
}

async function getCurrentCompany() {
  const token = localStorage.getItem('accessToken');
  const { companyId } = parseJwt(token);

  return getCompany(companyId);
}

// Uso
const myCompany = await getCurrentCompany();
console.log('Minha empresa:', myCompany.name);
```

### Python

```python
import requests

def get_company(access_token, company_id):
    url = f'https://api.chatblue.io/api/companies/{company_id}'

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
company = get_company(token, 'clxxxxxxxxxxxxxxxxxxxxxxxx')
print(f"Empresa: {company['name']}")
print(f"Usuarios: {company['_count']['users']}")
print(f"Tickets: {company['_count']['tickets']}")
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: string;
  isActive: boolean;
  settings: {
    aiEnabled: boolean;
    autoAssign: boolean;
    // ...
  };
  _count: {
    users: number;
    tickets: number;
    // ...
  };
}

export function useCompany(companyId: string) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompany() {
      try {
        setLoading(true);
        const response = await fetch(`/api/companies/${companyId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch company');
        }

        const data = await response.json();
        setCompany(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  return { company, loading, error };
}

// Uso no componente
function CompanyDashboard({ companyId }: { companyId: string }) {
  const { company, loading, error } = useCompany(companyId);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!company) return <div>Empresa nao encontrada</div>;

  return (
    <div>
      <h1>{company.name}</h1>
      <p>Plano: {company.plan}</p>
      <p>Usuarios: {company._count.users}</p>
      <p>Tickets: {company._count.tickets}</p>
    </div>
  );
}
```

## Casos de Uso

### Verificar Limites do Plano

```javascript
async function checkPlanLimits(companyId) {
  const company = await getCompany(companyId);

  const limits = {
    BASIC: { users: 5, connections: 1 },
    PRO: { users: 20, connections: 5 },
    ENTERPRISE: { users: -1, connections: -1 }, // ilimitado
  };

  const planLimits = limits[company.plan];
  const currentUsers = company._count.users;
  const currentConnections = company._count.connections;

  return {
    canAddUser: planLimits.users === -1 || currentUsers < planLimits.users,
    canAddConnection: planLimits.connections === -1 || currentConnections < planLimits.connections,
    usersRemaining: planLimits.users === -1 ? Infinity : planLimits.users - currentUsers,
    connectionsRemaining: planLimits.connections === -1 ? Infinity : planLimits.connections - currentConnections,
  };
}
```

### Exibir Status das Integracoes

```javascript
async function getIntegrationStatus(companyId) {
  const company = await getCompany(companyId);
  const { settings } = company;

  return {
    ai: {
      enabled: settings.aiEnabled,
      provider: settings.aiProvider,
      model: settings.aiDefaultModel,
    },
    notion: {
      enabled: settings.notionSyncEnabled,
      configured: !!settings.notionDatabaseId,
    },
    whatsapp: {
      connections: company._count.connections,
    },
  };
}
```

## Notas Importantes

1. **Seguranca**: Usuarios so podem ver detalhes da propria empresa, exceto SUPER_ADMIN.

2. **Settings Incluidos**: As configuracoes completas da empresa sao retornadas, exceto chaves de API que sao mascaradas.

3. **Contadores em Tempo Real**: Os valores em `_count` refletem o estado atual do banco de dados.

4. **Cache**: Para melhor performance, considere implementar cache no cliente para dados que nao mudam frequentemente.

## Endpoints Relacionados

- [Listar Empresas](/docs/api/empresas/listar) - Ver todas as empresas
- [Atualizar Empresa](/docs/api/empresas/atualizar) - Modificar dados
- [Configuracoes](/docs/api/empresas/configuracoes) - Gerenciar settings detalhados
