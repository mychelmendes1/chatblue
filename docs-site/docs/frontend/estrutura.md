---
sidebar_position: 2
title: Estrutura
description: Organizacao detalhada do frontend
---

# Estrutura do Frontend

Detalhamento da organizacao de arquivos e pastas do frontend.

## App Directory

O Next.js 14 usa o App Router com a estrutura de pastas `app/`:

```
app/
├── (auth)/                    # Route Group - Autenticacao
│   ├── login/
│   │   └── page.tsx          # /login
│   ├── register/
│   │   └── page.tsx          # /register (se habilitado)
│   └── layout.tsx            # Layout compartilhado
│
├── (dashboard)/              # Route Group - Dashboard
│   ├── chat/
│   │   ├── page.tsx         # /chat
│   │   └── [ticketId]/
│   │       └── page.tsx     # /chat/[ticketId]
│   │
│   ├── contacts/
│   │   ├── page.tsx         # /contacts
│   │   └── [id]/
│   │       └── page.tsx     # /contacts/[id]
│   │
│   ├── users/
│   │   ├── page.tsx         # /users
│   │   └── [id]/
│   │       └── page.tsx     # /users/[id]
│   │
│   ├── connections/
│   │   └── page.tsx         # /connections
│   │
│   ├── departments/
│   │   └── page.tsx         # /departments
│   │
│   ├── metrics/
│   │   └── page.tsx         # /metrics
│   │
│   ├── settings/
│   │   ├── page.tsx         # /settings
│   │   ├── ai/
│   │   │   └── page.tsx     # /settings/ai
│   │   └── notion/
│   │       └── page.tsx     # /settings/notion
│   │
│   ├── knowledge-base/
│   │   └── page.tsx         # /knowledge-base
│   │
│   ├── faq/
│   │   └── page.tsx         # /faq
│   │
│   └── layout.tsx           # Layout do dashboard
│
├── layout.tsx               # Root layout
├── providers.tsx            # Providers globais
├── globals.css              # Estilos globais
├── loading.tsx              # Loading global
├── error.tsx                # Error boundary global
└── not-found.tsx            # Pagina 404
```

## Components

### Estrutura

```
components/
├── chat/                    # Componentes do chat
│   ├── ChatSidebar.tsx
│   ├── ChatWindow.tsx
│   ├── ChatInput.tsx
│   ├── MessageBubble.tsx
│   ├── MessageList.tsx
│   ├── ContactInfo.tsx
│   ├── TicketHeader.tsx
│   ├── TypingIndicator.tsx
│   ├── EmojiPicker.tsx
│   ├── MediaPreview.tsx
│   └── SLATimer.tsx
│
├── ui/                      # Shadcn/UI
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── radio-group.tsx
│   ├── switch.tsx
│   ├── slider.tsx
│   ├── dialog.tsx
│   ├── alert-dialog.tsx
│   ├── sheet.tsx
│   ├── dropdown-menu.tsx
│   ├── popover.tsx
│   ├── tooltip.tsx
│   ├── card.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── progress.tsx
│   ├── skeleton.tsx
│   ├── toast.tsx
│   ├── toaster.tsx
│   ├── scroll-area.tsx
│   ├── separator.tsx
│   ├── label.tsx
│   └── form.tsx
│
├── layout/                  # Layout
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── DashboardLayout.tsx
│   ├── MobileNav.tsx
│   ├── Breadcrumb.tsx
│   └── ProtectedRoute.tsx
│
├── forms/                   # Formularios
│   ├── LoginForm.tsx
│   ├── UserForm.tsx
│   ├── DepartmentForm.tsx
│   ├── ConnectionForm.tsx
│   ├── SettingsForm.tsx
│   └── AIConfigForm.tsx
│
├── tables/                  # Tabelas
│   ├── UsersTable.tsx
│   ├── ContactsTable.tsx
│   ├── TicketsTable.tsx
│   └── DataTable.tsx
│
├── charts/                  # Graficos
│   ├── TicketsChart.tsx
│   ├── SLAChart.tsx
│   └── PerformanceChart.tsx
│
├── providers/               # Context Providers
│   ├── SocketProvider.tsx
│   ├── QueryProvider.tsx
│   └── ThemeProvider.tsx
│
└── shared/                  # Compartilhados
    ├── Logo.tsx
    ├── Avatar.tsx
    ├── EmptyState.tsx
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── Pagination.tsx
```

## Stores (Zustand)

```
stores/
├── auth.store.ts           # Autenticacao
├── chat.store.ts           # Estado do chat
├── ui.store.ts             # UI/Layout
└── index.ts                # Exports
```

### Auth Store

```typescript
// stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface Company {
  id: string;
  name: string;
  logo?: string;
}

interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  companies: Company[];

  setAuth: (user: User, company: Company, token: string, refreshToken: string) => void;
  setToken: (token: string) => void;
  setCompanies: (companies: Company[]) => void;
  switchCompany: (company: Company, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      companies: [],

      setAuth: (user, company, token, refreshToken) =>
        set({
          user,
          company,
          token,
          refreshToken,
          isAuthenticated: true,
        }),

      setToken: (token) => set({ token }),

      setCompanies: (companies) => set({ companies }),

      switchCompany: (company, token) =>
        set({ company, token }),

      logout: () =>
        set({
          user: null,
          company: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          companies: [],
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        companies: state.companies,
      }),
    }
  )
);
```

### Chat Store

```typescript
// stores/chat.store.ts
import { create } from 'zustand';

interface Message {
  id: string;
  content: string;
  type: string;
  status: string;
  createdAt: string;
  userId?: string;
  user?: { name: string; avatar?: string };
}

interface Ticket {
  id: string;
  protocol: string;
  status: string;
  contact: { name: string; phone: string };
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatState {
  activeTicketId: string | null;
  tickets: Ticket[];
  messages: Message[];
  isLoading: boolean;
  typingUserId: string | null;

  setActiveTicket: (id: string | null) => void;
  setTickets: (tickets: Ticket[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, data: Partial<Message>) => void;
  setTypingUser: (userId: string | null) => void;
  markAsRead: (ticketId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeTicketId: null,
  tickets: [],
  messages: [],
  isLoading: false,
  typingUserId: null,

  setActiveTicket: (id) => set({ activeTicketId: id }),

  setTickets: (tickets) => set({ tickets }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, data) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...data } : m
      ),
    })),

  setTypingUser: (userId) => set({ typingUserId: userId }),

  markAsRead: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, unreadCount: 0 } : t
      ),
    })),
}));
```

## Lib (Utilitarios)

```
lib/
├── api.ts                  # Cliente HTTP (Axios)
├── socket.ts               # Cliente Socket.io
├── utils.ts                # Funcoes utilitarias
├── constants.ts            # Constantes
├── validators.ts           # Validacoes Zod
└── cn.ts                   # Classe CSS helper
```

### Utils

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  return phone;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
```

## Hooks

```
hooks/
├── useAuth.ts              # Autenticacao
├── useSocket.ts            # Socket.io
├── useTickets.ts           # Tickets (CRUD)
├── useMessages.ts          # Mensagens
├── useContacts.ts          # Contatos
├── useUsers.ts             # Usuarios
├── useDepartments.ts       # Departamentos
├── useConnections.ts       # Conexoes WhatsApp
├── useMetrics.ts           # Metricas
├── useSettings.ts          # Configuracoes
├── useDebounce.ts          # Debounce
├── useMediaQuery.ts        # Media queries
└── useLocalStorage.ts      # Local storage
```

## Types

```typescript
// types/index.ts

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'AGENT';
  avatar?: string;
  isActive: boolean;
  isOnline: boolean;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
}

export interface Department {
  id: string;
  name: string;
  color: string;
  parentId?: string;
  parent?: Department;
  children?: Department[];
}

export interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  tags: string[];
  notionClientStatus?: string;
}

export interface Ticket {
  id: string;
  protocol: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isAIHandled: boolean;
  contact: Contact;
  user?: User;
  department?: Department;
  slaDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  content?: string;
  mediaUrl?: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  isInternal: boolean;
  isAIGenerated: boolean;
  user?: User;
  createdAt: string;
}

export interface WhatsAppConnection {
  id: string;
  name: string;
  type: 'BAILEYS' | 'META_CLOUD';
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  phoneNumber?: string;
  isDefault: boolean;
}
```

## Public Assets

```
public/
├── favicon.ico
├── logo.svg
├── logo-dark.svg
├── images/
│   ├── empty-state.svg
│   ├── error.svg
│   └── placeholder-avatar.png
├── sounds/
│   └── notification.mp3
└── manifest.json
```

## Proximos Passos

- [Componentes](/frontend/componentes)
- [Paginas](/frontend/paginas)
- [Stores](/frontend/stores)
