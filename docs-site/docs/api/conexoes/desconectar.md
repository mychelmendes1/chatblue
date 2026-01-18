---
sidebar_position: 5
title: Desconectar WhatsApp
description: Endpoint para desconectar um WhatsApp no ChatBlue
---

# Desconectar WhatsApp

Encerra a conexao de um dispositivo WhatsApp.

## Endpoint

```
POST /api/connections/:id/disconnect
```

## Descricao

Este endpoint encerra a conexao com um dispositivo WhatsApp. Apos desconectar, sera necessario escanear um novo QR Code para reconectar. Os tickets e mensagens existentes sao preservados.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode desconectar
- **SUPER_ADMIN**: Pode desconectar

:::warning Acesso Restrito
Apenas usuarios com role `ADMIN` ou `SUPER_ADMIN` podem desconectar dispositivos.
:::

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Nao |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da conexao (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `clearSession` | boolean | Nao | Limpar dados da sessao (padrao: false) |

### Exemplo de Request

```json
{
  "clearSession": false
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "name": "WhatsApp Principal",
  "status": "DISCONNECTED",
  "previousStatus": "CONNECTED",
  "disconnectedAt": "2024-01-15T16:30:00.000Z",
  "message": "Connection disconnected successfully"
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID da conexao |
| `name` | string | Nome da conexao |
| `status` | string | Novo status (DISCONNECTED) |
| `previousStatus` | string | Status anterior |
| `disconnectedAt` | string | Data/hora da desconexao |
| `message` | string | Mensagem de confirmacao |

## Erros

### 400 Bad Request - Ja Desconectado

```json
{
  "error": "Connection is already disconnected",
  "code": "ALREADY_DISCONNECTED"
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
  "error": "Connection not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
# Desconectar mantendo sessao
curl -X POST https://api.chatblue.io/api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/disconnect \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Desconectar e limpar sessao
curl -X POST https://api.chatblue.io/api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/disconnect \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"clearSession": true}'
```

### JavaScript (Fetch)

```javascript
async function disconnectWhatsApp(connectionId, clearSession = false) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(
    `https://api.chatblue.io/api/connections/${connectionId}/disconnect`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clearSession }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
try {
  const result = await disconnectWhatsApp('clconnxxxxxxxxxxxxxxxxxxxxxx');

  console.log('Status:', result.status);
  console.log('Desconectado em:', result.disconnectedAt);
  console.log('Mensagem:', result.message);

  // Atualizar UI
  document.getElementById('connection-status').textContent = 'Desconectado';
  document.getElementById('reconnect-btn').style.display = 'block';
} catch (error) {
  if (error.message.includes('already disconnected')) {
    console.log('Conexao ja estava desconectada');
  } else {
    console.error('Erro:', error.message);
  }
}
```

### JavaScript - Confirmacao e Reconexao

```javascript
async function handleDisconnect(connectionId) {
  const confirmed = confirm(
    'Deseja realmente desconectar este WhatsApp?\n\n' +
    'Os tickets e mensagens serao preservados, mas sera necessario ' +
    'escanear um novo QR Code para reconectar.'
  );

  if (!confirmed) return;

  try {
    await disconnectWhatsApp(connectionId);

    // Perguntar sobre reconexao
    const reconnect = confirm('Conexao encerrada. Deseja reconectar agora?');

    if (reconnect) {
      // Iniciar reconexao
      const result = await fetch(`/api/connections/${connectionId}/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (result.ok) {
        const data = await result.json();
        // Exibir QR Code
        showQRCodeModal(data.qrCode);
      }
    }
  } catch (error) {
    alert('Erro ao desconectar: ' + error.message);
  }
}
```

### Python

```python
import requests

def disconnect_whatsapp(access_token, connection_id, clear_session=False):
    url = f'https://api.chatblue.io/api/connections/{connection_id}/disconnect'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payload = {'clearSession': clear_session}

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    result = disconnect_whatsapp(token, 'clconnxxxxxxxxxxxxxxxxxxxxxx')
    print(f"Status: {result['status']}")
    print(f"Desconectado em: {result['disconnectedAt']}")
except Exception as e:
    print(f"Erro: {e}")
```

### PHP

```php
<?php

function disconnectWhatsApp($accessToken, $connectionId, $clearSession = false) {
    $url = "https://api.chatblue.io/api/connections/{$connectionId}/disconnect";

    $payload = ['clearSession' => $clearSession];

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

    if ($httpCode === 200) {
        return $data;
    }

    throw new Exception($data['error'] ?? 'Erro desconhecido');
}

// Uso
try {
    $result = disconnectWhatsApp($token, 'clconnxxxxxxxxxxxxxxxxxxxxxx');
    echo "Desconectado: " . $result['message'] . "\n";
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Comportamento do ClearSession

| `clearSession` | Comportamento |
|----------------|---------------|
| `false` (padrao) | Mantem dados da sessao. Reconexao pode ser mais rapida. |
| `true` | Limpa todos os dados da sessao. Necessario novo pareamento completo. |

### Quando Usar clearSession: true

- Trocar o numero de telefone da conexao
- Resolver problemas de autenticacao
- Remover completamente o dispositivo do WhatsApp

### Quando Usar clearSession: false

- Manutencao temporaria
- Troca de servidor
- Reconexao rapida planejada

## Eventos WebSocket

Ao desconectar, os seguintes eventos sao emitidos:

```javascript
// Evento de desconexao
socket.on('connection:status', (data) => {
  // data.status = 'DISCONNECTED'
  // data.connectionId = 'clconnxxxxxxxxxxxxxxxxxxxxxx'
  // data.disconnectedAt = '2024-01-15T16:30:00.000Z'
});

// Evento para usuarios online
socket.on('connection:offline', (data) => {
  // Notifica que a conexao ficou offline
});
```

## Notas Importantes

1. **Dados Preservados**: Tickets, mensagens e contatos NAO sao apagados ao desconectar.

2. **Mensagens Pendentes**: Mensagens em fila de envio serao perdidas. Certifique-se de que nao ha envios pendentes.

3. **Reconexao**: Use o endpoint `/connect` para reconectar apos desconexao.

4. **WhatsApp no Celular**: A desconexao no ChatBlue nao afeta o WhatsApp no celular, apenas a sessao web.

5. **Notificacoes**: Usuarios sao notificados via WebSocket sobre a desconexao.

## Endpoints Relacionados

- [Conectar](/docs/api/conexoes/conectar) - Reconectar WhatsApp
- [QR Code](/docs/api/conexoes/qr-code) - Obter QR Code
- [Listar Conexoes](/docs/api/conexoes/listar) - Ver status
