---
sidebar_position: 4
title: Paginas da Aplicacao
description: Documentacao completa de todas as paginas do frontend ChatBlue
---

# Paginas da Aplicacao

Esta documentacao descreve todas as paginas disponiveis no frontend do ChatBlue, incluindo suas funcionalidades, componentes utilizados e fluxos de interacao.

## Estrutura de Rotas

O ChatBlue utiliza o sistema de rotas do Next.js App Router com grupos de rotas para organizacao:

```
app/
├── (auth)/                 # Paginas de autenticacao
│   ├── login/
│   ├── forgot-password/
│   ├── reset-password/
│   └── layout.tsx
├── (dashboard)/            # Paginas do painel principal
│   ├── chat/
│   ├── inbox/
│   ├── kanban/
│   ├── contacts/
│   ├── users/
│   ├── connections/
│   ├── metrics/
│   ├── settings/
│   ├── faq/
│   ├── ai-agent/
│   ├── ai-agents/          # Redireciona para ai-agent?tab=categorias
│   ├── ai-knowledge/
│   ├── knowledge/
│   ├── knowledge-base/
│   ├── profile/
│   ├── open/[slug]/[phone]/
│   └── layout.tsx
└── layout.tsx              # Layout raiz
```

---

## Paginas de Autenticacao

### Login (`/login`)

Pagina de autenticacao do sistema.

**Arquivo:** `app/(auth)/login/page.tsx`

**Funcionalidades:**
- Formulario de login com email e senha
- Validacao de campos em tempo real
- Exibicao de erros de autenticacao
- Redirecionamento automatico apos login

**Componentes Utilizados:**
- `Input` - Campos de formulario
- `Button` - Botao de submissao
- `Card` - Container do formulario
- `Form` (react-hook-form) - Gerenciamento de formulario

**Exemplo de Implementacao:**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      router.push("/chat");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Entrar no ChatBlue</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Esqueci a Senha (`/forgot-password`)

Pagina para solicitar redefinicao de senha via email.

**Arquivo:** `app/(auth)/forgot-password/page.tsx`

### Redefinir Senha (`/reset-password`)

Pagina para redefinir a senha usando o token recebido por email.

**Arquivo:** `app/(auth)/reset-password/page.tsx`

---

## Paginas do Dashboard

### Chat (`/chat`)

Pagina principal de conversas e atendimento.

**Arquivo:** `app/(dashboard)/chat/page.tsx`

**Funcionalidades:**
- Lista de tickets/conversas na sidebar
- Janela de chat com mensagens em tempo real
- Envio de mensagens de texto, imagens, audio e documentos
- Sistema de mencoes (@) para mensagens internas
- Resposta a mensagens (quote/reply)
- Indicador de janela de 24h do WhatsApp
- Acoes de ticket: Resolver, Encerrar, Reabrir

**Componentes Principais:**
- `TicketList` - Lista de conversas
- `ChatWindow` - Janela de mensagens
- `ContactInfo` - Painel de informacoes do contato

**Estados Gerenciados:**
```tsx
interface ChatState {
  selectedTicket: Ticket | null;
  messages: Message[];
  isLoadingMessages: boolean;
  newMessage: string;
  isInternalMode: boolean;
  selectedMentions: User[];
  replyingTo: Message | null;
}
```

**Exemplo de Uso do ChatWindow:**

```tsx
import { ChatWindow } from "@/components/chat/chat-window";
import { useChatStore } from "@/stores/chat.store";

function ChatPage() {
  const { selectedTicket } = useChatStore();
  const [showContactInfo, setShowContactInfo] = useState(false);

  if (!selectedTicket) {
    return <EmptyState message="Selecione uma conversa" />;
  }

  return (
    <div className="flex h-full">
      <ChatWindow
        ticket={selectedTicket}
        onShowContactInfo={() => setShowContactInfo(true)}
        onMobileBack={() => setSelectedTicket(null)}
      />
      {showContactInfo && (
        <ContactInfo
          contact={selectedTicket.contact}
          onClose={() => setShowContactInfo(false)}
        />
      )}
    </div>
  );
}
```

**Tipos de Mensagens Suportados:**

| Tipo | Descricao |
|------|-----------|
| `TEXT` | Mensagem de texto simples |
| `IMAGE` | Imagem com preview |
| `AUDIO` | Audio com player e transcricao |
| `VIDEO` | Video com player |
| `DOCUMENT` | Documento para download |
| `TEMPLATE` | Mensagem de template WhatsApp |
| `SYSTEM` | Mensagem do sistema |

---

### Caixa de Entrada (`/inbox`)

Visualizacao de tickets em formato de lista.

**Arquivo:** `app/(dashboard)/inbox/page.tsx`

**Funcionalidades:**
- Listagem de tickets em formato de lista
- Filtros por status, atendente e periodo
- Visualizacao rapida do historico de cada ticket
- Acesso direto ao chat do ticket selecionado

---

### Kanban (`/kanban`)

Visualizacao de tickets em quadro Kanban.

**Arquivo:** `app/(dashboard)/kanban/page.tsx`

**Funcionalidades:**
- Quadro Kanban com colunas organizadas por status dos tickets
- Arrastar e soltar (drag-and-drop) para movimentar tickets entre colunas
- Visualizacao visual do fluxo de atendimento

---

### Contatos (`/contacts`)

Gerenciamento de contatos e clientes.

**Arquivo:** `app/(dashboard)/contacts/page.tsx`

**Funcionalidades:**
- Listagem de contatos com busca e filtros
- Criacao e edicao de contatos
- Visualizacao de historico de conversas
- Atribuicao de tags e categorias
- Exportacao de contatos

**Estrutura de Dados:**

```typescript
interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  lastMessageAt?: string;
  createdAt: string;
}
```

**Exemplo de Listagem:**

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPhone } from "@/lib/utils";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, [search]);

  async function fetchContacts() {
    setIsLoading(true);
    try {
      const response = await api.get<Contact[]>(
        `/contacts?search=${encodeURIComponent(search)}`
      );
      setContacts(response.data);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Contatos</h1>
        <Input
          placeholder="Buscar contatos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-4 max-w-md"
        />
      </div>

      <div className="grid gap-4">
        {contacts.map((contact) => (
          <Card key={contact.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar>
                <AvatarImage src={contact.avatar} />
                <AvatarFallback>
                  {contact.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{contact.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPhone(contact.phone)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

### Metricas (`/metrics`)

Dashboard de metricas e analytics.

**Arquivo:** `app/(dashboard)/metrics/page.tsx`

**Funcionalidades:**
- Visao geral de atendimentos
- Graficos de desempenho
- Tempo medio de resposta
- Taxa de resolucao
- Metricas por atendente
- Exportacao de relatorios

**Metricas Disponiveis:**

| Metrica | Descricao |
|---------|-----------|
| Total de Tickets | Quantidade total de atendimentos |
| Tempo Medio de Resposta | Tempo entre mensagem do cliente e resposta |
| Taxa de Resolucao | Percentual de tickets resolvidos |
| Tickets por Atendente | Distribuicao de carga por usuario |
| Tickets por Status | Distribuicao por status atual |
| Tempo Medio de Atendimento | Duracao media de um atendimento |

**Exemplo de Card de Metrica:**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Clock, CheckCircle, TrendingUp } from "lucide-react";

function MetricCard({
  title,
  value,
  change,
  icon: Icon
}: {
  title: string;
  value: string;
  change?: string;
  icon: any;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground mt-1">
            <TrendingUp className="w-3 h-3 inline mr-1 text-green-500" />
            {change} vs. periodo anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Uso
<div className="grid gap-4 md:grid-cols-4">
  <MetricCard
    title="Total de Tickets"
    value="1,234"
    change="+12%"
    icon={MessageSquare}
  />
  <MetricCard
    title="Tempo Medio"
    value="5m 32s"
    change="-8%"
    icon={Clock}
  />
  <MetricCard
    title="Taxa de Resolucao"
    value="94%"
    change="+3%"
    icon={CheckCircle}
  />
</div>
```

---

### Usuarios (`/users`)

Gerenciamento de usuarios e permissoes (apenas Admin).

**Arquivo:** `app/(dashboard)/users/page.tsx`

**Permissoes Necessarias:** `ADMIN` ou `SUPER_ADMIN`

**Funcionalidades:**
- Listagem de usuarios da empresa
- Criacao de novos usuarios
- Edicao de perfis e permissoes
- Desativacao de usuarios
- Atribuicao de departamentos

**Roles Disponiveis:**

| Role | Descricao |
|------|-----------|
| `AGENT` | Atendente comum |
| `SUPERVISOR` | Supervisor de equipe |
| `ADMIN` | Administrador da empresa |
| `SUPER_ADMIN` | Super administrador (multi-tenant) |

**Exemplo de Tabela de Usuarios:**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

function UsersTable({ users }: { users: User[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Funcao</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Acoes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant="outline">{user.role}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### Conexoes (`/connections`)

Gerenciamento de conexoes WhatsApp e Instagram.

**Arquivo:** `app/(dashboard)/connections/page.tsx`

**Funcionalidades:**
- Listagem de conexoes WhatsApp e Instagram
- Conexao via QR Code (Baileys)
- Conexao via Meta Cloud API (oficial)
- Conexao de conta Instagram
- Monitoramento de status em tempo real
- Desconexao e reconexao

**Tipos de Conexao:**

```typescript
type ConnectionType = "BAILEYS" | "META_CLOUD" | "INSTAGRAM";

interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  status: "CONNECTED" | "DISCONNECTED" | "CONNECTING" | "QR_CODE";
  phone?: string;
  qrCode?: string;
  createdAt: string;
}
```

**Exemplo de Card de Conexao:**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, QrCode, Trash2 } from "lucide-react";

function ConnectionCard({ connection }: { connection: Connection }) {
  const statusColors = {
    CONNECTED: "bg-green-500",
    DISCONNECTED: "bg-red-500",
    CONNECTING: "bg-yellow-500",
    QR_CODE: "bg-blue-500",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{connection.name}</CardTitle>
          <Badge className={statusColors[connection.status]}>
            {connection.status === "CONNECTED" ? (
              <Wifi className="w-3 h-3 mr-1" />
            ) : (
              <WifiOff className="w-3 h-3 mr-1" />
            )}
            {connection.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Tipo: {connection.type === "BAILEYS" ? "Baileys (QR Code)" : connection.type === "META_CLOUD" ? "Meta Cloud API" : "Instagram"}
        </p>

        {connection.status === "QR_CODE" && connection.qrCode && (
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <img src={connection.qrCode} alt="QR Code" className="w-48 h-48" />
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {connection.status !== "CONNECTED" && (
            <Button variant="outline" size="sm">
              <QrCode className="w-4 h-4 mr-2" />
              Conectar
            </Button>
          )}
          <Button variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Configuracoes (`/settings`)

Configuracoes gerais da conta e empresa.

**Arquivo:** `app/(dashboard)/settings/page.tsx`

**Secoes Disponiveis:**

1. **Empresa** - Informacoes da empresa (Admin)
2. **Notificacoes** - Preferencias de notificacao
3. **Departamentos** - Gerenciamento de setores
4. **Horarios** - Horarios de funcionamento
5. **Mensagens Automaticas** - Respostas automaticas

**Exemplo de Formulario de Configuracoes:**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sound: true,
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuracoes</h1>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">Notificacoes</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificacoes por Email</p>
                  <p className="text-sm text-muted-foreground">
                    Receber atualizacoes por email
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sons de Notificacao</p>
                  <p className="text-sm text-muted-foreground">
                    Tocar som ao receber mensagens
                  </p>
                </div>
                <Switch
                  checked={notifications.sound}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, sound: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### Perfil (`/profile`)

Pagina de perfil do usuario logado.

**Arquivo:** `app/(dashboard)/profile/page.tsx`

**Funcionalidades:**
- Visualizacao e edicao da foto de perfil
- Estatisticas pessoais de atendimento
- Alteracao de senha
- Dados pessoais do usuario

O acesso ao perfil e feito pelo avatar do usuario na sidebar (dropdown com opcao "Configuracoes" que leva a `/profile`).

---

### Atendente IA (`/ai-agent`)

Configuracao de agentes de IA para atendimento automatizado.

**Arquivo:** `app/(dashboard)/ai-agent/page.tsx`

**Funcionalidades:**
- Criacao de multiplos agentes IA
- Selecao de modelo (GPT-4, Claude, etc)
- Configuracao de personalidade
- Upload de PDF para treinamento
- Palavras-chave para transferencia
- Guardrails de seguranca
- Aba "Agentes por categoria" (visivel para admins) para atribuir agentes por departamento/categoria

A rota `/ai-agents` redireciona para `/ai-agent?tab=categorias`.

**Modelos de IA Suportados:**

| Modelo | Provider |
|--------|----------|
| GPT-4 Turbo | OpenAI |
| GPT-4o | OpenAI |
| GPT-4o Mini | OpenAI |
| GPT-3.5 Turbo | OpenAI |
| Claude Opus 4 | Anthropic |
| Claude Sonnet 4 | Anthropic |
| Claude 3.5 Sonnet | Anthropic |
| Claude 3 Opus | Anthropic |
| Claude 3 Haiku | Anthropic |

**Configuracoes de Personalidade:**

```typescript
const PERSONALITY_TONES = [
  { id: 'friendly', name: 'Amigavel' },
  { id: 'formal', name: 'Formal' },
  { id: 'technical', name: 'Tecnico' },
  { id: 'empathetic', name: 'Empatico' },
];

const PERSONALITY_STYLES = [
  { id: 'concise', name: 'Conciso' },
  { id: 'detailed', name: 'Detalhado' },
  { id: 'conversational', name: 'Conversacional' },
];
```

**Exemplo de Formulario de Agente IA:**

```tsx
<div className="space-y-4 p-4 border rounded-lg">
  <div className="flex items-center gap-2 mb-2">
    <Sparkles className="w-4 h-4 text-primary" />
    <Label className="text-sm font-medium">Personalidade da IA</Label>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label>Tom de Voz</Label>
      <Select value={form.aiPersonalityTone} onValueChange={handleToneChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERSONALITY_TONES.map((tone) => (
            <SelectItem key={tone.id} value={tone.id}>
              {tone.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Estilo de Resposta</Label>
      <Select value={form.aiPersonalityStyle} onValueChange={handleStyleChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERSONALITY_STYLES.map((style) => (
            <SelectItem key={style.id} value={style.id}>
              {style.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>

  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label>Usar Emojis</Label>
      <p className="text-xs text-muted-foreground">
        Permite emojis nas respostas
      </p>
    </div>
    <Switch
      checked={form.aiUseEmojis}
      onCheckedChange={(checked) => setForm({ ...form, aiUseEmojis: checked })}
    />
  </div>
</div>
```

---

### Conhecimento (`/knowledge`)

Base de conhecimento para treinamento da IA.

**Arquivo:** `app/(dashboard)/knowledge/page.tsx`

**Permissoes Necessarias:** `ADMIN` ou `SUPER_ADMIN`

**Funcionalidades:**
- Upload de documentos (PDF, DOCX, TXT)
- Organizacao em categorias
- Indexacao automatica para RAG
- Visualizacao de chunks processados

A rota `/knowledge-base` tambem existe como uma pagina separada, mas a pagina principal de gestao de conhecimento e `/knowledge`, que e a exibida na sidebar.

---

### FAQ (`/faq`)

Gerenciamento de perguntas frequentes para treinamento da IA.

**Arquivo:** `app/(dashboard)/faq/page.tsx`

**Permissoes Necessarias:** `ADMIN`

**Funcionalidades:**
- CRUD completo de FAQs
- Organizacao por categorias
- Atribuicao a departamentos
- Palavras-chave para busca semantica
- Contador de usos pela IA
- Ativacao/desativacao individual

Esta pagina nao aparece como item separado na sidebar. O acesso e feito por outras areas da aplicacao.

**Estrutura de Dados:**

```typescript
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category?: string;
  departmentId?: string;
  department?: Department;
  useCount: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

---

### Link Publico (`/open/[slug]/[phone]`)

Rota publica para iniciar conversa via link compartilhavel.

**Arquivo:** `app/(dashboard)/open/[slug]/[phone]/page.tsx`

**Funcionalidades:**
- Permite que clientes externos iniciem uma conversa atraves de um link
- O `[slug]` identifica a empresa/conexao
- O `[phone]` identifica o numero de telefone do contato
- Nao requer autenticacao para acesso

---

## Navegacao

### Sidebar Desktop

A sidebar desktop exibe todos os itens de navegacao em formato de icones. Itens marcados com `adminOnly` so aparecem para usuarios com role `ADMIN` ou `SUPER_ADMIN`:

```tsx
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
```

Na parte inferior da sidebar, o avatar do usuario abre um dropdown com as opcoes "Configuracoes" (leva a `/profile`) e "Sair".

### Bottom Navigation Mobile

No mobile, a navegacao principal aparece na parte inferior com os itens mais importantes:

```tsx
const bottomNavItems = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Entrada", href: "/inbox", icon: Inbox },
  { name: "Kanban", href: "/kanban", icon: LayoutGrid },
  { name: "Metricas", href: "/metrics", icon: BarChart3 },
];
```

Os demais itens ficam acessiveis atraves do menu "Mais" que abre um Sheet com todos os itens de navegacao, alem de secao de usuario com link para perfil e botao de sair.

---

## Protecao de Rotas

As rotas do dashboard sao protegidas pelo layout que verifica o estado de autenticacao usando `user` e `isLoading` do `useAuthStore`. O layout envolve todo o conteudo com `SocketProvider` e inclui o `Header` e o mascote `BlueMascot`:

```tsx
// app/(dashboard)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SocketProvider } from "@/components/providers/socket-provider";
import { BlueMascot } from "@/components/blue/blue-mascot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = pathname || "/chat";
      if (currentPath !== "/chat" && currentPath !== "/") {
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chatblue" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SocketProvider>
      <div className="flex h-screen h-screen-mobile overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 min-h-0">
            {children}
          </main>
        </div>
      </div>
      <BlueMascot />
    </SocketProvider>
  );
}
```

Quando o usuario nao esta autenticado, o layout redireciona para `/login` preservando o caminho atual como parametro `redirect` na URL (exceto para `/chat` e `/`).

---

## Boas Praticas

### 1. Server vs Client Components

- Use `"use client"` apenas quando necessario (interatividade, hooks)
- Prefira Server Components para paginas estaticas

### 2. Loading States

Sempre implemente estados de carregamento:

```tsx
if (isLoading) {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

### 3. Error Handling

Trate erros de forma amigavel:

```tsx
try {
  await api.get("/data");
} catch (error) {
  toast({
    title: "Erro",
    description: "Falha ao carregar dados",
    variant: "destructive",
  });
}
```

### 4. Responsividade

Use classes Tailwind para diferentes tamanhos de tela:

```tsx
<div className="p-2 md:p-4 lg:p-6">
  <h1 className="text-lg md:text-xl lg:text-2xl">Titulo</h1>
</div>
```
