---
sidebar_position: 4
title: Reagir a Mensagem
description: Endpoint para adicionar reacao a uma mensagem no ChatBlue
---

# Reagir a Mensagem

Adiciona ou remove uma reacao (emoji) de uma mensagem.

## Endpoint

```
POST /api/messages/:messageId/react
```

## Descricao

Este endpoint permite adicionar ou remover uma reacao (emoji) de uma mensagem. As reacoes sao sincronizadas com o WhatsApp e visiveis para o contato.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Usuario deve ter acesso ao ticket da mensagem.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `messageId` | string | ID da mensagem (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `emoji` | string | Sim | Emoji da reacao (ou vazio para remover) |

### Emojis Suportados

O WhatsApp suporta os seguintes emojis para reacao:

- 👍 (polegar para cima)
- ❤️ (coracao)
- 😂 (risada)
- 😮 (surpreso)
- 😢 (triste)
- 🙏 (oracao/agradecimento)

### Exemplo de Request

Adicionar reacao:

```json
{
  "emoji": "👍"
}
```

Remover reacao:

```json
{
  "emoji": ""
}
```

## Response

### Sucesso (200 OK)

```json
{
  "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
  "reaction": {
    "emoji": "👍",
    "from": "me",
    "timestamp": "2024-01-15T14:30:00.000Z"
  },
  "allReactions": [
    {
      "emoji": "👍",
      "from": "me",
      "timestamp": "2024-01-15T14:30:00.000Z"
    },
    {
      "emoji": "❤️",
      "from": "+5511999999999",
      "timestamp": "2024-01-15T14:25:00.000Z"
    }
  ]
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `messageId` | string | ID da mensagem |
| `reaction` | object/null | Reacao adicionada (null se removida) |
| `reaction.emoji` | string | Emoji usado |
| `reaction.from` | string | Quem reagiu ("me" ou numero) |
| `reaction.timestamp` | string | Data/hora da reacao |
| `allReactions` | array | Todas as reacoes na mensagem |

## Erros

### 400 Bad Request - Emoji Invalido

```json
{
  "error": "Invalid emoji. Supported: 👍, ❤️, 😂, 😮, 😢, 🙏",
  "code": "INVALID_EMOJI"
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
  "error": "Access denied",
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
# Adicionar reacao
curl -X POST https://api.chatblue.io/api/messages/clmsgxxxxxxxxxxxxxxxxxxxxxx/react \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "emoji": "👍"
  }'

# Remover reacao
curl -X POST https://api.chatblue.io/api/messages/clmsgxxxxxxxxxxxxxxxxxxxxxx/react \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "emoji": ""
  }'
```

### JavaScript (Fetch)

```javascript
async function reactToMessage(messageId, emoji) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(
    `https://api.chatblue.io/api/messages/${messageId}/react`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Adicionar reacao
try {
  const result = await reactToMessage('clmsgxxxxxxxxxxxxxxxxxxxxxx', '👍');
  console.log('Reacao adicionada:', result.reaction.emoji);
} catch (error) {
  console.error('Erro:', error.message);
}

// Remover reacao
try {
  await reactToMessage('clmsgxxxxxxxxxxxxxxxxxxxxxx', '');
  console.log('Reacao removida');
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Componente de Reacoes

```typescript
import { useState } from 'react';

const SUPPORTED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Reaction {
  emoji: string;
  from: string;
  timestamp: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  myReaction: string | null;
  onReactionChange: (reactions: Reaction[]) => void;
}

function MessageReactions({
  messageId,
  reactions,
  myReaction,
  onReactionChange,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReact = async (emoji: string) => {
    // Se clicar no mesmo emoji, remove
    const newEmoji = emoji === myReaction ? '' : emoji;

    setLoading(true);
    setShowPicker(false);

    try {
      const response = await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji: newEmoji }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      onReactionChange(result.allReactions);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao reagir');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar reacoes por emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <div className="message-reactions">
      {/* Reacoes existentes */}
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => (
        <button
          key={emoji}
          className={`reaction-badge ${myReaction === emoji ? 'my-reaction' : ''}`}
          onClick={() => handleReact(emoji)}
          disabled={loading}
        >
          {emoji} {reactionList.length}
        </button>
      ))}

      {/* Botao para adicionar reacao */}
      <div className="reaction-picker-container">
        <button
          className="add-reaction-btn"
          onClick={() => setShowPicker(!showPicker)}
          disabled={loading}
        >
          😀
        </button>

        {showPicker && (
          <div className="emoji-picker">
            {SUPPORTED_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={myReaction === emoji ? 'selected' : ''}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// CSS sugerido
const styles = `
.message-reactions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.reaction-badge {
  background: #f0f0f0;
  border: none;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 14px;
  cursor: pointer;
}

.reaction-badge.my-reaction {
  background: #e3f2fd;
  border: 1px solid #2196f3;
}

.emoji-picker {
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.emoji-picker button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.emoji-picker button:hover,
.emoji-picker button.selected {
  background: #f0f0f0;
}
`;
```

### Python

```python
import requests

def react_to_message(access_token, message_id, emoji):
    url = f'https://api.chatblue.io/api/messages/{message_id}/react'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payload = {'emoji': emoji}

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Adicionar reacao
result = react_to_message(token, 'clmsgxxx', '👍')
print(f"Reacao: {result['reaction']['emoji']}")

# Remover reacao
react_to_message(token, 'clmsgxxx', '')
print("Reacao removida")
```

## Eventos WebSocket

Quando uma reacao e adicionada ou removida:

```javascript
socket.on('message:reaction', (data) => {
  // data.messageId
  // data.reaction: { emoji, from, timestamp } ou null
  // data.allReactions: array

  console.log(`Reacao em mensagem ${data.messageId}`);
  if (data.reaction) {
    console.log(`${data.reaction.from} reagiu com ${data.reaction.emoji}`);
  }
});
```

## Notas Importantes

1. **Emojis Limitados**: O WhatsApp suporta apenas 6 emojis para reacao.

2. **Uma Reacao por Pessoa**: Cada pessoa pode ter apenas uma reacao por mensagem. Reagir novamente substitui a anterior.

3. **Sincronizacao**: Reacoes sao sincronizadas em tempo real com o WhatsApp.

4. **Remocao**: Envie `emoji: ""` para remover sua reacao.

5. **Visibilidade**: Reacoes sao visiveis para todos os participantes da conversa.

## Endpoints Relacionados

- [Listar Mensagens](/docs/api/mensagens/listar) - Ver mensagens com reacoes
- [Enviar Texto](/docs/api/mensagens/enviar-texto) - Enviar mensagem
- [WebSocket](/docs/api/websocket/mensagens) - Eventos em tempo real
