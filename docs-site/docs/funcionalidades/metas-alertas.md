---
sidebar_position: 18
title: Metas e Alertas
description: Metas de metricas e alertas automaticos no ChatBlue
---

# Metas e Alertas

O ChatBlue permite definir **metas** (MetricGoal) para acompanhar o progresso de indicadores-chave e configurar **alertas** (MetricAlert) que disparam notificacoes quando thresholds sao atingidos. Ambos os recursos estao integrados ao modulo de metricas.

## Visao Geral

```
+------------------+                    +------------------+
|   MetricGoal     |                    |   MetricAlert    |
|                  |                    |                  |
| "NPS acima de 50 |                    | "SLA abaixo de   |
|  neste mes"      |                    |  90% - notificar"|
|                  |                    |                  |
| target: 50       |                    | threshold: 90    |
| metric: nps      |                    | condition: below |
| period: monthly  |                    | metric: slaCom.. |
+------------------+                    +------------------+
        |                                       |
        v                                       v
  Progresso calculado                  Verificacao periodica
  automaticamente                      ou manual via endpoint
        |                                       |
        v                                       v
  "Atual: 45 (90%)"                   "Disparado! SLA em 87%"
```

### Diferencas entre Metas e Alertas

| Aspecto | MetricGoal (Meta) | MetricAlert (Alerta) |
|---------|-------------------|----------------------|
| Proposito | Acompanhar progresso rumo a um alvo | Reagir quando uma metrica cruza um limite |
| Acao | Visualizacao do progresso | Notificacao (email, in-app, webhook) |
| Escopo | Pode ser por departamento ou usuario | Global da empresa |
| Periodo | Diario, semanal, mensal ou trimestral | Verificacao do mes corrente |
| Tracking | Progresso percentual e status de atingimento | Contagem de disparos e ultimo disparo |

## Metas (MetricGoal)

### Campos

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | String (CUID) | Auto | Identificador unico |
| `companyId` | String | Auto | Empresa (via auth) |
| `name` | String | Sim | Nome descritivo da meta |
| `metric` | String | Sim | Metrica alvo (ver tabela abaixo) |
| `target` | Float | Sim | Valor alvo a ser atingido |
| `period` | String | Nao | Periodo de avaliacao (padrao: `monthly`) |
| `departmentId` | String | Nao | Filtrar por departamento especifico |
| `userId` | String | Nao | Filtrar por atendente especifico |
| `isActive` | Boolean | Nao | Se a meta esta ativa (padrao: true) |
| `createdAt` | DateTime | Auto | Data de criacao |

### Metricas Disponiveis

| Valor da metric | Descricao | Unidade |
|-----------------|-----------|---------|
| `totalTickets` | Total de tickets no periodo | Quantidade |
| `slaCompliance` | Taxa de conformidade SLA | Percentual (0-100) |
| `avgResponseTime` | Tempo medio de primeira resposta | Segundos |
| `avgRating` | Media de avaliacao por estrelas | Nota (1-5) |
| `nps` | Net Promoter Score | Pontos (-100 a 100) |
| `fcrRate` | Taxa de resolucao no primeiro contato | Percentual (0-100) |

### Periodos de Avaliacao

| Periodo | Janela de Calculo |
|---------|-------------------|
| `daily` | Inicio do dia atual |
| `weekly` | Ultimos 7 dias |
| `monthly` | Inicio do mes atual |
| `quarterly` | Ultimos 3 meses |

### Progresso Calculado

Ao listar metas, o sistema calcula automaticamente o valor atual de cada metrica e retorna campos adicionais:

| Campo Calculado | Tipo | Descricao |
|-----------------|------|-----------|
| `currentValue` | Float | Valor atual da metrica no periodo |
| `progress` | Float (0-100) | Percentual de progresso rumo ao target |
| `isAchieved` | Boolean | Se o valor atual atingiu ou superou o target |

O progresso e limitado a 100% (`Math.min(progress, 100)`).

### API de Metas

#### `GET /api/metrics/goals`

Lista todas as metas da empresa com progresso calculado em tempo real.

**Autenticacao**: qualquer usuario autenticado.

**Resposta (200):**

```json
[
  {
    "id": "clx...",
    "name": "NPS acima de 50",
    "metric": "nps",
    "target": 50,
    "period": "monthly",
    "departmentId": null,
    "userId": null,
    "isActive": true,
    "department": null,
    "user": null,
    "currentValue": 45,
    "progress": 90,
    "isAchieved": false
  },
  {
    "id": "clx...",
    "name": "SLA 95% no Comercial",
    "metric": "slaCompliance",
    "target": 95,
    "period": "monthly",
    "departmentId": "dept1",
    "userId": null,
    "isActive": true,
    "department": { "name": "Comercial", "color": "#3B82F6" },
    "user": null,
    "currentValue": 97.2,
    "progress": 100,
    "isAchieved": true
  }
]
```

Quando a meta possui `departmentId` ou `userId`, o calculo da metrica e filtrado para esse escopo. Inclui dados do departamento e usuario relacionados.

#### `POST /api/metrics/goals`

Cria uma nova meta.

**Autenticacao**: supervisor ou superior (`requireSupervisor`).

**Body:**

```json
{
  "name": "NPS acima de 50",
  "metric": "nps",
  "target": 50,
  "period": "monthly",
  "departmentId": null,
  "userId": null
}
```

**Resposta (201):** objeto criado.

#### `PUT /api/metrics/goals/:id`

Atualiza uma meta existente.

**Autenticacao**: supervisor ou superior.

**Body (parcial):**

```json
{
  "target": 60,
  "isActive": false
}
```

Campos atualizaveis: `name`, `metric`, `target`, `period`, `isActive`, `departmentId`, `userId`.

**Resposta (200):** objeto atualizado.

#### `DELETE /api/metrics/goals/:id`

Remove uma meta.

**Autenticacao**: supervisor ou superior.

**Resposta (204):** sem conteudo.

## Alertas (MetricAlert)

### Campos

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | String (CUID) | Auto | Identificador unico |
| `companyId` | String | Auto | Empresa (via auth) |
| `name` | String | Sim | Nome descritivo do alerta |
| `metric` | String | Sim | Metrica monitorada (mesmas opcoes das metas + extras) |
| `condition` | String | Sim | Condicao de disparo: `below`, `above` ou `equals` |
| `threshold` | Float | Sim | Valor limite para disparo |
| `notifyEmail` | Boolean | Nao | Notificar por email (padrao: true) |
| `notifyInApp` | Boolean | Nao | Notificar no app (padrao: true) |
| `notifyWebhook` | String | Nao | URL de webhook para notificacao externa |
| `isActive` | Boolean | Nao | Se o alerta esta ativo (padrao: true) |
| `lastTriggeredAt` | DateTime | Auto | Ultima vez que o alerta foi disparado |
| `triggerCount` | Int | Auto | Quantidade total de vezes que o alerta foi disparado |
| `createdAt` | DateTime | Auto | Data de criacao |

### Metricas Disponiveis para Alertas

Alem das metricas das metas, alertas suportam:

| Valor da metric | Descricao | Unidade |
|-----------------|-----------|---------|
| `totalTickets` | Total de tickets | Quantidade |
| `slaCompliance` | Taxa de conformidade SLA | Percentual |
| `avgResponseTime` | Tempo medio de resposta | Segundos |
| `avgRating` | Media de avaliacao | Nota (1-5) |
| `nps` | Net Promoter Score | Pontos |
| `fcrRate` | Taxa de FCR | Percentual |
| `abandonRate` | Taxa de abandono | Percentual |

### Condicoes de Disparo

| Condicao | Descricao | Exemplo |
|----------|-----------|---------|
| `below` | Valor atual esta **abaixo** do threshold | SLA < 90% |
| `above` | Valor atual esta **acima** do threshold | Tempo de resposta > 300s |
| `equals` | Valor atual e **igual** ao threshold (tolerancia de 0.01) | NPS = 0 |

### Canais de Notificacao

| Canal | Campo | Descricao |
|-------|-------|-----------|
| Email | `notifyEmail` | Envia email para supervisores (padrao: ativo) |
| In-App | `notifyInApp` | Notificacao dentro do ChatBlue (padrao: ativo) |
| Webhook | `notifyWebhook` | Envia POST para URL externa (ex: Slack, Teams) |

### API de Alertas

#### `GET /api/metrics/alerts`

Lista todos os alertas da empresa.

**Autenticacao**: qualquer usuario autenticado.

**Resposta (200):**

```json
[
  {
    "id": "clx...",
    "name": "SLA critico",
    "metric": "slaCompliance",
    "condition": "below",
    "threshold": 90,
    "notifyEmail": true,
    "notifyInApp": true,
    "notifyWebhook": "https://hooks.slack.com/...",
    "isActive": true,
    "lastTriggeredAt": "2024-01-20T14:30:00Z",
    "triggerCount": 3,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### `POST /api/metrics/alerts`

Cria um novo alerta.

**Autenticacao**: supervisor ou superior (`requireSupervisor`).

**Body:**

```json
{
  "name": "SLA critico",
  "metric": "slaCompliance",
  "condition": "below",
  "threshold": 90,
  "notifyEmail": true,
  "notifyInApp": true,
  "notifyWebhook": "https://hooks.slack.com/..."
}
```

**Resposta (201):** objeto criado.

#### `PUT /api/metrics/alerts/:id`

Atualiza um alerta existente.

**Autenticacao**: supervisor ou superior.

**Body (parcial):**

```json
{
  "threshold": 85,
  "isActive": false
}
```

Campos atualizaveis: `name`, `metric`, `condition`, `threshold`, `isActive`, `notifyEmail`, `notifyInApp`, `notifyWebhook`.

**Resposta (200):** objeto atualizado.

#### `DELETE /api/metrics/alerts/:id`

Remove um alerta.

**Autenticacao**: supervisor ou superior.

**Resposta (204):** sem conteudo.

### Verificacao de Alertas

#### `POST /api/metrics/alerts/check`

Verifica todos os alertas ativos da empresa e dispara os que atingiram o threshold. Pode ser chamado manualmente ou por um cron job.

**Autenticacao**: supervisor ou superior.

**Funcionamento:**

1. Busca todos os alertas ativos da empresa
2. Calcula o valor atual de cada metrica (usando tickets do mes corrente)
3. Compara com o threshold de cada alerta conforme a condicao
4. Para cada alerta disparado, atualiza `lastTriggeredAt` e incrementa `triggerCount`
5. Retorna lista de alertas disparados com mensagens descritivas

**Resposta (200):**

```json
{
  "checked": 5,
  "triggered": 2,
  "alerts": [
    {
      "alert": { "id": "clx...", "name": "SLA critico", "...": "..." },
      "currentValue": 87.5,
      "message": "Alerta \"SLA critico\": slaCompliance esta abaixo 90 (atual: 87.5)"
    },
    {
      "alert": { "id": "clx...", "name": "NPS em queda", "...": "..." },
      "currentValue": 15,
      "message": "Alerta \"NPS em queda\": nps esta abaixo 30 (atual: 15)"
    }
  ]
}
```

### Tracking de Alertas

Cada alerta mantem um historico basico de disparos:

| Campo | Descricao |
|-------|-----------|
| `lastTriggeredAt` | Data/hora do ultimo disparo — util para saber ha quanto tempo o alerta esta ativo |
| `triggerCount` | Contador total de disparos — indica recorrencia do problema |

Esses campos sao atualizados automaticamente a cada verificacao que resulta em disparo.

## Permissoes

| Acao | Agente | Supervisor | Admin |
|------|--------|------------|-------|
| Listar metas | Sim | Sim | Sim |
| Criar/editar/excluir metas | Nao | Sim | Sim |
| Listar alertas | Sim | Sim | Sim |
| Criar/editar/excluir alertas | Nao | Sim | Sim |
| Verificar alertas manualmente | Nao | Sim | Sim |

## Exemplos de Configuracao

### Metas Recomendadas

| Nome | Metrica | Target | Periodo | Escopo |
|------|---------|--------|---------|--------|
| NPS acima de 50 | `nps` | 50 | Mensal | Toda empresa |
| SLA 95% Comercial | `slaCompliance` | 95 | Mensal | Departamento Comercial |
| Resposta em 60s | `avgResponseTime` | 60 | Semanal | Toda empresa |
| Avaliacao 4.5 estrelas | `avgRating` | 4.5 | Mensal | Toda empresa |
| FCR acima de 80% | `fcrRate` | 80 | Mensal | Toda empresa |

### Alertas Recomendados

| Nome | Metrica | Condicao | Threshold | Notificacao |
|------|---------|----------|-----------|-------------|
| SLA critico | `slaCompliance` | below | 85 | Email + In-App |
| NPS negativo | `nps` | below | 0 | Email + Webhook |
| Tempo de resposta alto | `avgResponseTime` | above | 300 | In-App |
| Avaliacao baixa | `avgRating` | below | 3 | Email |
| Abandono elevado | `abandonRate` | above | 15 | Email + In-App + Webhook |

## Boas Praticas

1. **Comece com poucas metas** - Foque nos indicadores mais importantes antes de adicionar metas secundarias
2. **Defina targets realistas** - Baseie-se no historico recente antes de definir targets ambiciosos
3. **Use alertas para situacoes criticas** - Nao crie alertas para tudo; foque em thresholds que requerem acao imediata
4. **Segmente por departamento** - Departamentos diferentes podem ter targets diferentes
5. **Monitore o triggerCount** - Alertas disparados repetidamente indicam problemas cronicos que precisam de solucao estrutural
6. **Integre com ferramentas externas** - Use `notifyWebhook` para enviar alertas ao Slack, Teams ou sistemas internos
7. **Revise periodicamente** - Ajuste targets e thresholds conforme a operacao evolui

## Proximos Passos

- [NPS e Avaliacao](/funcionalidades/nps) - Detalhes sobre NPS e avaliacao de atendimento
- [SLA e Metricas](/funcionalidades/sla-metricas) - Metricas gerais e conformidade SLA
- [Tickets](/funcionalidades/tickets) - Ciclo de vida do ticket e campos de metricas
