---
sidebar_position: 1
title: Eventos WebSocket
description: Referencia de eventos WebSocket do ChatBlue
---

# Eventos WebSocket

Referencia completa dos eventos WebSocket do ChatBlue.

## Visao Geral

O ChatBlue utiliza Socket.io para comunicacao em tempo real. Atraves do WebSocket, voce recebe notificacoes instantaneas sobre novas mensagens, atualizacoes de tickets, status de conexoes e muito mais.

## Conexao

### URL de Conexao

```
wss://api.chatblue.io
```

### Autenticacao

A conexao WebSocket requer autenticacao via token JWT:

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.chatblue.io', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Conectado ao WebSocket');
  console.log('Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Erro de conexao:', error.message);
});
```

## Eventos do Cliente (Emit)

Eventos que o cliente pode enviar para o servidor.

### join-company

Entrar na sala da empresa para receber eventos.

```javascript
socket.emit('join-company', { companyId: 'clcompanyxxx' });
```

### join-ticket

Entrar na sala de um ticket especifico.

```javascript
socket.emit('join-ticket', { ticketId: 'clticketxxx' });
```

### leave-ticket

Sair da sala de um ticket.

```javascript
socket.emit('leave-ticket', { ticketId: 'clticketxxx' });
```

### typing

Indicar que o usuario esta digitando.

```javascript
socket.emit('typing', {
  ticketId: 'clticketxxx',
  isTyping: true,
});
```

### read-messages

Marcar mensagens como lidas.

```javascript
socket.emit('read-messages', {
  ticketId: 'clticketxxx',
  messageIds: ['clmsg1', 'clmsg2'],
});
```

### agent-status

Atualizar status do agente.

```javascript
socket.emit('agent-status', {
  status: 'online', // online, away, busy, offline
});
```

## Eventos do Servidor (On)

Eventos que o servidor envia para o cliente.

### Mensagens

#### new-message

Nova mensagem recebida.

```javascript
socket.on('new-message', (data) => {
  console.log('Nova mensagem:', data);
});

// Payload
{
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "message": {
    "id": "clmsgxxxxxxxxxxxxxxxxxxxxxxx",
    "content": "Ola, preciso de ajuda",
    "type": "text",
    "direction": "incoming",
    "sender": {
      "type": "contact",
      "id": "clcontactxxx",
      "name": "Joao Silva",
      "phone": "5511999999999"
    },
    "timestamp": "2024-01-15T14:30:00.000Z",
    "status": "received"
  }
}
```

#### message-status-update

Atualizacao de status de mensagem.

```javascript
socket.on('message-status-update', (data) => {
  console.log('Status atualizado:', data);
});

// Payload
{
  "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxxx",
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "status": "read", // sent, delivered, read, failed
  "timestamp": "2024-01-15T14:31:00.000Z"
}
```

#### message-deleted

Mensagem deletada.

```javascript
socket.on('message-deleted', (data) => {
  console.log('Mensagem deletada:', data);
});

// Payload
{
  "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxxx",
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "deletedBy": "agent",
  "timestamp": "2024-01-15T14:32:00.000Z"
}
```

#### message-reaction

Reacao adicionada/removida.

```javascript
socket.on('message-reaction', (data) => {
  console.log('Reacao:', data);
});

// Payload
{
  "messageId": "clmsgxxxxxxxxxxxxxxxxxxxxxxx",
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "reaction": "thumbsup",
  "action": "added", // added, removed
  "reactor": {
    "type": "agent",
    "id": "clagentxxx",
    "name": "Atendente"
  }
}
```

### Tickets

#### new-ticket

Novo ticket criado.

```javascript
socket.on('new-ticket', (data) => {
  console.log('Novo ticket:', data);
});

// Payload
{
  "ticket": {
    "id": "clticketxxxxxxxxxxxxxxxxxx",
    "protocol": "20240115-0001",
    "status": "open",
    "priority": "medium",
    "contact": {
      "id": "clcontactxxx",
      "name": "Joao Silva",
      "phone": "5511999999999"
    },
    "department": {
      "id": "cldeptxxx",
      "name": "Suporte"
    },
    "lastMessage": {
      "content": "Ola, preciso de ajuda",
      "timestamp": "2024-01-15T14:30:00.000Z"
    },
    "createdAt": "2024-01-15T14:30:00.000Z"
  }
}
```

#### ticket-updated

Ticket atualizado.

```javascript
socket.on('ticket-updated', (data) => {
  console.log('Ticket atualizado:', data);
});

// Payload
{
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "changes": {
    "status": { "from": "open", "to": "in_progress" },
    "assignedTo": { "from": null, "to": { "id": "clagentxxx", "name": "Atendente" } }
  },
  "updatedBy": {
    "id": "clagentxxx",
    "name": "Atendente"
  },
  "timestamp": "2024-01-15T14:35:00.000Z"
}
```

#### ticket-assigned

Ticket atribuido a agente.

```javascript
socket.on('ticket-assigned', (data) => {
  console.log('Ticket atribuido:', data);
});

// Payload
{
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "agent": {
    "id": "clagentxxx",
    "name": "Atendente"
  },
  "previousAgent": null,
  "timestamp": "2024-01-15T14:35:00.000Z"
}
```

#### ticket-transferred

Ticket transferido.

```javascript
socket.on('ticket-transferred', (data) => {
  console.log('Ticket transferido:', data);
});

// Payload
{
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "from": {
    "department": { "id": "cldept1", "name": "Vendas" },
    "agent": { "id": "clagent1", "name": "Vendedor" }
  },
  "to": {
    "department": { "id": "cldept2", "name": "Suporte" },
    "agent": null
  },
  "reason": "Cliente precisa de suporte tecnico",
  "timestamp": "2024-01-15T14:40:00.000Z"
}
```

### Conexoes WhatsApp

#### connection-status

Status da conexao WhatsApp.

```javascript
socket.on('connection-status', (data) => {
  console.log('Status conexao:', data);
});

// Payload
{
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "status": "connected", // disconnected, connecting, connected, qr_code
  "phone": "5511999999999",
  "name": "Empresa ABC",
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

#### qr-code

QR Code para conexao.

```javascript
socket.on('qr-code', (data) => {
  console.log('QR Code recebido');
  document.getElementById('qr').src = data.qrCode;
});

// Payload
{
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "expiresAt": "2024-01-15T14:35:00.000Z"
}
```

#### connection-authenticated

Conexao autenticada com sucesso.

```javascript
socket.on('connection-authenticated', (data) => {
  console.log('Conexao autenticada:', data);
});

// Payload
{
  "connectionId": "clconnxxxxxxxxxxxxxxxxxxxxxx",
  "phone": "5511999999999",
  "name": "Empresa ABC",
  "profilePicture": "https://...",
  "timestamp": "2024-01-15T14:32:00.000Z"
}
```

### Agentes

#### agent-online

Agente ficou online.

```javascript
socket.on('agent-online', (data) => {
  console.log('Agente online:', data);
});

// Payload
{
  "agent": {
    "id": "clagentxxx",
    "name": "Atendente",
    "avatar": "https://..."
  },
  "timestamp": "2024-01-15T08:00:00.000Z"
}
```

#### agent-offline

Agente ficou offline.

```javascript
socket.on('agent-offline', (data) => {
  console.log('Agente offline:', data);
});

// Payload
{
  "agentId": "clagentxxx",
  "timestamp": "2024-01-15T18:00:00.000Z"
}
```

#### agent-typing

Agente esta digitando.

```javascript
socket.on('agent-typing', (data) => {
  console.log('Agente digitando:', data);
});

// Payload
{
  "ticketId": "clticketxxx",
  "agent": {
    "id": "clagentxxx",
    "name": "Atendente"
  },
  "isTyping": true
}
```

### Notificacoes

#### notification

Notificacao geral.

```javascript
socket.on('notification', (data) => {
  showNotification(data);
});

// Payload
{
  "id": "clnotifxxx",
  "type": "info", // info, warning, error, success
  "title": "Novo ticket atribuido",
  "message": "Voce recebeu um novo ticket de Joao Silva",
  "action": {
    "type": "open-ticket",
    "ticketId": "clticketxxx"
  },
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

## Exemplo Completo

```javascript
import { io } from 'socket.io-client';

class ChatBlueSocket {
  constructor(token) {
    this.socket = io('https://api.chatblue.io', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupListeners();
  }

  setupListeners() {
    // Conexao
    this.socket.on('connect', () => {
      console.log('Conectado');
      this.socket.emit('join-company', { companyId: this.companyId });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Desconectado:', reason);
    });

    this.socket.on('reconnect', (attempt) => {
      console.log('Reconectado apos', attempt, 'tentativas');
    });

    // Mensagens
    this.socket.on('new-message', (data) => {
      this.handleNewMessage(data);
    });

    this.socket.on('message-status-update', (data) => {
      this.handleMessageStatus(data);
    });

    // Tickets
    this.socket.on('new-ticket', (data) => {
      this.handleNewTicket(data);
    });

    this.socket.on('ticket-updated', (data) => {
      this.handleTicketUpdate(data);
    });

    // Conexao WhatsApp
    this.socket.on('connection-status', (data) => {
      this.handleConnectionStatus(data);
    });
  }

  handleNewMessage(data) {
    // Atualizar UI com nova mensagem
    console.log('Nova mensagem:', data.message.content);
  }

  handleMessageStatus(data) {
    // Atualizar status da mensagem na UI
    console.log('Mensagem', data.messageId, 'agora esta', data.status);
  }

  handleNewTicket(data) {
    // Mostrar notificacao de novo ticket
    console.log('Novo ticket:', data.ticket.protocol);
  }

  handleTicketUpdate(data) {
    // Atualizar ticket na UI
    console.log('Ticket atualizado:', data.ticketId);
  }

  handleConnectionStatus(data) {
    // Atualizar status da conexao na UI
    console.log('Conexao', data.connectionId, ':', data.status);
  }

  joinTicket(ticketId) {
    this.socket.emit('join-ticket', { ticketId });
  }

  leaveTicket(ticketId) {
    this.socket.emit('leave-ticket', { ticketId });
  }

  sendTyping(ticketId, isTyping) {
    this.socket.emit('typing', { ticketId, isTyping });
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Uso
const chatSocket = new ChatBlueSocket(accessToken);
```

## Notas Importantes

1. **Reconexao**: O Socket.io reconecta automaticamente em caso de queda.
2. **Rooms**: Eventos sao enviados apenas para usuarios na room apropriada.
3. **Autenticacao**: Token expira apos 24h, renove antes de expirar.
4. **Rate Limit**: Maximo de 100 eventos por minuto por conexao.

## Endpoints Relacionados

- [Rooms WebSocket](/docs/api/websocket/rooms)
- [Mensagens em Tempo Real](/docs/api/websocket/mensagens)
