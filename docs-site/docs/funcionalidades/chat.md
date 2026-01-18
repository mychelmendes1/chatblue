---
sidebar_position: 1
title: Chat
description: Interface de chat em tempo real do ChatBlue
---

# Chat

O Chat e o coracao do ChatBlue, oferecendo uma interface de comunicacao em tempo real similar ao WhatsApp Web, permitindo que agentes se comuniquem eficientemente com os clientes.

## Visao Geral

A funcionalidade de Chat permite:

- **Comunicacao em tempo real** via WebSocket (Socket.io)
- **Suporte a multiplos tipos de midia** (texto, imagens, audio, video, documentos)
- **Indicadores de digitacao** em tempo real
- **Status de mensagens** (enviado, entregue, lido)
- **Reacoes com emoji** nas mensagens
- **Citacao de mensagens** anteriores
- **Mensagens internas** visiveis apenas para a equipe
- **Transcricao automatica** de audios

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

Mensagens visiveis apenas para a equipe interna:

```
┌─────────────────────────────────────────┐
│  [Nota Interna]                         │
│  Este cliente e VIP, priorizar          │
│  atendimento.                           │
│                           - Maria 10:35 │
└─────────────────────────────────────────┘
```

## Fluxo de Mensagens

### Recebimento de Mensagem

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  WhatsApp   │────►│   Webhook   │────►│  Message    │────►│  Database   │
│   Cliente   │     │   Handler   │     │  Processor  │     │  (Prisma)   │
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
