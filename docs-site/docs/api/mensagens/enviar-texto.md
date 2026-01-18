---
sidebar_position: 2
title: Enviar Mensagem de Texto
description: Endpoint para enviar mensagem de texto em um ticket no ChatBlue
---

# Enviar Mensagem de Texto

Envia uma mensagem de texto em um ticket.

## Endpoint

```
POST /api/messages/ticket/:ticketId/send
```

## Descricao

Este endpoint envia uma mensagem de texto para o contato de um ticket. A mensagem e enviada via WhatsApp e registrada no historico do ticket.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Usuario deve ter acesso ao ticket (estar atribuido ou ser supervisor/admin).

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `ticketId` | string | ID do ticket (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `content` | string | Sim | Texto da mensagem (max 4096 caracteres) |
| `quotedMessageId` | string | Nao | ID da mensagem a ser citada |

### Exemplo de Request

```json
{
  "content": "Ola! Como posso ajudar voce hoje?"
}
```

Com citacao:

```json
{
  "content": "Sobre isso que voce mencionou...",
  "quotedMessageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx"
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
  "whatsappMessageId": "ABCD1234567890",
  "type": "text",
  "content": "Ola! Como posso ajudar voce hoje?",
  "fromMe": true,
  "status": "sent",
  "createdAt": "2024-01-15T14:30:00.000Z",
  "sender": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Maria Atendente",
    "avatar": "https://exemplo.com/avatar.jpg",
    "isAI": false
  },
  "quotedMessage": null,
  "ticket": {
    "id": "clticketxxxxxxxxxxxxxxxxxx",
    "number": 1234,
    "status": "IN_PROGRESS"
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da mensagem |
| `whatsappMessageId` | string | ID da mensagem no WhatsApp |
| `type` | string | Tipo (sempre "text") |
| `content` | string | Conteudo da mensagem |
| `fromMe` | boolean | Sempre true |
| `status` | string | Status inicial (sent) |
| `createdAt` | string | Data de criacao |
| `sender` | object | Dados do remetente |
| `quotedMessage` | object/null | Mensagem citada |
| `ticket` | object | Dados do ticket |

## Erros

### 400 Bad Request - Conteudo Vazio

```json
{
  "error": "Message content is required",
  "code": "VALIDATION_ERROR"
}
```

### 400 Bad Request - Mensagem Muito Longa

```json
{
  "error": "Message content exceeds maximum length of 4096 characters",
  "code": "CONTENT_TOO_LONG"
}
```

### 400 Bad Request - Conexao Offline

```json
{
  "error": "WhatsApp connection is not connected",
  "code": "CONNECTION_OFFLINE"
}
```

### 400 Bad Request - Ticket Fechado

```json
{
  "error": "Cannot send messages to closed tickets",
  "code": "TICKET_CLOSED"
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
  "error": "You do not have permission to send messages in this ticket",
  "code": "FORBIDDEN"
}
```

### 404 Not Found

```json
{
  "error": "Ticket not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
# Enviar mensagem simples
curl -X POST https://api.chatblue.io/api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx/send \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Ola! Como posso ajudar?"
  }'

# Com citacao
curl -X POST https://api.chatblue.io/api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx/send \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Entendi sua duvida",
    "quotedMessageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

### JavaScript (Fetch)

```javascript
async function sendMessage(ticketId, content, quotedMessageId = null) {
  const accessToken = localStorage.getItem('accessToken');

  const body = { content };
  if (quotedMessageId) body.quotedMessageId = quotedMessageId;

  const response = await fetch(
    `https://api.chatblue.io/api/messages/ticket/${ticketId}/send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Enviar mensagem simples
try {
  const message = await sendMessage(
    'clticketxxxxxxxxxxxxxxxxxx',
    'Ola! Como posso ajudar?'
  );
  console.log('Mensagem enviada:', message.id);
  console.log('Status:', message.status);
} catch (error) {
  if (error.message.includes('offline')) {
    console.error('WhatsApp desconectado');
  } else {
    console.error('Erro:', error.message);
  }
}

// Com citacao
try {
  const message = await sendMessage(
    'clticketxxxxxxxxxxxxxxxxxx',
    'Sobre isso que voce mencionou...',
    'clmsgpreviousxxxxxxxxxx'
  );
  console.log('Mensagem com citacao enviada');
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Componente de Chat Input

```typescript
import { useState, useRef } from 'react';

interface ChatInputProps {
  ticketId: string;
  quotedMessage?: {
    id: string;
    content: string;
  } | null;
  onClearQuote: () => void;
  onMessageSent: (message: any) => void;
}

function ChatInput({ ticketId, quotedMessage, onClearQuote, onMessageSent }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/messages/ticket/${ticketId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          quotedMessageId: quotedMessage?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const message = await response.json();
      onMessageSent(message);
      setContent('');
      onClearQuote();
      inputRef.current?.focus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input">
      {quotedMessage && (
        <div className="quoted-message">
          <span className="quote-text">{quotedMessage.content}</span>
          <button type="button" onClick={onClearQuote}>×</button>
        </div>
      )}

      <div className="input-row">
        <textarea
          ref={inputRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={sending}
          maxLength={4096}
        />

        <button type="submit" disabled={!content.trim() || sending}>
          {sending ? '...' : 'Enviar'}
        </button>
      </div>

      <div className="char-count">
        {content.length}/4096
      </div>
    </form>
  );
}
```

### Python

```python
import requests

def send_message(access_token, ticket_id, content, quoted_message_id=None):
    url = f'https://api.chatblue.io/api/messages/ticket/{ticket_id}/send'

    payload = {'content': content}
    if quoted_message_id:
        payload['quotedMessageId'] = quoted_message_id

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
    message = send_message(
        token,
        'clticketxxx',
        'Ola! Como posso ajudar?'
    )
    print(f"Mensagem enviada: {message['id']}")
    print(f"Status: {message['status']}")
except Exception as e:
    print(f"Erro: {e}")

# Com citacao
try:
    message = send_message(
        token,
        'clticketxxx',
        'Sobre isso...',
        quoted_message_id='clmsgxxx'
    )
    print("Mensagem com citacao enviada")
except Exception as e:
    print(f"Erro: {e}")
```

### PHP

```php
<?php

function sendMessage($accessToken, $ticketId, $content, $quotedMessageId = null) {
    $url = "https://api.chatblue.io/api/messages/ticket/{$ticketId}/send";

    $payload = ['content' => $content];
    if ($quotedMessageId) {
        $payload['quotedMessageId'] = $quotedMessageId;
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
    $message = sendMessage($token, 'clticketxxx', 'Ola! Como posso ajudar?');
    echo "Mensagem enviada: " . $message['id'] . "\n";
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Formatacao de Texto

O WhatsApp suporta formatacao basica:

| Formatacao | Sintaxe | Exemplo |
|------------|---------|---------|
| Negrito | `*texto*` | `*importante*` |
| Italico | `_texto_` | `_destaque_` |
| Riscado | `~texto~` | `~erro~` |
| Monoespaco | ``` `texto` ``` | `` `codigo` `` |

### Exemplo com Formatacao

```javascript
await sendMessage(ticketId, `
*Resumo do Pedido:*
- Produto: _Smartphone XYZ_
- Quantidade: 1
- Valor: R$ 1.999,00

~Frete gratis~ incluido!

Codigo de rastreio: \`BR123456789\`
`);
```

## Monitorar Status de Entrega

Apos enviar, monitore o status via WebSocket:

```javascript
socket.on('message:status', (data) => {
  // data.messageId
  // data.status: 'sent' | 'delivered' | 'read' | 'failed'
  // data.timestamp

  updateMessageStatus(data.messageId, data.status);
});
```

## Notas Importantes

1. **Limite de Caracteres**: Maximo de 4096 caracteres por mensagem.

2. **Conexao Ativa**: A conexao WhatsApp deve estar online para enviar.

3. **Ticket Ativo**: Nao e possivel enviar mensagens em tickets fechados (CLOSED).

4. **Rate Limit**: Limite de 60 mensagens por minuto por conexao.

5. **Entrega Assincrona**: A mensagem e enfileirada. O status e atualizado via WebSocket.

## Endpoints Relacionados

- [Enviar Midia](/docs/api/mensagens/enviar-midia) - Enviar arquivo
- [Listar Mensagens](/docs/api/mensagens/listar) - Ver mensagens
- [WebSocket](/docs/api/websocket/mensagens) - Tempo real
