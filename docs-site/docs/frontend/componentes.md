---
sidebar_position: 3
title: Componentes
description: Componentes React do ChatBlue
---

# Componentes

Documentacao dos principais componentes React do ChatBlue.

## Componentes do Chat

### ChatSidebar

Lista de conversas/tickets:

```typescript
// components/chat/ChatSidebar.tsx
'use client';

import { useState } from 'react';
import { useTickets } from '@/hooks/useTickets';
import { useChatStore } from '@/stores/chat.store';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageSquare } from 'lucide-react';
import { formatRelative, cn } from '@/lib/utils';

type TabFilter = 'all' | 'mine' | 'ai' | 'pending';

export function ChatSidebar() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabFilter>('all');
  const { activeTicketId, setActiveTicket } = useChatStore();

  const { data: tickets, isLoading } = useTickets({
    search,
    filter: tab,
  });

  return (
    <div className="w-80 border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg mb-4">Conversas</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">Todas</TabsTrigger>
            <TabsTrigger value="mine" className="flex-1">Minhas</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">IA</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">Fila</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Ticket List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <TicketListSkeleton />
        ) : tickets?.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y">
            {tickets?.map((ticket) => (
              <TicketItem
                key={ticket.id}
                ticket={ticket}
                isActive={ticket.id === activeTicketId}
                onClick={() => setActiveTicket(ticket.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function TicketItem({ ticket, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left hover:bg-muted/50 transition-colors',
        isActive && 'bg-muted'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar>
          <img src={ticket.contact.avatarUrl || '/placeholder-avatar.png'} />
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate">
              {ticket.contact.name || ticket.contact.phone}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelative(ticket.updatedAt)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground truncate mt-1">
            {ticket.lastMessage?.content || 'Sem mensagens'}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant={getStatusVariant(ticket.status)}>
              {ticket.status}
            </Badge>
            {ticket.isAIHandled && (
              <Badge variant="secondary">IA</Badge>
            )}
            {ticket.unreadCount > 0 && (
              <Badge variant="destructive">{ticket.unreadCount}</Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
```

### ChatWindow

Janela de mensagens:

```typescript
// components/chat/ChatWindow.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chat.store';
import { useMessages } from '@/hooks/useMessages';
import { useTicketSocket } from '@/hooks/useTicketSocket';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TicketHeader } from './TicketHeader';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export function ChatWindow() {
  const { activeTicketId, messages, typingUserId } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading: ticketLoading } = useTicket(activeTicketId);
  const { isLoading: messagesLoading } = useMessages(activeTicketId);

  // Socket hooks
  const { sendMessage, startTyping, stopTyping } = useTicketSocket(activeTicketId);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeTicketId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione uma conversa para comecar</p>
        </div>
      </div>
    );
  }

  if (ticketLoading) {
    return <ChatWindowSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <TicketHeader ticket={ticket} />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <MessagesSkeleton />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {typingUserId && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
        disabled={ticket?.status === 'CLOSED'}
      />
    </div>
  );
}
```

### MessageBubble

Bolha de mensagem:

```typescript
// components/chat/MessageBubble.tsx
import { cn, formatTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isFromContact = !message.userId;
  const isInternal = message.isInternal;

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[80%]',
        isFromContact ? 'mr-auto' : 'ml-auto flex-row-reverse'
      )}
    >
      {/* Avatar */}
      {isFromContact && (
        <Avatar className="h-8 w-8">
          <img src="/placeholder-avatar.png" />
        </Avatar>
      )}

      {/* Bubble */}
      <div
        className={cn(
          'rounded-lg px-4 py-2',
          isFromContact
            ? 'bg-muted'
            : isInternal
              ? 'bg-yellow-100 dark:bg-yellow-900'
              : 'bg-primary text-primary-foreground'
        )}
      >
        {/* AI Badge */}
        {message.isAIGenerated && (
          <span className="text-xs opacity-70 block mb-1">
            Resposta da IA
          </span>
        )}

        {/* Content */}
        {message.type === 'TEXT' && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {message.type === 'IMAGE' && (
          <img
            src={message.mediaUrl}
            alt="Imagem"
            className="rounded max-w-sm"
          />
        )}

        {message.type === 'AUDIO' && (
          <audio controls src={message.mediaUrl} className="max-w-xs" />
        )}

        {message.type === 'VIDEO' && (
          <video controls src={message.mediaUrl} className="rounded max-w-sm" />
        )}

        {message.type === 'DOCUMENT' && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-500 underline"
          >
            <FileText className="h-4 w-4" />
            Documento
          </a>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-xs opacity-70">
            {formatTime(message.createdAt)}
          </span>

          {/* Status */}
          {!isFromContact && (
            <MessageStatus status={message.status} />
          )}
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return <Clock className="h-3 w-3 opacity-70" />;
    case 'SENT':
      return <Check className="h-3 w-3 opacity-70" />;
    case 'DELIVERED':
      return <CheckCheck className="h-3 w-3 opacity-70" />;
    case 'READ':
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case 'FAILED':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
}
```

### ChatInput

Input de mensagem:

```typescript
// components/chat/ChatInput.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, Mic } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

interface ChatInputProps {
  onSend: (content: string, mediaUrl?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!message.trim()) return;

    onSend(message);
    setMessage('');
    onTypingStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Typing indicator
    onTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 2000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Upload file and send
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const { url } = await response.json();
    onSend('', url);
  };

  return (
    <div className="border-t p-4">
      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-20 right-4">
          <EmojiPicker onSelect={handleEmojiSelect} />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File Upload */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />

        {/* Message Input */}
        <Textarea
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          disabled={disabled}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />

        {/* Emoji */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => setShowEmoji(!showEmoji)}
        >
          <Smile className="h-5 w-5" />
        </Button>

        {/* Send */}
        <Button
          size="icon"
          disabled={disabled || !message.trim()}
          onClick={handleSubmit}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
```

## Componentes de Layout

### DashboardLayout

```typescript
// components/layout/DashboardLayout.tsx
'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        )}
      >
        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

### ProtectedRoute

```typescript
// components/layout/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push('/login');
    }
  }, [isAuthenticated, token, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
```

## Componentes UI (Shadcn)

O ChatBlue usa componentes do Shadcn/UI. Principais componentes:

- **Button**: Botoes com variantes
- **Input/Textarea**: Campos de entrada
- **Dialog/Sheet**: Modais e paineis
- **Table**: Tabelas de dados
- **Tabs**: Abas de navegacao
- **Badge**: Indicadores de status
- **Avatar**: Imagens de perfil
- **Toast**: Notificacoes
- **Form**: Formularios com validacao

## Proximos Passos

- [Paginas](/frontend/paginas)
- [Stores](/frontend/stores)
- [Hooks](/frontend/hooks)
