---
sidebar_position: 1
title: Chat
description: Interface de chat em tempo real do ChatBlue
---

# Chat

O Chat e o coracao do ChatBlue, oferecendo uma interface de comunicacao em tempo real similar ao WhatsApp Web, permitindo que agentes se comuniquem eficientemente com os clientes atraves de multiplos canais.

## Visao Geral

A funcionalidade de Chat permite:

- **Comunicacao em tempo real** via WebSocket (Socket.io)
- **Suporte multicanal** - WhatsApp, Email e Instagram na mesma interface
- **Suporte a multiplos tipos de midia** (texto, imagens, audio, video, documentos)
- **Indicadores de digitacao** em tempo real
- **Status de mensagens** (enviado, entregue, lido)
- **Reacoes com emoji** nas mensagens
- **Citacao de mensagens** anteriores
- **Mensagens internas** visiveis apenas para a equipe, com mencoes a usuarios
- **Transcricao automatica** de audios
- **Visualizacao de emails HTML** integrada
- **Sugestoes de respostas por IA** com preview antes do envio

## Interface do Usuario

### Layout Principal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CABECALHO DO CHAT                                 │
│  ┌─────┐  ┌─────────────────────────────────────────┐  ┌─────────────────┐  │
│  │Avatar│  │ Nome do Contato                        │  │ Acoes do Ticket │  │
│  │     │  │ +55 11 99999-9999 | Cliente desde 2023  │  │ [Transfer] [...]│  │
│  └─────┘  └─────────────────────────────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          AREA DE MENSAGENS                                   │
│                                                                              │
│    ┌────────────────────────────────────┐                                   │
│    │ Mensagem do Cliente               │                          10:30    │
│    └────────────────────────────────────┘                                   │
│                                                                              │
│                           ┌────────────────────────────────────┐            │
│                   10:31   │ Resposta do Agente                 │            │
│                           └────────────────────────────────────┘            │
│                                                           ✓✓ Lido          │
│                                                                              │
│    ┌────────────────────────────────────┐                                   │
│    │ [Audio] 0:45                       │                          10:32    │
│    │ Transcricao: "Texto do audio..."   │                                   │
│    └────────────────────────────────────┘                                   │
│                                                                              │
│                                              Joao esta digitando...          │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [+] [Emoji] Digite sua mensagem...                         [Enviar]  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Componentes da Interface

| Componente | Descricao |
|------------|-----------|
| **Cabecalho** | Informacoes do contato e acoes rapidas do ticket |
| **Area de Mensagens** | Historico da conversa com scroll infinito |
| **Campo de Entrada** | Composicao de mensagens com opcoes de midia |
| **Indicador de Digitacao** | Mostra quando o contato esta digitando |
| **Status de Mensagem** | Icones indicando enviado/entregue/lido |

### Componentes Especializados

| Componente (arquivo) | Descricao |
|----------------------|-----------|
| **template-selector.tsx** | Seletor de templates do WhatsApp aprovados pela Meta. Permite escolher e preencher variaveis do template antes do envio. |
| **email-viewer.tsx** | Renderizacao segura de emails HTML recebidos (EmailViewer). Exibe o conteudo HTML formatado dentro da area de mensagens. |
| **ai-response-preview.tsx** | Preview das sugestoes geradas pela IA antes de enviar ao cliente. O agente pode editar, aceitar ou recusar a sugestao. |

### Navegacao por URL

O chat suporta abertura direta de tickets via query string:

```
/chat?ticket=TICKET_ID
```

Ao acessar essa URL, o sistema abre automaticamente o ticket especificado na area de conversa. Isso e utilizado por links em notificacoes e redirecionamentos internos.

### Layout Mobile

Em dispositivos moveis, a interface adota um layout adaptativo com duas visualizacoes:

| Visualizacao | Descricao |
|-------------|-----------|
| **Lista** | Exibe a lista de tickets/conversas, similar a tela inicial do WhatsApp mobile |
| **Conversa** | Exibe a conversa do ticket selecionado em tela cheia, com botao de voltar para a lista |

O usuario alterna entre as duas visualizacoes. Apenas uma e exibida por vez em telas pequenas.

## Tipos de Mensagens

### Mensagens de Texto

Mensagens de texto simples com suporte a:

- **Links clicaveis**: URLs sao detectadas automaticamente
- **Quebras de linha**: Suporte a multiplas linhas
- **Emojis**: Renderizacao nativa de emojis

### Mensagens de Midia

| Tipo | Extensoes | Tamanho Maximo |
|------|-----------|----------------|
| **Imagem** | JPG, PNG, GIF, WebP | 5 MB |
| **Video** | MP4, MOV | 16 MB |
| **Audio** | OGG, MP3, M4A | 16 MB |
| **Documento** | PDF, DOC, DOCX, XLS, XLSX, TXT | 100 MB |
| **Sticker** | WebP | 500 KB |
| **Localizacao** | Coordenadas GPS | - |
| **Contato** | vCard | - |

### Mensagens de Audio

Os audios recebidos podem ser transcritos automaticamente:

```
┌─────────────────────────────────────────┐
│  [Play]  ▓▓▓▓▓▓▓▓░░░░░░  0:45 / 1:23   │
│                                         │
│  Transcricao (Whisper):                 │
│  "Ola, gostaria de saber sobre o        │
│   produto que vi no site..."            │
└─────────────────────────────────────────┘
```

### Mensagens Internas

Mensagens visiveis apenas para a equipe interna, controladas pela flag `isInternal`:

```
┌─────────────────────────────────────────┐
│  [Nota Interna]                         │
│  Este cliente e VIP, priorizar          │
│  atendimento.                           │
│                           - Maria 10:35 │
└─────────────────────────────────────────┘
```

Mensagens internas suportam mencoes a outros usuarios da equipe atraves do campo `mentionedUserIds`. Ao mencionar um usuario, ele recebe uma notificacao do tipo `notification_mention`.

### Mensagens de Email (htmlContent)

Quando o canal e email, as mensagens podem conter conteudo HTML completo no campo `htmlContent`. O componente `EmailViewer` renderiza esse HTML de forma segura na area de mensagens, preservando a formatacao original do email.

## Suporte Multicanal

O chat opera com tres canais integrados na mesma interface:

| Canal | Descricao | Particularidades |
|-------|-----------|-----------------|
| **WhatsApp** | Canal principal via API oficial da Meta | Suporte a templates, midia, reacoes, localizacao, stickers |
| **Email** | Integrado via IMAP/SMTP | Mensagens com `htmlContent` renderizado pelo EmailViewer |
| **Instagram** | Mensagens diretas do Instagram | Integrado via API do Instagram/Meta |

O agente nao precisa alternar entre ferramentas -- todas as conversas aparecem na mesma lista, identificadas pelo icone do canal.

## Fluxo de Mensagens

### Recebimento de Mensagem

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  WhatsApp/  │────►│   Webhook   │────►│  Message    │────►│  Database   │
│  Email/IG   │     │   Handler   │     │  Processor  │     │  (Prisma)   │
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘
                                               │
                                               ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  Frontend   │◄────│  Socket.io  │◄────│  Emit Event │
                    │  (React)    │     │   Server    │     │             │
                    └─────────────┘     └─────────────┘     └─────────────┘
```

### Envio de Mensagem

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────►│  REST API   │────►│  WhatsApp   │────►│  WhatsApp   │
│  (React)    │     │   POST      │     │  Service    │     │   Cliente   │
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘
                                               │
                                               ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Socket.io  │◄────│  Update     │
                    │  Broadcast  │     │  Status     │
                    └─────────────┘     └─────────────┘
```

## Endpoints REST

### Envio de Mensagens

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `POST` | `/messages/template` | Envia mensagem usando template do WhatsApp. Requer selecao do template e preenchimento de variaveis. |

### Leitura e Status

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `POST` | `/messages/ticket/:ticketId/read` | Marca todas as mensagens do ticket como lidas |
| `POST` | `/messages/ticket/:ticketId/unread` | Marca o ticket como nao lido |

### Paginacao e Historico

O carregamento de mensagens de um ticket usa paginacao. O parametro `includeHistory` controla se mensagens de tickets anteriores do mesmo contato sao incluidas na resposta:

```typescript
GET /messages/ticket/:ticketId?page=1&limit=50&includeHistory=true
```

Quando `includeHistory=true`, o sistema carrega tambem mensagens de tickets anteriores do mesmo contato, permitindo que o agente veja o historico completo de interacoes. Isso e util para dar contexto ao atendimento sem precisar navegar entre tickets.

### Campos Importantes da Mensagem

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `isInternal` | Boolean | Quando `true`, a mensagem e uma nota interna visivel apenas para a equipe |
| `mentionedUserIds` | String[] | IDs dos usuarios mencionados em mensagens internas |
| `htmlContent` | String | Conteudo HTML completo para mensagens de email |

## Reacoes

Os usuarios podem reagir as mensagens com emojis:

```typescript
// Estrutura da reacao
{
  messageId: "msg_123",
  reactions: [
    { emoji: "👍", userId: "user_1", createdAt: "2024-01-15T10:30:00Z" },
    { emoji: "❤️", userId: "user_2", createdAt: "2024-01-15T10:31:00Z" }
  ]
}
```

### Emojis Disponiveis

Os emojis mais comuns para reacao rapida:

- 👍 Positivo
- ❤️ Coracao
- 😂 Rindo
- 😮 Surpreso
- 😢 Triste
- 🙏 Obrigado

## Indicadores de Digitacao

### Como Funciona

```
┌─────────────┐                      ┌─────────────┐
│   Agente    │                      │  Frontend   │
│  digitando  │                      │   Contato   │
└──────┬──────┘                      └──────▲──────┘
       │                                    │
       │  Socket.io: typing:start           │
       │──────────────────────────────────►│
       │                                    │
       │  (apos 3s sem digitar)             │
       │  Socket.io: typing:stop            │
       │──────────────────────────────────►│
       │                                    │
```

### Eventos WebSocket

| Evento | Direcao | Descricao |
|--------|---------|-----------|
| `typing:start` | Cliente → Servidor | Usuario comecou a digitar |
| `typing:stop` | Cliente → Servidor | Usuario parou de digitar |
| `typing:update` | Servidor → Cliente | Notifica outros usuarios |

## Status de Mensagens

### Ciclo de Vida

```
  PENDING ──► SENT ──► DELIVERED ──► READ
     │          │          │
     │          │          └─────────────────────────────┐
     │          │                                        │
     │          └──────────────────────┐                 │
     │                                 │                 │
     ▼                                 ▼                 ▼
  ┌─────┐                          ┌─────┐          ┌─────┐
  │  ○  │  Pendente                │ ✓ │  Enviado  │ ✓✓ │  Entregue/Lido
  └─────┘                          └─────┘          └─────┘
```

### Indicadores Visuais

| Status | Icone | Cor | Descricao |
|--------|-------|-----|-----------|
| **PENDING** | ○ | Cinza | Aguardando envio |
| **SENT** | ✓ | Cinza | Enviado ao servidor |
| **DELIVERED** | ✓✓ | Cinza | Entregue ao destinatario |
| **READ** | ✓✓ | Azul | Lido pelo destinatario |
| **FAILED** | ✗ | Vermelho | Falha no envio |

## Citacao de Mensagens

Permite responder a uma mensagem especifica:

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │ Mensagem original citada...     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Esta e a resposta a mensagem acima.    │
└─────────────────────────────────────────┘
```

## Configuracoes

### Configuracoes do Chat (CompanySettings)

| Configuracao | Tipo | Padrao | Descricao |
|--------------|------|--------|-----------|
| `welcomeMessage` | String | null | Mensagem automatica de boas-vindas |
| `awayMessage` | String | null | Mensagem quando fora do horario |
| `whisperApiKey` | String | null | Chave API para transcricao de audio |

### Configuracoes de Transcricao

```typescript
// Configuracao do Whisper para transcricao de audios
{
  whisperApiKey: "sk-...",
  whisperModel: "whisper-1",
  whisperLanguage: "pt"  // Portugues
}
```

## Casos de Uso

### 1. Atendimento ao Cliente

**Cenario**: Cliente entra em contato pelo WhatsApp.

1. Mensagem chega via webhook
2. Sistema cria/busca contato
3. Sistema cria/busca ticket
4. Se IA ativa, responde automaticamente
5. Se nao, agente recebe notificacao
6. Agente responde pelo chat
7. Status atualizado em tempo real

### 2. Suporte Tecnico com Audio

**Cenario**: Cliente envia audio descrevendo problema.

1. Audio recebido pelo sistema
2. Whisper transcreve automaticamente
3. Transcricao exibida junto ao audio
4. IA pode processar transcricao
5. Agente visualiza audio + texto

### 3. Atendimento em Equipe

**Cenario**: Multiplos agentes em um departamento.

1. Ticket atribuido a departamento
2. Qualquer agente pode responder
3. Todos veem mensagens em tempo real
4. Notas internas para comunicacao da equipe
5. Historico compartilhado

## Integracao com Outras Funcionalidades

### Tickets

- Cada conversa esta vinculada a um ticket
- Status do chat afeta status do ticket
- Transferencia encerra chat atual

### Contatos

- Informacoes do contato no cabecalho
- Tags e campos customizados visiveis
- Historico de conversas anteriores

### Inteligencia Artificial

- IA pode responder automaticamente
- Transcricao de audios via Whisper
- Analise de sentimento (futuro)

### SLA

- Indicadores de tempo de resposta
- Alertas de SLA no chat
- Metricas por conversa

## Atalhos de Teclado

| Atalho | Acao |
|--------|------|
| `Enter` | Enviar mensagem |
| `Shift + Enter` | Nova linha |
| `Ctrl + V` | Colar imagem |
| `Esc` | Fechar painel lateral |

## Boas Praticas

### Para Agentes

1. **Responda rapidamente**: Tempo de resposta impacta SLA
2. **Use notas internas**: Para comunicacao com a equipe
3. **Cite mensagens**: Para manter contexto em conversas longas
4. **Evite mensagens muito longas**: Prefira multiplas mensagens curtas
5. **Use reacoes**: Para confirmar leitura sem necessidade de resposta

### Para Administradores

1. **Configure mensagens automaticas**: Welcome e Away messages
2. **Habilite transcricao**: Se muitos clientes enviam audios
3. **Monitore metricas**: Tempo de resposta e satisfacao
4. **Treine a equipe**: Sobre recursos do chat

## Proximos Passos

- [Tickets](/funcionalidades/tickets) - Gerenciamento de tickets
- [Contatos](/funcionalidades/contatos) - Gestao de contatos
- [Notificacoes](/funcionalidades/notificacoes) - Sistema de alertas
