---
sidebar_position: 4
title: Conectar WhatsApp
description: Endpoint para iniciar a conexao de um WhatsApp no ChatBlue
---

# Conectar WhatsApp

Inicia o processo de conexao de um dispositivo WhatsApp.

## Endpoint

```
POST /api/connections/:id/connect
```

## Descricao

Este endpoint inicia o processo de conexao de um dispositivo WhatsApp. Ele gera um novo QR Code e prepara a sessao para receber a autenticacao. Use este endpoint quando quiser reconectar uma conexao que foi desconectada ou iniciar o processo de conexao de uma conexao pendente.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode conectar
- **SUPER_ADMIN**: Pode conectar

:::warning Acesso Restrito
Apenas usuarios com role `ADMIN` ou `SUPER_ADMIN` podem conectar dispositivos.
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
| `force` | boolean | Nao | Forcar reconexao mesmo se ja conectado |

### Exemplo de Request

```json
{
  "force": false
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "name": "WhatsApp Principal",
  "status": "CONNECTING",
  "previousStatus": "DISCONNECTED",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEA...",
  "qrExpiresAt": "2024-01-15T10:31:00.000Z",
  "message": "Connection process started. Scan the QR code to connect."
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID da conexao |
| `name` | string | Nome da conexao |
| `status` | string | Novo status (CONNECTING) |
| `previousStatus` | string | Status anterior |
| `qrCode` | string | QR Code em base64 |
| `qrExpiresAt` | string | Expiracao do QR Code |
| `message` | string | Mensagem de status |

## Erros

### 400 Bad Request - Ja Conectado

```json
{
  "error": "Connection is already connected. Use force=true to reconnect.",
  "code": "ALREADY_CONNECTED"
}
```

### 400 Bad Request - Em Processo

```json
{
  "error": "Connection process already in progress. Wait or cancel first.",
  "code": "CONNECTION_IN_PROGRESS"
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

### 503 Service Unavailable

```json
{
  "error": "WhatsApp service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE"
}
```

## Exemplos de Codigo

### cURL

```bash
# Iniciar conexao
curl -X POST https://api.chatblue.io/api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/connect \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Forcar reconexao
curl -X POST https://api.chatblue.io/api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/connect \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### JavaScript (Fetch)

```javascript
async function connectWhatsApp(connectionId, force = false) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(
    `https://api.chatblue.io/api/connections/${connectionId}/connect`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force }),
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
  const result = await connectWhatsApp('clconnxxxxxxxxxxxxxxxxxxxxxx');

  console.log('Status:', result.status);
  console.log('Mensagem:', result.message);

  // Exibir QR Code
  const img = document.getElementById('qr-image');
  img.src = result.qrCode;

  console.log('Escaneie o QR Code no WhatsApp');
} catch (error) {
  if (error.message.includes('already connected')) {
    // Perguntar ao usuario se deseja reconectar
    if (confirm('Conexao ja ativa. Deseja reconectar?')) {
      const result = await connectWhatsApp('clconnxxxxxxxxxxxxxxxxxxxxxx', true);
      console.log('Reconexao iniciada');
    }
  } else {
    console.error('Erro:', error.message);
  }
}
```

### JavaScript - Fluxo Completo com WebSocket

```javascript
import { io } from 'socket.io-client';

class WhatsAppConnection {
  constructor(connectionId, accessToken) {
    this.connectionId = connectionId;
    this.accessToken = accessToken;
    this.socket = null;
    this.onStatusChange = null;
    this.onQRCode = null;
    this.onConnected = null;
    this.onError = null;
  }

  async connect(force = false) {
    // Iniciar conexao WebSocket
    this.socket = io('https://api.chatblue.io', {
      auth: { token: this.accessToken },
    });

    // Configurar listeners
    this.setupSocketListeners();

    // Chamar API para iniciar conexao
    const response = await fetch(
      `https://api.chatblue.io/api/connections/${this.connectionId}/connect`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  }

  setupSocketListeners() {
    // Novo QR Code gerado
    this.socket.on('connection:qr', (data) => {
      if (data.connectionId === this.connectionId) {
        this.onQRCode?.(data.qrCode, data.expiresIn);
      }
    });

    // Status da conexao mudou
    this.socket.on('connection:status', (data) => {
      if (data.connectionId === this.connectionId) {
        this.onStatusChange?.(data.status, data);

        if (data.status === 'CONNECTED') {
          this.onConnected?.(data);
        }
      }
    });

    // Erro na conexao
    this.socket.on('connection:error', (data) => {
      if (data.connectionId === this.connectionId) {
        this.onError?.(data.error);
      }
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

// Uso
const whatsapp = new WhatsAppConnection('clconnxxxxxxxxxxxxxxxxxxxxxx', accessToken);

whatsapp.onQRCode = (qrCode, expiresIn) => {
  document.getElementById('qr-image').src = qrCode;
  document.getElementById('qr-timer').textContent = `Expira em ${expiresIn}s`;
};

whatsapp.onStatusChange = (status, data) => {
  document.getElementById('status').textContent = status;
};

whatsapp.onConnected = (data) => {
  console.log('Conectado!');
  console.log('Numero:', data.phone);
  console.log('Nome:', data.pushName);

  // Ocultar QR Code e mostrar sucesso
  document.getElementById('qr-container').style.display = 'none';
  document.getElementById('success-container').style.display = 'block';
};

whatsapp.onError = (error) => {
  console.error('Erro:', error);
  alert('Erro na conexao: ' + error);
};

// Iniciar conexao
whatsapp.connect().then(result => {
  document.getElementById('qr-image').src = result.qrCode;
}).catch(error => {
  console.error('Falha ao iniciar:', error.message);
});
```

### Python

```python
import requests

def connect_whatsapp(access_token, connection_id, force=False):
    url = f'https://api.chatblue.io/api/connections/{connection_id}/connect'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payload = {'force': force}

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    result = connect_whatsapp(token, 'clconnxxxxxxxxxxxxxxxxxxxxxx')
    print(f"Status: {result['status']}")
    print(f"QR Code gerado. Expira em: {result['qrExpiresAt']}")

    # Salvar QR Code como imagem
    import base64
    qr_data = result['qrCode'].split(',')[1]
    with open('qrcode.png', 'wb') as f:
        f.write(base64.b64decode(qr_data))
    print("QR Code salvo em qrcode.png")
except Exception as e:
    print(f"Erro: {e}")
```

### PHP

```php
<?php

function connectWhatsApp($accessToken, $connectionId, $force = false) {
    $url = "https://api.chatblue.io/api/connections/{$connectionId}/connect";

    $payload = ['force' => $force];

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
    $result = connectWhatsApp($token, 'clconnxxxxxxxxxxxxxxxxxxxxxx');
    echo "Status: " . $result['status'] . "\n";
    echo "QR Code gerado!\n";

    // Exibir em HTML
    echo '<img src="' . $result['qrCode'] . '" alt="QR Code" />';
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Fluxo de Estados

```
PENDING/DISCONNECTED
        ↓
  POST /connect
        ↓
   CONNECTING
        ↓
  (Escanear QR)
        ↓
   CONNECTED
```

## Estados Possiveis

| Status | Descricao | Proxima Acao |
|--------|-----------|--------------|
| `PENDING` | Nunca conectou | Usar POST /connect |
| `DISCONNECTED` | Foi desconectado | Usar POST /connect |
| `CONNECTING` | Aguardando QR | Escanear QR Code |
| `CONNECTED` | Funcionando | Pronto para uso |

## Notas Importantes

1. **Force Reconnect**: Use `force: true` apenas quando necessario, pois desconecta a sessao atual.

2. **WebSocket Recomendado**: Use WebSocket para monitorar o status em tempo real.

3. **Timeout**: Se o QR Code nao for escaneado em 60 segundos, ele expira e um novo e gerado automaticamente.

4. **Multiplos Dispositivos**: O WhatsApp suporta ate 4 dispositivos vinculados. O ChatBlue usa 1 slot.

5. **Persistencia**: Apos conectar, a sessao e persistida e nao requer escaneamento a cada restart.

## Endpoints Relacionados

- [QR Code](/docs/api/conexoes/qr-code) - Obter QR Code
- [Desconectar](/docs/api/conexoes/desconectar) - Encerrar conexao
- [Listar Conexoes](/docs/api/conexoes/listar) - Ver status das conexoes
- [WebSocket Eventos](/docs/api/websocket/eventos) - Eventos em tempo real
