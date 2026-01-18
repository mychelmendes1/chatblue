---
sidebar_position: 2
title: Rooms WebSocket
description: Sistema de rooms do WebSocket ChatBlue
---

# Rooms WebSocket

Sistema de rooms para organizacao de eventos em tempo real.

## Visao Geral

O ChatBlue utiliza o conceito de "rooms" do Socket.io para organizar a distribuicao de eventos. Ao entrar em uma room, voce recebe apenas os eventos relevantes para aquele contexto.

## Tipos de Rooms

### Company Room

Room principal da empresa. Todos os eventos da empresa sao enviados aqui.

**Formato**: `company:{companyId}`

```javascript
// Entrar na room da empresa
socket.emit('join-company', { companyId: 'clcompanyxxx' });

// O servidor adiciona o socket a room: company:clcompanyxxx
```

**Eventos recebidos**:
- `new-ticket` - Novos tickets
- `connection-status` - Status das conexoes WhatsApp
- `agent-online` / `agent-offline` - Status dos agentes
- `notification` - Notificacoes gerais

### Ticket Room

Room de um ticket especifico. Apenas eventos daquele ticket.

**Formato**: `ticket:{ticketId}`

```javascript
// Entrar na room do ticket
socket.emit('join-ticket', { ticketId: 'clticketxxx' });

// Sair da room do ticket
socket.emit('leave-ticket', { ticketId: 'clticketxxx' });
```

**Eventos recebidos**:
- `new-message` - Novas mensagens do ticket
- `message-status-update` - Status das mensagens
- `message-deleted` - Mensagens deletadas
- `message-reaction` - Reacoes em mensagens
- `ticket-updated` - Atualizacoes do ticket
- `agent-typing` - Indicador de digitacao

### Department Room

Room de um departamento. Eventos de tickets do departamento.

**Formato**: `department:{departmentId}`

```javascript
// Entrar na room do departamento
socket.emit('join-department', { departmentId: 'cldeptxxx' });
```

**Eventos recebidos**:
- `new-ticket` - Novos tickets do departamento
- `ticket-assigned` - Atribuicoes de tickets
- `ticket-transferred` - Transferencias para/do departamento

### Connection Room

Room de uma conexao WhatsApp especifica.

**Formato**: `connection:{connectionId}`

```javascript
// Entrar na room da conexao
socket.emit('join-connection', { connectionId: 'clconnxxx' });
```

**Eventos recebidos**:
- `connection-status` - Status da conexao
- `qr-code` - QR Code para autenticacao
- `connection-authenticated` - Conexao autenticada

## Gerenciamento de Rooms

### Entrar em Rooms

```javascript
class RoomManager {
  constructor(socket) {
    this.socket = socket;
    this.currentRooms = new Set();
  }

  // Entrar na room da empresa (obrigatorio)
  joinCompany(companyId) {
    this.socket.emit('join-company', { companyId });
    this.currentRooms.add(`company:${companyId}`);
  }

  // Entrar em um ticket
  joinTicket(ticketId) {
    this.socket.emit('join-ticket', { ticketId });
    this.currentRooms.add(`ticket:${ticketId}`);
  }

  // Sair de um ticket
  leaveTicket(ticketId) {
    this.socket.emit('leave-ticket', { ticketId });
    this.currentRooms.delete(`ticket:${ticketId}`);
  }

  // Entrar em departamento
  joinDepartment(departmentId) {
    this.socket.emit('join-department', { departmentId });
    this.currentRooms.add(`department:${departmentId}`);
  }

  // Entrar em conexao
  joinConnection(connectionId) {
    this.socket.emit('join-connection', { connectionId });
    this.currentRooms.add(`connection:${connectionId}`);
  }

  // Listar rooms atuais
  getRooms() {
    return Array.from(this.currentRooms);
  }

  // Sair de todas as rooms
  leaveAll() {
    for (const room of this.currentRooms) {
      const [type, id] = room.split(':');
      if (type === 'ticket') {
        this.socket.emit('leave-ticket', { ticketId: id });
      } else if (type === 'department') {
        this.socket.emit('leave-department', { departmentId: id });
      } else if (type === 'connection') {
        this.socket.emit('leave-connection', { connectionId: id });
      }
    }
    this.currentRooms.clear();
  }
}

// Uso
const rooms = new RoomManager(socket);
rooms.joinCompany('clcompanyxxx');
rooms.joinDepartment('cldeptxxx');

// Ao abrir um ticket
rooms.joinTicket('clticketxxx');

// Ao fechar o ticket
rooms.leaveTicket('clticketxxx');
```

## Permissoes por Room

Nem todos os usuarios podem entrar em todas as rooms:

| Room | AGENT | SUPERVISOR | ADMIN | SUPER_ADMIN |
|------|-------|------------|-------|-------------|
| Company | Sim | Sim | Sim | Sim |
| Ticket (proprio) | Sim | Sim | Sim | Sim |
| Ticket (outros) | Nao | Departamento | Sim | Sim |
| Department | Proprio | Supervisionados | Todos | Todos |
| Connection | Nao | Nao | Sim | Sim |

## Eventos de Room

### room-joined

Confirmacao de entrada na room.

```javascript
socket.on('room-joined', (data) => {
  console.log('Entrou na room:', data.room);
});

// Payload
{
  "room": "ticket:clticketxxx",
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

### room-left

Confirmacao de saida da room.

```javascript
socket.on('room-left', (data) => {
  console.log('Saiu da room:', data.room);
});

// Payload
{
  "room": "ticket:clticketxxx",
  "timestamp": "2024-01-15T14:35:00.000Z"
}
```

### room-error

Erro ao entrar/sair de room.

```javascript
socket.on('room-error', (data) => {
  console.error('Erro de room:', data.error);
});

// Payload
{
  "action": "join",
  "room": "ticket:clticketxxx",
  "error": "Access denied",
  "code": "FORBIDDEN"
}
```

## Usuarios na Room

### room-users

Listar usuarios em uma room.

```javascript
socket.emit('room-users', { ticketId: 'clticketxxx' }, (response) => {
  console.log('Usuarios na room:', response.users);
});

// Response
{
  "room": "ticket:clticketxxx",
  "users": [
    { "id": "clagent1", "name": "Atendente 1", "status": "active" },
    { "id": "clagent2", "name": "Atendente 2", "status": "away" }
  ]
}
```

### user-joined-room

Usuario entrou na room.

```javascript
socket.on('user-joined-room', (data) => {
  console.log('Usuario entrou:', data.user.name);
});

// Payload
{
  "room": "ticket:clticketxxx",
  "user": {
    "id": "clagentxxx",
    "name": "Atendente",
    "avatar": "https://..."
  },
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

### user-left-room

Usuario saiu da room.

```javascript
socket.on('user-left-room', (data) => {
  console.log('Usuario saiu:', data.userId);
});

// Payload
{
  "room": "ticket:clticketxxx",
  "userId": "clagentxxx",
  "timestamp": "2024-01-15T14:35:00.000Z"
}
```

## Exemplo: Chat com Multiplos Tickets

```javascript
class TicketChatManager {
  constructor(socket) {
    this.socket = socket;
    this.activeTickets = new Map();

    this.setupListeners();
  }

  setupListeners() {
    // Mensagens de qualquer ticket ativo
    this.socket.on('new-message', (data) => {
      if (this.activeTickets.has(data.ticketId)) {
        this.addMessage(data.ticketId, data.message);
      }
    });

    // Digitacao
    this.socket.on('agent-typing', (data) => {
      if (this.activeTickets.has(data.ticketId)) {
        this.showTypingIndicator(data.ticketId, data.isTyping);
      }
    });
  }

  // Abrir ticket em aba/janela
  openTicket(ticketId) {
    if (this.activeTickets.has(ticketId)) return;

    this.socket.emit('join-ticket', { ticketId });
    this.activeTickets.set(ticketId, {
      messages: [],
      isTyping: false,
    });

    console.log(`Ticket ${ticketId} aberto`);
  }

  // Fechar ticket
  closeTicket(ticketId) {
    if (!this.activeTickets.has(ticketId)) return;

    this.socket.emit('leave-ticket', { ticketId });
    this.activeTickets.delete(ticketId);

    console.log(`Ticket ${ticketId} fechado`);
  }

  // Enviar indicador de digitacao
  sendTyping(ticketId, isTyping) {
    this.socket.emit('typing', { ticketId, isTyping });
  }

  addMessage(ticketId, message) {
    const ticket = this.activeTickets.get(ticketId);
    if (ticket) {
      ticket.messages.push(message);
      this.updateUI(ticketId);
    }
  }

  showTypingIndicator(ticketId, isTyping) {
    const ticket = this.activeTickets.get(ticketId);
    if (ticket) {
      ticket.isTyping = isTyping;
      this.updateUI(ticketId);
    }
  }

  updateUI(ticketId) {
    // Atualizar interface do ticket
    console.log(`Atualizando UI do ticket ${ticketId}`);
  }

  // Fechar todos os tickets
  closeAll() {
    for (const ticketId of this.activeTickets.keys()) {
      this.closeTicket(ticketId);
    }
  }
}

// Uso
const chatManager = new TicketChatManager(socket);

// Ao clicar em um ticket na lista
chatManager.openTicket('clticket1');
chatManager.openTicket('clticket2');

// Ao fechar aba do ticket
chatManager.closeTicket('clticket1');
```

## Notas Importantes

1. **Limite de Rooms**: Cada socket pode estar em ate 50 rooms simultaneamente.
2. **Auto-Join**: Ao conectar, o servidor automaticamente adiciona o socket a room da empresa.
3. **Cleanup**: Ao desconectar, todas as rooms sao limpas automaticamente.
4. **Reconnect**: Apos reconexao, voce precisa entrar novamente nas rooms.

## Endpoints Relacionados

- [Eventos WebSocket](/docs/api/websocket/eventos)
- [Mensagens em Tempo Real](/docs/api/websocket/mensagens)
