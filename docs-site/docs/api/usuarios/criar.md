---
sidebar_position: 2
title: Criar Usuario
description: Endpoint para criar um novo usuario no ChatBlue
---

# Criar Usuario

Cria um novo usuario na empresa.

## Endpoint

```
POST /api/users
```

## Descricao

Este endpoint permite criar um novo usuario na empresa. Pode ser usado para criar usuarios humanos ou agentes de IA. Usuarios sao criados vinculados a empresa do administrador autenticado.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN** ou **SUPER_ADMIN**

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |
| `Authorization` | `Bearer {accessToken}` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `email` | string | Sim | Email do usuario (unico por empresa) |
| `password` | string | Sim | Senha (minimo 6 caracteres) |
| `name` | string | Sim | Nome completo (minimo 2 caracteres) |
| `role` | string | Nao | Role do usuario (padrao: AGENT) |
| `isAI` | boolean | Nao | Se e um agente de IA (padrao: false) |
| `isActive` | boolean | Nao | Status de ativacao (padrao: true) |
| `departmentIds` | string[] | Nao | IDs dos departamentos |
| `companyId` | string | Nao | ID da empresa (somente SUPER_ADMIN) |
| `aiConfig` | object | Nao | Configuracoes de IA (se isAI: true) |

### Objeto `aiConfig`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `provider` | string | Provedor (openai, anthropic) |
| `model` | string | Modelo de IA |
| `systemPrompt` | string | Prompt do sistema |
| `temperature` | number | Temperatura (0-2) |
| `maxTokens` | number | Maximo de tokens |
| `trainingData` | string | Dados de treinamento |
| `triggerKeywords` | string[] | Palavras-chave para transferencia |
| `personalityTone` | string | Tom (friendly, formal, technical, empathetic) |
| `personalityStyle` | string | Estilo (concise, detailed, conversational) |
| `useEmojis` | boolean | Usar emojis |
| `useClientName` | boolean | Usar nome do cliente |
| `guardrailsEnabled` | boolean | Habilitar guardrails |

### Roles Disponiveis

| Role | Descricao |
|------|-----------|
| `ADMIN` | Administrador da empresa |
| `SUPERVISOR` | Supervisor de equipe |
| `AGENT` | Atendente (padrao) |

### Exemplo de Request - Usuario Humano

```json
{
  "email": "novo.usuario@empresa.com",
  "password": "senhaSegura123",
  "name": "Novo Usuario",
  "role": "AGENT",
  "departmentIds": [
    "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "cldeptzzzzzzzzzzzzzzzzzzzzzz"
  ]
}
```

### Exemplo de Request - Agente de IA

```json
{
  "email": "assistente.ia@empresa.com",
  "password": "senha-segura-ia",
  "name": "Assistente Virtual",
  "role": "AGENT",
  "isAI": true,
  "departmentIds": ["cldeptxxxxxxxxxxxxxxxxxxxxxx"],
  "aiConfig": {
    "provider": "openai",
    "model": "gpt-4-turbo-preview",
    "systemPrompt": "Voce e um assistente de atendimento da Empresa X. Seja educado e prestativo.",
    "temperature": 0.7,
    "maxTokens": 1000,
    "triggerKeywords": ["humano", "atendente", "falar com pessoa"],
    "personalityTone": "friendly",
    "personalityStyle": "conversational",
    "useEmojis": true,
    "useClientName": true,
    "guardrailsEnabled": true
  }
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "email": "novo.usuario@empresa.com",
  "name": "Novo Usuario",
  "role": "AGENT",
  "isAI": false,
  "departments": [
    {
      "department": {
        "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Atendimento",
        "color": "#3B82F6"
      }
    }
  ]
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico do usuario (CUID) |
| `email` | string | Email do usuario |
| `name` | string | Nome completo |
| `role` | string | Role atribuida |
| `isAI` | boolean | Se e agente de IA |
| `departments` | array | Departamentos vinculados |

## Erros

### 400 Bad Request - Email Existente

```json
{
  "error": "Email already exists in this company",
  "code": "VALIDATION_ERROR"
}
```

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
- `role`: Role invalida
- `departmentIds`: ID de departamento invalido

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

### 404 Not Found - Empresa

```json
{
  "error": "Company not found",
  "code": "NOT_FOUND"
}
```

Ocorre quando SUPER_ADMIN especifica um `companyId` invalido.

## Exemplos de Codigo

### cURL

```bash
# Criar usuario humano
curl -X POST https://api.chatblue.io/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo.usuario@empresa.com",
    "password": "senhaSegura123",
    "name": "Novo Usuario",
    "role": "AGENT",
    "departmentIds": ["cldeptxxxxxxxxxxxxxxxxxxxxxx"]
  }'

# Criar agente de IA
curl -X POST https://api.chatblue.io/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ai.assistente@empresa.com",
    "password": "senha-ia-123",
    "name": "Assistente Virtual",
    "isAI": true,
    "aiConfig": {
      "model": "gpt-4-turbo-preview",
      "systemPrompt": "Voce e um assistente de atendimento..."
    }
  }'
```

### JavaScript (Fetch)

```javascript
async function createUser(userData) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('https://api.chatblue.io/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Criar usuario humano
async function createHumanUser(data) {
  return createUser({
    email: data.email,
    password: data.password,
    name: data.name,
    role: data.role || 'AGENT',
    departmentIds: data.departmentIds,
  });
}

// Criar agente de IA
async function createAIAgent(data) {
  return createUser({
    email: data.email,
    password: `ai-agent-${Date.now()}`, // Senha automatica para IA
    name: data.name,
    role: 'AGENT',
    isAI: true,
    departmentIds: data.departmentIds,
    aiConfig: {
      provider: 'openai',
      model: data.model || 'gpt-4-turbo-preview',
      systemPrompt: data.systemPrompt,
      temperature: data.temperature || 0.7,
      maxTokens: data.maxTokens || 1000,
      personalityTone: data.tone || 'friendly',
      personalityStyle: data.style || 'conversational',
      useEmojis: data.useEmojis ?? true,
      useClientName: data.useClientName ?? true,
      guardrailsEnabled: true,
    },
  });
}

// Uso
try {
  const humanUser = await createHumanUser({
    email: 'agente@empresa.com',
    password: 'senha123',
    name: 'Agente de Suporte',
    role: 'AGENT',
    departmentIds: ['cldeptxxx'],
  });
  console.log('Usuario criado:', humanUser.id);

  const aiAgent = await createAIAgent({
    email: 'ai@empresa.com',
    name: 'Assistente IA',
    model: 'gpt-4-turbo-preview',
    systemPrompt: 'Voce e um assistente...',
    departmentIds: ['cldeptxxx'],
  });
  console.log('Agente IA criado:', aiAgent.id);
} catch (error) {
  console.error('Erro:', error.message);
}
```

### Python

```python
import requests
import secrets

def create_user(access_token, user_data):
    url = 'https://api.chatblue.io/api/users'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.post(url, json=user_data, headers=headers)

    if response.status_code == 201:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

def create_human_user(token, email, password, name, role='AGENT', department_ids=None):
    return create_user(token, {
        'email': email,
        'password': password,
        'name': name,
        'role': role,
        'departmentIds': department_ids or []
    })

def create_ai_agent(token, email, name, system_prompt, department_ids=None, **kwargs):
    return create_user(token, {
        'email': email,
        'password': f'ai-agent-{secrets.token_hex(8)}',
        'name': name,
        'role': 'AGENT',
        'isAI': True,
        'departmentIds': department_ids or [],
        'aiConfig': {
            'provider': kwargs.get('provider', 'openai'),
            'model': kwargs.get('model', 'gpt-4-turbo-preview'),
            'systemPrompt': system_prompt,
            'temperature': kwargs.get('temperature', 0.7),
            'maxTokens': kwargs.get('max_tokens', 1000),
            'personalityTone': kwargs.get('tone', 'friendly'),
            'personalityStyle': kwargs.get('style', 'conversational'),
            'useEmojis': kwargs.get('use_emojis', True),
            'useClientName': kwargs.get('use_client_name', True),
            'guardrailsEnabled': True,
        }
    })

# Uso
user = create_human_user(
    token,
    email='agente@empresa.com',
    password='senha123',
    name='Agente de Suporte'
)
print(f"Usuario criado: {user['id']}")

ai_agent = create_ai_agent(
    token,
    email='ai@empresa.com',
    name='Assistente Virtual',
    system_prompt='Voce e um assistente de atendimento...',
    model='gpt-4-turbo-preview'
)
print(f"Agente IA criado: {ai_agent['id']}")
```

## Endpoint Alternativo: Criar Agente de IA

Existe um endpoint de conveniencia especifico para criar agentes de IA:

### Endpoint

```
POST /api/users/ai-agent
```

### Body

Este endpoint aceita campos de IA em formato plano (flat), sem necessidade de objeto `aiConfig`:

```json
{
  "email": "ai@empresa.com",
  "name": "Assistente Virtual",
  "departmentIds": ["cldeptxxxxxxxxxxxxxxxxxxxxxx"],
  "aiModel": "gpt-4-turbo-preview",
  "aiSystemPrompt": "Voce e um assistente...",
  "aiTemperature": 0.7,
  "aiMaxTokens": 1000,
  "aiPersonalityTone": "friendly",
  "aiPersonalityStyle": "conversational",
  "aiUseEmojis": true,
  "aiUseClientName": true,
  "aiGuardrailsEnabled": true,
  "transferKeywords": ["humano", "atendente"],
  "trainingData": "Dados de treinamento extraidos de PDF..."
}
```

### Exemplo

```bash
curl -X POST https://api.chatblue.io/api/users/ai-agent \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ai@empresa.com",
    "name": "Assistente Virtual",
    "aiModel": "gpt-4-turbo-preview",
    "aiSystemPrompt": "Voce e um assistente de atendimento..."
  }'
```

## Notas Importantes

1. **Email Unico por Empresa**: O mesmo email pode existir em empresas diferentes, mas e unico dentro de cada empresa.

2. **Senha para IA**: Agentes de IA tambem precisam de senha (para consistencia do modelo), mas nao fazem login. Gere uma senha automatica.

3. **Departamentos**: Os departamentos devem existir na mesma empresa do usuario.

4. **Ativacao**: Usuarios sao criados ativos por padrao. Use `isActive: false` para criar desativado.

5. **SUPER_ADMIN**: Apenas SUPER_ADMIN pode especificar `companyId` para criar usuarios em outras empresas.

6. **Treinamento de IA**: Use o endpoint `/api/users/process-training-pdf` para extrair texto de PDFs antes de criar o agente.

## Endpoints Relacionados

- [Listar Usuarios](/docs/api/usuarios/listar) - Ver todos os usuarios
- [Detalhes do Usuario](/docs/api/usuarios/detalhes) - Ver usuario especifico
- [Atualizar Usuario](/docs/api/usuarios/atualizar) - Modificar usuario
- [Departamentos](/docs/api/usuarios/departamentos) - Gerenciar departamentos
