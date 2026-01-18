---
sidebar_position: 5
title: Gerenciamento de Estado (Zustand)
description: Documentacao completa das stores Zustand do ChatBlue para gerenciamento de estado global
---

# Gerenciamento de Estado (Zustand)

O ChatBlue utiliza o **Zustand** como biblioteca de gerenciamento de estado global. O Zustand foi escolhido por sua simplicidade, performance e integracao natural com React.

## Por que Zustand?

- **Simplicidade**: API minimalista e intuitiva
- **Performance**: Sem re-renders desnecessarios, selecao granular de estado
- **TypeScript**: Excelente suporte a tipagem
- **Persistencia**: Middleware nativo para persistir estado no localStorage
- **DevTools**: Integracao com React DevTools
- **Bundle Size**: Apenas ~1KB gzipped

## Arquitetura das Stores

```
stores/
├── auth.store.ts    # Autenticacao e usuario
└── chat.store.ts    # Chat, tickets e mensagens
```

---

## Auth Store

A `auth.store` gerencia todo o estado de autenticacao do usuario, incluindo login, logout, tokens e troca de empresas (multi-tenant).

**Arquivo:** `stores/auth.store.ts`

### Interfaces

```typescript
export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role?: string;
  isPrimary?: boolean;
  unreadCount?: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  isAI: boolean;
  company: Company;
  activeCompany?: Company;
  companies?: Company[];
}

interface AuthState {
  // Estado
  user: User | null;
  companies: Company[];
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isSwitchingCompany: boolean;

  // Acoes
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
}
```

### Implementacao

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      companies: [],
      accessToken: null,
      refreshToken: null,
      isLoading: true,
      isSwitchingCompany: false,

      // Acoes
      login: async (email, password, companyId) => {
        const response = await api.post<{
          user: User;
          companies: Company[];
          accessToken: string;
          refreshToken: string;
        }>("/auth/login", {
          email,
          password,
          ...(companyId && { companyId }),
        });

        const { user, companies, accessToken, refreshToken } = response.data;

        set({
          user,
          companies: companies || [],
          accessToken,
          refreshToken,
          isLoading: false,
        });
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch (error) {
          // Ignore errors
        }
        set({
          user: null,
          companies: [],
          accessToken: null,
          refreshToken: null,
        });
      },

      checkAuth: async () => {
        const { accessToken } = get();

        if (!accessToken) {
          set({ isLoading: false });
          return;
        }

        try {
          const [userResponse, companiesResponse] = await Promise.all([
            api.get<User>("/auth/me"),
            api.get<Company[]>("/user-access/my-companies"),
          ]);

          const { companies: userCompanies, activeCompany, ...userData } = userResponse.data;
          const companiesWithUnread = companiesResponse.data || [];

          set({
            user: {
              ...userData,
              company: activeCompany || userData.company,
              activeCompany,
              companies: companiesWithUnread,
            },
            companies: companiesWithUnread,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            companies: [],
            accessToken: null,
            refreshToken: null,
            isLoading: false,
          });
        }
      },

      switchCompany: async (companyId: string) => {
        const { user } = get();

        if (!user || user.company?.id === companyId) {
          return;
        }

        set({ isSwitchingCompany: true });

        try {
          const response = await api.post<{
            company: Company;
            role: string;
            accessToken: string;
            refreshToken: string;
          }>("/user-access/switch-company", { companyId });

          const { company, role, accessToken, refreshToken } = response.data;

          set({
            user: {
              ...user,
              role,
              company,
              activeCompany: company,
            },
            accessToken,
            refreshToken,
            isSwitchingCompany: false,
          });

          // Dispara evento customizado para atualizar dados
          window.dispatchEvent(new CustomEvent('company-switched', {
            detail: { companyId: company.id, companyName: company.name }
          }));
        } catch (error) {
          set({ isSwitchingCompany: false });
          throw error;
        }
      },
    }),
    {
      name: "chatblue-auth",
      // Persiste apenas tokens
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

### Exemplo de Uso

```tsx
"use client";

import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const { login, isLoading, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      router.push("/chat");
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
```

### Verificacao de Autenticacao

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

### Selecao Granular de Estado

Para evitar re-renders desnecessarios, selecione apenas o estado necessario:

```tsx
// Ruim - re-renderiza em qualquer mudanca da store
const authState = useAuthStore();

// Bom - re-renderiza apenas quando user muda
const user = useAuthStore((state) => state.user);

// Bom - seleciona multiplos valores
const { user, isLoading } = useAuthStore((state) => ({
  user: state.user,
  isLoading: state.isLoading,
}));
```

---

## Chat Store

A `chat.store` gerencia todo o estado relacionado ao chat, incluindo tickets, mensagens, filtros e selecao.

**Arquivo:** `stores/chat.store.ts`

### Interfaces

```typescript
interface Contact {
  id: string;
  name?: string;
  phone: string;
  avatar?: string;
  isClient?: boolean;
}

export interface Message {
  id: string;
  type: string;              // TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT, TEMPLATE, SYSTEM
  content?: string;
  mediaUrl?: string;
  caption?: string;          // Legenda para midias
  transcription?: string;    // Transcricao de audio
  isFromMe: boolean;
  isAIGenerated: boolean;
  status: string;            // PENDING, SENT, DELIVERED, READ, FAILED
  createdAt: string;
  ticketId?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
    isAI: boolean;
  };
  quoted?: {                 // Mensagem respondida
    id: string;
    content?: string;
    type: string;
    isFromMe: boolean;
  };
  quotedId?: string;
  reactions?: Array<{        // Reacoes
    emoji: string;
    userId: string;
    userName: string;
    timestamp: string;
  }>;
  deletedAt?: string;        // Soft delete
  deletedBy?: string;
}

export interface Ticket {
  id: string;
  protocol: string;
  status: string;            // PENDING, IN_PROGRESS, WAITING, RESOLVED, CLOSED
  priority: string;          // LOW, NORMAL, HIGH, URGENT
  isAIHandled: boolean;
  slaDeadline?: string;
  humanTakeoverAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
    isAI: boolean;
  };
  department?: {
    id: string;
    name: string;
    color?: string;
  };
  messages?: Message[];
  lastMessage?: Message;
  _count?: {
    messages: number;        // Contador de nao lidas
  };
}

interface ChatState {
  // Estado
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  messages: Message[];
  isLoadingTickets: boolean;
  isLoadingMessages: boolean;
  showResolved: boolean;
  filters: {
    status?: string;
    departmentId?: string;
    assignedToId?: string;
    search?: string;
  };

  // Acoes
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  removeTicket: (ticketId: string) => void;
  selectTicket: (ticket: Ticket | null) => void;
  updateSelectedTicket: (updates: Partial<Ticket>) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  updateTicketUnread: (ticketId: string) => void;
  markTicketAsRead: (ticketId: string) => void;
  setFilters: (filters: Partial<ChatState["filters"]>) => void;
  setShowResolved: (show: boolean) => void;
  setLoadingTickets: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  clearData: () => void;
}
```

### Implementacao

```typescript
import { create } from "zustand";
import { normalizeMediaUrl } from "@/utils/media-url.util";

export const useChatStore = create<ChatState>((set, get) => ({
  // Estado inicial
  tickets: [],
  selectedTicket: null,
  messages: [],
  isLoadingTickets: false,
  isLoadingMessages: false,
  showResolved: false,
  filters: {},

  // Gerenciamento de Tickets
  setTickets: (tickets) => set({ tickets }),

  addTicket: (ticket) =>
    set((state) => {
      // Evita duplicatas
      if (state.tickets.some((t) => t.id === ticket.id)) {
        return state;
      }
      // Adiciona no inicio da lista
      return { tickets: [ticket, ...state.tickets] };
    }),

  removeTicket: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.filter((t) => t.id !== ticketId),
      selectedTicket:
        state.selectedTicket?.id === ticketId ? null : state.selectedTicket,
    })),

  selectTicket: (ticket) => {
    set({ selectedTicket: ticket, messages: [] });
  },

  updateSelectedTicket: (updates) => {
    set((state) => {
      if (!state.selectedTicket) return state;
      return {
        selectedTicket: { ...state.selectedTicket, ...updates },
      };
    });
  },

  // Gerenciamento de Mensagens
  setMessages: (messages) => {
    // Normaliza URLs de midia
    const normalizedMessages = messages.map((msg) => ({
      ...msg,
      mediaUrl: normalizeMediaUrl(msg.mediaUrl),
    }));
    set({ messages: normalizedMessages });
  },

  addMessage: (message) =>
    set((state) => {
      // Evita duplicatas
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    }),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),

  // Atualizacao de Ticket com ordenacao inteligente
  updateTicket: (ticketId, updates) =>
    set((state) => {
      // Remove ticket se resolvido/fechado e showResolved=false
      const isBeingResolved =
        (updates.status === 'RESOLVED' || updates.status === 'CLOSED') &&
        !state.showResolved;

      if (isBeingResolved) {
        return {
          tickets: state.tickets.filter((t) => t.id !== ticketId),
          selectedTicket:
            state.selectedTicket?.id === ticketId ? null : state.selectedTicket,
        };
      }

      // Atualiza e reordena tickets
      const updatedTickets = state.tickets.map((t) =>
        t.id === ticketId ? { ...t, ...updates } : t
      );

      // Ordenacao por prioridade:
      // 1. Mensagens nao lidas ou transferidos da IA
      // 2. Tickets com IA ativa
      // 3. Aguardando resposta
      // 4. Mais recentes
      const sortedTickets = updatedTickets.sort((a, b) => {
        const aUnread = a._count?.messages || 0;
        const bUnread = b._count?.messages || 0;
        const aIsAI = a.isAIHandled;
        const bIsAI = b.isAIHandled;
        const aTransferredFromAI = !aIsAI && a.status === 'PENDING' && a.humanTakeoverAt !== null;
        const bTransferredFromAI = !bIsAI && b.status === 'PENDING' && b.humanTakeoverAt !== null;

        // Prioridade 1: Precisa atencao humana
        const aNeedsAttention = aUnread > 0 || aTransferredFromAI;
        const bNeedsAttention = bUnread > 0 || bTransferredFromAI;

        if (aNeedsAttention && !bNeedsAttention) return -1;
        if (bNeedsAttention && !aNeedsAttention) return 1;

        // Prioridade 2: Tickets com IA
        if (aIsAI && !bIsAI) return -1;
        if (bIsAI && !aIsAI) return 1;

        // Prioridade 3: Por data de atualizacao
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      return {
        tickets: sortedTickets,
        selectedTicket:
          state.selectedTicket?.id === ticketId
            ? { ...state.selectedTicket, ...updates }
            : state.selectedTicket,
      };
    }),

  // Contador de nao lidas
  updateTicketUnread: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? { ...t, _count: { messages: (t._count?.messages || 0) + 1 } }
          : t
      ),
    })),

  markTicketAsRead: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, _count: { messages: 0 } } : t
      ),
      selectedTicket:
        state.selectedTicket?.id === ticketId
          ? { ...state.selectedTicket, _count: { messages: 0 } }
          : state.selectedTicket,
    })),

  // Filtros
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setShowResolved: (show) => set({ showResolved: show }),

  // Loading states
  setLoadingTickets: (loading) => set({ isLoadingTickets: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

  // Limpar dados (usado na troca de empresa)
  clearData: () => set({
    tickets: [],
    selectedTicket: null,
    messages: [],
    filters: {},
  }),
}));
```

### Exemplo de Uso - Lista de Tickets

```tsx
"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chat.store";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function TicketList() {
  const {
    tickets,
    selectedTicket,
    selectTicket,
    setTickets,
    setLoadingTickets,
    isLoadingTickets,
    filters,
    showResolved,
  } = useChatStore();

  useEffect(() => {
    fetchTickets();
  }, [filters, showResolved]);

  async function fetchTickets() {
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.departmentId) params.set("departmentId", filters.departmentId);
      if (filters.search) params.set("search", filters.search);
      if (showResolved) params.set("includeResolved", "true");

      const response = await api.get<Ticket[]>(`/tickets?${params}`);
      setTickets(response.data);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  }

  if (isLoadingTickets) {
    return <TicketListSkeleton />;
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          onClick={() => selectTicket(ticket)}
          className={cn(
            "p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors",
            selectedTicket?.id === ticket.id && "bg-muted"
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={ticket.contact.avatar} />
              <AvatarFallback>
                {ticket.contact.name?.substring(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">
                  {ticket.contact.name || ticket.contact.phone}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDate(ticket.updatedAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {ticket.lastMessage?.content || "Sem mensagens"}
              </p>
            </div>
            {(ticket._count?.messages || 0) > 0 && (
              <Badge variant="default" className="rounded-full">
                {ticket._count.messages}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Exemplo de Uso - Janela de Chat

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat.store";
import { api } from "@/lib/api";
import { useSocket } from "@/components/providers/socket-provider";

function ChatWindow() {
  const {
    selectedTicket,
    messages,
    setMessages,
    addMessage,
    setLoadingMessages,
    markTicketAsRead,
  } = useChatStore();
  const { socket } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedTicket) return;

    fetchMessages();

    // Entra na room do ticket para receber mensagens em tempo real
    socket?.emit("ticket:join", selectedTicket.id);

    return () => {
      socket?.emit("ticket:leave", selectedTicket.id);
    };
  }, [selectedTicket?.id, socket]);

  useEffect(() => {
    // Scroll para o final quando novas mensagens chegam
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function fetchMessages() {
    if (!selectedTicket) return;

    setLoadingMessages(true);
    try {
      const response = await api.get<{ messages: Message[] }>(
        `/messages/ticket/${selectedTicket.id}`
      );
      setMessages(response.data.messages);

      // Marca como lido
      await api.post(`/messages/ticket/${selectedTicket.id}/read`);
      markTicketAsRead(selectedTicket.id);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function sendMessage(content: string) {
    if (!selectedTicket || !content.trim()) return;

    try {
      const response = await api.post<Message>(
        `/messages/ticket/${selectedTicket.id}`,
        { content, type: "TEXT" }
      );
      addMessage(response.data);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  if (!selectedTicket) {
    return <EmptyState message="Selecione uma conversa" />;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader ticket={selectedTicket} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={sendMessage} />
    </div>
  );
}
```

### Integracao com Socket.IO

```tsx
"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chat.store";
import { useSocket } from "@/components/providers/socket-provider";

function SocketListener() {
  const { socket } = useSocket();
  const {
    addTicket,
    updateTicket,
    addMessage,
    updateMessage,
    updateTicketUnread,
    selectedTicket,
  } = useChatStore();

  useEffect(() => {
    if (!socket) return;

    // Novo ticket criado
    socket.on("ticket:created", (ticket) => {
      addTicket(ticket);
    });

    // Ticket atualizado
    socket.on("ticket:updated", (data) => {
      updateTicket(data.ticketId, data);
    });

    // Nova mensagem recebida
    socket.on("message:created", (message) => {
      // Se o ticket esta selecionado, adiciona a mensagem
      if (message.ticketId === selectedTicket?.id) {
        addMessage(message);
      } else {
        // Senao, incrementa contador de nao lidas
        updateTicketUnread(message.ticketId);
      }
    });

    // Status da mensagem atualizado
    socket.on("message:status", (data) => {
      updateMessage(data.messageId, { status: data.status });
    });

    // Mensagem deletada
    socket.on("message:deleted", (data) => {
      updateMessage(data.messageId, { deletedAt: data.deletedAt });
    });

    return () => {
      socket.off("ticket:created");
      socket.off("ticket:updated");
      socket.off("message:created");
      socket.off("message:status");
      socket.off("message:deleted");
    };
  }, [socket, selectedTicket?.id]);

  return null;
}
```

---

## Boas Praticas

### 1. Selecao Granular

Sempre selecione apenas o estado que voce precisa:

```tsx
// Evite - causa re-renders em qualquer mudanca
const chatState = useChatStore();

// Prefira - re-renderiza apenas quando tickets mudam
const tickets = useChatStore((state) => state.tickets);

// Para multiplos valores
const { tickets, selectedTicket } = useChatStore((state) => ({
  tickets: state.tickets,
  selectedTicket: state.selectedTicket,
}));
```

### 2. Acoes Fora de Componentes

Voce pode acessar a store fora de componentes React:

```typescript
// Em um service ou util
import { useChatStore } from "@/stores/chat.store";

function handleIncomingMessage(message: Message) {
  // Acesso direto a store
  const state = useChatStore.getState();
  const { addMessage, updateTicketUnread, selectedTicket } = state;

  if (message.ticketId === selectedTicket?.id) {
    addMessage(message);
  } else {
    updateTicketUnread(message.ticketId);
  }
}
```

### 3. Middleware de Persistencia

Para persistir estado no localStorage:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useStore = create(
  persist(
    (set, get) => ({
      // estado e acoes
    }),
    {
      name: "storage-key",
      storage: createJSONStorage(() => localStorage),
      // Persiste apenas campos especificos
      partialize: (state) => ({
        campo1: state.campo1,
        campo2: state.campo2,
      }),
    }
  )
);
```

### 4. DevTools

Habilite os DevTools em desenvolvimento:

```typescript
import { create } from "zustand";
import { devtools } from "zustand/middleware";

const useStore = create(
  devtools(
    (set) => ({
      // estado e acoes
    }),
    { name: "MyStore" }
  )
);
```

### 5. Immer para Atualizacoes Complexas

Para atualizacoes de estado aninhado:

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

const useStore = create(
  immer((set) => ({
    nested: { deep: { value: 0 } },
    updateDeepValue: (newValue) =>
      set((state) => {
        state.nested.deep.value = newValue;
      }),
  }))
);
```

---

## Referencias

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand Middleware](https://github.com/pmndrs/zustand#middleware)
- [Zustand TypeScript Guide](https://github.com/pmndrs/zustand#typescript-usage)
