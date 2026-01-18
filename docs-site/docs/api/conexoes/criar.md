---
sidebar_position: 2
title: Criar Conexao
description: Endpoint para criar uma nova conexao WhatsApp no ChatBlue
---

# Criar Conexao

Cria uma nova conexao WhatsApp na empresa.

## Endpoint

```
POST /api/connections
```

## Descricao

Este endpoint cria uma nova conexao WhatsApp na empresa. Apos a criacao, a conexao fica com status `PENDING` ate que o QR Code seja escaneado pelo dispositivo movel.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode criar conexoes
- **SUPER_ADMIN**: Pode criar conexoes

:::warning Acesso Restrito
Apenas usuarios com role `ADMIN` ou `SUPER_ADMIN` podem criar conexoes.
:::

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome identificador da conexao (max 100 caracteres) |
| `isDefault` | boolean | Nao | Definir como conexao padrao (padrao: false) |
| `webhookUrl` | string | Nao | URL para receber webhooks |
| `webhookEvents` | array | Nao | Eventos a notificar via webhook |

### Webhook Events Disponiveis

| Evento | Descricao |
|--------|-----------|
| `message.received` | Nova mensagem recebida |
| `message.sent` | Mensagem enviada com sucesso |
| `message.delivered` | Mensagem entregue |
| `message.read` | Mensagem lida |
| `connection.status` | Mudanca de status da conexao |
| `ticket.created` | Novo ticket criado |

### Exemplo de Request

```json
{
  "name": "WhatsApp Suporte",
  "isDefault": false,
  "webhookUrl": "https://meusite.com/webhook/whatsapp",
  "webhookEvents": ["message.received", "connection.status"]
}
```

Exemplo minimo:

```json
{
  "name": "WhatsApp Principal"
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "name": "WhatsApp Suporte",
  "phone": null,
  "status": "PENDING",
  "isDefault": false,
  "lastConnected": null,
  "batteryLevel": null,
  "isPlugged": null,
  "pushName": null,
  "profilePicUrl": null,
  "webhookUrl": "https://meusite.com/webhook/whatsapp",
  "webhookEvents": ["message.received", "connection.status"],
  "companyId": "clcompxxxxxxxxxxxxxxxxxxxxxx",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "qrCodeUrl": "/api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/qr"
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da conexao (CUID) |
| `name` | string | Nome da conexao |
| `phone` | null | Numero ainda nao configurado |
| `status` | string | Status inicial (PENDING) |
| `isDefault` | boolean | Se e conexao padrao |
| `webhookUrl` | string/null | URL do webhook |
| `webhookEvents` | array | Eventos configurados |
| `companyId` | string | ID da empresa |
| `createdAt` | string | Data de criacao |
| `qrCodeUrl` | string | URL para obter o QR Code |

## Erros

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: name: Nome e obrigatorio",
  "code": "VALIDATION_ERROR"
}
```

### 400 Bad Request - Nome Duplicado

```json
{
  "error": "Connection with this name already exists",
  "code": "DUPLICATE_NAME"
}
```

### 400 Bad Request - Limite do Plano

```json
{
  "error": "Connection limit reached for your plan. Current: 3, Limit: 3",
  "code": "PLAN_LIMIT_REACHED"
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

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/connections \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WhatsApp Suporte",
    "isDefault": false,
    "webhookUrl": "https://meusite.com/webhook",
    "webhookEvents": ["message.received"]
  }'
```

### JavaScript (Fetch)

```javascript
async function createConnection(connectionData) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('https://api.chatblue.io/api/connections', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(connectionData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
try {
  const connection = await createConnection({
    name: 'WhatsApp Suporte',
    webhookUrl: 'https://meusite.com/webhook',
    webhookEvents: ['message.received', 'connection.status'],
  });

  console.log('Conexao criada:', connection.id);
  console.log('Status:', connection.status);
  console.log('QR Code URL:', connection.qrCodeUrl);

  // Proximo passo: obter e exibir QR Code
  window.location.href = connection.qrCodeUrl;
} catch (error) {
  if (error.message.includes('limit reached')) {
    console.error('Limite de conexoes atingido. Faca upgrade do plano.');
  } else {
    console.error('Erro ao criar conexao:', error.message);
  }
}
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.chatblue.io/api',
});

async function createConnection(name, options = {}) {
  try {
    const { data } = await api.post('/connections', {
      name,
      isDefault: options.isDefault || false,
      webhookUrl: options.webhookUrl,
      webhookEvents: options.webhookEvents,
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

// Criar conexao simples
const conn = await createConnection('WhatsApp Principal');

// Criar conexao com webhook
const connWithWebhook = await createConnection('WhatsApp Notificacoes', {
  webhookUrl: 'https://meusite.com/webhook',
  webhookEvents: ['message.received', 'message.sent'],
});
```

### Python

```python
import requests

def create_connection(access_token, name, is_default=False, webhook_url=None, webhook_events=None):
    url = 'https://api.chatblue.io/api/connections'

    payload = {
        'name': name,
        'isDefault': is_default
    }

    if webhook_url:
        payload['webhookUrl'] = webhook_url
    if webhook_events:
        payload['webhookEvents'] = webhook_events

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
try:
    connection = create_connection(
        token,
        name='WhatsApp Suporte',
        webhook_url='https://meusite.com/webhook',
        webhook_events=['message.received']
    )
    print(f"Conexao criada: {connection['id']}")
    print(f"Status: {connection['status']}")
    print(f"QR Code: {connection['qrCodeUrl']}")
except Exception as e:
    print(f"Erro: {e}")
```

### PHP

```php
<?php

function createConnection($accessToken, $name, $isDefault = false, $webhookUrl = null, $webhookEvents = null) {
    $url = 'https://api.chatblue.io/api/connections';

    $payload = [
        'name' => $name,
        'isDefault' => $isDefault
    ];

    if ($webhookUrl) {
        $payload['webhookUrl'] = $webhookUrl;
    }
    if ($webhookEvents) {
        $payload['webhookEvents'] = $webhookEvents;
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $accessToken
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true);

    if ($httpCode === 201) {
        return $data;
    }

    throw new Exception($data['error'] ?? 'Erro desconhecido');
}

// Uso
try {
    $connection = createConnection($token, 'WhatsApp Vendas');
    echo "Conexao criada: " . $connection['id'] . "\n";
    echo "Escaneie o QR Code: " . $connection['qrCodeUrl'] . "\n";
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Fluxo de Conexao

Apos criar a conexao, siga estes passos:

```
1. Criar Conexao (POST /api/connections)
        ↓
2. Obter QR Code (GET /api/connections/:id/qr)
        ↓
3. Escanear QR Code com WhatsApp no celular
        ↓
4. Conexao estabelecida (status: CONNECTED)
```

### Exemplo de Fluxo Completo

```javascript
async function setupNewConnection(name) {
  // 1. Criar conexao
  const connection = await createConnection({ name });
  console.log('Conexao criada, obtendo QR Code...');

  // 2. Obter QR Code
  const qrResponse = await fetch(`/api/connections/${connection.id}/qr`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const { qrCode } = await qrResponse.json();

  // 3. Exibir QR Code (base64)
  document.getElementById('qr-image').src = qrCode;

  // 4. Monitorar status via WebSocket
  socket.on('connection:status', (data) => {
    if (data.connectionId === connection.id) {
      console.log('Novo status:', data.status);

      if (data.status === 'CONNECTED') {
        console.log('Conexao estabelecida!');
        console.log('Numero:', data.phone);
      }
    }
  });
}
```

## Notas Importantes

1. **Limite de Conexoes**: O numero de conexoes permitidas depende do plano:
   - BASIC: 1 conexao
   - PRO: 3 conexoes
   - ENTERPRISE: Ilimitado

2. **Nome Unico**: Cada conexao deve ter um nome unico dentro da empresa.

3. **Status Inicial**: Conexoes novas sempre comecam com status `PENDING`.

4. **Webhooks**: Configure webhooks para receber notificacoes em tempo real sem usar WebSockets.

5. **Conexao Padrao**: Se `isDefault: true` for passado, a conexao anterior sera desmarcada.

## Endpoints Relacionados

- [QR Code](/docs/api/conexoes/qr-code) - Obter QR Code
- [Conectar](/docs/api/conexoes/conectar) - Iniciar conexao
- [Webhooks](/docs/api/conexoes/webhooks) - Configurar webhooks
