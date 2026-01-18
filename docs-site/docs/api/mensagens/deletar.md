---
sidebar_position: 5
title: Deletar Mensagem
description: Endpoint para deletar uma mensagem no ChatBlue
---

# Deletar Mensagem

Deleta uma mensagem enviada.

## Endpoint

```
DELETE /api/messages/:messageId
```

## Descricao

Este endpoint deleta uma mensagem enviada. A mensagem e removida tanto do ChatBlue quanto do WhatsApp (usando a funcao "apagar para todos"). So e possivel deletar mensagens enviadas por voce (fromMe=true).

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- Usuario deve ter acesso ao ticket da mensagem
- So pode deletar mensagens enviadas (fromMe=true)
- Admins podem deletar qualquer mensagem do ticket

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `messageId` | string | ID da mensagem (CUID) |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `forEveryone` | boolean | true | Apagar para todos (true) ou apenas localmente (false) |

### Exemplo de URL

```
# Apagar para todos
DELETE /api/messages/clmsgxxxxxxxxxxxxxxxxxxxxxx

# Apagar apenas localmente
DELETE /api/messages/clmsgxxxxxxxxxxxxxxxxxxxxxx?forEveryone=false
```

## Response

### Sucesso (200 OK)

```json
{
  "message": "Message deleted successfully",
  "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
  "deletedFor": "everyone",
  "deletedAt": "2024-01-15T14:30:00.000Z"
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `message` | string | Mensagem de sucesso |
| `messageId` | string | ID da mensagem deletada |
| `deletedFor` | string | "everyone" ou "me" |
| `deletedAt` | string | Data/hora da delecao |

## Erros

### 400 Bad Request - Mensagem Recebida

```json
{
  "error": "Cannot delete received messages",
  "code": "CANNOT_DELETE_RECEIVED"
}
```

### 400 Bad Request - Tempo Excedido

```json
{
  "error": "Cannot delete message. Time limit exceeded (messages can only be deleted within 1 hour)",
  "code": "DELETE_TIME_EXCEEDED"
}
```

### 400 Bad Request - Conexao Offline

```json
{
  "error": "WhatsApp connection is not connected",
  "code": "CONNECTION_OFFLINE"
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
  "error": "You can only delete messages sent by you",
  "code": "FORBIDDEN"
}
```

### 404 Not Found

```json
{
  "error": "Message not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
# Deletar para todos
curl -X DELETE https://api.chatblue.io/api/messages/clmsgxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Deletar apenas localmente
curl -X DELETE "https://api.chatblue.io/api/messages/clmsgxxxxxxxxxxxxxxxxxxxxxx?forEveryone=false" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function deleteMessage(messageId, forEveryone = true) {
  const accessToken = localStorage.getItem('accessToken');

  const url = `https://api.chatblue.io/api/messages/${messageId}${!forEveryone ? '?forEveryone=false' : ''}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Deletar para todos
try {
  const result = await deleteMessage('clmsgxxxxxxxxxxxxxxxxxxxxxx');
  console.log('Mensagem deletada:', result.messageId);
} catch (error) {
  if (error.message.includes('time limit')) {
    console.error('Nao e possivel deletar mensagens com mais de 1 hora');
  } else {
    console.error('Erro:', error.message);
  }
}

// Deletar apenas localmente (manter no WhatsApp)
try {
  const result = await deleteMessage('clmsgxxxxxxxxxxxxxxxxxxxxxx', false);
  console.log('Mensagem oculta localmente');
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Componente de Mensagem com Delete

```typescript
import { useState } from 'react';

interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  createdAt: string;
  isDeleted?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  onDelete: (messageId: string) => void;
}

function MessageBubble({ message, onDelete }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = message.fromMe && !message.isDeleted;

  // Verificar se passou mais de 1 hora
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const canDeleteForEveryone = messageAge < 60 * 60 * 1000; // 1 hora em ms

  const handleDelete = async (forEveryone: boolean) => {
    if (!window.confirm('Deseja realmente apagar esta mensagem?')) return;

    setDeleting(true);
    setShowMenu(false);

    try {
      const url = `/api/messages/${message.id}${!forEveryone ? '?forEveryone=false' : ''}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      onDelete(message.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar');
    } finally {
      setDeleting(false);
    }
  };

  if (message.isDeleted) {
    return (
      <div className="message deleted">
        <span className="deleted-text">🚫 Mensagem apagada</span>
      </div>
    );
  }

  return (
    <div className={`message ${message.fromMe ? 'sent' : 'received'}`}>
      <div className="message-content">
        {message.content}
      </div>

      {canDelete && (
        <div className="message-menu">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={deleting}
            className="menu-trigger"
          >
            ⋮
          </button>

          {showMenu && (
            <div className="menu-dropdown">
              {canDeleteForEveryone && (
                <button onClick={() => handleDelete(true)}>
                  Apagar para todos
                </button>
              )}
              <button onClick={() => handleDelete(false)}>
                Apagar para mim
              </button>
            </div>
          )}
        </div>
      )}

      {deleting && <span className="deleting">Apagando...</span>}
    </div>
  );
}

// Gerenciamento de estado
function Chat({ ticketId }: { ticketId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, isDeleted: true } : msg
      )
    );
  };

  return (
    <div className="chat">
      {messages.map(message => (
        <MessageBubble
          key={message.id}
          message={message}
          onDelete={handleDeleteMessage}
        />
      ))}
    </div>
  );
}
```

### Python

```python
import requests

def delete_message(access_token, message_id, for_everyone=True):
    url = f'https://api.chatblue.io/api/messages/{message_id}'

    if not for_everyone:
        url += '?forEveryone=false'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.delete(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
try:
    result = delete_message(token, 'clmsgxxx')
    print(f"Mensagem deletada: {result['messageId']}")
except Exception as e:
    print(f"Erro: {e}")

# Deletar apenas localmente
try:
    result = delete_message(token, 'clmsgxxx', for_everyone=False)
    print("Mensagem oculta localmente")
except Exception as e:
    print(f"Erro: {e}")
```

### PHP

```php
<?php

function deleteMessage($accessToken, $messageId, $forEveryone = true) {
    $url = "https://api.chatblue.io/api/messages/{$messageId}";

    if (!$forEveryone) {
        $url .= '?forEveryone=false';
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
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
    $result = deleteMessage($token, 'clmsgxxx');
    echo "Mensagem deletada\n";
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
```

## Eventos WebSocket

Quando uma mensagem e deletada:

```javascript
socket.on('message:deleted', (data) => {
  // data.messageId
  // data.ticketId
  // data.deletedFor: 'everyone' | 'me'
  // data.deletedBy: { id, name }
  // data.deletedAt

  console.log(`Mensagem ${data.messageId} deletada`);

  // Atualizar UI
  if (data.deletedFor === 'everyone') {
    markMessageAsDeleted(data.messageId);
  }
});
```

## Comportamentos

### Apagar para Todos (`forEveryone=true`)

- Mensagem removida do WhatsApp para todos os participantes
- No ChatBlue, a mensagem e marcada como deletada
- Exibe "Mensagem apagada" no lugar do conteudo
- Limite de 1 hora apos o envio

### Apagar para Mim (`forEveryone=false`)

- Mensagem permanece no WhatsApp
- Mensagem e ocultada apenas no ChatBlue
- Nao afeta outros atendentes ou o contato
- Sem limite de tempo

## Notas Importantes

1. **Limite de Tempo**: "Apagar para todos" so funciona dentro de 1 hora do envio.

2. **Mensagens Recebidas**: Nao e possivel deletar mensagens recebidas (do contato).

3. **Auditoria**: Mesmo mensagens deletadas ficam registradas no log de auditoria.

4. **Midia**: Ao deletar mensagem com midia, o arquivo tambem e removido.

5. **Admin Override**: Admins podem deletar qualquer mensagem do ticket (apenas localmente).

## Endpoints Relacionados

- [Listar Mensagens](/docs/api/mensagens/listar) - Ver mensagens
- [Enviar Texto](/docs/api/mensagens/enviar-texto) - Enviar mensagem
- [WebSocket](/docs/api/websocket/mensagens) - Eventos em tempo real
