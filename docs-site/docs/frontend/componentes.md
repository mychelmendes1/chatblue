---
sidebar_position: 3
title: Componentes
---

# Componentes

Documentacao dos principais componentes React do ChatBlue. Todos os arquivos de componentes seguem a convencao **kebab-case** (ex: `chat-sidebar.tsx`).

## Estrutura de Diretorios

```
apps/web/components/
  chat/               # Componentes do chat (atendimento)
  kanban/             # Quadro Kanban de tickets
  inbox/              # Caixa de entrada
  layout/             # Header, Sidebar, Notifications
  blue/               # Mascote Blue (assistente IA do operador)
  admin-assistant/    # Assistente de monitoramento (admin)
  ai-agents/          # Configuracao de agentes IA
  connections/        # Gerenciamento de conexoes (WhatsApp, email)
  providers/          # Providers (Socket.IO, etc.)
  shared/             # Componentes compartilhados
  landing/            # Pagina de landing page
  ui/                 # Componentes base (shadcn/ui)
```

## Componentes do Chat

Localizados em `components/chat/`. Formam a tela principal de atendimento.

### chat-sidebar.tsx

Lista de conversas/tickets com busca, filtros e abas. Componente grande (~1400 linhas) que gerencia a listagem completa de tickets.

```typescript
// components/chat/chat-sidebar.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Filter, Bot, User, Clock, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate, formatPhone, getStatusColor, formatSLATime } from "@/lib/utils";
import { useChatStore } from "@/stores/chat.store";
```

Principais funcionalidades:
- Busca por nome, telefone ou protocolo
- Filtro por departamento, atendente e status
- Abas: Todas, Minhas, IA, Fila, Mencoes
- Dialog de novo ticket com selecao de contato e conexao
- Indicadores de SLA e contagem de nao lidas

### chat-window.tsx

Janela de mensagens com input, header do ticket e area de mensagens. Componente grande (~2200 linhas) que engloba toda a logica de envio, recebimento, reacoes, resposta e renderizacao de mensagens.

```typescript
// components/chat/chat-window.tsx
"use client";

import React, { useEffect, useRef, useState, Component } from "react";
import {
  Phone, Video, MoreVertical, Paperclip, Send, Smile, Bot,
  Check, CheckCheck, AtSign, MessageSquare, CheckCircle,
  Loader2, Clock, AlertCircle, X, FileIcon, Reply, Trash2, Heart,
} from "lucide-react";
```

Principais funcionalidades:
- Renderizacao de mensagens (texto, imagem, audio, video, documento, sticker, localizacao)
- Status de entrega (pendente, enviado, entregue, lido, falhou)
- Upload de arquivos e midia
- Notas internas (mensagens amarelas visiveis apenas para a equipe)
- Mencoes de usuarios com `@`
- Reacoes e resposta (reply/quote)
- Preview de resposta da IA antes de enviar
- Indicador de digitacao
- Atalhos de template de mensagem
- ErrorBoundary para recuperacao de erros

### contact-info.tsx

Painel lateral com informacoes do contato e historico de tickets.

```typescript
// components/chat/contact-info.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Phone, Mail, Edit2, Check, Building, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPhone } from "@/lib/utils";
import { api } from "@/lib/api";
```

Principais funcionalidades:
- Exibicao e edicao de dados do contato (nome, telefone, email, empresa)
- Historico de tickets anteriores do mesmo contato
- Navegacao para ticket anterior
- Transferencia de ticket para outro atendente ou departamento

### template-selector.tsx

Seletor de templates de mensagem do WhatsApp.

```typescript
// components/chat/template-selector.tsx
"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Loader2, ChevronRight, X, Send, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
```

Principais funcionalidades:
- Busca e listagem de templates aprovados no WhatsApp
- Preenchimento de variaveis do template
- Preview do template antes de enviar
- Envio direto pelo seletor

### email-viewer.tsx

Visualizador de emails HTML em modal.

```typescript
// components/chat/email-viewer.tsx
"use client";

import { useEffect, useState } from "react";
import { X, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function EmailViewer() { ... }
```

Abre via evento customizado (`open-email-viewer`) e renderiza o HTML do email em um iframe seguro dentro de um Dialog.

### ai-response-preview.tsx

Preview e edicao da resposta sugerida pela IA antes do envio.

```typescript
// components/chat/ai-response-preview.tsx
"use client";

import { useState } from "react";
import {
  Bot, Send, Edit3, X, Star, ExternalLink, Loader2,
  ThumbsUp, ThumbsDown, Copy, Check, AlertTriangle, FileText, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
```

Principais funcionalidades:
- Exibicao da sugestao da IA
- Edicao do texto antes de enviar
- Feedback (positivo/negativo) para treinamento
- Envio direto ou copia para area de transferencia

## Componentes de Layout

Localizados em `components/layout/`.

### sidebar.tsx

Barra de navegacao lateral (desktop) e bottom navigation (mobile).

```typescript
// components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare, Users, BarChart3, Settings, LogOut, Wifi,
  Bot, Shield, Book, Menu, X, Inbox, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

const navigation = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Caixa de Entrada", href: "/inbox", icon: Inbox },
  { name: "Kanban", href: "/kanban", icon: LayoutGrid },
  { name: "Contatos", href: "/contacts", icon: Users },
  { name: "Metricas", href: "/metrics", icon: BarChart3 },
  { name: "Usuarios", href: "/users", icon: Shield, adminOnly: true },
  { name: "Conexoes", href: "/connections", icon: Wifi },
  { name: "Atendente IA", href: "/ai-agent", icon: Bot },
  { name: "Conhecimento", href: "/knowledge", icon: Book, adminOnly: true },
  { name: "Configuracoes", href: "/settings", icon: Settings },
];

export function Sidebar() { ... }
```

Funcionalidades:
- Sidebar fixa de 64px no desktop com icones e tooltips
- Bottom navigation no mobile com 4 itens principais + menu "Mais"
- Itens `adminOnly` filtrados por role do usuario
- Logout e exibicao do avatar do usuario
- Usa `Sheet` do shadcn para menu mobile expandido

### header.tsx

Header superior com troca de empresa, link para documentacao e notificacoes.

```typescript
// components/layout/header.tsx
"use client";

import { useEffect, useState } from "react";
import { Building2, Library } from "lucide-react";
import { useAuthStore, type Company } from "@/stores/auth.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { Notifications } from "./notifications";

export function Header() { ... }
```

Funcionalidades:
- Troca rapida de empresa (multi-tenant) via abas
- Badge de mensagens nao lidas por empresa
- Link para documentacao
- Componente `Notifications` integrado

### notifications.tsx

Popover de notificacoes em tempo real.

```typescript
// components/layout/notifications.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/components/providers/socket-provider";

export function Notifications() { ... }
```

Funcionalidades:
- Badge com contagem de notificacoes nao lidas
- Listagem de notificacoes com scroll
- Atualizacao em tempo real via Socket.IO
- Marcar como lida ao clicar

### company-switcher.tsx

Dropdown para troca de empresa (multi-tenant).

```typescript
// components/layout/company-switcher.tsx
"use client";

import { useState } from "react";
import { Check, ChevronDown, Building2, Loader2, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth.store";

export function CompanySwitcher() { ... }
```

## Componentes Kanban

Localizados em `components/kanban/`. Implementam o quadro Kanban de tickets com drag-and-drop.

### kanban-board.tsx

Board principal com colunas drag-and-drop usando `@hello-pangea/dnd`.

```typescript
// components/kanban/kanban-board.tsx
"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn, type ColumnId } from "./kanban-column";
import type { KanbanTicket } from "./kanban-card";

const columns = [
  { id: "novos", title: "Novos", color: "#f59e0b" },
  { id: "em_atendimento", title: "Em Atendimento", color: "#3b82f6" },
  { id: "aguardando", title: "Aguardando", color: "#8b5cf6" },
  { id: "resolvidos", title: "Resolvidos", color: "#22c55e" },
];
```

### kanban-column.tsx

Coluna individual do Kanban com paginacao (20 itens por pagina) e area droppable.

### kanban-card.tsx

Card de ticket no Kanban com avatar do contato, badges de status/prioridade, indicador de IA e `ConnectionTag`.

## Componentes da Caixa de Entrada

### inbox-card.tsx

Card de ticket para a caixa de entrada. Similar ao `kanban-card.tsx` mas com layout em lista e checkbox para selecao em lote.

```typescript
// components/inbox/inbox-card.tsx
"use client";

import { Bot, Phone, Clock, MessageSquare, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConnectionTag } from "@/components/shared/connection-tag";
```

## Mascote Blue

Localizados em `components/blue/`. O Blue e o assistente IA que ajuda o operador durante o atendimento.

### blue-mascot.tsx

Componente principal do mascote. Gerencia os estados (minimizado, expandido, mostrando dica) e a posicao arrastavel na tela.

```typescript
// components/blue/blue-mascot.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, X, Minimize2, Maximize2 } from "lucide-react";
import { BlueChat } from "./blue-chat";
import { BlueTips } from "./blue-tips";
import { usePageContext } from "./context-detector";

type BlueState = "minimized" | "expanded" | "showing-tip";

export function BlueMascot({ className }: BlueMascotProps) { ... }
```

### blue-chat.tsx

Chat com o Blue. Interface de conversa onde o operador pode perguntar sobre o sistema, pedir ajuda com atendimento, etc.

### blue-tips.tsx

Dicas contextuais do Blue. Exibe dicas relevantes baseadas na pagina atual usando o `usePageContext`.

## Assistente de Monitoramento (Admin)

Localizados em `components/admin-assistant/`. Assistente IA para administradores com acesso a metricas e dados operacionais.

### admin-assistant-fab.tsx

Floating Action Button (FAB) fixo no canto inferior esquerdo que abre o chat do assistente admin.

### admin-assistant-chat.tsx

Chat do assistente de monitoramento. Permite ao admin fazer perguntas sobre metricas, performance da equipe, SLA, etc.

```typescript
// components/admin-assistant/admin-assistant-chat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { BarChart3, X, Send, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
```

## Agentes IA

### ai-agents-by-category-panel.tsx

Painel de gerenciamento de agentes IA organizados por categoria. Permite criar, editar e remover agentes com configuracoes de prompt, knowledge base e parametros.

Localizado em `components/ai-agents/`.

## Conexoes

### email-connections.tsx

Gerenciamento de conexoes de email (IMAP/SMTP). Permite adicionar, testar, ativar/desativar e remover contas de email.

Localizado em `components/connections/`.

## Providers

### socket-provider.tsx

Provider de Socket.IO que gerencia a conexao WebSocket em tempo real.

```typescript
// components/providers/socket-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore, type Message } from "@/stores/chat.store";

export function useSocket() { ... }
export function SocketProvider({ children }: { children: React.ReactNode }) { ... }
```

Funcionalidades:
- Conexao/desconexao automatica baseada no token de autenticacao
- Listeners para eventos de mensagem, ticket, digitacao e notificacao
- Debounce de refetch da lista de tickets
- Normalizacao de URLs de midia
- Exporta o hook `useSocket` para acesso ao socket em qualquer componente

## Componentes Compartilhados

### connection-tag.tsx

Badge que mostra o tipo e status de conexao de um ticket (WhatsApp, Email), com countdown da janela de 24h do WhatsApp.

```typescript
// components/shared/connection-tag.tsx
"use client";

import { Wifi, Clock, AlertTriangle, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConnectionTagProps {
  connectionName?: string;
  connectionType?: string;
  lastMessageAt?: string;
  compact?: boolean;
}

export function ConnectionTag({ ... }: ConnectionTagProps) { ... }
```

Usado em `kanban-card.tsx`, `inbox-card.tsx` e na tela de chat.

## Componentes da Landing Page

Localizados em `components/landing/`. Sao componentes da pagina publica de apresentacao do produto:

- `HeroSection.tsx` - Hero principal
- `HowItWorksSection.tsx` - Como funciona
- `HowDoesItWorkSection.tsx` - Detalhamento de funcionamento
- `StepByStepSection.tsx` - Passo a passo
- `ForWhomSection.tsx` - Para quem e
- `WhyItWorksSection.tsx` - Por que funciona
- `PricingSection.tsx` - Precos
- `FAQSection.tsx` - Perguntas frequentes
- `LandingNavbar.tsx` - Navbar da landing
- `LandingFooter.tsx` - Footer da landing

> Nota: os componentes de landing usam PascalCase nos nomes de arquivo, diferente do restante do projeto.

## Componentes UI (shadcn/ui)

O ChatBlue usa [shadcn/ui](https://ui.shadcn.com/) como base de componentes. Ficam em `components/ui/` e seguem o padrao de composicao do Radix UI. Principais componentes instalados:

- **button** - Botoes com variantes (default, destructive, outline, secondary, ghost, link)
- **input** / **textarea** - Campos de entrada
- **select** - Selecao com dropdown
- **dialog** / **sheet** - Modais e paineis laterais
- **popover** - Popover flutuante (usado em filtros e notificacoes)
- **dropdown-menu** - Menu dropdown (usado no logout, acoes)
- **table** - Tabelas de dados
- **tabs** - Abas de navegacao
- **badge** - Indicadores de status e contagem
- **avatar** - Imagens de perfil com fallback de iniciais
- **toast** / **toaster** - Notificacoes toast (via `useToast`)
- **scroll-area** - Area com scroll customizado
- **checkbox** - Checkbox (usado na selecao em lote)
- **switch** - Toggle on/off
- **label** - Labels de formulario
- **slider** - Slider de valores
- **progress** - Barra de progresso
- **alert** - Alertas informativos
- **card** - Cards com header, content e footer

## Proximos Passos

- [Paginas](/frontend/paginas)
- [Stores](/frontend/stores)
- [Hooks](/frontend/hooks)
