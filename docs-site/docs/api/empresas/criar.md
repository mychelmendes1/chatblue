---
sidebar_position: 2
title: Criar Empresa
description: Endpoint para criar uma nova empresa no ChatBlue
---

# Criar Empresa

Cria uma nova empresa no sistema.

## Endpoint

```
POST /api/companies
```

## Descricao

Este endpoint permite criar uma nova empresa no sistema. Ao criar uma empresa, as configuracoes padrao (CompanySettings) sao automaticamente criadas.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **SUPER_ADMIN**: Pode criar novas empresas

:::warning Acesso Restrito
Apenas usuarios com role `SUPER_ADMIN` podem criar novas empresas.
:::

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |
| `Authorization` | `Bearer {accessToken}` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome da empresa (min. 2 caracteres) |
| `slug` | string | Sim | Identificador URL-friendly (min. 2 caracteres) |
| `logo` | string | Nao | URL do logo da empresa |
| `plan` | string | Nao | Plano da empresa (padrao: BASIC) |

### Validacao do Slug

O slug deve:
- Ter no minimo 2 caracteres
- Conter apenas letras minusculas, numeros e hifens
- Ser unico no sistema

### Planos Disponiveis

| Valor | Descricao |
|-------|-----------|
| `BASIC` | Plano basico (padrao) |
| `PRO` | Plano profissional |
| `ENTERPRISE` | Plano empresarial |

### Exemplo de Request

```json
{
  "name": "Nova Empresa LTDA",
  "slug": "nova-empresa",
  "logo": "https://exemplo.com/logo.png",
  "plan": "PRO"
}
```

Request minimo:

```json
{
  "name": "Nova Empresa",
  "slug": "nova-empresa"
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Nova Empresa LTDA",
  "slug": "nova-empresa",
  "logo": "https://exemplo.com/logo.png",
  "plan": "PRO",
  "isActive": true,
  "createdAt": "2024-01-15T14:30:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z",
  "settings": {
    "id": "clzzzzzzzzzzzzzzzzzzzzzzzz",
    "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
    "autoAssign": true,
    "maxTicketsPerAgent": 10,
    "welcomeMessage": null,
    "awayMessage": null,
    "aiEnabled": false,
    "notionSyncEnabled": false
  },
  "_count": {
    "users": 0,
    "connections": 0,
    "tickets": 0
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da empresa (CUID) |
| `name` | string | Nome da empresa |
| `slug` | string | Identificador URL-friendly |
| `logo` | string/null | URL do logo |
| `plan` | string | Plano contratado |
| `isActive` | boolean | Status (sempre true na criacao) |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Data de atualizacao |
| `settings` | object | Configuracoes padrao da empresa |
| `_count` | object | Contadores (inicialmente zerados) |

## Erros

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: name: Nome deve ter pelo menos 2 caracteres",
  "code": "VALIDATION_ERROR"
}
```

Possiveis erros:
- `name`: Nome deve ter pelo menos 2 caracteres
- `slug`: Slug deve ter pelo menos 2 caracteres
- `slug`: Slug deve conter apenas letras minusculas, numeros e hifens
- `logo`: URL do logo invalida
- `plan`: Plano invalido

### 400 Bad Request - Slug Duplicado

```json
{
  "error": "Uma empresa com este slug ja existe",
  "code": "VALIDATION_ERROR"
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
  "error": "Access denied. Super Admin required.",
  "code": "FORBIDDEN"
}
```

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/companies \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nova Empresa LTDA",
    "slug": "nova-empresa",
    "logo": "https://exemplo.com/logo.png",
    "plan": "PRO"
  }'
```

### JavaScript (Fetch)

```javascript
async function createCompany(companyData) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('https://api.chatblue.io/api/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(companyData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
try {
  const newCompany = await createCompany({
    name: 'Nova Empresa LTDA',
    slug: 'nova-empresa',
    plan: 'PRO',
  });

  console.log('Empresa criada:', newCompany.id);
  console.log('Settings ID:', newCompany.settings.id);
} catch (error) {
  console.error('Erro ao criar empresa:', error.message);
}
```

### JavaScript - Funcao de Geracao de Slug

```javascript
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')     // Substitui caracteres especiais
    .replace(/^-|-$/g, '');          // Remove hifens no inicio/fim
}

async function createCompanyWithAutoSlug(name, plan = 'BASIC') {
  const slug = generateSlug(name);

  return createCompany({
    name,
    slug,
    plan,
  });
}

// Uso
const company = await createCompanyWithAutoSlug('Minha Nova Empresa!');
// slug gerado: "minha-nova-empresa"
```

### Python

```python
import requests
import re
import unicodedata

def generate_slug(name):
    # Normalizar e remover acentos
    slug = unicodedata.normalize('NFD', name)
    slug = slug.encode('ascii', 'ignore').decode('utf-8')
    slug = slug.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

def create_company(access_token, name, slug=None, logo=None, plan='BASIC'):
    url = 'https://api.chatblue.io/api/companies'

    if slug is None:
        slug = generate_slug(name)

    payload = {
        'name': name,
        'slug': slug,
        'plan': plan
    }

    if logo:
        payload['logo'] = logo

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
company = create_company(
    access_token=token,
    name='Nova Empresa LTDA',
    plan='PRO'
)
print(f"Empresa criada: {company['id']}")
```

## Fluxo Pos-Criacao

Apos criar uma empresa, voce normalmente precisa:

1. **Criar o primeiro usuario administrador**:

```javascript
async function setupCompany(companyData, adminData) {
  // 1. Criar empresa
  const company = await createCompany(companyData);

  // 2. Criar usuario admin
  const admin = await createUser({
    ...adminData,
    role: 'ADMIN',
    companyId: company.id,
  });

  // 3. Criar departamentos iniciais
  await createDepartment({
    name: 'Atendimento',
    color: '#3B82F6',
  });

  return { company, admin };
}
```

2. **Configurar conexao WhatsApp**
3. **Configurar integracao de IA** (se aplicavel)
4. **Adicionar mais usuarios e departamentos**

## Notas Importantes

1. **Settings Automaticos**: Ao criar uma empresa, um registro de `CompanySettings` e automaticamente criado com valores padrao.

2. **Slug Unico**: O slug deve ser unico em todo o sistema. Recomendamos validar antes de enviar.

3. **Logo Opcional**: O logo pode ser adicionado depois via endpoint de atualizacao.

4. **Ativacao**: Novas empresas sao criadas com `isActive: true`. Para desativar, use o endpoint DELETE.

5. **Contadores Zerados**: Os contadores (`_count`) iniciam zerados e sao atualizados conforme recursos sao adicionados.

## Endpoints Relacionados

- [Listar Empresas](/docs/api/empresas/listar) - Ver todas as empresas
- [Detalhes da Empresa](/docs/api/empresas/detalhes) - Obter empresa especifica
- [Atualizar Empresa](/docs/api/empresas/atualizar) - Modificar dados
- [Configuracoes](/docs/api/empresas/configuracoes) - Gerenciar settings
