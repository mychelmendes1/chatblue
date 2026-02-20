# Integração externa (webhook de saída + API de métricas)

Este documento descreve como integrar um sistema externo (ex.: Supabase, cronjobs) com o ChatBlue: receber eventos em tempo real via **webhook de saída** e consultar **métricas** via API com autenticação por API Key.

---

## 1. Dados para configurar no sistema externo

| Parâmetro        | Descrição |
|------------------|-----------|
| **api_url**      | URL base da API do ChatBlue (ex.: `https://api.chatblue.com.br`). |
| **api_token**    | Chave de API da empresa, gerada em **Configurações → Integração externa** (botão "Gerar chave"). Usada no header `X-API-Key` nas chamadas a `/api/external/*`. |
| **webhook_secret** | Mesmo valor configurado no campo "Secret (X-Webhook-Secret)" no ChatBlue. O sistema externo usa para validar o header `X-Webhook-Secret` nas requisições POST que o ChatBlue envia. |
| **company_id**   | CUID da empresa no ChatBlue. Uma chave de API está vinculada a uma empresa; o mapeamento `id_empresa (sistema externo) → company_id (ChatBlue)` fica no sistema externo. O ID da empresa pode ser copiado em Configurações → Integração externa. |

---

## 2. Webhook de saída (eventos enviados pelo ChatBlue)

Quando a **URL do webhook de saída** e, opcionalmente, o **Secret** estão configurados em Configurações → Integração externa, o ChatBlue envia um `POST` para essa URL a cada evento relevante.

- **URL**: a configurada em *URL do webhook de saída*.
- **Header**: `X-Webhook-Secret: <outboundWebhookSecret>` (se configurado).
- **Body** (JSON):

```json
{
  "event": "<nome_do_evento>",
  "payload": { ... },
  "timestamp": "2025-02-12T12:00:00.000Z"
}
```

### 2.1. Eventos e payloads

#### `conversation_created`

Disparado quando um ticket é criado.

| Campo          | Tipo   | Descrição |
|----------------|--------|-----------|
| ticketId       | string | ID do ticket (CUID). |
| companyId      | string | ID da empresa. |
| contactId      | string | ID do contato. |
| protocol       | string | Protocolo do ticket. |
| status         | string | Ex.: `PENDING`, `IN_PROGRESS`. |
| departmentId   | string | (opcional) ID do departamento. |
| createdAt      | string | ISO 8601. |

---

#### `conversation_updated`

Disparado quando status, departamento ou atribuição do ticket é alterado.

| Campo        | Tipo   | Descrição |
|--------------|--------|-----------|
| ticketId     | string | ID do ticket. |
| companyId    | string | ID da empresa. |
| status       | string | Status atual. |
| departmentId | string | (opcional) ID do departamento. |
| assignedToId | string | (opcional) ID do usuário atribuído. |
| updatedAt    | string | ISO 8601. |

---

#### `conversation_resolved`

Disparado quando o ticket é resolvido ou fechado (status `RESOLVED` ou `CLOSED`).

| Campo         | Tipo   | Descrição |
|---------------|--------|-----------|
| ticketId      | string | ID do ticket. |
| companyId     | string | ID da empresa. |
| status        | string | `RESOLVED` ou `CLOSED`. |
| resolvedAt    | string | (opcional) ISO 8601. |
| closedAt      | string | (opcional) ISO 8601. |
| resolutionTime | number | (opcional) Tempo até resolução em segundos. |

---

#### `message_created`

Disparado quando uma nova mensagem é criada (qualquer origem: usuário, IA, sistema).

| Campo     | Tipo   | Descrição |
|-----------|--------|-----------|
| ticketId  | string | ID do ticket. |
| companyId | string | ID da empresa. |
| messageId | string | ID da mensagem. |
| type      | string | Ex.: `TEXT`, `IMAGE`, `AUDIO`, `SYSTEM`. |
| content   | string | (opcional) Texto ou legenda. |
| mediaUrl  | string | (opcional) URL da mídia. |
| isFromMe  | boolean| `true` se enviada pelo atendente/IA/sistema. |
| createdAt | string | ISO 8601. |

---

## 3. API externa (health e métricas)

Todas as rotas abaixo exigem o header **`X-API-Key`** com o valor de **api_token** (chave gerada por empresa).

### 3.1. GET /api/external/health

Valida conexão e API Key.

**Headers**

- `X-API-Key`: api_token da empresa.

**Resposta (200)**

```json
{
  "status": "ok",
  "timestamp": "2025-02-12T12:00:00.000Z"
}
```

**Erros**

- `401`: header ausente ou API Key inválida.

---

### 3.2. GET /api/external/metrics

Retorna métricas do dia (hoje 00:00 até o momento da requisição) para a empresa cuja chave foi usada.

**Query**

- **companyId** (obrigatório): deve ser igual ao `company_id` da empresa dona da API Key (uma chave por empresa).

**Headers**

- `X-API-Key`: api_token da empresa.

**Resposta (200)**

```json
{
  "ticketsTotal": 42,
  "ticketsPending": 5,
  "ticketsResolved": 35,
  "ticketsSlaBreached": 2,
  "ticketsAI": 10,
  "avgResponseTime": 120,
  "avgResolutionTime": 600,
  "slaCompliance": 95.24,
  "npsScore": 72,
  "departments": [
    {
      "id": "clx...",
      "name": "Suporte",
      "color": "#6366f1",
      "totalTickets": 20,
      "ticketsResolved": 18,
      "ticketsSlaBreached": 1,
      "avgResponseTime": 90,
      "avgResolutionTime": 480
    }
  ]
}
```

| Campo              | Tipo    | Descrição |
|--------------------|---------|-----------|
| ticketsTotal       | number  | Total de tickets criados no período. |
| ticketsPending     | number  | Tickets com status PENDING. |
| ticketsResolved    | number  | Tickets RESOLVED ou CLOSED no período. |
| ticketsSlaBreached | number  | Tickets com SLA violado. |
| ticketsAI          | number  | Tickets atendidos por IA no período. |
| avgResponseTime    | number  | Tempo médio de primeira resposta (segundos). |
| avgResolutionTime   | number  | Tempo médio de resolução (segundos). |
| slaCompliance      | number  | Percentual de conformidade de SLA (0–100). |
| npsScore           | number  | NPS (escore -100 a 100). |
| departments        | array   | Breakdown por departamento (id, name, color, totais, resolvidos, slaBreached, avgResponseTime, avgResolutionTime). |

**Erros**

- `401`: API Key ausente ou inválida.
- `403`: `companyId` da query diferente da empresa da API Key.

---

## 4. Fluxo resumido

1. **ChatBlue** dispara eventos (ticket/mensagem) → serviço de webhook de saída envia **POST** para a URL configurada, com `X-Webhook-Secret` e body `{ event, payload, timestamp }`.
2. **Cron/sistema externo** chama **GET /api/external/metrics?companyId=...** com **X-API-Key** para obter métricas do dia.
3. **Validação de integração** no sistema externo chama **GET /api/external/health** com **X-API-Key** para checar conectividade e chave.

---

## 5. Observações

- **Segurança**: não logar nem expor em respostas o secret nem a API key em texto claro.
- **Idempotência**: o webhook de saída é fire-and-forget; em caso de falha não há retry automático (pode ser estendido com fila no futuro).
- **Multi-empresa**: cada empresa possui uma chave de API; o parâmetro `companyId` em `/api/external/metrics` deve ser o da empresa dona da chave.
