---
sidebar_position: 6
title: Acesso Multi-Empresa
description: Endpoints para gerenciar acesso de usuarios a multiplas empresas no ChatBlue
---

# Acesso Multi-Empresa

Endpoints para gerenciar o acesso de usuarios a multiplas empresas no sistema multi-tenant do ChatBlue.

## Visao Geral

O ChatBlue permite que usuarios tenham acesso a multiplas empresas com diferentes roles em cada uma. O sistema funciona com:

- **Empresa Primaria**: A empresa onde o usuario foi originalmente criado
- **Empresas Adicionais**: Outras empresas onde o usuario recebeu acesso

---

## Listar Solicitacoes de Acesso

Retorna todas as solicitacoes de acesso a empresa (para administradores).

### Endpoint

```
GET /api/user-access
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Query Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `status` | string | Filtrar por status (PENDING, APPROVED, REJECTED) |

### Response (200 OK)

```json
[
  {
    "id": "clucaxxxxxxxxxxxxxxxxxxxxxxx",
    "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
    "role": "USER",
    "status": "PENDING",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "approvedAt": null,
    "user": {
      "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
      "email": "usuario@outraempresa.com",
      "name": "Usuario Solicitante",
      "avatar": null,
      "isActive": true,
      "createdAt": "2024-01-10T08:00:00.000Z"
    },
    "approvedBy": null
  },
  {
    "id": "clucayyyyyyyyyyyyyyyyyyyyyy",
    "userId": "cluseryyyyyyyyyyyyyyyyyyyyyy",
    "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
    "role": "ADMIN",
    "status": "APPROVED",
    "createdAt": "2024-01-12T14:00:00.000Z",
    "approvedAt": "2024-01-12T15:00:00.000Z",
    "user": {
      "id": "cluseryyyyyyyyyyyyyyyyyyyyyy",
      "email": "admin@parceiro.com",
      "name": "Admin Parceiro"
    },
    "approvedBy": {
      "id": "cluseradminxxxxxxxxxxxxxxxxx",
      "name": "Administrador"
    }
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID do registro de acesso |
| `userId` | string | ID do usuario solicitante |
| `companyId` | string | ID da empresa |
| `role` | string | Role solicitada/aprovada (ADMIN, USER) |
| `status` | string | Status (PENDING, APPROVED, REJECTED) |
| `createdAt` | string | Data da solicitacao |
| `approvedAt` | string/null | Data de aprovacao/rejeicao |
| `user` | object | Dados do usuario |
| `approvedBy` | object/null | Quem aprovou/rejeitou |

### Exemplo cURL

```bash
# Listar todas as solicitacoes
curl -X GET https://api.chatblue.io/api/user-access \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por pendentes
curl -X GET "https://api.chatblue.io/api/user-access?status=PENDING" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Solicitar Acesso a Empresa

Permite que um usuario solicite acesso a uma empresa.

### Endpoint

```
POST /api/user-access/request
```

### Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `companyId` | string | Sim | ID da empresa desejada |

### Exemplo

```json
{
  "companyId": "clcompyyyyyyyyyyyyyyyyyyyyyy"
}
```

### Response (201 Created)

```json
{
  "id": "clucaxxxxxxxxxxxxxxxxxxxxxxx",
  "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "companyId": "clcompyyyyyyyyyyyyyyyyyyyyyy",
  "role": "USER",
  "status": "PENDING",
  "createdAt": "2024-01-15T14:30:00.000Z"
}
```

### Erros

```json
{
  "error": "You already have access to this company",
  "code": "VALIDATION_ERROR"
}
```

```json
{
  "error": "You already have a pending request for this company",
  "code": "VALIDATION_ERROR"
}
```

```json
{
  "error": "Company not found",
  "code": "NOT_FOUND"
}
```

### Exemplo cURL

```bash
curl -X POST https://api.chatblue.io/api/user-access/request \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "clcompyyyyyyyyyyyyyyyyyyyyyy"
  }'
```

---

## Aprovar Solicitacao de Acesso

Aprova uma solicitacao de acesso pendente.

### Endpoint

```
POST /api/user-access/:id/approve
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `role` | string | Nao | Role a atribuir (ADMIN ou USER, padrao: USER) |

### Exemplo

```json
{
  "role": "ADMIN"
}
```

### Response (200 OK)

```json
{
  "id": "clucaxxxxxxxxxxxxxxxxxxxxxxx",
  "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "role": "ADMIN",
  "status": "APPROVED",
  "approvedAt": "2024-01-15T15:00:00.000Z",
  "user": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "email": "usuario@empresa.com",
    "name": "Usuario Aprovado"
  }
}
```

### Exemplo cURL

```bash
curl -X POST https://api.chatblue.io/api/user-access/clucaxxxxxxxxxxxxxxxxxxxxxxx/approve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'
```

---

## Rejeitar Solicitacao de Acesso

Rejeita uma solicitacao de acesso pendente.

### Endpoint

```
POST /api/user-access/:id/reject
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Response (200 OK)

```json
{
  "id": "clucaxxxxxxxxxxxxxxxxxxxxxxx",
  "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "role": "USER",
  "status": "REJECTED",
  "approvedAt": "2024-01-15T15:00:00.000Z"
}
```

### Exemplo cURL

```bash
curl -X POST https://api.chatblue.io/api/user-access/clucaxxxxxxxxxxxxxxxxxxxxxxx/reject \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Atualizar Role do Usuario

Altera a role de um usuario com acesso aprovado.

### Endpoint

```
PUT /api/user-access/:id/role
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `role` | string | Sim | Nova role (ADMIN ou USER) |

### Exemplo

```json
{
  "role": "ADMIN"
}
```

### Response (200 OK)

```json
{
  "id": "clucaxxxxxxxxxxxxxxxxxxxxxxx",
  "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "role": "ADMIN",
  "status": "APPROVED"
}
```

### Erro - Alterar Propria Role

```json
{
  "error": "Cannot change your own role",
  "code": "FORBIDDEN"
}
```

---

## Revogar Acesso

Remove o acesso de um usuario a empresa.

### Endpoint

```
DELETE /api/user-access/:id
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Response (200 OK)

```json
{
  "message": "Access revoked successfully"
}
```

### Erro - Revogar Proprio Acesso

```json
{
  "error": "Cannot revoke your own access",
  "code": "FORBIDDEN"
}
```

---

## Listar Minhas Empresas

Retorna todas as empresas que o usuario tem acesso, com contagem de mensagens nao lidas.

### Endpoint

```
GET /api/user-access/my-companies
```

### Response (200 OK)

```json
[
  {
    "id": "clcompxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Empresa Principal",
    "slug": "empresa-principal",
    "logo": "https://exemplo.com/logo1.png",
    "plan": "PRO",
    "isActive": true,
    "role": "ADMIN",
    "isPrimary": true,
    "unreadCount": 15
  },
  {
    "id": "clcompyyyyyyyyyyyyyyyyyyyyyy",
    "name": "Empresa Parceira",
    "slug": "empresa-parceira",
    "logo": null,
    "plan": "BASIC",
    "isActive": true,
    "role": "USER",
    "isPrimary": false,
    "unreadCount": 3
  }
]
```

### Campos

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID da empresa |
| `name` | string | Nome da empresa |
| `slug` | string | Slug da empresa |
| `logo` | string/null | URL do logo |
| `plan` | string | Plano da empresa |
| `isActive` | boolean | Se a empresa esta ativa |
| `role` | string | Role do usuario na empresa |
| `isPrimary` | boolean | Se e a empresa primaria |
| `unreadCount` | number | Mensagens nao lidas |

### Exemplo cURL

```bash
curl -X GET https://api.chatblue.io/api/user-access/my-companies \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Trocar Empresa Ativa

Alterna para outra empresa, gerando novos tokens JWT.

### Endpoint

```
POST /api/user-access/switch-company
```

### Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `companyId` | string | Sim | ID da empresa destino |

### Exemplo

```json
{
  "companyId": "clcompyyyyyyyyyyyyyyyyyyyyyy"
}
```

### Response (200 OK)

```json
{
  "company": {
    "id": "clcompyyyyyyyyyyyyyyyyyyyyyy",
    "name": "Empresa Parceira",
    "slug": "empresa-parceira",
    "logo": null,
    "isActive": true
  },
  "role": "USER",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Erros

```json
{
  "error": "You do not have access to this company",
  "code": "FORBIDDEN"
}
```

```json
{
  "error": "Company is inactive",
  "code": "FORBIDDEN"
}
```

### Exemplo cURL

```bash
curl -X POST https://api.chatblue.io/api/user-access/switch-company \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "clcompyyyyyyyyyyyyyyyyyyyyyy"
  }'
```

---

## Adicionar Acesso Diretamente (Admin)

Administradores podem conceder acesso direto a usuarios da sua empresa.

### Endpoint

```
POST /api/users/:id/company-access
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `companyId` | string | Sim | ID da empresa |
| `role` | string | Nao | Role (ADMIN ou USER, padrao: USER) |

### Exemplo

```json
{
  "companyId": "clcompyyyyyyyyyyyyyyyyyyyyyy",
  "role": "ADMIN"
}
```

### Response (201 Created)

```json
{
  "id": "clucaxxxxxxxxxxxxxxxxxxxxxxx",
  "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "companyId": "clcompyyyyyyyyyyyyyyyyyyyyyy",
  "role": "ADMIN",
  "status": "APPROVED",
  "approvedAt": "2024-01-15T15:00:00.000Z",
  "company": {
    "id": "clcompyyyyyyyyyyyyyyyyyyyyyy",
    "name": "Empresa Parceira",
    "slug": "empresa-parceira",
    "logo": null
  }
}
```

---

## Remover Acesso (Admin)

Remove acesso de um usuario a uma empresa especifica.

### Endpoint

```
DELETE /api/users/:id/company-access/:companyId
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Response (200 OK)

```json
{
  "message": "Company access removed successfully"
}
```

---

## Exemplos de Codigo

### JavaScript

```javascript
class UserAccessAPI {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
    return response.json();
  }

  // Listar solicitacoes de acesso
  async listAccessRequests(status = null) {
    const query = status ? `?status=${status}` : '';
    return this.request('GET', `/user-access${query}`);
  }

  // Solicitar acesso a empresa
  async requestAccess(companyId) {
    return this.request('POST', '/user-access/request', { companyId });
  }

  // Aprovar solicitacao
  async approveAccess(requestId, role = 'USER') {
    return this.request('POST', `/user-access/${requestId}/approve`, { role });
  }

  // Rejeitar solicitacao
  async rejectAccess(requestId) {
    return this.request('POST', `/user-access/${requestId}/reject`);
  }

  // Listar minhas empresas
  async getMyCompanies() {
    return this.request('GET', '/user-access/my-companies');
  }

  // Trocar empresa ativa
  async switchCompany(companyId) {
    const result = await this.request('POST', '/user-access/switch-company', { companyId });

    // Atualizar token local
    if (result.accessToken) {
      this.token = result.accessToken;
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
    }

    return result;
  }
}

// Uso
const api = new UserAccessAPI('https://api.chatblue.io/api', token);

// Listar minhas empresas
const companies = await api.getMyCompanies();
console.log('Empresas:', companies.map(c => c.name));

// Trocar para outra empresa
const result = await api.switchCompany('clcompyyy');
console.log('Empresa ativa:', result.company.name);
console.log('Role:', result.role);

// Listar solicitacoes pendentes (admin)
const pending = await api.listAccessRequests('PENDING');
console.log('Solicitacoes pendentes:', pending.length);

// Aprovar solicitacao
if (pending.length > 0) {
  await api.approveAccess(pending[0].id, 'USER');
  console.log('Solicitacao aprovada');
}
```

### Python

```python
import requests

class UserAccessAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def list_access_requests(self, status=None):
        params = {'status': status} if status else {}
        response = requests.get(
            f'{self.base_url}/user-access',
            params=params,
            headers=self.headers
        )
        return response.json()

    def request_access(self, company_id):
        response = requests.post(
            f'{self.base_url}/user-access/request',
            json={'companyId': company_id},
            headers=self.headers
        )
        return response.json()

    def approve_access(self, request_id, role='USER'):
        response = requests.post(
            f'{self.base_url}/user-access/{request_id}/approve',
            json={'role': role},
            headers=self.headers
        )
        return response.json()

    def get_my_companies(self):
        response = requests.get(
            f'{self.base_url}/user-access/my-companies',
            headers=self.headers
        )
        return response.json()

    def switch_company(self, company_id):
        response = requests.post(
            f'{self.base_url}/user-access/switch-company',
            json={'companyId': company_id},
            headers=self.headers
        )
        result = response.json()

        if 'accessToken' in result:
            self.token = result['accessToken']
            self.headers['Authorization'] = f'Bearer {self.token}'

        return result

# Uso
api = UserAccessAPI('https://api.chatblue.io/api', token)

companies = api.get_my_companies()
for company in companies:
    print(f"{company['name']}: {company['unreadCount']} nao lidas")

result = api.switch_company('clcompyyy')
print(f"Empresa ativa: {result['company']['name']}")
```

### React Context

```typescript
import { createContext, useContext, useState, useCallback } from 'react';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
  isPrimary: boolean;
  unreadCount: number;
}

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  loading: boolean;
  switchCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCompanies = useCallback(async () => {
    const response = await fetch('/api/user-access/my-companies', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    });
    const data = await response.json();
    setCompanies(data);

    // Definir empresa ativa com base no token atual
    const tokenPayload = parseJwt(localStorage.getItem('accessToken') || '');
    const active = data.find((c: Company) => c.id === tokenPayload.companyId);
    setActiveCompany(active || data[0]);

    setLoading(false);
  }, []);

  const switchCompany = useCallback(async (companyId: string) => {
    setLoading(true);

    const response = await fetch('/api/user-access/switch-company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ companyId }),
    });

    const result = await response.json();

    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);

    setActiveCompany(companies.find(c => c.id === companyId) || null);
    setLoading(false);

    // Recarregar dados da aplicacao
    window.location.reload();
  }, [companies]);

  return (
    <CompanyContext.Provider value={{
      companies,
      activeCompany,
      loading,
      switchCompany,
      refreshCompanies,
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanies() {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompanies must be used within CompanyProvider');
  return context;
}

// Uso no componente
function CompanySelector() {
  const { companies, activeCompany, switchCompany, loading } = useCompanies();

  if (loading) return <div>Carregando...</div>;

  return (
    <select
      value={activeCompany?.id}
      onChange={(e) => switchCompany(e.target.value)}
    >
      {companies.map(company => (
        <option key={company.id} value={company.id}>
          {company.name} ({company.unreadCount} nao lidas)
        </option>
      ))}
    </select>
  );
}
```

---

## Notas Importantes

1. **Tokens por Empresa**: Cada empresa gera tokens JWT diferentes. Ao trocar de empresa, novos tokens sao gerados.

2. **Roles Diferentes**: Um usuario pode ter role diferente em cada empresa (ex: ADMIN em uma, USER em outra).

3. **Empresa Primaria**: A empresa primaria e onde o usuario foi criado originalmente. Nao pode ser removida.

4. **Re-Solicitacao**: Se uma solicitacao foi rejeitada, o usuario pode solicitar novamente.

5. **Contagem de Mensagens**: O `unreadCount` considera apenas tickets ativos e mensagens nao lidas.

6. **Consistencia de Dados**: Ao trocar de empresa, todos os dados da aplicacao devem ser recarregados.

## Endpoints Relacionados

- [Login](/docs/api/autenticacao/login) - Login com empresa especifica
- [Detalhes do Usuario](/docs/api/usuarios/detalhes) - Ver acesso a empresas
- [Listar Empresas Ativas](/docs/api/empresas/listar) - Ver empresas disponiveis
