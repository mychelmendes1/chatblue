---
sidebar_position: 2
title: Estrutura
description: Organizacao detalhada do frontend
---

# Estrutura do Frontend

Detalhamento da organizacao de arquivos e pastas do frontend (`apps/web/`).

## App Directory

O Next.js 14 usa o App Router com a estrutura de pastas `app/`:

```
app/
├── (auth)/                         # Route Group - Autenticacao
│   ├── login/
│   │   └── page.tsx               # /login
│   ├── forgot-password/
│   │   └── page.tsx               # /forgot-password
│   └── reset-password/
│       └── page.tsx               # /reset-password
│
├── (dashboard)/                    # Route Group - Dashboard
│   ├── ai-agent/
│   │   └── page.tsx               # /ai-agent
│   ├── ai-agents/
│   │   └── page.tsx               # /ai-agents
│   ├── ai-knowledge/
│   │   └── page.tsx               # /ai-knowledge
│   ├── chat/
│   │   └── page.tsx               # /chat
│   ├── connections/
│   │   └── page.tsx               # /connections
│   ├── contacts/
│   │   └── page.tsx               # /contacts
│   ├── faq/
│   │   └── page.tsx               # /faq
│   ├── inbox/
│   │   └── page.tsx               # /inbox
│   ├── kanban/
│   │   └── page.tsx               # /kanban
│   ├── knowledge/
│   │   └── page.tsx               # /knowledge
│   ├── knowledge-base/
│   │   └── page.tsx               # /knowledge-base
│   ├── metrics/
│   │   └── page.tsx               # /metrics
│   ├── open/
│   │   └── [slug]/
│   │       └── [phone]/
│   │           └── page.tsx       # /open/:slug/:phone
│   ├── profile/
│   │   └── page.tsx               # /profile
│   ├── settings/
│   │   └── page.tsx               # /settings
│   ├── users/
│   │   └── page.tsx               # /users
│   └── layout.tsx                  # Layout do dashboard
│
├── layout.tsx                      # Root layout
├── providers.tsx                   # Providers globais
└── globals.css                     # Estilos globais
```

### Root Layout

O `layout.tsx` raiz importa o componente `Providers` e envolve toda a aplicacao:

```typescript
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Providers Globais

O `providers.tsx` configura o `QueryClientProvider` (React Query) e o `Toaster`:

```typescript
// app/providers.tsx
export function Providers({ children }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

### Dashboard Layout

O layout do dashboard (`(dashboard)/layout.tsx`) verifica autenticacao e renderiza a estrutura principal com `SocketProvider`, `Sidebar`, `Header` e `BlueMascot`:

```typescript
// app/(dashboard)/layout.tsx
import { SocketProvider } from "@/components/providers/socket-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BlueMascot } from "@/components/blue/blue-mascot";

export default function DashboardLayout({ children }) {
  // Verifica autenticacao via useAuthStore
  // Redireciona para /login se nao autenticado

  return (
    <SocketProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main>{children}</main>
        </div>
      </div>
      <BlueMascot />
    </SocketProvider>
  );
}
```

## Components

### Estrutura de Diretorios

```
components/
├── admin-assistant/        # Assistente administrativo (Blue)
│   ├── admin-assistant-chat.tsx
│   └── admin-assistant-fab.tsx
│
├── ai-agents/              # Agentes de IA
│   └── ai-agents-by-category-panel.tsx
│
├── blue/                   # Mascote Blue
│   ├── blue-mascot.tsx
│   ├── blue-chat.tsx
│   ├── blue-tips.tsx
│   └── context-detector.ts
│
├── chat/                   # Componentes do chat
│   ├── chat-sidebar.tsx
│   ├── chat-window.tsx
│   ├── contact-info.tsx
│   ├── ai-response-preview.tsx
│   ├── email-viewer.tsx
│   └── template-selector.tsx
│
├── connections/            # Conexoes (WhatsApp, Email)
│   └── email-connections.tsx
│
├── inbox/                  # Caixa de entrada
│   └── inbox-card.tsx
│
├── kanban/                 # Quadro Kanban
│   ├── kanban-board.tsx
│   ├── kanban-column.tsx
│   └── kanban-card.tsx
│
├── landing/                # Landing page
│   ├── LandingNavbar.tsx
│   ├── HeroSection.tsx
│   ├── HowItWorksSection.tsx
│   ├── HowDoesItWorkSection.tsx
│   ├── WhyItWorksSection.tsx
│   ├── StepByStepSection.tsx
│   ├── ForWhomSection.tsx
│   ├── PricingSection.tsx
│   ├── FAQSection.tsx
│   └── LandingFooter.tsx
│
├── layout/                 # Layout
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── company-switcher.tsx
│   └── notifications.tsx
│
├── providers/              # Context Providers
│   └── socket-provider.tsx
│
├── shared/                 # Compartilhados
│   └── connection-tag.tsx
│
└── ui/                     # Shadcn/UI
    ├── alert.tsx
    ├── avatar.tsx
    ├── badge.tsx
    ├── button.tsx
    ├── card.tsx
    ├── checkbox.tsx
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    ├── input.tsx
    ├── label.tsx
    ├── popover.tsx
    ├── progress.tsx
    ├── scroll-area.tsx
    ├── select.tsx
    ├── sheet.tsx
    ├── slider.tsx
    ├── switch.tsx
    ├── table.tsx
    ├── tabs.tsx
    ├── textarea.tsx
    ├── toast.tsx
    ├── toaster.tsx
    └── use-toast.ts
```

### Socket Provider

O `socket-provider.tsx` em `components/providers/` gerencia a conexao Socket.io e exporta o hook `useSocket`. Ele escuta eventos de tickets e mensagens em tempo real, atualizando o `chatStore` automaticamente.

## Stores (Zustand)

Os stores ficam em `stores/` (na raiz de `apps/web/`), nao dentro de `lib/`:

```
stores/
├── auth.store.ts           # Autenticacao e empresa ativa
└── chat.store.ts           # Estado do chat, tickets e mensagens
```

### Auth Store

```typescript
// stores/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

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
  user: User | null;
  companies: Company[];
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isSwitchingCompany: boolean;
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      companies: [],
      accessToken: null,
      refreshToken: null,
      isLoading: true,
      isSwitchingCompany: false,

      login: async (email, password, companyId) => {
        const response = await api.post("/auth/login", {
          email, password, ...(companyId && { companyId }),
        });
        const { user, companies, accessToken, refreshToken } = response.data;
        set({ user, companies: companies || [], accessToken, refreshToken, isLoading: false });
      },

      logout: async () => {
        try { await api.post("/auth/logout"); } catch {}
        set({ user: null, companies: [], accessToken: null, refreshToken: null });
      },

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) { set({ isLoading: false }); return; }
        try {
          const [userResponse, companiesResponse] = await Promise.all([
            api.get("/auth/me"),
            api.get("/user-access/my-companies"),
          ]);
          // Monta user com companies e activeCompany
          set({ user: { ... }, companies: companiesResponse.data, isLoading: false });
        } catch {
          set({ user: null, companies: [], accessToken: null, refreshToken: null, isLoading: false });
        }
      },

      switchCompany: async (companyId) => {
        // Troca empresa ativa, recebe novo token
        // Dispara evento 'company-switched' para notificar componentes
      },
    }),
    {
      name: "chatblue-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

Pontos importantes do auth store:

- Usa `accessToken` (nao `token`) como campo do estado
- Persiste apenas `accessToken` e `refreshToken` no localStorage com chave `"chatblue-auth"`
- Suporta multi-empresa com `switchCompany` que obtem novo token e dispara evento customizado
- `checkAuth` busca dados do usuario e lista de empresas em paralelo

### Chat Store

```typescript
// stores/chat.store.ts
import { create } from "zustand";

interface ChatState {
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
    isAIHandled?: boolean;
    mentionedUserId?: string;
    unreadOnly?: boolean;
    waitingReply?: boolean;
    massDispatchOnly?: boolean;
    sortOrder?: 'asc' | 'desc';
  };
  aiStuckCount: number;

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
  markTicketAsUnread: (ticketId: string, unreadCount?: number) => void;
  setFilters: (filters: Partial<ChatState["filters"]>) => void;
  setShowResolved: (show: boolean) => void;
  clearData: () => void;
  // ...
}
```

Pontos importantes do chat store:

- Usa `selectedTicket` (nao `activeTicketId`) para rastrear o ticket selecionado
- Suporta filtros avancados (departamento, atribuicao, mencoes, nao lidos, disparo em massa)
- `updateTicket` inclui logica de ordenacao por prioridade: snooze vencido > nao lidos/transferidos da IA > IA > aguardando resposta > snoozed
- Normaliza URLs de midia via `normalizeMediaUrl` ao adicionar/atualizar mensagens
- Tickets resolvidos/fechados sao removidos da lista quando `showResolved` esta desligado

## Lib (Utilitarios)

```
lib/
├── api.ts                  # Cliente HTTP (fetch nativo)
├── socket.ts               # Cliente Socket.io
└── utils.ts                # Funcoes utilitarias (cn, formatPhone, formatDate, etc.)
```

### API Client

O `api.ts` implementa um cliente HTTP customizado baseado em `fetch` (nao Axios). Obtem o token do localStorage (`chatblue-auth`) automaticamente:

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

class ApiClient {
  private getToken(): string | null {
    const stored = localStorage.getItem("chatblue-auth");
    if (!stored) return null;
    const { state } = JSON.parse(stored);
    return state?.accessToken;
  }

  private async request<T>(method: string, path: string, data?: any): Promise<{ data: T }> {
    const token = this.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}${path}`, {
      method, headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    // ...
  }

  get<T>(path: string) { return this.request<T>("GET", path); }
  post<T>(path: string, data?: any) { return this.request<T>("POST", path, data); }
  put<T>(path: string, data?: any) { return this.request<T>("PUT", path, data); }
  patch<T>(path: string, data?: any) { return this.request<T>("PATCH", path, data); }
  delete<T>(path: string) { return this.request<T>("DELETE", path); }
}

export const api = new ApiClient(API_URL);
```

### Socket Client

O `socket.ts` gerencia a conexao Socket.io com reconexao automatica. Forca reconexao quando o token muda (ex: troca de empresa):

```typescript
// lib/socket.ts
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const getSocket = (token: string): Socket => {
  // Se token mudou, forca reconexao
  // Configura: websocket + polling, reconnection infinita
};

export const disconnectSocket = () => { /* ... */ };
```

### Utils

O `utils.ts` contem funcoes utilitarias incluindo o helper `cn` para classes CSS (Tailwind merge + clsx):

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string { /* ... */ }
export function formatDate(date: string | Date): string { /* ... */ }
export function formatSLATime(deadline: string): { text: string; status: string } { /* ... */ }
export function getStatusColor(status: string): string { /* ... */ }
export function getStatusLabel(status: string): string { /* ... */ }
export function formatDistanceToNow(date: string | Date): string { /* ... */ }
```

## Utils (Diretorio Separado)

Alem de `lib/utils.ts`, existe um diretorio `utils/` na raiz de `apps/web/`:

```
utils/
└── media-url.util.ts       # Normalizacao de URLs de midia
```

## Hooks

O diretorio `hooks/` em `apps/web/` esta vazio. Os hooks customizados do projeto vivem em outros locais:

- `useSocket` -- exportado por `components/providers/socket-provider.tsx`
- `useToast` -- exportado por `components/ui/use-toast.ts`
- `useAuthStore` -- exportado por `stores/auth.store.ts`
- `useChatStore` -- exportado por `stores/chat.store.ts`

## Public Assets

```
public/
└── landing/                # Assets da landing page
    ├── logo-symbol.svg
    ├── logo-symbol-footer.svg
    ├── social-facebook.svg
    ├── social-twitter.svg
    ├── social-linkedin.svg
    ├── step-icon-1.svg
    ├── step-icon-2.svg
    ├── step-icon-3.svg
    ├── step-icon-4.svg
    └── ... (demais SVGs)
```

## Proximos Passos

- [Componentes](/frontend/componentes)
- [Paginas](/frontend/paginas)
- [Stores](/frontend/stores)
