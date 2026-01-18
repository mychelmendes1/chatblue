---
sidebar_position: 7
title: Estilizacao
description: Guia completo de estilizacao com Tailwind CSS e Shadcn/UI no ChatBlue
---

# Estilizacao

O ChatBlue utiliza **Tailwind CSS** como framework de estilizacao e **Shadcn/UI** como biblioteca de componentes. Esta combinacao oferece flexibilidade, consistencia e excelente experiencia de desenvolvimento.

## Stack de Estilizacao

| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| Tailwind CSS | 3.4+ | Framework de utilitarios CSS |
| Shadcn/UI | - | Componentes acessiveis e personalizaveis |
| tailwindcss-animate | - | Animacoes CSS |
| clsx | - | Concatenacao condicional de classes |
| tailwind-merge | - | Merge inteligente de classes Tailwind |

---

## Configuracao do Tailwind

**Arquivo:** `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Cores semanticas (CSS variables)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Cores WhatsApp
        whatsapp: {
          green: "#25D366",
          teal: "#128C7E",
          "teal-dark": "#075E54",
          light: "#DCF8C6",
        },
        // Cores ChatBlue
        chatblue: {
          DEFAULT: "#0088CC",
          light: "#E3F2FD",
          dark: "#005C99",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## Variaveis CSS

**Arquivo:** `app/globals.css`

O tema utiliza CSS custom properties (variaveis) para suportar modo claro e escuro:

### Modo Claro (Padrao)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 199 100% 40%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 199 100% 40%;
  --radius: 0.5rem;
}
```

### Modo Escuro

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 199 100% 40%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 199 100% 40%;
}
```

---

## Utilitario cn()

A funcao `cn()` combina `clsx` e `tailwind-merge` para concatenar classes de forma segura:

**Arquivo:** `lib/utils.ts`

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Uso

```tsx
import { cn } from "@/lib/utils";

// Classes condicionais
<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "primary" && "primary-variant"
)} />

// Merge de classes (evita conflitos)
<button className={cn(
  "px-4 py-2 bg-blue-500",
  className // Props externas nao conflitam
)} />

// Arrays e objetos
<div className={cn([
  "class-1",
  "class-2",
  { "conditional-class": condition }
])} />
```

---

## Componentes Shadcn/UI

Os componentes do Shadcn/UI sao instalados diretamente no projeto em `components/ui/`.

### Componentes Disponiveis

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| `Button` | `button.tsx` | Botao com variantes |
| `Input` | `input.tsx` | Campo de texto |
| `Card` | `card.tsx` | Container de conteudo |
| `Dialog` | `dialog.tsx` | Modal |
| `Select` | `select.tsx` | Seletor dropdown |
| `Badge` | `badge.tsx` | Etiqueta/tag |
| `Avatar` | `avatar.tsx` | Imagem de perfil |
| `Toast` | `toast.tsx` | Notificacao |
| `Tabs` | `tabs.tsx` | Abas |
| `Table` | `table.tsx` | Tabela |
| `Switch` | `switch.tsx` | Toggle |
| `Textarea` | `textarea.tsx` | Area de texto |
| `ScrollArea` | `scroll-area.tsx` | Area com scroll customizado |
| `Sheet` | `sheet.tsx` | Painel lateral |

### Exemplos de Uso

#### Button

```tsx
import { Button } from "@/components/ui/button";

// Variantes
<Button variant="default">Padrao</Button>
<Button variant="secondary">Secundario</Button>
<Button variant="destructive">Destrutivo</Button>
<Button variant="outline">Contorno</Button>
<Button variant="ghost">Fantasma</Button>
<Button variant="link">Link</Button>

// Tamanhos
<Button size="default">Normal</Button>
<Button size="sm">Pequeno</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><Icon /></Button>

// Estados
<Button disabled>Desabilitado</Button>
<Button asChild>
  <Link href="/pagina">Como Link</Link>
</Button>
```

#### Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Titulo do Card</CardTitle>
    <CardDescription>Descricao do card</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Conteudo principal do card</p>
  </CardContent>
  <CardFooter>
    <Button>Acao</Button>
  </CardFooter>
</Card>
```

#### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir Modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titulo do Modal</DialogTitle>
      <DialogDescription>
        Descricao do que este modal faz
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Conteudo */}
    </div>
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opcao1">Opcao 1</SelectItem>
    <SelectItem value="opcao2">Opcao 2</SelectItem>
    <SelectItem value="opcao3">Opcao 3</SelectItem>
  </SelectContent>
</Select>
```

#### Badge

```tsx
import { Badge } from "@/components/ui/badge";

// Variantes
<Badge variant="default">Padrao</Badge>
<Badge variant="secondary">Secundario</Badge>
<Badge variant="outline">Contorno</Badge>
<Badge variant="destructive">Destrutivo</Badge>

// Custom
<Badge className="bg-green-500">Online</Badge>
<Badge className="bg-yellow-500">Pendente</Badge>
```

#### Avatar

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

<Avatar>
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>
    {user.name.substring(0, 2).toUpperCase()}
  </AvatarFallback>
</Avatar>

// Tamanhos customizados
<Avatar className="w-16 h-16">
  <AvatarImage src={avatar} />
  <AvatarFallback className="text-lg">JD</AvatarFallback>
</Avatar>
```

---

## Estilos Customizados

### Bolhas de Mensagem

O ChatBlue possui estilos especificos para bolhas de mensagem no estilo WhatsApp:

```css
/* WhatsApp-like message bubbles */
.message-bubble {
  @apply relative max-w-[70%] rounded-lg px-3 py-2 break-words;
}

.message-bubble-sent {
  @apply bg-chatblue-light text-foreground ml-auto;
}

.message-bubble-received {
  @apply bg-card text-foreground mr-auto;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .message-bubble {
    @apply max-w-[80%] text-sm px-2.5 py-1.5;
  }
}
```

**Uso:**

```tsx
<div className={cn(
  "message-bubble",
  isFromMe ? "message-bubble-sent" : "message-bubble-received"
)}>
  <p>{message.content}</p>
</div>
```

### Scrollbar Customizado

```css
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

/* Hide scrollbar */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### Safe Areas (Dispositivos com Notch)

```css
/* Safe area for devices with notch/home indicator */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);
}
```

### Viewport Mobile

```css
/* Mobile viewport height fix */
@supports (height: 100dvh) {
  .h-screen-mobile {
    height: 100dvh;
  }
}

@supports not (height: 100dvh) {
  .h-screen-mobile {
    height: 100vh;
    height: -webkit-fill-available;
  }
}

/* Chat container for mobile */
@media (max-width: 768px) {
  .chat-container-mobile {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - 48px - 64px);
    max-height: calc(100dvh - 48px - 64px);
    overflow: hidden;
  }
}
```

---

## Cores do ChatBlue

### Paleta Principal

| Nome | Classe | Hex | Uso |
|------|--------|-----|-----|
| ChatBlue | `chatblue` | `#0088CC` | Cor primaria da marca |
| ChatBlue Light | `chatblue-light` | `#E3F2FD` | Backgrounds, bolhas enviadas |
| ChatBlue Dark | `chatblue-dark` | `#005C99` | Sidebar, hover |

### Cores WhatsApp (Referencia)

| Nome | Classe | Hex | Uso |
|------|--------|-----|-----|
| WhatsApp Green | `whatsapp-green` | `#25D366` | Status online |
| WhatsApp Teal | `whatsapp-teal` | `#128C7E` | Acentos |
| WhatsApp Dark | `whatsapp-teal-dark` | `#075E54` | Headers |
| WhatsApp Light | `whatsapp-light` | `#DCF8C6` | Bolhas (referencia) |

### Exemplos

```tsx
// Sidebar
<div className="bg-chatblue-dark text-white">
  {/* Sidebar content */}
</div>

// Bolha de mensagem enviada
<div className="bg-chatblue-light">
  {/* Message */}
</div>

// Status online
<span className="w-2 h-2 rounded-full bg-whatsapp-green" />

// Badge de conexao
<Badge className="bg-whatsapp-teal">Conectado</Badge>
```

---

## Responsividade

O ChatBlue utiliza os breakpoints padrao do Tailwind:

| Breakpoint | Largura | Classe |
|------------|---------|--------|
| sm | 640px | `sm:` |
| md | 768px | `md:` |
| lg | 1024px | `lg:` |
| xl | 1280px | `xl:` |
| 2xl | 1536px | `2xl:` |

### Padroes Mobile-First

```tsx
// Padding responsivo
<div className="p-2 md:p-4 lg:p-6">
  {/* Conteudo */}
</div>

// Grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>

// Visibilidade condicional
<div className="hidden md:block">
  {/* Apenas em desktop */}
</div>

<div className="block md:hidden">
  {/* Apenas em mobile */}
</div>

// Flex responsivo
<div className="flex flex-col md:flex-row gap-4">
  {/* Items */}
</div>
```

### Exemplo de Layout Responsivo

```tsx
function ChatLayout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar - escondida em mobile */}
      <aside className="hidden md:flex w-16 bg-chatblue-dark">
        <Sidebar />
      </aside>

      {/* Lista de tickets - largura total mobile, lateral desktop */}
      <div className="w-full md:w-80 border-r">
        <TicketList />
      </div>

      {/* Janela de chat - escondida mobile sem ticket */}
      <main className={cn(
        "flex-1 hidden md:flex flex-col",
        selectedTicket && "flex"
      )}>
        <ChatWindow />
      </main>

      {/* Bottom nav - apenas mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0">
        <BottomNavigation />
      </nav>
    </div>
  );
}
```

---

## Animacoes

O plugin `tailwindcss-animate` adiciona animacoes uteis:

### Entrada/Saida

```tsx
// Fade in
<div className="animate-in fade-in">Aparecendo</div>

// Slide in from bottom
<div className="animate-in slide-in-from-bottom">Subindo</div>

// Zoom in
<div className="animate-in zoom-in">Crescendo</div>

// Combinacoes
<div className="animate-in fade-in slide-in-from-bottom duration-300">
  Fade + Slide
</div>
```

### Duracao e Delay

```tsx
// Duracao
<div className="animate-in fade-in duration-150">Rapido</div>
<div className="animate-in fade-in duration-300">Normal</div>
<div className="animate-in fade-in duration-500">Lento</div>

// Delay
<div className="animate-in fade-in delay-150">Com delay</div>
```

### Spin e Pulse

```tsx
// Loading spinner
<Loader2 className="w-6 h-6 animate-spin" />

// Pulsando
<span className="animate-pulse">Carregando...</span>

// Ping (notificacao)
<span className="relative flex h-3 w-3">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
</span>
```

---

## Dark Mode

### Implementacao

O ChatBlue usa a estrategia `class` para dark mode:

```tsx
// Em _app.tsx ou layout.tsx
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Toggle de Tema

```tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
```

### Classes Condicionais

```tsx
// Cores diferentes por tema
<div className="bg-white dark:bg-gray-800">
  <p className="text-gray-900 dark:text-gray-100">
    Texto adaptavel
  </p>
</div>

// Bordas
<div className="border-gray-200 dark:border-gray-700">
  Conteudo
</div>

// Imagens diferentes
<img
  src="/logo-light.png"
  className="block dark:hidden"
  alt="Logo"
/>
<img
  src="/logo-dark.png"
  className="hidden dark:block"
  alt="Logo"
/>
```

---

## Boas Praticas

### 1. Preferir Classes Utilitarias

```tsx
// Evite - CSS inline ou arquivos separados
<div style={{ padding: "1rem", backgroundColor: "blue" }}>

// Prefira - Classes Tailwind
<div className="p-4 bg-blue-500">
```

### 2. Usar cn() para Classes Condicionais

```tsx
// Evite - template strings
<div className={`p-4 ${isActive ? "bg-blue-500" : "bg-gray-500"}`}>

// Prefira - cn()
<div className={cn("p-4", isActive ? "bg-blue-500" : "bg-gray-500")}>
```

### 3. Componentizar Estilos Repetitivos

```tsx
// Crie variantes com cva (class-variance-authority)
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### 4. Mobile-First

```tsx
// Comece pelo mobile
<div className="text-sm md:text-base lg:text-lg">
  Texto responsivo
</div>

<div className="flex flex-col md:flex-row">
  {/* Layout adaptavel */}
</div>
```

### 5. Consistencia de Espacamento

Use a escala padrao do Tailwind:

| Valor | Pixels | Classe |
|-------|--------|--------|
| 1 | 4px | `p-1`, `m-1` |
| 2 | 8px | `p-2`, `m-2` |
| 3 | 12px | `p-3`, `m-3` |
| 4 | 16px | `p-4`, `m-4` |
| 6 | 24px | `p-6`, `m-6` |
| 8 | 32px | `p-8`, `m-8` |

---

## Referencias

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/UI](https://ui.shadcn.com/)
- [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate)
- [Class Variance Authority](https://cva.style/docs)
