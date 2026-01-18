---
sidebar_position: 3
title: QR Code da Conexao
description: Endpoint para obter o QR Code de uma conexao WhatsApp no ChatBlue
---

# QR Code da Conexao

Obtem o QR Code para conectar um dispositivo WhatsApp.

## Endpoint

```
GET /api/connections/:id/qr
```

## Descricao

Este endpoint retorna o QR Code necessario para conectar um dispositivo WhatsApp a conexao. O QR Code deve ser escaneado pelo aplicativo WhatsApp no celular para estabelecer a conexao.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode obter QR Code
- **SUPER_ADMIN**: Pode obter QR Code

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da conexao (CUID) |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `format` | string | `base64` | Formato: `base64`, `png`, `svg` |
| `size` | number | `256` | Tamanho em pixels (64-512) |

### Exemplos de URL

```
# QR Code em base64 (padrao)
GET /api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/qr

# QR Code como imagem PNG
GET /api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/qr?format=png

# QR Code SVG maior
GET /api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/qr?format=svg&size=400
```

## Response

### Sucesso - Base64 (200 OK)

```json
{
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "connectionName": "WhatsApp Principal",
  "status": "PENDING",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEA...",
  "expiresAt": "2024-01-15T10:31:00.000Z",
  "expiresIn": 60
}
```

### Sucesso - PNG (200 OK)

Retorna a imagem PNG diretamente com header `Content-Type: image/png`.

### Sucesso - SVG (200 OK)

Retorna o SVG diretamente com header `Content-Type: image/svg+xml`.

### Campos da Resposta (JSON)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `connectionId` | string | ID da conexao |
| `connectionName` | string | Nome da conexao |
| `status` | string | Status atual (PENDING ou CONNECTING) |
| `qrCode` | string | QR Code em formato base64 data URI |
| `expiresAt` | string | Data/hora de expiracao do QR Code |
| `expiresIn` | number | Segundos ate expirar |

## Erros

### 400 Bad Request - Conexao Ja Conectada

```json
{
  "error": "Connection is already connected. Disconnect first to generate new QR code.",
  "code": "ALREADY_CONNECTED"
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

### 408 Request Timeout - QR Expirado

```json
{
  "error": "QR Code expired. Request a new one.",
  "code": "QR_EXPIRED"
}
```

### 503 Service Unavailable

```json
{
  "error": "WhatsApp service temporarily unavailable. Try again later.",
  "code": "SERVICE_UNAVAILABLE"
}
```

## Exemplos de Codigo

### cURL

```bash
# Obter QR Code em base64
curl -X GET https://api.chatblue.io/api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/qr \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Salvar QR Code como imagem PNG
curl -X GET "https://api.chatblue.io/api/connections/clconnxxxxxxxxxxxxxxxxxxxxxx/qr?format=png" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --output qrcode.png
```

### JavaScript (Fetch)

```javascript
async function getQRCode(connectionId, options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (options.format) params.append('format', options.format);
  if (options.size) params.append('size', options.size.toString());

  const url = `https://api.chatblue.io/api/connections/${connectionId}/qr?${params}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  // Se formato base64, retorna JSON
  if (!options.format || options.format === 'base64') {
    return response.json();
  }

  // Se PNG ou SVG, retorna blob
  return response.blob();
}

// Uso - Base64
try {
  const data = await getQRCode('clconnxxxxxxxxxxxxxxxxxxxxxx');

  // Exibir QR Code em img tag
  const img = document.getElementById('qr-image');
  img.src = data.qrCode;

  // Mostrar tempo restante
  console.log(`QR expira em ${data.expiresIn} segundos`);

  // Configurar timer para recarregar antes de expirar
  setTimeout(async () => {
    const newData = await getQRCode('clconnxxxxxxxxxxxxxxxxxxxxxx');
    img.src = newData.qrCode;
  }, (data.expiresIn - 5) * 1000);
} catch (error) {
  console.error('Erro:', error.message);
}

// Uso - Download como PNG
try {
  const blob = await getQRCode('clconnxxxxxxxxxxxxxxxxxxxxxx', { format: 'png', size: 400 });
  const url = URL.createObjectURL(blob);

  // Download automatico
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qrcode.png';
  a.click();
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Componente React com Auto-Refresh

```typescript
import { useState, useEffect, useCallback } from 'react';

interface QRCodeData {
  connectionId: string;
  connectionName: string;
  status: string;
  qrCode: string;
  expiresAt: string;
  expiresIn: number;
}

function QRCodeDisplay({ connectionId }: { connectionId: string }) {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const fetchQRCode = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/connections/${connectionId}/qr`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const data = await response.json();
      setQrData(data);
      setCountdown(data.expiresIn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  // Carregar QR Code inicial
  useEffect(() => {
    fetchQRCode();
  }, [fetchQRCode]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Recarregar QR Code quando expirar
          fetchQRCode();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, fetchQRCode]);

  if (loading && !qrData) {
    return <div className="qr-loading">Gerando QR Code...</div>;
  }

  if (error) {
    return (
      <div className="qr-error">
        <p>Erro: {error}</p>
        <button onClick={fetchQRCode}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="qr-container">
      <h3>{qrData?.connectionName}</h3>

      <div className="qr-image-wrapper">
        <img src={qrData?.qrCode} alt="QR Code WhatsApp" />
        {loading && <div className="qr-overlay">Atualizando...</div>}
      </div>

      <p className="qr-instructions">
        Abra o WhatsApp no seu celular e escaneie este QR Code
      </p>

      <div className="qr-timer">
        Expira em: {countdown}s
        {countdown < 10 && <span className="warning"> (Recarregando...)</span>}
      </div>

      <button onClick={fetchQRCode} disabled={loading}>
        Gerar novo QR Code
      </button>
    </div>
  );
}

export default QRCodeDisplay;
```

### Python

```python
import requests
import base64

def get_qr_code(access_token, connection_id, format='base64', size=256):
    url = f'https://api.chatblue.io/api/connections/{connection_id}/qr'

    params = {
        'format': format,
        'size': size
    }

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        if format == 'base64':
            return response.json()
        else:
            return response.content
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso - Base64
data = get_qr_code(token, 'clconnxxxxxxxxxxxxxxxxxxxxxx')
print(f"QR Code expira em: {data['expiresIn']} segundos")

# Para exibir em terminal (requer biblioteca qrcode)
# import qrcode
# qr = qrcode.QRCode()
# qr.add_data(data['qrCode'])
# qr.print_ascii()

# Uso - Salvar PNG
png_data = get_qr_code(token, 'clconnxxxxxxxxxxxxxxxxxxxxxx', format='png', size=400)
with open('qrcode.png', 'wb') as f:
    f.write(png_data)
print("QR Code salvo em qrcode.png")
```

### PHP

```php
<?php

function getQRCode($accessToken, $connectionId, $format = 'base64', $size = 256) {
    $url = "https://api.chatblue.io/api/connections/{$connectionId}/qr";
    $url .= "?format={$format}&size={$size}";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if ($httpCode === 200) {
        if (strpos($contentType, 'application/json') !== false) {
            return json_decode($response, true);
        }
        return $response; // Binary data (PNG/SVG)
    }

    $data = json_decode($response, true);
    throw new Exception($data['error'] ?? 'Erro desconhecido');
}

// Uso - Base64
try {
    $data = getQRCode($token, 'clconnxxxxxxxxxxxxxxxxxxxxxx');
    echo "QR Code gerado. Expira em: " . $data['expiresIn'] . " segundos\n";

    // Exibir em HTML
    echo '<img src="' . $data['qrCode'] . '" alt="QR Code" />';
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}

// Uso - Salvar PNG
try {
    $pngData = getQRCode($token, 'clconnxxxxxxxxxxxxxxxxxxxxxx', 'png', 400);
    file_put_contents('qrcode.png', $pngData);
    echo "QR Code salvo!\n";
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Integracao com Socket.io

Para monitorar quando o QR Code e escaneado:

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.chatblue.io', {
  auth: { token: accessToken },
});

socket.on('connection:qr:scanned', (data) => {
  console.log('QR Code escaneado!');
  console.log('Conexao:', data.connectionId);
});

socket.on('connection:status', (data) => {
  if (data.status === 'CONNECTED') {
    console.log('Conexao estabelecida com sucesso!');
    console.log('Numero:', data.phone);
    console.log('Nome:', data.pushName);
  }
});

socket.on('connection:qr:expired', (data) => {
  console.log('QR Code expirou, gerando novo...');
  // Recarregar QR Code
});
```

## Notas Importantes

1. **Expiracao**: O QR Code expira em 60 segundos. Configure refresh automatico.

2. **Conexao Existente**: Se a conexao ja estiver conectada, primeiro use o endpoint de desconectar.

3. **Um Dispositivo**: Cada QR Code so pode ser escaneado por um dispositivo.

4. **WhatsApp Business**: Funciona tanto com WhatsApp normal quanto WhatsApp Business.

5. **Multi-Device**: O sistema usa a API de multi-dispositivos do WhatsApp, nao requer celular sempre conectado.

## Endpoints Relacionados

- [Criar Conexao](/docs/api/conexoes/criar) - Criar nova conexao
- [Conectar](/docs/api/conexoes/conectar) - Iniciar processo de conexao
- [Desconectar](/docs/api/conexoes/desconectar) - Encerrar conexao
- [WebSocket Eventos](/docs/api/websocket/eventos) - Eventos em tempo real
