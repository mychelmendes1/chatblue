---
sidebar_position: 1
title: External AI API
description: Endpoints da API para integracao de agentes de IA externos com o ChatBlue
---

# External AI API

API para integracao de agentes de IA externos que gerenciam tickets no ChatBlue. Permite que sistemas de IA de terceiros enviem mensagens, transfiram, resolvam e encerrem tickets.

## Autenticacao

Todos os endpoints utilizam autenticacao via header `X-API-Key`, diferente da autenticacao JWT padrao. A chave e associada a um usuario de IA externo configurado no sistema.

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `X-API-Key` | `{apiKey}` | Sim |

A API Key e obtida durante a configuracao do usuario de IA externo no painel administrativo.

---

## Mensagens

### Enviar mensagem

```
POST /api/external-ai/messages
```

Envia uma mensagem (texto ou midia) em nome do agente de IA externo via WhatsApp.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `ticketId` | string | Sim | ID do ticket |
| `content` | string | Condicional | Conteudo da mensagem (obrigatorio para tipo TEXT) |
| `type` | string | Nao | Tipo: `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `DOCUMENT` (padrao: TEXT) |
| `mediaUrl` | string | Condicional | URL da midia (obrigatorio para tipos de midia) |
| `caption` | string | Nao | Legenda para mensagens de midia |

**Response (200)**

```json
{
  "success": true,
  "message": {
    "id": "clmsg01xxxxxxxxxxxxx",
    "type": "TEXT",
    "content": "Ola! Como posso ajudar?",
    "status": "SENT",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos, content obrigatorio para TEXT, mediaUrl obrigatorio para midia |
| 404 | Ticket nao encontrado |

**Exemplo cURL**

```bash
# Enviar mensagem de texto
curl -X POST "https://api.chatblue.io/api/external-ai/messages" \
  -H "X-API-Key: sua-api-key-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "clticketxxxxxxxxxxxxx",
    "content": "Ola! Sou o assistente virtual. Como posso ajudar?",
    "type": "TEXT"
  }'

# Enviar imagem
curl -X POST "https://api.chatblue.io/api/external-ai/messages" \
  -H "X-API-Key: sua-api-key-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "clticketxxxxxxxxxxxxx",
    "type": "IMAGE",
    "mediaUrl": "https://exemplo.com/imagem.jpg",
    "caption": "Segue a imagem solicitada"
  }'
```

---

## Tickets

### Transferir ticket

```
POST /api/external-ai/tickets/:id/transfer
```

Transfere um ticket para outro departamento ou usuario. Cria registro de transferencia, mensagem de sistema e notifica via socket.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do ticket |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `toDepartmentId` | string | Condicional | ID do departamento destino (obrigatorio se toUserId nao fornecido) |
| `toUserId` | string | Condicional | ID do usuario destino (obrigatorio se toDepartmentId nao fornecido) |
| `reason` | string | Nao | Motivo da transferencia |

Pelo menos um entre `toDepartmentId` e `toUserId` deve ser fornecido.

**Response (200)**

```json
{
  "success": true,
  "ticket": {
    "id": "clticketxxxxxxxxxxxxx",
    "status": "PENDING",
    "departmentId": "cldeptxxxxxxxxxxxxx",
    "departmentName": "Suporte Tecnico",
    "assignedToId": "cluserxxxxxxxxxxxxx",
    "assignedToName": "Maria Atendente"
  }
}
```

**Comportamento especial**: Se o departamento destino possui outro agente de IA externo configurado, o ticket e automaticamente atribuido a esse agente e um webhook de atribuicao e disparado.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Deve especificar toDepartmentId ou toUserId |
| 404 | Ticket nao encontrado |

---

### Resolver ticket

```
POST /api/external-ai/tickets/:id/resolve
```

Marca um ticket como resolvido. Cria atividade, mensagem de sistema e notifica via socket.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do ticket |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `reason` | string | Nao | Motivo da resolucao |

**Response (200)**

```json
{
  "success": true,
  "ticket": {
    "id": "clticketxxxxxxxxxxxxx",
    "status": "RESOLVED"
  }
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Ticket nao encontrado |

---

### Encerrar ticket

```
POST /api/external-ai/tickets/:id/close
```

Encerra um ticket definitivamente. Cria atividade e notifica via socket.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do ticket |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `reason` | string | Nao | Motivo do encerramento |

**Response (200)**

```json
{
  "success": true,
  "ticket": {
    "id": "clticketxxxxxxxxxxxxx",
    "status": "CLOSED"
  }
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Ticket nao encontrado |

---

### Obter detalhes do ticket

```
GET /api/external-ai/tickets/:id
```

Retorna informacoes detalhadas de um ticket.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do ticket |

**Response (200)**

```json
{
  "ticket": {
    "id": "clticketxxxxxxxxxxxxx",
    "protocol": "2024011500001",
    "status": "IN_PROGRESS",
    "isAIHandled": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z",
    "contact": {
      "id": "clcontactxxxxxxxxxxxxx",
      "name": "Joao Silva",
      "phone": "+5511999999999",
      "email": "joao@email.com",
      "avatar": null,
      "isClient": true
    },
    "department": {
      "id": "cldeptxxxxxxxxxxxxx",
      "name": "Suporte",
      "color": "#3B82F6"
    },
    "assignedTo": {
      "id": "cluserxxxxxxxxxxxxx",
      "name": "Bot Suporte",
      "isAI": true
    },
    "connection": {
      "id": "clconnxxxxxxxxxxxxx",
      "name": "WhatsApp Principal",
      "type": "WHATSAPP"
    },
    "messageCount": 15
  }
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Ticket nao encontrado |

---

### Obter mensagens do ticket

```
GET /api/external-ai/tickets/:id/messages
```

Retorna o historico de mensagens de um ticket com paginacao.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do ticket |

**Query Parameters**

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `limit` | number | 100 | Quantidade de mensagens (max 500) |
| `offset` | number | 0 | Offset para paginacao |

**Response (200)**

```json
{
  "messages": [
    {
      "id": "clmsg01xxxxxxxxxxxxx",
      "type": "TEXT",
      "content": "Ola, preciso de ajuda com meu pedido",
      "mediaUrl": null,
      "isFromMe": false,
      "isAIGenerated": false,
      "status": "DELIVERED",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "sender": null,
      "role": "customer"
    },
    {
      "id": "clmsg02xxxxxxxxxxxxx",
      "type": "TEXT",
      "content": "Claro! Qual o numero do seu pedido?",
      "mediaUrl": null,
      "isFromMe": true,
      "isAIGenerated": true,
      "status": "DELIVERED",
      "createdAt": "2024-01-15T10:00:05.000Z",
      "sender": {
        "id": "cluserxxxxxxxxxxxxx",
        "name": "Bot Suporte",
        "isAI": true
      },
      "role": "assistant"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

O campo `role` e calculado automaticamente:
- `system` para mensagens do tipo SYSTEM
- `assistant` para mensagens enviadas (isFromMe = true)
- `customer` para mensagens recebidas (isFromMe = false)

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Ticket nao encontrado |

---

## Erros Comuns

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados de requisicao invalidos |
| 401 | API Key invalida ou nao fornecida |
| 404 | Ticket nao encontrado |
| 500 | Erro interno do servidor |

## Notas Importantes

1. **Autenticacao**: Esta API utiliza `X-API-Key` ao inves de JWT Bearer token. A chave e associada a um usuario marcado como IA no sistema.

2. **Escopo de acesso**: O agente externo so pode acessar tickets da empresa a qual esta vinculado.

3. **Formatacao de mensagens**: Mensagens de texto enviadas sao automaticamente formatadas com o nome do agente em negrito (`*NomeIA:*\nConteudo`).

4. **Conexao WhatsApp**: O sistema seleciona automaticamente uma conexao WhatsApp ativa. Se a conexao original do ticket estiver inativa, uma conexao ativa e utilizada como fallback.

5. **Eventos Socket**: Todas as acoes emitem eventos via WebSocket para atualizacao em tempo real na interface.

6. **Outbound Webhooks**: Mensagens criadas disparam eventos de outbound webhook para integracoes externas.

7. **Transferencia inteligente**: Ao transferir para um departamento que possui outro agente de IA externo, o ticket e automaticamente atribuido e o webhook de atribuicao e disparado.
