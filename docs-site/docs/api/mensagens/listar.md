---
sidebar_position: 1
title: Listar Mensagens
description: Endpoint para listar mensagens de um ticket no ChatBlue
---

# Listar Mensagens

Retorna as mensagens de um ticket.

## Endpoint

```
GET /api/messages/ticket/:ticketId
```

## Descricao

Este endpoint retorna todas as mensagens de um ticket especifico, incluindo textos, midias, documentos e mensagens de sistema. As mensagens sao retornadas em ordem cronologica.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Mesmas permissoes do ticket - usuario deve ter acesso ao ticket para ver as mensagens.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `ticketId` | string | ID do ticket (CUID) |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `limit` | number | 50 | Mensagens por pagina (max 100) |
| `before` | string | - | ID da mensagem para paginacao (mensagens anteriores) |
| `after` | string | - | ID da mensagem para paginacao (mensagens posteriores) |
| `type` | string | - | Filtrar por tipo (text, image, audio, video, document, sticker) |
| `fromMe` | boolean | - | Filtrar mensagens enviadas (true) ou recebidas (false) |

### Exemplos de URL

```
# Ultimas 50 mensagens
GET /api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx

# Mensagens anteriores a uma especifica
GET /api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx?before=clmsgxxxxxxxxxxxxxxxxxxxxxx&limit=20

# Apenas imagens
GET /api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx?type=image

# Apenas mensagens recebidas
GET /api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx?fromMe=false
```

## Response

### Sucesso (200 OK)

```json
{
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "ticketNumber": 1234,
  "messages": [
    {
      "id": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
      "whatsappMessageId": "ABCD1234567890",
      "type": "text",
      "content": "Ola, preciso de ajuda com meu pedido",
      "fromMe": false,
      "status": "read",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:05.000Z",
      "contact": {
        "id": "clcontactxxxxxxxxxxxxxxxxxx",
        "name": "Joao Silva",
        "phone": "+5511999999999",
        "profilePicUrl": "https://exemplo.com/pic.jpg"
      },
      "quotedMessage": null,
      "reactions": []
    },
    {
      "id": "clmsgyyyyyyyyyyyyyyyyyyyyyy",
      "whatsappMessageId": "EFGH5678901234",
      "type": "text",
      "content": "Ola Joao! Qual o numero do seu pedido?",
      "fromMe": true,
      "status": "read",
      "createdAt": "2024-01-15T10:05:00.000Z",
      "updatedAt": "2024-01-15T10:05:30.000Z",
      "sender": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Maria Atendente",
        "avatar": "https://exemplo.com/avatar.jpg",
        "isAI": false
      },
      "quotedMessage": null,
      "reactions": [
        {
          "emoji": "👍",
          "from": "+5511999999999",
          "timestamp": "2024-01-15T10:05:35.000Z"
        }
      ]
    },
    {
      "id": "clmsgzzzzzzzzzzzzzzzzzzzzzz",
      "whatsappMessageId": "IJKL9012345678",
      "type": "image",
      "content": "Segue a foto do produto",
      "mediaUrl": "https://cdn.chatblue.io/media/abc123.jpg",
      "mediaMimeType": "image/jpeg",
      "mediaSize": 125000,
      "mediaWidth": 800,
      "mediaHeight": 600,
      "fromMe": false,
      "status": "read",
      "createdAt": "2024-01-15T10:10:00.000Z",
      "contact": {
        "id": "clcontactxxxxxxxxxxxxxxxxxx",
        "name": "Joao Silva"
      },
      "quotedMessage": {
        "id": "clmsgyyyyyyyyyyyyyyyyyyyyyy",
        "type": "text",
        "content": "Ola Joao! Qual o numero do seu pedido?"
      },
      "reactions": []
    },
    {
      "id": "clmsgaaaaaaaaaaaaaaaaaaaaa",
      "whatsappMessageId": null,
      "type": "system",
      "content": "Ticket transferido para Suporte Tecnico",
      "fromMe": true,
      "status": "sent",
      "createdAt": "2024-01-15T12:00:00.000Z",
      "isSystemMessage": true
    }
  ],
  "pagination": {
    "limit": 50,
    "hasMore": true,
    "oldestMessageId": "clmsgxxxxxxxxxxxxxxxxxxxxxx",
    "newestMessageId": "clmsgaaaaaaaaaaaaaaaaaaaaa"
  }
}
```

### Campos da Resposta

#### Objeto Message

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da mensagem (CUID) |
| `whatsappMessageId` | string/null | ID da mensagem no WhatsApp |
| `type` | string | Tipo da mensagem |
| `content` | string | Conteudo textual |
| `fromMe` | boolean | Se foi enviada (true) ou recebida (false) |
| `status` | string | Status de entrega |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Ultima atualizacao |
| `contact` | object | Contato (se fromMe=false) |
| `sender` | object | Atendente (se fromMe=true) |
| `quotedMessage` | object/null | Mensagem citada |
| `reactions` | array | Reacoes a mensagem |
| `isSystemMessage` | boolean | Se e mensagem de sistema |

#### Campos de Midia (quando aplicavel)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `mediaUrl` | string | URL do arquivo |
| `mediaMimeType` | string | Tipo MIME |
| `mediaSize` | number | Tamanho em bytes |
| `mediaWidth` | number | Largura (imagens/videos) |
| `mediaHeight` | number | Altura (imagens/videos) |
| `mediaDuration` | number | Duracao em segundos (audio/video) |
| `mediaFilename` | string | Nome do arquivo (documentos) |

### Tipos de Mensagem

| Tipo | Descricao |
|------|-----------|
| `text` | Texto simples |
| `image` | Imagem |
| `audio` | Audio/voz |
| `video` | Video |
| `document` | Documento/arquivo |
| `sticker` | Figurinha |
| `location` | Localizacao |
| `contact` | Contato (vCard) |
| `system` | Mensagem de sistema |

### Status de Entrega

| Status | Descricao |
|--------|-----------|
| `pending` | Aguardando envio |
| `sent` | Enviada |
| `delivered` | Entregue |
| `read` | Lida |
| `failed` | Falhou |

## Erros

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
  "error": "Ticket not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
# Listar mensagens
curl -X GET https://api.chatblue.io/api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Paginacao (mensagens anteriores)
curl -X GET "https://api.chatblue.io/api/messages/ticket/clticketxxxxxxxxxxxxxxxxxx?before=clmsgxxx&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function getMessages(ticketId, options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.before) params.append('before', options.before);
  if (options.after) params.append('after', options.after);
  if (options.type) params.append('type', options.type);
  if (options.fromMe !== undefined) params.append('fromMe', options.fromMe.toString());

  const url = `https://api.chatblue.io/api/messages/ticket/${ticketId}?${params}`;

  const response = await fetch(url, {
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

// Carregar mensagens iniciais
const { messages, pagination } = await getMessages('clticketxxxxxxxxxxxxxxxxxx');
console.log(`${messages.length} mensagens carregadas`);

// Carregar mais (scroll infinito)
if (pagination.hasMore) {
  const older = await getMessages('clticketxxxxxxxxxxxxxxxxxx', {
    before: pagination.oldestMessageId,
    limit: 20,
  });
  console.log(`Mais ${older.messages.length} mensagens carregadas`);
}

// Filtrar por tipo
const images = await getMessages('clticketxxxxxxxxxxxxxxxxxx', { type: 'image' });
console.log(`${images.messages.length} imagens`);
```

### JavaScript - Hook React com Scroll Infinito

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface Message {
  id: string;
  type: string;
  content: string;
  fromMe: boolean;
  status: string;
  createdAt: string;
  contact?: { name: string };
  sender?: { name: string; avatar: string };
  mediaUrl?: string;
  reactions: Array<{ emoji: string }>;
}

export function useMessages(ticketId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestIdRef = useRef<string | null>(null);

  // Carregar mensagens iniciais
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const response = await fetch(`/api/messages/ticket/${ticketId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        const data = await response.json();

        setMessages(data.messages);
        setHasMore(data.pagination.hasMore);
        oldestIdRef.current = data.pagination.oldestMessageId;
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, [ticketId]);

  // Carregar mais mensagens (paginacao)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestIdRef.current) return;

    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/messages/ticket/${ticketId}?before=${oldestIdRef.current}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      const data = await response.json();

      setMessages(prev => [...data.messages, ...prev]);
      setHasMore(data.pagination.hasMore);
      oldestIdRef.current = data.pagination.oldestMessageId;
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [ticketId, loadingMore, hasMore]);

  // Adicionar nova mensagem (tempo real)
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Atualizar status da mensagem
  const updateMessageStatus = useCallback((messageId: string, status: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
    );
  }, []);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    addMessage,
    updateMessageStatus,
  };
}

// Componente de Chat
function ChatMessages({ ticketId }: { ticketId: string }) {
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useMessages(ticketId);

  const containerRef = useRef<HTMLDivElement>(null);

  // Detectar scroll para carregar mais
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop === 0 && hasMore && !loadingMore) {
      loadMore();
    }
  };

  if (loading) return <div>Carregando mensagens...</div>;

  return (
    <div
      ref={containerRef}
      className="chat-messages"
      onScroll={handleScroll}
    >
      {loadingMore && <div className="loading-more">Carregando...</div>}

      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const senderName = message.fromMe
    ? message.sender?.name
    : message.contact?.name;

  return (
    <div className={`message ${message.fromMe ? 'sent' : 'received'}`}>
      <div className="message-header">
        <span className="sender">{senderName}</span>
        <span className="time">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="message-content">
        {message.type === 'text' && <p>{message.content}</p>}
        {message.type === 'image' && (
          <img src={message.mediaUrl} alt={message.content} />
        )}
        {message.type === 'audio' && (
          <audio src={message.mediaUrl} controls />
        )}
        {message.type === 'video' && (
          <video src={message.mediaUrl} controls />
        )}
      </div>

      {message.reactions.length > 0 && (
        <div className="reactions">
          {message.reactions.map((r, i) => (
            <span key={i}>{r.emoji}</span>
          ))}
        </div>
      )}

      {message.fromMe && (
        <span className={`status ${message.status}`}>
          {message.status === 'read' ? '✓✓' : '✓'}
        </span>
      )}
    </div>
  );
}
```

### Python

```python
import requests

def get_messages(access_token, ticket_id, limit=50, before=None, after=None, msg_type=None):
    url = f'https://api.chatblue.io/api/messages/ticket/{ticket_id}'

    params = {'limit': limit}
    if before:
        params['before'] = before
    if after:
        params['after'] = after
    if msg_type:
        params['type'] = msg_type

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
data = get_messages(token, 'clticketxxx')
print(f"Ticket #{data['ticketNumber']}")
print(f"{len(data['messages'])} mensagens")

for msg in data['messages']:
    sender = '→' if msg['fromMe'] else '←'
    print(f"{sender} [{msg['type']}] {msg['content'][:50]}...")

# Carregar todas as mensagens
all_messages = []
has_more = True
before_id = None

while has_more:
    data = get_messages(token, 'clticketxxx', before=before_id)
    all_messages = data['messages'] + all_messages
    has_more = data['pagination']['hasMore']
    before_id = data['pagination']['oldestMessageId']

print(f"Total: {len(all_messages)} mensagens")
```

## Notas Importantes

1. **Ordenacao**: Mensagens sao retornadas em ordem cronologica (mais antiga primeiro).

2. **Paginacao**: Use `before` para carregar mensagens mais antigas (scroll up) e `after` para novas.

3. **Midia**: URLs de midia sao temporarias e expiram. Use-as imediatamente ou faca cache.

4. **Tempo Real**: Para novas mensagens em tempo real, use WebSocket.

5. **Mensagens Deletadas**: Mensagens deletadas nao sao retornadas.

## Endpoints Relacionados

- [Enviar Texto](/docs/api/mensagens/enviar-texto) - Enviar mensagem de texto
- [Enviar Midia](/docs/api/mensagens/enviar-midia) - Enviar arquivo
- [Reagir](/docs/api/mensagens/reagir) - Adicionar reacao
- [Deletar](/docs/api/mensagens/deletar) - Deletar mensagem
