---
sidebar_position: 5
title: WebSocket
description: Comunicacao em tempo real com Socket.io
---

# WebSocket

O ChatBlue usa Socket.io para comunicacao em tempo real entre o servidor e os clientes.

## Configuracao

### Servidor

```typescript
// sockets/index.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export const setupSockets = (httpServer: ReturnType<typeof createServer>) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware de autenticacao
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Token nao fornecido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        companyId: string;
        role: string;
      };

      // Verificar usuario
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        return next(new Error('Usuario invalido'));
      }

      // Anexar dados ao socket
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Autenticacao falhou'));
    }
  });

  // Handler de conexao
  io.on('connection', (socket) => {
    const { userId, companyId } = socket.data.user;

    console.log(`Usuario ${userId} conectado`);

    // Entrar na sala da empresa
    socket.join(`company:${companyId}`);

    // Atualizar status online
    updateUserOnlineStatus(userId, true);

    // Handlers de eventos
    setupEventHandlers(socket, io);

    // Handler de desconexao
    socket.on('disconnect', () => {
      console.log(`Usuario ${userId} desconectado`);
      updateUserOnlineStatus(userId, false);
    });
  });

  return io;
};
```

### Handlers de Eventos

```typescript
// sockets/handlers/index.ts
import { Socket, Server } from 'socket.io';
import { prisma } from '../../config/database';

export const setupEventHandlers = (socket: Socket, io: Server) => {
  const { userId, companyId } = socket.data.user;

  // === TICKET EVENTS ===

  // Entrar na sala de um ticket
  socket.on('ticket:join', async (ticketId: string) => {
    // Verificar acesso ao ticket
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, companyId },
    });

    if (ticket) {
      socket.join(`ticket:${ticketId}`);
      console.log(`Usuario ${userId} entrou no ticket ${ticketId}`);
    }
  });

  // Sair da sala de um ticket
  socket.on('ticket:leave', (ticketId: string) => {
    socket.leave(`ticket:${ticketId}`);
    console.log(`Usuario ${userId} saiu do ticket ${ticketId}`);
  });

  // === MESSAGE EVENTS ===

  // Enviar mensagem
  socket.on('message:send', async (data: {
    ticketId: string;
    content: string;
    mediaUrl?: string;
  }) => {
    try {
      // Criar mensagem no banco
      const message = await prisma.message.create({
        data: {
          companyId,
          ticketId: data.ticketId,
          userId,
          content: data.content,
          mediaUrl: data.mediaUrl,
          type: data.mediaUrl ? 'IMAGE' : 'TEXT',
          status: 'PENDING',
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      // Emitir para a sala do ticket
      io.to(`ticket:${data.ticketId}`).emit('message:sent', message);

      // Enviar via WhatsApp (async)
      sendWhatsAppMessage(data.ticketId, message);
    } catch (error) {
      socket.emit('message:error', { error: error.message });
    }
  });

  // === TYPING EVENTS ===

  // Inicio de digitacao
  socket.on('typing:start', (ticketId: string) => {
    socket.to(`ticket:${ticketId}`).emit('user:typing', {
      ticketId,
      userId,
      isTyping: true,
    });
  });

  // Fim de digitacao
  socket.on('typing:stop', (ticketId: string) => {
    socket.to(`ticket:${ticketId}`).emit('user:typing', {
      ticketId,
      userId,
      isTyping: false,
    });
  });

  // === PRESENCE EVENTS ===

  // Atualizar status online
  socket.on('presence:update', async (status: 'online' | 'away' | 'offline') => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: status === 'online',
        lastSeenAt: new Date(),
      },
    });

    io.to(`company:${companyId}`).emit('user:presence', {
      userId,
      status,
      lastSeenAt: new Date(),
    });
  });
};
```

## Eventos

### Eventos de Ticket

| Evento | Direcao | Descricao |
|--------|---------|-----------|
| `ticket:join` | Cliente -> Servidor | Entrar na sala de um ticket |
| `ticket:leave` | Cliente -> Servidor | Sair da sala de um ticket |
| `ticket:created` | Servidor -> Cliente | Novo ticket criado |
| `ticket:updated` | Servidor -> Cliente | Ticket atualizado |
| `ticket:assigned` | Servidor -> Cliente | Ticket atribuido |
| `ticket:transferred` | Servidor -> Cliente | Ticket transferido |

### Eventos de Mensagem

| Evento | Direcao | Descricao |
|--------|---------|-----------|
| `message:send` | Cliente -> Servidor | Enviar mensagem |
| `message:sent` | Servidor -> Cliente | Mensagem enviada com sucesso |
| `message:received` | Servidor -> Cliente | Nova mensagem recebida |
| `message:status` | Servidor -> Cliente | Status da mensagem atualizado |
| `message:error` | Servidor -> Cliente | Erro ao enviar mensagem |

### Eventos de Presenca

| Evento | Direcao | Descricao |
|--------|---------|-----------|
| `typing:start` | Cliente -> Servidor | Usuario comecou a digitar |
| `typing:stop` | Cliente -> Servidor | Usuario parou de digitar |
| `user:typing` | Servidor -> Cliente | Notificacao de digitacao |
| `user:online` | Servidor -> Cliente | Usuario ficou online |
| `user:offline` | Servidor -> Cliente | Usuario ficou offline |
| `user:presence` | Servidor -> Cliente | Status de presenca atualizado |

## Salas (Rooms)

### Estrutura de Salas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ESTRUTURA DE SALAS                              │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────┐
                          │   company:abc123    │
                          │                     │
                          │  Todos os usuarios  │
                          │   da empresa abc    │
                          │                     │
                          └──────────┬──────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │ ticket:t001  │  │ ticket:t002  │  │ ticket:t003  │
          │              │  │              │  │              │
          │  Usuarios    │  │  Usuarios    │  │  Usuarios    │
          │  no ticket   │  │  no ticket   │  │  no ticket   │
          │              │  │              │  │              │
          └──────────────┘  └──────────────┘  └──────────────┘
```

### Gerenciamento de Salas

```typescript
// Entrar em salas
socket.join(`company:${companyId}`);     // Sala da empresa
socket.join(`ticket:${ticketId}`);       // Sala do ticket
socket.join(`department:${deptId}`);     // Sala do departamento

// Sair de salas
socket.leave(`ticket:${ticketId}`);

// Emitir para sala especifica
io.to(`ticket:${ticketId}`).emit('message:received', message);
io.to(`company:${companyId}`).emit('ticket:created', ticket);

// Emitir para todos exceto o emissor
socket.to(`ticket:${ticketId}`).emit('user:typing', { userId });
```

## Emissao de Eventos

### Do Servidor para Cliente

```typescript
// Emitir para usuario especifico
io.to(socketId).emit('notification', data);

// Emitir para sala
io.to(`ticket:${ticketId}`).emit('message:received', message);

// Emitir para todos da empresa
io.to(`company:${companyId}`).emit('ticket:created', ticket);

// Broadcast global (todos conectados)
io.emit('system:announcement', message);
```

### De Services para Clients

```typescript
// services/message-processor.service.ts
import { io } from '../sockets';

class MessageProcessorService {
  async processIncomingMessage(message: Message, ticket: Ticket) {
    // ... processar mensagem

    // Emitir para frontend
    io.to(`ticket:${ticket.id}`).emit('message:received', {
      message,
      ticket,
    });

    io.to(`company:${ticket.companyId}`).emit('ticket:updated', {
      ticketId: ticket.id,
      lastMessage: message,
    });
  }
}
```

## Cliente (Frontend)

### Conexao

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(process.env.NEXT_PUBLIC_API_URL!, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket conectado');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket desconectado:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Erro de conexao:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
```

### Provider React

```typescript
// components/providers/SocketProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = connectSocket(token);
      setSocket(newSocket);
    }

    return () => {
      disconnectSocket();
      setSocket(null);
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

### Hooks de Uso

```typescript
// hooks/useTicketSocket.ts
import { useEffect } from 'react';
import { useSocket } from '@/components/providers/SocketProvider';
import { useChatStore } from '@/stores/chat.store';

export const useTicketSocket = (ticketId: string) => {
  const socket = useSocket();
  const { addMessage, updateMessage, setTypingUser } = useChatStore();

  useEffect(() => {
    if (!socket || !ticketId) return;

    // Entrar na sala do ticket
    socket.emit('ticket:join', ticketId);

    // Handlers
    const handleMessageReceived = (message: Message) => {
      addMessage(message);
    };

    const handleMessageStatus = (data: { messageId: string; status: string }) => {
      updateMessage(data.messageId, { status: data.status });
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingUser(data.isTyping ? data.userId : null);
    };

    // Registrar listeners
    socket.on('message:received', handleMessageReceived);
    socket.on('message:status', handleMessageStatus);
    socket.on('user:typing', handleTyping);

    // Cleanup
    return () => {
      socket.emit('ticket:leave', ticketId);
      socket.off('message:received', handleMessageReceived);
      socket.off('message:status', handleMessageStatus);
      socket.off('user:typing', handleTyping);
    };
  }, [socket, ticketId]);

  // Funcoes para emitir eventos
  const sendMessage = (content: string, mediaUrl?: string) => {
    socket?.emit('message:send', { ticketId, content, mediaUrl });
  };

  const startTyping = () => {
    socket?.emit('typing:start', ticketId);
  };

  const stopTyping = () => {
    socket?.emit('typing:stop', ticketId);
  };

  return { sendMessage, startTyping, stopTyping };
};
```

## Reconexao

### Estrategia de Reconexao

```typescript
// Configuracao do cliente
const socket = io(url, {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
});

// Handlers de reconexao
socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconectado apos ${attemptNumber} tentativas`);
  // Re-join nas salas necessarias
  socket.emit('ticket:join', currentTicketId);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`Tentativa de reconexao ${attemptNumber}`);
});

socket.on('reconnect_failed', () => {
  console.error('Falha na reconexao');
  // Mostrar mensagem ao usuario
});
```

## Debugging

### Logs do Servidor

```typescript
// Habilitar debug do Socket.io
DEBUG=socket.io* node server.js

// Log de eventos
io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    console.log(`[Socket ${socket.id}] ${event}:`, args);
  });
});
```

### Logs do Cliente

```typescript
// Habilitar debug no cliente
localStorage.debug = 'socket.io-client:*';

// Log de todos os eventos
socket.onAny((event, ...args) => {
  console.log('[Socket]', event, args);
});
```

## Proximos Passos

- [Jobs](/backend/jobs)
- [Utils](/backend/utils)
- [Frontend](/frontend/visao-geral)
