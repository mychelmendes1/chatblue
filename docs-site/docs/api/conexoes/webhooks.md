---
sidebar_position: 6
title: Webhooks WhatsApp
description: Configuracao e referencia de webhooks para conexoes WhatsApp no ChatBlue
---

# Webhooks WhatsApp

Configuracao e referencia de webhooks para receber eventos do WhatsApp em tempo real.

## Visao Geral

Webhooks permitem que sua aplicacao receba notificacoes HTTP em tempo real sobre eventos do WhatsApp, sem necessidade de polling ou conexao WebSocket persistente.

## Configurar Webhook

### Endpoint

```
PUT /api/connections/:id/webhook
```

### Request

```json
{
  "webhookUrl": "https://meusite.com/webhook/whatsapp",
  "webhookEvents": [
    "message.received",
    "message.sent",
    "message.delivered",
    "message.read",
    "connection.status",
    "ticket.created",
    "ticket.updated"
  ],
  "webhookSecret": "meu-secret-seguro-123",
  "webhookRetries": 3
}
```

### Parametros

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `webhookUrl` | string | Sim | URL HTTPS que recebera os eventos |
| `webhookEvents` | array | Sim | Lista de eventos a serem notificados |
| `webhookSecret` | string | Nao | Secret para validar assinatura (recomendado) |
| `webhookRetries` | number | Nao | Tentativas em caso de falha (1-5, padrao: 3) |

### Response (200 OK)

```json
{
  "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "name": "WhatsApp Principal",
  "webhookUrl": "https://meusite.com/webhook/whatsapp",
  "webhookEvents": ["message.received", "message.sent", "connection.status"],
  "webhookSecret": "***hidden***",
  "webhookRetries": 3,
  "webhookLastSuccess": null,
  "webhookLastError": null
}
```

---

## Eventos Disponiveis

### message.received

Disparado quando uma nova mensagem e recebida.

```json
{
  "event": "message.received",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "connectionName": "WhatsApp Principal",
  "data": {
    "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
    "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
    "from": "+5511999999999",
    "fromName": "Joao Silva",
    "type": "text",
    "content": "Ola, preciso de ajuda",
    "timestamp": "2024-01-15T14:30:00.000Z",
    "contact": {
      "id": "clcontactxxxxxxxxxxxxxxxxxx",
      "name": "Joao Silva",
      "phone": "+5511999999999",
      "profilePicUrl": "https://exemplo.com/pic.jpg"
    }
  }
}
```

### message.sent

Disparado quando uma mensagem e enviada com sucesso.

```json
{
  "event": "message.sent",
  "timestamp": "2024-01-15T14:31:00.000Z",
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "data": {
    "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
    "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
    "to": "+5511999999999",
    "type": "text",
    "content": "Ola! Como posso ajudar?",
    "whatsappMessageId": "ABCD1234567890",
    "sentBy": {
      "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Maria Atendente",
      "isAI": false
    }
  }
}
```

### message.delivered

Disparado quando a mensagem e entregue ao destinatario.

```json
{
  "event": "message.delivered",
  "timestamp": "2024-01-15T14:31:05.000Z",
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "data": {
    "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
    "whatsappMessageId": "ABCD1234567890",
    "deliveredAt": "2024-01-15T14:31:05.000Z"
  }
}
```

### message.read

Disparado quando a mensagem e lida pelo destinatario.

```json
{
  "event": "message.read",
  "timestamp": "2024-01-15T14:32:00.000Z",
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "data": {
    "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
    "whatsappMessageId": "ABCD1234567890",
    "readAt": "2024-01-15T14:32:00.000Z"
  }
}
```

### connection.status

Disparado quando o status da conexao muda.

```json
{
  "event": "connection.status",
  "timestamp": "2024-01-15T14:00:00.000Z",
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "data": {
    "status": "CONNECTED",
    "previousStatus": "CONNECTING",
    "phone": "+5511999999999",
    "pushName": "Empresa ABC",
    "batteryLevel": 85,
    "isPlugged": true
  }
}
```

### ticket.created

Disparado quando um novo ticket e criado.

```json
{
  "event": "ticket.created",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "data": {
    "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
    "ticketNumber": 1234,
    "status": "PENDING",
    "contact": {
      "id": "clcontactxxxxxxxxxxxxxxxxxx",
      "name": "Joao Silva",
      "phone": "+5511999999999"
    },
    "department": {
      "id": "cldeptxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Atendimento"
    },
    "firstMessage": "Ola, preciso de ajuda"
  }
}
```

### ticket.updated

Disparado quando um ticket e atualizado.

```json
{
  "event": "ticket.updated",
  "timestamp": "2024-01-15T14:35:00.000Z",
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "data": {
    "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
    "ticketNumber": 1234,
    "changes": {
      "status": {
        "from": "PENDING",
        "to": "IN_PROGRESS"
      },
      "assignedTo": {
        "from": null,
        "to": {
          "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
          "name": "Maria Atendente"
        }
      }
    },
    "updatedBy": {
      "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Maria Atendente"
    }
  }
}
```

---

## Validacao de Assinatura

Quando configurado um `webhookSecret`, cada requisicao inclui um header de assinatura para verificar autenticidade.

### Headers Enviados

```http
POST /webhook/whatsapp HTTP/1.1
Host: meusite.com
Content-Type: application/json
X-ChatBlue-Signature: sha256=abc123...
X-ChatBlue-Timestamp: 1705329000
X-ChatBlue-Event: message.received
X-ChatBlue-Connection-Id: clconnxxxxxxxxxxxxxxxxxxxxxx
```

### Validacao em Node.js

```javascript
const crypto = require('crypto');

function validateWebhook(req, secret) {
  const signature = req.headers['x-chatblue-signature'];
  const timestamp = req.headers['x-chatblue-timestamp'];
  const body = JSON.stringify(req.body);

  // Verificar se timestamp nao e muito antigo (5 minutos)
  const now = Math.floor(Date.now() / 1000);
  if (now - parseInt(timestamp) > 300) {
    return false;
  }

  // Calcular assinatura esperada
  const payload = `${timestamp}.${body}`;
  const expectedSignature = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

  // Comparar assinaturas
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Uso no Express
app.post('/webhook/whatsapp', (req, res) => {
  if (!validateWebhook(req, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-chatblue-event'];
  const data = req.body;

  console.log(`Evento recebido: ${event}`);

  // Processar evento
  switch (event) {
    case 'message.received':
      handleNewMessage(data);
      break;
    case 'ticket.created':
      handleNewTicket(data);
      break;
    // ...
  }

  res.status(200).json({ received: true });
});
```

### Validacao em Python

```python
import hmac
import hashlib
import time
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = 'meu-secret'

def validate_webhook(request):
    signature = request.headers.get('X-ChatBlue-Signature', '')
    timestamp = request.headers.get('X-ChatBlue-Timestamp', '')
    body = request.get_data(as_text=True)

    # Verificar timestamp
    now = int(time.time())
    if now - int(timestamp) > 300:
        return False

    # Calcular assinatura
    payload = f"{timestamp}.{body}"
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

@app.route('/webhook/whatsapp', methods=['POST'])
def webhook():
    if not validate_webhook(request):
        return jsonify({'error': 'Invalid signature'}), 401

    event = request.headers.get('X-ChatBlue-Event')
    data = request.json

    print(f"Evento: {event}")

    if event == 'message.received':
        handle_new_message(data)
    elif event == 'ticket.created':
        handle_new_ticket(data)

    return jsonify({'received': True})
```

### Validacao em PHP

```php
<?php

function validateWebhook($secret) {
    $signature = $_SERVER['HTTP_X_CHATBLUE_SIGNATURE'] ?? '';
    $timestamp = $_SERVER['HTTP_X_CHATBLUE_TIMESTAMP'] ?? '';
    $body = file_get_contents('php://input');

    // Verificar timestamp
    $now = time();
    if ($now - intval($timestamp) > 300) {
        return false;
    }

    // Calcular assinatura
    $payload = "{$timestamp}.{$body}";
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

    return hash_equals($expected, $signature);
}

// Uso
$secret = getenv('WEBHOOK_SECRET');

if (!validateWebhook($secret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

$event = $_SERVER['HTTP_X_CHATBLUE_EVENT'];
$data = json_decode(file_get_contents('php://input'), true);

switch ($event) {
    case 'message.received':
        handleNewMessage($data);
        break;
    case 'ticket.created':
        handleNewTicket($data);
        break;
}

echo json_encode(['received' => true]);
```

---

## Testar Webhook

### Endpoint de Teste

```
POST /api/connections/:id/webhook/test
```

Envia um evento de teste para verificar se o webhook esta funcionando.

### Request

```json
{
  "event": "message.received"
}
```

### Response

```json
{
  "success": true,
  "responseTime": 234,
  "statusCode": 200,
  "response": "{\"received\":true}"
}
```

### Exemplo cURL

```bash
curl -X POST https://api.chatblue.io/api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/webhook/test \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"event": "message.received"}'
```

---

## Remover Webhook

### Endpoint

```
DELETE /api/connections/:id/webhook
```

### Response (200 OK)

```json
{
  "message": "Webhook removed successfully",
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

## Logs de Webhook

### Listar Logs

```
GET /api/connections/:id/webhook/logs
```

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `status` | string | - | Filtrar por status (success, failed) |
| `event` | string | - | Filtrar por tipo de evento |
| `limit` | number | 50 | Limite de resultados |
| `offset` | number | 0 | Offset para paginacao |

### Response

```json
{
  "logs": [
    {
      "id": "cllogxxxxxxxxxxxxxxxxxxxxxx",
      "event": "message.received",
      "status": "success",
      "statusCode": 200,
      "responseTime": 156,
      "attempt": 1,
      "createdAt": "2024-01-15T14:30:00.000Z"
    },
    {
      "id": "cllogyyyyyyyyyyyyyyyyyyyyyy",
      "event": "message.sent",
      "status": "failed",
      "statusCode": 500,
      "responseTime": 5000,
      "attempt": 3,
      "error": "Connection timeout",
      "createdAt": "2024-01-15T14:31:00.000Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

---

## Boas Praticas

1. **HTTPS Obrigatorio**: Webhooks so sao enviados para URLs HTTPS.

2. **Responda Rapido**: Retorne 200 em ate 5 segundos. Processe assincronamente se necessario.

3. **Idempotencia**: Eventos podem ser enviados mais de uma vez. Implemente tratamento idempotente.

4. **Valide Assinaturas**: Sempre valide a assinatura para garantir autenticidade.

5. **Logs**: Mantenha logs dos webhooks recebidos para debugging.

6. **Retry Logic**: O sistema faz ate 3 tentativas com backoff exponencial (1s, 5s, 30s).

## Endpoints Relacionados

- [Criar Conexao](/docs/api/conexoes/criar) - Configurar webhook na criacao
- [WebSocket Eventos](/docs/api/websocket/eventos) - Alternativa em tempo real
