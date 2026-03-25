---
sidebar_position: 5
title: Metas de Metricas
description: Endpoints para gerenciar metas de metricas de atendimento no ChatBlue
---

# Metas de Metricas

Endpoints para criar, listar, atualizar e remover metas de desempenho vinculadas a metricas de atendimento.

## Listar Metas

```
GET /api/metrics/goals
```

Retorna todas as metas da empresa com o progresso atual calculado em tempo real.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Response - Sucesso (200 OK)

```json
[
  {
    "id": "clgoal001",
    "name": "SLA acima de 95%",
    "metric": "slaCompliance",
    "target": 95,
    "period": "monthly",
    "isActive": true,
    "departmentId": null,
    "userId": null,
    "department": null,
    "user": null,
    "companyId": "clcompany001",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T10:00:00.000Z",
    "currentValue": 97.2,
    "progress": 100,
    "isAchieved": true
  },
  {
    "id": "clgoal002",
    "name": "Nota media 4.5",
    "metric": "avgRating",
    "target": 4.5,
    "period": "monthly",
    "isActive": true,
    "departmentId": "cldept001",
    "userId": null,
    "department": {
      "name": "Suporte",
      "color": "#3B82F6"
    },
    "user": null,
    "companyId": "clcompany001",
    "createdAt": "2024-01-12T14:30:00.000Z",
    "updatedAt": "2024-01-12T14:30:00.000Z",
    "currentValue": 4.1,
    "progress": 91.1,
    "isAchieved": false
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da meta |
| `name` | string | Nome descritivo da meta |
| `metric` | string | Metrica alvo (ver tabela abaixo) |
| `target` | number | Valor alvo da meta |
| `period` | string | Periodo de avaliacao: `daily`, `weekly`, `monthly`, `quarterly` |
| `isActive` | boolean | Se a meta esta ativa |
| `departmentId` | string/null | Departamento especifico (null = toda a empresa) |
| `userId` | string/null | Usuario especifico (null = todos) |
| `currentValue` | number | Valor atual calculado em tempo real |
| `progress` | number | Progresso em percentual (0-100) |
| `isAchieved` | boolean | Se a meta foi atingida |

### Metricas Disponiveis

| Metrica | Descricao | Unidade |
|---------|-----------|---------|
| `totalTickets` | Total de tickets | quantidade |
| `slaCompliance` | Conformidade SLA | percentual |
| `avgResponseTime` | Tempo medio de resposta | segundos |
| `avgRating` | Nota media de avaliacao | 1-5 |
| `nps` | Net Promoter Score | -100 a 100 |
| `fcrRate` | Taxa de resolucao no primeiro contato | percentual |

---

## Criar Meta

```
POST /api/metrics/goals
```

Cria uma nova meta de metrica.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

Requer role `SUPERVISOR` ou superior.

### Request Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome descritivo da meta |
| `metric` | string | Sim | Metrica alvo (ver tabela acima) |
| `target` | number | Sim | Valor alvo |
| `period` | string | Nao | Periodo: `daily`, `weekly`, `monthly` (padrao), `quarterly` |
| `departmentId` | string | Nao | ID do departamento (null = toda empresa) |
| `userId` | string | Nao | ID do usuario (null = todos) |

```json
{
  "name": "SLA acima de 95%",
  "metric": "slaCompliance",
  "target": 95,
  "period": "monthly",
  "departmentId": "cldept001"
}
```

### Response - Sucesso (201 Created)

```json
{
  "id": "clgoal003",
  "name": "SLA acima de 95%",
  "metric": "slaCompliance",
  "target": 95,
  "period": "monthly",
  "isActive": true,
  "departmentId": "cldept001",
  "userId": null,
  "companyId": "clcompany001",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

---

## Atualizar Meta

```
PUT /api/metrics/goals/:id
```

Atualiza uma meta existente.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

Requer role `SUPERVISOR` ou superior.

### Parametros de Rota

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da meta |

### Request Body

Todos os campos sao opcionais. Envie apenas os campos que deseja alterar.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `name` | string | Nome descritivo |
| `metric` | string | Metrica alvo |
| `target` | number | Valor alvo |
| `period` | string | Periodo de avaliacao |
| `isActive` | boolean | Ativar/desativar meta |
| `departmentId` | string | ID do departamento |
| `userId` | string | ID do usuario |

```json
{
  "target": 97,
  "isActive": true
}
```

### Response - Sucesso (200 OK)

```json
{
  "id": "clgoal003",
  "name": "SLA acima de 95%",
  "metric": "slaCompliance",
  "target": 97,
  "period": "monthly",
  "isActive": true,
  "departmentId": "cldept001",
  "userId": null,
  "companyId": "clcompany001",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

---

## Deletar Meta

```
DELETE /api/metrics/goals/:id
```

Remove permanentemente uma meta.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

Requer role `SUPERVISOR` ou superior.

### Parametros de Rota

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da meta |

### Response - Sucesso (204 No Content)

Sem corpo na resposta.

### Erros

| Status | Descricao |
|--------|-----------|
| 404 | Meta nao encontrada ou nao pertence a empresa |

---

## Exemplos de Codigo

### cURL

```bash
# Listar metas
curl -X GET "https://api.chatblue.io/api/metrics/goals" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Criar meta
curl -X POST "https://api.chatblue.io/api/metrics/goals" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NPS acima de 50",
    "metric": "nps",
    "target": 50,
    "period": "monthly"
  }'

# Atualizar meta
curl -X PUT "https://api.chatblue.io/api/metrics/goals/clgoal003" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"target": 60}'

# Deletar meta
curl -X DELETE "https://api.chatblue.io/api/metrics/goals/clgoal003" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### JavaScript (Fetch)

```javascript
const API_BASE = 'https://api.chatblue.io/api/metrics';

async function listGoals(accessToken) {
  const response = await fetch(`${API_BASE}/goals`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  return response.json();
}

async function createGoal(accessToken, goal) {
  const response = await fetch(`${API_BASE}/goals`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goal),
  });
  return response.json();
}

// Uso
const goals = await listGoals(token);
const achieved = goals.filter(g => g.isAchieved);
console.log(`${achieved.length}/${goals.length} metas atingidas`);
```

## Notas Importantes

1. **Calculo em tempo real**: O `currentValue` e `progress` sao calculados a cada requisicao com base nos dados do periodo vigente.

2. **Periodos**: O periodo define a janela de tempo para calculo: `daily` (hoje), `weekly` (ultimos 7 dias), `monthly` (mes atual), `quarterly` (ultimos 3 meses).

3. **Escopo**: Metas podem ser globais (empresa), por departamento ou por usuario.

## Endpoints Relacionados

- [Alertas de Metricas](/docs/api/metricas/alertas) - Alertas automaticos baseados em metricas
- [Metricas do Dashboard](/docs/api/metricas/dashboard) - Visao geral das metricas
- [Metricas SLA](/docs/api/metricas/sla) - Metricas de SLA
