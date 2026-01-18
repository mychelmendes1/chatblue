---
sidebar_position: 3
title: Mensagens em Tempo Real
description: Sistema de mensagens em tempo real via WebSocket no ChatBlue
---

# Mensagens em Tempo Real

Sistema de mensagens em tempo real via WebSocket.

## Visao Geral

O ChatBlue permite enviar e receber mensagens em tempo real atraves do WebSocket. Isso proporciona uma experiencia de chat fluida sem necessidade de polling.

## Fluxo de Mensagens

```
Cliente                  Servidor                 WhatsApp
   |                        |                        |
   |--- send-message ------>|                        |
   |                        |--- Envia para WA ----->|
   |<-- message-sending ----|                        |
   |                        |<-- ACK ---------------|
   |<-- message-sent -------|                        |
   |                        |<-- Delivered ----------|
   |<-- message-delivered --|                        |
   |                        |<-- Read ---------------|
   |<-- message-read -------|                        |
```

## Enviar Mensagens

### send-message

Envia uma mensagem de texto.

```javascript
socket.emit('send-message', {
  ticketId: 'clticketxxx',
  content: 'Ola, como posso ajudar?',
  quotedMessageId: null, // opcional: responder mensagem
}, (response) => {
  if (response.success) {
    console.log('Mensagem enviada:', response.messageId);
  } else {
    console.error('Erro:', response.error);
  }
});

// Response
{
  "success": true,
  "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxxx",
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

### send-media

Envia uma mensagem com midia.

```javascript
// Primeiro faca upload do arquivo via REST API
const uploadResult = await uploadFile(file);

// Depois envie a mensagem com a URL
socket.emit('send-media', {
  ticketId: 'clticketxxx',
  type: 'image', // image, video, audio, document
  mediaUrl: uploadResult.url,
  filename: uploadResult.originalName,
  caption: 'Veja esta imagem',
}, (response) => {
  console.log('Midia enviada:', response.messageId);
});
```

### send-location

Envia localizacao.

```javascript
socket.emit('send-location', {
  ticketId: 'clticketxxx',
  latitude: -23.5505,
  longitude: -46.6333,
  name: 'Escritorio ChatBlue',
  address: 'Av. Paulista, 1000 - Sao Paulo, SP',
}, (response) => {
  console.log('Localizacao enviada:', response.messageId);
});
```

### send-contact

Envia cartao de contato.

```javascript
socket.emit('send-contact', {
  ticketId: 'clticketxxx',
  contact: {
    name: 'Suporte ChatBlue',
    phone: '5511999999999',
    email: 'suporte@chatblue.io',
  },
}, (response) => {
  console.log('Contato enviado:', response.messageId);
});
```

## Receber Mensagens

### new-message

Nova mensagem recebida.

```javascript
socket.on('new-message', (data) => {
  const { ticketId, message } = data;

  switch (message.type) {
    case 'text':
      displayTextMessage(message);
      break;
    case 'image':
      displayImageMessage(message);
      break;
    case 'audio':
      displayAudioMessage(message);
      break;
    case 'video':
      displayVideoMessage(message);
      break;
    case 'document':
      displayDocumentMessage(message);
      break;
    case 'location':
      displayLocationMessage(message);
      break;
    case 'contact':
      displayContactMessage(message);
      break;
    case 'sticker':
      displayStickerMessage(message);
      break;
  }
});

// Payload completo
{
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "message": {
    "id": "clmsgxxxxxxxxxxxxxxxxxxxxxxx",
    "type": "text", // text, image, video, audio, document, location, contact, sticker
    "content": "Conteudo da mensagem",
    "direction": "incoming", // incoming, outgoing
    "sender": {
      "type": "contact", // contact, agent, bot
      "id": "clcontactxxx",
      "name": "Joao Silva",
      "phone": "5511999999999",
      "avatar": "https://..."
    },
    "media": { // se type != text
      "url": "https://storage.chatblue.io/...",
      "mimetype": "image/jpeg",
      "filename": "foto.jpg",
      "size": 153600,
      "caption": "Legenda da imagem"
    },
    "location": { // se type == location
      "latitude": -23.5505,
      "longitude": -46.6333,
      "name": "Local",
      "address": "Endereco completo"
    },
    "quotedMessage": { // se for resposta
      "id": "clmsgxxx",
      "content": "Mensagem original",
      "sender": "Joao"
    },
    "timestamp": "2024-01-15T14:30:00.000Z",
    "status": "received"
  }
}
```

## Status de Mensagem

### Estados Possiveis

| Status | Descricao |
|--------|-----------|
| `sending` | Enviando para o servidor |
| `sent` | Enviado para WhatsApp |
| `delivered` | Entregue ao destinatario |
| `read` | Lido pelo destinatario |
| `failed` | Falha no envio |

### message-status-update

Atualizacao de status.

```javascript
socket.on('message-status-update', (data) => {
  updateMessageStatus(data.messageId, data.status);
});

// Payload
{
  "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxxx",
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "status": "delivered",
  "timestamp": "2024-01-15T14:30:05.000Z"
}
```

## Indicador de Digitacao

### Enviar

```javascript
let typingTimeout;

function handleTyping(ticketId) {
  // Envia indicador de digitacao
  socket.emit('typing', { ticketId, isTyping: true });

  // Para de digitar apos 3 segundos de inatividade
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { ticketId, isTyping: false });
  }, 3000);
}

// Usar no evento de input
inputElement.addEventListener('input', () => {
  handleTyping('clticketxxx');
});
```

### Receber

```javascript
socket.on('agent-typing', (data) => {
  if (data.isTyping) {
    showTypingIndicator(data.ticketId, data.agent.name);
  } else {
    hideTypingIndicator(data.ticketId);
  }
});

socket.on('contact-typing', (data) => {
  if (data.isTyping) {
    showTypingIndicator(data.ticketId, 'Cliente');
  } else {
    hideTypingIndicator(data.ticketId);
  }
});
```

## Marcar como Lido

### read-messages

Marcar mensagens como lidas.

```javascript
// Marcar mensagens especificas
socket.emit('read-messages', {
  ticketId: 'clticketxxx',
  messageIds: ['clmsg1', 'clmsg2', 'clmsg3'],
});

// Marcar todas as mensagens do ticket
socket.emit('read-all-messages', {
  ticketId: 'clticketxxx',
});
```

## Reacoes

### add-reaction

Adicionar reacao a mensagem.

```javascript
socket.emit('add-reaction', {
  messageId: 'clmsgxxx',
  reaction: 'thumbsup', // thumbsup, heart, laugh, surprised, sad, angry
}, (response) => {
  console.log('Reacao adicionada');
});
```

### remove-reaction

Remover reacao.

```javascript
socket.emit('remove-reaction', {
  messageId: 'clmsgxxx',
});
```

### message-reaction

Reacao recebida.

```javascript
socket.on('message-reaction', (data) => {
  if (data.action === 'added') {
    addReactionToMessage(data.messageId, data.reaction, data.reactor);
  } else {
    removeReactionFromMessage(data.messageId, data.reactor.id);
  }
});
```

## Deletar Mensagem

### delete-message

Deletar mensagem enviada.

```javascript
socket.emit('delete-message', {
  messageId: 'clmsgxxx',
  deleteForEveryone: true, // tambem apaga no WhatsApp
}, (response) => {
  if (response.success) {
    removeMessageFromUI(response.messageId);
  }
});
```

### message-deleted

Mensagem deletada.

```javascript
socket.on('message-deleted', (data) => {
  if (data.deletedBy === 'contact') {
    // Cliente apagou a mensagem
    showDeletedPlaceholder(data.messageId, 'Esta mensagem foi apagada');
  } else {
    // Agente apagou
    removeMessageFromUI(data.messageId);
  }
});
```

## Exemplo Completo: Chat Component

```javascript
class ChatWebSocket {
  constructor(socket, ticketId) {
    this.socket = socket;
    this.ticketId = ticketId;
    this.messages = [];
    this.typingUsers = new Set();

    this.setupListeners();
    this.joinTicket();
  }

  setupListeners() {
    // Nova mensagem
    this.socket.on('new-message', (data) => {
      if (data.ticketId === this.ticketId) {
        this.messages.push(data.message);
        this.onNewMessage(data.message);
      }
    });

    // Status da mensagem
    this.socket.on('message-status-update', (data) => {
      if (data.ticketId === this.ticketId) {
        this.updateMessageStatus(data.messageId, data.status);
      }
    });

    // Digitando
    this.socket.on('contact-typing', (data) => {
      if (data.ticketId === this.ticketId) {
        if (data.isTyping) {
          this.typingUsers.add('contact');
        } else {
          this.typingUsers.delete('contact');
        }
        this.onTypingChange();
      }
    });

    // Reacao
    this.socket.on('message-reaction', (data) => {
      if (data.ticketId === this.ticketId) {
        this.handleReaction(data);
      }
    });

    // Mensagem deletada
    this.socket.on('message-deleted', (data) => {
      if (data.ticketId === this.ticketId) {
        this.handleMessageDeleted(data);
      }
    });
  }

  joinTicket() {
    this.socket.emit('join-ticket', { ticketId: this.ticketId });
  }

  leaveTicket() {
    this.socket.emit('leave-ticket', { ticketId: this.ticketId });
  }

  sendMessage(content, quotedMessageId = null) {
    return new Promise((resolve, reject) => {
      this.socket.emit('send-message', {
        ticketId: this.ticketId,
        content,
        quotedMessageId,
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  sendMedia(mediaUrl, type, caption = '') {
    return new Promise((resolve, reject) => {
      this.socket.emit('send-media', {
        ticketId: this.ticketId,
        type,
        mediaUrl,
        caption,
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  setTyping(isTyping) {
    this.socket.emit('typing', {
      ticketId: this.ticketId,
      isTyping,
    });
  }

  markAsRead(messageIds) {
    this.socket.emit('read-messages', {
      ticketId: this.ticketId,
      messageIds,
    });
  }

  addReaction(messageId, reaction) {
    this.socket.emit('add-reaction', { messageId, reaction });
  }

  deleteMessage(messageId, deleteForEveryone = false) {
    return new Promise((resolve, reject) => {
      this.socket.emit('delete-message', {
        messageId,
        deleteForEveryone,
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Callbacks - sobrescrever conforme necessario
  onNewMessage(message) {
    console.log('Nova mensagem:', message);
  }

  onTypingChange() {
    console.log('Digitando:', this.typingUsers.size > 0);
  }

  updateMessageStatus(messageId, status) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.status = status;
    }
  }

  handleReaction(data) {
    console.log('Reacao:', data);
  }

  handleMessageDeleted(data) {
    const index = this.messages.findIndex(m => m.id === data.messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
    }
  }

  destroy() {
    this.leaveTicket();
  }
}

// Uso
const chat = new ChatWebSocket(socket, 'clticketxxx');

// Sobrescrever callbacks
chat.onNewMessage = (message) => {
  appendMessageToUI(message);
  if (message.direction === 'incoming') {
    playNotificationSound();
  }
};

chat.onTypingChange = () => {
  if (chat.typingUsers.size > 0) {
    showTypingIndicator();
  } else {
    hideTypingIndicator();
  }
};

// Enviar mensagem
await chat.sendMessage('Ola!');

// Cleanup ao sair
chat.destroy();
```

## Notas Importantes

1. **Ordem**: Mensagens sao entregues na ordem de envio, mas podem chegar fora de ordem. Use `timestamp` para ordenar.
2. **Duplicatas**: O servidor pode enviar a mesma mensagem mais de uma vez em caso de reconexao. Use `messageId` para deduplicar.
3. **Timeout**: Mensagens que nao recebem ACK em 30 segundos sao consideradas falhas.
4. **Rate Limit**: Maximo de 20 mensagens por minuto por ticket.

## Endpoints Relacionados

- [Eventos WebSocket](/docs/api/websocket/eventos)
- [Rooms WebSocket](/docs/api/websocket/rooms)
- [Enviar Mensagem (REST)](/docs/api/mensagens/enviar-texto)
