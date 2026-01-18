---
sidebar_position: 4
title: Atualizar Usuario
description: Endpoint para atualizar dados de um usuario no ChatBlue
---

# Atualizar Usuario

Atualiza os dados de um usuario existente.

## Endpoint

```
PUT /api/users/:id
```

## Descricao

Este endpoint permite atualizar informacoes de um usuario, incluindo nome, role, departamentos e configuracoes de IA (para agentes de IA).

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

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do usuario (CUID) |

### Body Parameters

Todos os campos sao opcionais. Envie apenas os que deseja atualizar.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `email` | string | Novo email |
| `name` | string | Novo nome (min. 2 caracteres) |
| `role` | string | Nova role (ADMIN, SUPERVISOR, AGENT) |
| `isAI` | boolean | Se e agente de IA |
| `isActive` | boolean | Status de ativacao |
| `departmentIds` | string[] | Novos departamentos (substitui os atuais) |
| `aiConfig` | object | Configuracoes de IA |

### Campos de IA em Formato Plano

Para agentes de IA, voce tambem pode usar os campos em formato plano:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `aiModel` | string | Modelo de IA |
| `aiSystemPrompt` | string | Prompt do sistema |
| `aiTemperature` | number | Temperatura (0-2) |
| `aiMaxTokens` | number | Maximo de tokens |
| `trainingData` | string | Dados de treinamento |
| `transferKeywords` | string[] | Palavras-chave para transferencia |
| `aiPersonalityTone` | string | Tom (friendly, formal, etc.) |
| `aiPersonalityStyle` | string | Estilo (concise, detailed, etc.) |
| `aiUseEmojis` | boolean | Usar emojis |
| `aiUseClientName` | boolean | Usar nome do cliente |
| `aiGuardrailsEnabled` | boolean | Habilitar guardrails |

### Exemplo de Request - Usuario Humano

```json
{
  "name": "Nome Atualizado",
  "role": "SUPERVISOR",
  "departmentIds": [
    "cldeptxxxxxxxxxxxxxxxxxxxxxx",
    "cldeptzzzzzzzzzzzzzzzzzzzzzz"
  ]
}
```

### Exemplo de Request - Agente de IA

```json
{
  "name": "Assistente Atualizado",
  "aiModel": "gpt-4-turbo-preview",
  "aiSystemPrompt": "Voce e um assistente de atendimento...",
  "aiTemperature": 0.8,
  "aiPersonalityTone": "formal",
  "aiUseEmojis": false,
  "transferKeywords": ["humano", "atendente", "gerente"],
  "departmentIds": ["cldeptxxxxxxxxxxxxxxxxxxxxxx"]
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "email": "usuario@empresa.com",
  "name": "Nome Atualizado",
  "role": "SUPERVISOR",
  "isAI": false,
  "isActive": true,
  "aiConfig": null,
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

## Erros

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: name: Nome deve ter pelo menos 2 caracteres",
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
  "error": "Access denied. Admin required.",
  "code": "FORBIDDEN"
}
```

### 404 Not Found

```json
{
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
# Atualizar nome e role
curl -X PUT https://api.chatblue.io/api/users/cluserxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nome Atualizado",
    "role": "SUPERVISOR"
  }'

# Atualizar departamentos
curl -X PUT https://api.chatblue.io/api/users/cluserxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "departmentIds": ["cldeptxxxxxxxxxxxxxxxxxxxxxx", "cldeptzzzzzzzzzzzzzzzzzzzzzz"]
  }'

# Atualizar configuracoes de IA
curl -X PUT https://api.chatblue.io/api/users/cluseraaaaaaaaaaaaaaaaaaaaa \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "aiModel": "gpt-4-turbo-preview",
    "aiTemperature": 0.8,
    "aiUseEmojis": false
  }'
```

### JavaScript (Fetch)

```javascript
async function updateUser(userId, updates) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`https://api.chatblue.io/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Atualizar nome e role
async function updateUserRole(userId, name, role) {
  return updateUser(userId, { name, role });
}

// Atualizar departamentos
async function updateUserDepartments(userId, departmentIds) {
  return updateUser(userId, { departmentIds });
}

// Atualizar configuracoes de IA
async function updateAIConfig(userId, config) {
  return updateUser(userId, {
    aiModel: config.model,
    aiSystemPrompt: config.systemPrompt,
    aiTemperature: config.temperature,
    aiMaxTokens: config.maxTokens,
    aiPersonalityTone: config.tone,
    aiPersonalityStyle: config.style,
    aiUseEmojis: config.useEmojis,
    aiUseClientName: config.useClientName,
    aiGuardrailsEnabled: config.guardrails,
    trainingData: config.trainingData,
    transferKeywords: config.transferKeywords,
  });
}

// Desativar usuario
async function deactivateUser(userId) {
  return updateUser(userId, { isActive: false });
}

// Uso
try {
  // Promover para supervisor
  await updateUserRole('cluserxxx', 'Maria Silva', 'SUPERVISOR');

  // Adicionar a novos departamentos
  await updateUserDepartments('cluserxxx', ['cldept1', 'cldept2']);

  // Atualizar IA
  await updateAIConfig('cluseraia', {
    model: 'gpt-4-turbo-preview',
    temperature: 0.8,
    tone: 'formal',
  });

  // Desativar usuario
  await deactivateUser('cluseryyy');
} catch (error) {
  console.error('Erro:', error.message);
}
```

### Python

```python
import requests

def update_user(access_token, user_id, **updates):
    url = f'https://api.chatblue.io/api/users/{user_id}'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.put(url, json=updates, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

def update_user_role(token, user_id, role):
    return update_user(token, user_id, role=role)

def update_user_departments(token, user_id, department_ids):
    return update_user(token, user_id, departmentIds=department_ids)

def deactivate_user(token, user_id):
    return update_user(token, user_id, isActive=False)

def update_ai_config(token, user_id, **config):
    return update_user(
        token, user_id,
        aiModel=config.get('model'),
        aiSystemPrompt=config.get('system_prompt'),
        aiTemperature=config.get('temperature'),
        aiPersonalityTone=config.get('tone'),
        aiUseEmojis=config.get('use_emojis'),
    )

# Uso
user = update_user(token, 'cluserxxx', name='Novo Nome', role='SUPERVISOR')
print(f"Usuario atualizado: {user['name']}")

update_user_departments(token, 'cluserxxx', ['cldept1', 'cldept2'])
deactivate_user(token, 'cluseryyy')
```

### React Form Component

```typescript
import { useState } from 'react';

interface UserUpdateForm {
  userId: string;
  initialData: {
    name: string;
    email: string;
    role: string;
    isAI: boolean;
    departmentIds: string[];
    aiConfig?: any;
  };
  departments: Array<{ id: string; name: string }>;
  onSave: (user: any) => void;
}

function UserEditForm({ userId, initialData, departments, onSave }: UserUpdateForm) {
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          departmentIds: formData.departmentIds,
          ...(formData.isAI && {
            aiModel: formData.aiConfig?.model,
            aiTemperature: formData.aiConfig?.temperature,
            aiPersonalityTone: formData.aiConfig?.personalityTone,
          }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const updated = await response.json();
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Nome</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          minLength={2}
          required
        />
      </div>

      <div>
        <label>Role</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        >
          <option value="AGENT">Agente</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      <div>
        <label>Departamentos</label>
        {departments.map(dept => (
          <label key={dept.id}>
            <input
              type="checkbox"
              checked={formData.departmentIds.includes(dept.id)}
              onChange={(e) => {
                const ids = e.target.checked
                  ? [...formData.departmentIds, dept.id]
                  : formData.departmentIds.filter(id => id !== dept.id);
                setFormData({ ...formData, departmentIds: ids });
              }}
            />
            {dept.name}
          </label>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```

## Endpoint Alternativo: Atualizar Configuracoes de IA

Existe um endpoint dedicado para atualizar apenas configuracoes de IA:

### Endpoint

```
PUT /api/users/:id/ai-config
```

### Body

```json
{
  "provider": "openai",
  "model": "gpt-4-turbo-preview",
  "systemPrompt": "Voce e um assistente...",
  "temperature": 0.7,
  "maxTokens": 1000,
  "triggerKeywords": ["humano", "atendente"],
  "trainingData": "Dados de treinamento..."
}
```

### Exemplo

```bash
curl -X PUT https://api.chatblue.io/api/users/cluseraaaaaaaaaaaaaaaaaaaaa/ai-config \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4-turbo-preview",
    "temperature": 0.8,
    "maxTokens": 1500
  }'
```

## Desativar Usuario

Para desativar (soft delete) um usuario:

### Endpoint

```
DELETE /api/users/:id
```

### Response

```json
{
  "message": "User deactivated successfully"
}
```

### Exemplo

```bash
curl -X DELETE https://api.chatblue.io/api/users/cluserxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

:::warning Cuidado
Desativar um usuario impede que ele faca login e atenda tickets.
:::

## Notas Importantes

1. **Departamentos Substituidos**: Ao enviar `departmentIds`, a lista atual e completamente substituida.

2. **Email Imutavel**: O email nao pode ser alterado para evitar problemas de autenticacao.

3. **Senha**: A senha nao pode ser atualizada por este endpoint. Use um endpoint de reset de senha dedicado.

4. **Configuracoes de IA**: Os campos de IA em formato plano sao automaticamente convertidos para o objeto `aiConfig`.

5. **Treinamento de IA**: Se atualizar `trainingData`, o conteudo e automaticamente adicionado ao `systemPrompt`.

6. **Validacao de Role**: Nao e possivel promover alguem para SUPER_ADMIN.

## Endpoints Relacionados

- [Detalhes do Usuario](/docs/api/usuarios/detalhes) - Ver dados atuais
- [Listar Usuarios](/docs/api/usuarios/listar) - Ver todos os usuarios
- [Departamentos](/docs/api/usuarios/departamentos) - Gerenciar departamentos
