---
sidebar_position: 6
title: Custom Hooks
description: Documentacao dos hooks customizados do ChatBlue para React
---

# Custom Hooks

Esta documentacao descreve os hooks customizados utilizados no ChatBlue para encapsular logica reutilizavel e gerenciar funcionalidades especificas da aplicacao.

## Visao Geral

O ChatBlue utiliza uma combinacao de hooks customizados e hooks de bibliotecas externas:

| Hook | Categoria | Descricao |
|------|-----------|-----------|
| `useSocket` | Comunicacao | Gerencia conexao WebSocket |
| `useToast` | UI | Sistema de notificacoes toast |
| `useAuthStore` | Estado | Hook do Zustand para autenticacao |
| `useChatStore` | Estado | Hook do Zustand para chat |

---

## useSocket

Hook para gerenciar a conexao WebSocket com o servidor, permitindo comunicacao em tempo real.

**Arquivo:** `components/providers/socket-provider.tsx`

### Interface

```typescript
interface SocketContextType {
  socket: Socket | null;       // Instancia do Socket.IO
  isConnected: boolean;        // Status da conexao
}
```

### Implementacao

```typescript
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}
```

### Provider

O `SocketProvider` deve envolver os componentes que precisam de acesso ao socket:

```tsx
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketInstance = getSocket(accessToken);
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("[Socket] Connected with id:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setIsConnected(false);
    });

    // ... event listeners

    return () => {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      // ... cleanup
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
```

### Uso Basico

```tsx
"use client";

import { useSocket } from "@/components/providers/socket-provider";

function ChatComponent() {
  const { socket, isConnected } = useSocket();

  // Indicador de status
  return (
    <div>
      <span className={isConnected ? "text-green-500" : "text-red-500"}>
        {isConnected ? "Conectado" : "Desconectado"}
      </span>
    </div>
  );
}
```

### Entrando em Rooms

```tsx
"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";

function ChatWindow({ ticketId }: { ticketId: string }) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !ticketId) return;

    // Entra na room do ticket
    socket.emit("ticket:join", ticketId);
    console.log("Joined ticket room:", ticketId);

    return () => {
      // Sai da room ao desmontar
      socket.emit("ticket:leave", ticketId);
      console.log("Left ticket room:", ticketId);
    };
  }, [socket, ticketId]);

  // ...
}
```

### Escutando Eventos

```tsx
"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useChatStore } from "@/stores/chat.store";

function MessageListener() {
  const { socket } = useSocket();
  const { addMessage, selectedTicket } = useChatStore();

  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(message: any) {
      if (message.ticketId === selectedTicket?.id) {
        addMessage(message);
      }
    }

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, selectedTicket?.id, addMessage]);

  return null;
}
```

### Eventos Suportados

#### Eventos de Mensagem

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `message:received` | `{ message, ticket }` | Mensagem recebida do cliente |
| `message:sent` | `Message` | Mensagem enviada pelo atendente |
| `message:new` | `Message` | Nova mensagem (generico) |
| `message:status` | `{ messageId, status }` | Status atualizado |
| `message:reaction` | `{ messageId, reactions }` | Reacao adicionada |
| `message:deleted` | `{ messageId, deletedAt }` | Mensagem deletada |

#### Eventos de Ticket

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `ticket:created` | `Ticket` | Novo ticket criado |
| `ticket:updated` | `Ticket` | Ticket atualizado |
| `ticket:assigned` | `{ ticketId, assignedToId }` | Ticket atribuido |
| `ticket:transferred` | `{ ticketId, departmentId }` | Ticket transferido |
| `ticket:statusChanged` | `{ ticketId, status }` | Status alterado |

---

## useToast

Hook para exibir notificacoes toast na interface.

**Arquivo:** `components/ui/use-toast.ts`

### Interface

```typescript
interface ToasterToast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
}

interface UseToastReturn {
  toasts: ToasterToast[];
  toast: (props: Toast) => { id: string; dismiss: () => void; update: (props: ToasterToast) => void };
  dismiss: (toastId?: string) => void;
}
```

### Implementacao Simplificada

```typescript
"use client";

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

// Estado global de toasts
let memoryState: { toasts: ToasterToast[] } = { toasts: [] };
const listeners: Array<(state: typeof memoryState) => void> = [];

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function toast({ ...props }: Omit<ToasterToast, "id">) {
  const id = genId();

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dispatch({ type: "DISMISS_TOAST", toastId: id });
      },
    },
  });

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
    update: (props: ToasterToast) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } }),
  };
}

function useToast() {
  const [state, setState] = React.useState<typeof memoryState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
```

### Uso Basico

```tsx
"use client";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

function SaveButton() {
  const { toast } = useToast();

  async function handleSave() {
    try {
      await saveData();
      toast({
        title: "Sucesso!",
        description: "Os dados foram salvos com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar os dados.",
        variant: "destructive",
      });
    }
  }

  return <Button onClick={handleSave}>Salvar</Button>;
}
```

### Variantes

```tsx
// Toast de sucesso (padrao)
toast({
  title: "Sucesso",
  description: "Operacao realizada com sucesso",
});

// Toast de erro
toast({
  title: "Erro",
  description: "Algo deu errado",
  variant: "destructive",
});

// Toast com acao
toast({
  title: "Mensagem enviada",
  description: "Sua mensagem foi enviada",
  action: (
    <ToastAction altText="Desfazer" onClick={() => undoSend()}>
      Desfazer
    </ToastAction>
  ),
});
```

### Uso Fora de Componentes

```typescript
// Em um service ou util
import { toast } from "@/components/ui/use-toast";

async function uploadFile(file: File) {
  try {
    const result = await api.uploadFile("/upload", file);
    toast({
      title: "Upload concluido",
      description: `Arquivo ${file.name} enviado com sucesso`,
    });
    return result;
  } catch (error) {
    toast({
      title: "Falha no upload",
      description: "Nao foi possivel enviar o arquivo",
      variant: "destructive",
    });
    throw error;
  }
}
```

---

## Hooks de Estado (Zustand)

Os hooks de estado do ChatBlue sao baseados no Zustand. Veja a documentacao completa em [Stores](/docs/frontend/stores).

### useAuthStore

```tsx
import { useAuthStore } from "@/stores/auth.store";

function Profile() {
  // Selecao granular de estado
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuthStore();

  return (
    <div>
      <p>Ola, {user?.name}</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

### useChatStore

```tsx
import { useChatStore } from "@/stores/chat.store";

function TicketList() {
  // Selecao de multiplos valores
  const { tickets, selectedTicket, selectTicket } = useChatStore((state) => ({
    tickets: state.tickets,
    selectedTicket: state.selectedTicket,
    selectTicket: state.selectTicket,
  }));

  return (
    <div>
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          onClick={() => selectTicket(ticket)}
          className={selectedTicket?.id === ticket.id ? "bg-muted" : ""}
        >
          {ticket.contact.name}
        </div>
      ))}
    </div>
  );
}
```

---

## Hooks Utilitarios Comuns

### useDebounce

Hook para debounce de valores (util para busca):

```tsx
import { useState, useEffect } from "react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Uso
function SearchInput() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { setFilters } = useChatStore();

  useEffect(() => {
    setFilters({ search: debouncedSearch });
  }, [debouncedSearch]);

  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Buscar..."
    />
  );
}
```

### useLocalStorage

Hook para persistir estado no localStorage:

```tsx
import { useState, useEffect } from "react";

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

// Uso
function Settings() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");

  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      Modo: {theme}
    </button>
  );
}
```

### useMediaQuery

Hook para responsive design:

```tsx
import { useState, useEffect } from "react";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

// Uso
function ResponsiveComponent() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");

  if (isMobile) {
    return <MobileView />;
  }

  if (isTablet) {
    return <TabletView />;
  }

  return <DesktopView />;
}
```

### useOnClickOutside

Hook para detectar cliques fora de um elemento:

```tsx
import { useEffect, useRef } from "react";

function useOnClickOutside<T extends HTMLElement>(
  handler: () => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handler]);

  return ref;
}

// Uso
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useOnClickOutside<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}>Menu</button>
      {isOpen && (
        <div className="dropdown-content">
          <a href="#">Item 1</a>
          <a href="#">Item 2</a>
        </div>
      )}
    </div>
  );
}
```

### useInterval

Hook para intervalos controlados:

```tsx
import { useEffect, useRef } from "react";

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Uso - Atualizar metricas a cada 30 segundos
function MetricsDisplay() {
  const [metrics, setMetrics] = useState(null);

  useInterval(() => {
    fetchMetrics().then(setMetrics);
  }, 30000);

  return <div>{/* exibir metricas */}</div>;
}
```

---

## Boas Praticas

### 1. Extraia Logica Complexa para Hooks

```tsx
// Ruim - logica misturada com UI
function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    // muita logica aqui...
  }, []);

  // ...
}

// Bom - logica encapsulada
function useChatMessages(ticketId: string) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    // logica encapsulada
  }, [ticketId, socket]);

  return { messages, isTyping };
}

function ChatWindow({ ticketId }: { ticketId: string }) {
  const { messages, isTyping } = useChatMessages(ticketId);
  // ...
}
```

### 2. Use Dependencias Corretas

```tsx
// Ruim - dependencia faltando
useEffect(() => {
  fetchData(userId);
}, []); // userId deveria estar nas dependencias

// Bom
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### 3. Cleanup de Efeitos

```tsx
// Sempre limpe subscricoes e timers
useEffect(() => {
  const subscription = api.subscribe(handleUpdate);
  const timer = setInterval(refresh, 5000);

  return () => {
    subscription.unsubscribe();
    clearInterval(timer);
  };
}, []);
```

### 4. Evite Recreacao de Callbacks

```tsx
// Ruim - callback recriado a cada render
function Parent() {
  return <Child onClick={() => doSomething()} />;
}

// Bom - callback memoizado
function Parent() {
  const handleClick = useCallback(() => {
    doSomething();
  }, []);

  return <Child onClick={handleClick} />;
}
```

### 5. Selecao Granular de Estado

```tsx
// Ruim - re-renderiza em qualquer mudanca
const state = useChatStore();

// Bom - re-renderiza apenas quando necessario
const tickets = useChatStore((state) => state.tickets);
```

---

## Referencias

- [React Hooks Reference](https://react.dev/reference/react/hooks)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
