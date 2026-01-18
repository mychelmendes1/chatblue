---
sidebar_position: 1
title: Visao Geral do Frontend
description: Arquitetura e componentes do frontend do ChatBlue
---

# Visao Geral do Frontend

O frontend do ChatBlue e construido com Next.js 14 usando App Router, React 18, TypeScript e Tailwind CSS.

## Stack Tecnologico

| Tecnologia | Versao | Proposito |
|------------|--------|-----------|
| Next.js | 14.x | Framework React |
| React | 18.x | Biblioteca UI |
| TypeScript | 5.x | Tipagem estatica |
| Tailwind CSS | 3.x | Estilizacao |
| Shadcn/UI | - | Componentes |
| Zustand | 4.x | Estado global |
| TanStack Query | 5.x | Data fetching |
| Socket.io Client | 4.x | Tempo real |
| React Hook Form | 7.x | Formularios |
| Zod | 3.x | Validacao |
| Lucide React | - | Icones |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA FRONTEND                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              APP ROUTER                                      │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   (auth)        │  │   (dashboard)   │  │     api/        │            │
│  │   /login        │  │   /chat         │  │   Route Handlers│            │
│  │   /register     │  │   /contacts     │  │                 │            │
│  │                 │  │   /users        │  │                 │            │
│  │                 │  │   /metrics      │  │                 │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PROVIDERS                                       │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Query     │ │   Socket    │ │   Theme     │ │   Toast     │          │
│  │   Provider  │ │   Provider  │ │   Provider  │ │   Provider  │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               STORES                                         │
│                            (Zustand)                                         │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │    Auth     │ │    Chat     │ │     UI      │ │   Socket    │          │
│  │    Store    │ │    Store    │ │    Store    │ │    Store    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPONENTS                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           chat/                                      │   │
│  │  ChatSidebar │ ChatWindow │ ChatInput │ MessageBubble │ ContactInfo │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                            ui/                                       │   │
│  │  Button │ Input │ Dialog │ Card │ Table │ Badge │ Avatar │ Toast    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          layout/                                     │   │
│  │  Header │ Sidebar │ DashboardLayout │ ProtectedRoute                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               HOOKS                                          │
│                                                                              │
│  useAuth │ useSocket │ useTickets │ useMessages │ useContacts │ useMetrics │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                LIB                                           │
│                                                                              │
│  api.ts │ socket.ts │ utils.ts │ constants.ts │ validators.ts              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Estrutura de Pastas

```
apps/web/
├── app/
│   ├── (auth)/                 # Grupo de autenticacao
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/            # Grupo do dashboard
│   │   ├── chat/
│   │   │   └── page.tsx
│   │   ├── contacts/
│   │   │   └── page.tsx
│   │   ├── users/
│   │   │   └── page.tsx
│   │   ├── connections/
│   │   │   └── page.tsx
│   │   ├── metrics/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── layout.tsx              # Layout raiz
│   ├── providers.tsx           # Providers React
│   └── globals.css             # Estilos globais
│
├── components/
│   ├── chat/                   # Componentes do chat
│   ├── ui/                     # Componentes Shadcn/UI
│   ├── layout/                 # Componentes de layout
│   └── providers/              # Providers
│
├── stores/                     # Zustand stores
│   ├── auth.store.ts
│   ├── chat.store.ts
│   └── ui.store.ts
│
├── lib/                        # Utilitarios
│   ├── api.ts
│   ├── socket.ts
│   └── utils.ts
│
├── hooks/                      # Custom hooks
│   ├── useAuth.ts
│   ├── useSocket.ts
│   └── useTickets.ts
│
├── types/                      # Tipos TypeScript
│   └── index.ts
│
└── public/                     # Assets estaticos
    ├── favicon.ico
    └── images/
```

## App Router

### Layout Raiz

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChatBlue',
  description: 'Plataforma de Atendimento via WhatsApp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Providers

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { SocketProvider } from '@/components/providers/SocketProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <SocketProvider>
          {children}
          <Toaster />
        </SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### Route Groups

```typescript
// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

// app/(dashboard)/layout.tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

## Data Fetching

### TanStack Query

```typescript
// hooks/useTickets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useTickets = (filters?: TicketFilters) => {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => api.get('/tickets', { params: filters }),
  });
};

export const useTicket = (id: string) => {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`),
    enabled: !!id,
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/tickets/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};
```

### API Client

```typescript
// lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refreshToken }
          );

          useAuthStore.getState().setToken(data.accessToken);

          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api.request(error.config);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }

    return Promise.reject(error);
  }
);
```

## Proximos Passos

- [Estrutura](/frontend/estrutura)
- [Componentes](/frontend/componentes)
- [Paginas](/frontend/paginas)
- [Stores](/frontend/stores)
