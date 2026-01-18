---
sidebar_position: 5
title: Configuracoes da Empresa
description: Endpoints para gerenciar configuracoes da empresa no ChatBlue
---

# Configuracoes da Empresa

Endpoints para gerenciar configuracoes detalhadas da empresa, incluindo IA, Notion e SLA.

## Visao Geral

As configuracoes da empresa estao divididas em categorias:

- **Configuracoes Gerais**: Auto-atribuicao, mensagens padrao, limites
- **Configuracoes de IA**: Provedor, modelo, personalidade
- **Integracao Notion**: Sincronizacao de dados
- **Configuracoes de SLA**: Tempos de resposta e resolucao

---

## Obter Configuracoes

Retorna todas as configuracoes da empresa.

### Endpoint

```
GET /api/settings
```

### Permissoes

- **ADMIN** ou **SUPER_ADMIN**

### Response (200 OK)

```json
{
  "id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "autoAssign": true,
  "maxTicketsPerAgent": 10,
  "welcomeMessage": "Ola! Como posso ajudar?",
  "awayMessage": "Estamos fora do horario de atendimento.",
  "defaultTransferDepartmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
  "aiEnabled": true,
  "aiProvider": "openai",
  "aiApiKey": "********",
  "aiDefaultModel": "gpt-4-turbo-preview",
  "aiSystemPrompt": "Voce e um assistente de atendimento...",
  "aiPersonalityTone": "friendly",
  "aiPersonalityStyle": "conversational",
  "aiUseEmojis": true,
  "aiUseClientName": true,
  "aiGuardrailsEnabled": true,
  "whisperApiKey": "********",
  "notionSyncEnabled": false,
  "notionApiKey": "********",
  "notionDatabaseId": null
}
```

:::note Seguranca
Chaves de API sao mascaradas com `********` por seguranca.
:::

### Exemplo

```bash
curl -X GET https://api.chatblue.io/api/settings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Atualizar Configuracoes Gerais

### Endpoint

```
PUT /api/settings
```

### Body Parameters

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `autoAssign` | boolean | Habilitar auto-atribuicao de tickets |
| `maxTicketsPerAgent` | number | Maximo de tickets por agente (1-100) |
| `welcomeMessage` | string | Mensagem de boas-vindas |
| `awayMessage` | string | Mensagem de ausencia |
| `defaultTransferDepartmentId` | string/null | Departamento padrao para transferencias |

### Exemplo de Request

```json
{
  "autoAssign": true,
  "maxTicketsPerAgent": 15,
  "welcomeMessage": "Ola! Seja bem-vindo ao nosso atendimento.",
  "awayMessage": "No momento estamos fora do horario. Retornaremos em breve!"
}
```

### Exemplo cURL

```bash
curl -X PUT https://api.chatblue.io/api/settings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "autoAssign": true,
    "maxTicketsPerAgent": 15,
    "welcomeMessage": "Ola! Como posso ajudar?"
  }'
```

---

## Configuracoes de IA

### Endpoint

```
PUT /api/settings/ai
```

### Body Parameters

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `aiEnabled` | boolean | Habilitar atendimento por IA |
| `aiProvider` | string | Provedor (openai, anthropic) |
| `aiApiKey` | string | Chave de API do provedor |
| `aiDefaultModel` | string | Modelo padrao |
| `aiSystemPrompt` | string | Prompt do sistema |
| `whisperApiKey` | string | Chave para transcricao de audio |
| `aiPersonalityTone` | string | Tom (friendly, formal, technical, empathetic) |
| `aiPersonalityStyle` | string | Estilo (concise, detailed, conversational) |
| `aiUseEmojis` | boolean | Usar emojis nas respostas |
| `aiUseClientName` | boolean | Usar nome do cliente |
| `aiGuardrailsEnabled` | boolean | Habilitar guardrails de seguranca |

### Modelos Disponiveis

#### OpenAI
- `gpt-4-turbo-preview`
- `gpt-4`
- `gpt-3.5-turbo`

#### Anthropic
- `claude-3-opus`
- `claude-3-sonnet`
- `claude-3-haiku`

### Tons de Personalidade

| Valor | Descricao |
|-------|-----------|
| `friendly` | Amigavel e informal |
| `formal` | Formal e profissional |
| `technical` | Tecnico e preciso |
| `empathetic` | Empatico e acolhedor |

### Estilos de Resposta

| Valor | Descricao |
|-------|-----------|
| `concise` | Respostas curtas e diretas |
| `detailed` | Respostas completas e detalhadas |
| `conversational` | Estilo de conversa natural |

### Exemplo de Request

```json
{
  "aiEnabled": true,
  "aiProvider": "openai",
  "aiApiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
  "aiDefaultModel": "gpt-4-turbo-preview",
  "aiSystemPrompt": "Voce e um assistente de atendimento da empresa X. Seja educado e prestativo.",
  "aiPersonalityTone": "friendly",
  "aiPersonalityStyle": "conversational",
  "aiUseEmojis": true,
  "aiUseClientName": true,
  "aiGuardrailsEnabled": true
}
```

### Exemplo cURL

```bash
curl -X PUT https://api.chatblue.io/api/settings/ai \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "aiEnabled": true,
    "aiProvider": "openai",
    "aiApiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    "aiDefaultModel": "gpt-4-turbo-preview"
  }'
```

### JavaScript

```javascript
async function configureAI(settings) {
  const response = await fetch('/api/settings/ai', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
await configureAI({
  aiEnabled: true,
  aiProvider: 'openai',
  aiApiKey: 'sk-xxx',
  aiDefaultModel: 'gpt-4-turbo-preview',
  aiPersonalityTone: 'friendly',
  aiUseEmojis: true,
});
```

---

## Configuracoes do Notion

### Atualizar Configuracoes

```
PUT /api/settings/notion
```

### Body Parameters

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `notionApiKey` | string | Chave de integracao do Notion |
| `notionDatabaseId` | string | ID do database do Notion |
| `notionSyncEnabled` | boolean | Habilitar sincronizacao |

### Exemplo

```json
{
  "notionApiKey": "secret_xxxxxxxxxxxxxxxxxxxxxxxx",
  "notionDatabaseId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "notionSyncEnabled": true
}
```

### Testar Conexao

```
POST /api/settings/notion/test
```

### Body

```json
{
  "notionApiKey": "secret_xxxxxxxxxxxxxxxxxxxxxxxx",
  "notionDatabaseId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Response

```json
{
  "success": true
}
```

ou

```json
{
  "success": false,
  "error": "Invalid API key or database ID"
}
```

### Exemplo cURL

```bash
# Testar conexao
curl -X POST https://api.chatblue.io/api/settings/notion/test \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "notionApiKey": "secret_xxx",
    "notionDatabaseId": "xxx"
  }'

# Salvar configuracoes apos teste bem-sucedido
curl -X PUT https://api.chatblue.io/api/settings/notion \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "notionApiKey": "secret_xxx",
    "notionDatabaseId": "xxx",
    "notionSyncEnabled": true
  }'
```

---

## Configuracoes de SLA

### Listar Configuracoes de SLA

```
GET /api/settings/sla
```

### Response

```json
[
  {
    "id": "clslaxxxxxxxxxxxxxxxxxxxxxxx",
    "name": "SLA Padrao",
    "firstResponseTime": 60,
    "resolutionTime": 480,
    "businessHours": {
      "start": "09:00",
      "end": "18:00",
      "days": [1, 2, 3, 4, 5]
    },
    "isDefault": true,
    "isActive": true,
    "department": null
  },
  {
    "id": "clslayyyyyyyyyyyyyyyyyyyyyy",
    "name": "SLA Suporte Tecnico",
    "firstResponseTime": 30,
    "resolutionTime": 240,
    "businessHours": {
      "start": "08:00",
      "end": "22:00",
      "days": [0, 1, 2, 3, 4, 5, 6]
    },
    "isDefault": false,
    "isActive": true,
    "department": {
      "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Suporte Tecnico"
    }
  }
]
```

### Campos do SLA

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `name` | string | Nome do SLA |
| `firstResponseTime` | number | Tempo para primeira resposta (minutos) |
| `resolutionTime` | number | Tempo para resolucao (minutos) |
| `businessHours.start` | string | Horario de inicio (HH:MM) |
| `businessHours.end` | string | Horario de fim (HH:MM) |
| `businessHours.days` | number[] | Dias da semana (0=Dom, 6=Sab) |
| `isDefault` | boolean | Se e o SLA padrao |
| `isActive` | boolean | Se esta ativo |
| `departmentId` | string/null | Departamento especifico (ou null para todos) |

### Criar Configuracao de SLA

```
POST /api/settings/sla
```

### Body

```json
{
  "name": "SLA Premium",
  "firstResponseTime": 15,
  "resolutionTime": 120,
  "businessHours": {
    "start": "08:00",
    "end": "20:00",
    "days": [1, 2, 3, 4, 5]
  },
  "isDefault": false,
  "departmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Response (201 Created)

```json
{
  "id": "clslaxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "SLA Premium",
  "firstResponseTime": 15,
  "resolutionTime": 120,
  "businessHours": {
    "start": "08:00",
    "end": "20:00",
    "days": [1, 2, 3, 4, 5]
  },
  "isDefault": false,
  "isActive": true,
  "companyId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "departmentId": "cldeptxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Atualizar SLA

```
PUT /api/settings/sla/:id
```

### Body

```json
{
  "firstResponseTime": 10,
  "resolutionTime": 60
}
```

### Deletar SLA

```
DELETE /api/settings/sla/:id
```

### Response

```json
{
  "message": "SLA config deleted"
}
```

### Exemplo JavaScript

```javascript
// Listar SLAs
async function listSLAs() {
  const response = await fetch('/api/settings/sla', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.json();
}

// Criar SLA
async function createSLA(slaConfig) {
  const response = await fetch('/api/settings/sla', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(slaConfig),
  });
  return response.json();
}

// Atualizar SLA
async function updateSLA(slaId, updates) {
  const response = await fetch(`/api/settings/sla/${slaId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  return response.json();
}

// Deletar SLA
async function deleteSLA(slaId) {
  await fetch(`/api/settings/sla/${slaId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

// Uso
const slas = await listSLAs();
console.log('SLAs configurados:', slas.length);

await createSLA({
  name: 'SLA Urgente',
  firstResponseTime: 5,
  resolutionTime: 30,
  isDefault: false,
});
```

---

## Erros Comuns

### 400 Bad Request

```json
{
  "error": "Validation error: maxTicketsPerAgent must be between 1 and 100",
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

---

## Notas Importantes

1. **Chaves de API**: Chaves de API sao armazenadas de forma segura e nunca sao retornadas em texto puro.

2. **Validacao de IA**: Antes de habilitar a IA, certifique-se de que a chave de API e valida.

3. **SLA Padrao**: Sempre mantenha ao menos um SLA padrao configurado.

4. **Horario Comercial**: Tempos de SLA sao calculados apenas dentro do horario comercial configurado.

5. **Multiplos SLAs**: Voce pode ter SLAs diferentes por departamento.

## Endpoints Relacionados

- [Detalhes da Empresa](/docs/api/empresas/detalhes) - Ver dados da empresa
- [Atualizar Empresa](/docs/api/empresas/atualizar) - Atualizar dados basicos
