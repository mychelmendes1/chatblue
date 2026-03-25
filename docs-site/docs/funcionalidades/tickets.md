---
sidebar_position: 2
title: Tickets
description: Sistema de gerenciamento de tickets do ChatBlue
---

# Tickets

O sistema de tickets e o nucleo do gerenciamento de atendimento no ChatBlue, permitindo organizar, rastrear e resolver conversas com clientes de forma eficiente.

## Visao Geral

Um ticket representa uma conversa ou demanda de atendimento e inclui:

- **Protocolo unico** para identificacao
- **Status** do atendimento (incluindo snooze/adiamento)
- **Prioridade** da demanda
- **Canal de origem** (WhatsApp, Instagram ou Email)
- **Atribuicao** a agente humano ou IA e/ou departamento
- **Historico completo** de mensagens e atividades
- **Metricas** de tempo de resposta, resolucao e qualidade (FCR, abandono, reaberturas)
- **Avaliacao** do cliente (rating 1-5 e NPS 0-10)
- **Vinculo com campanhas** de disparo em massa

## Modelo de Dados

### Campos Principais

```prisma
model Ticket {
  id       String       @id @default(cuid())
  protocol String       @unique
  status   TicketStatus @default(PENDING)
  priority Priority     @default(MEDIUM)
  subject  String?

  // Canal de origem
  channel TicketChannel @default(WHATSAPP)

  // Relacionamentos
  contactId         String
  assignedToId      String?   // Agente humano ou IA atribuido
  departmentId      String?
  connectionId      String?   // Conexao WhatsApp/Instagram
  emailConnectionId String?   // Conexao de email
  companyId         String

  // SLA
  slaDeadline   DateTime?
  firstResponse DateTime?
  resolvedAt    DateTime?
  slaBreached   Boolean   @default(false)

  // Metricas de tempo
  waitingTime    Int?  // Tempo de espera em segundos
  responseTime   Int?  // Tempo de resposta em segundos
  resolutionTime Int?  // Tempo de resolucao em segundos

  // Avaliacao do atendimento
  rating        Int?       // 1-5 estrelas
  ratingComment String?
  ratedAt       DateTime?
  ratingToken   String?    @unique

  // NPS (Net Promoter Score)
  npsScore   Int?       // 0-10: 0-6 detratores, 7-8 neutros, 9-10 promotores
  npsComment String?
  npsRatedAt DateTime?
  npsToken   String?    @unique

  // Metricas de qualidade
  isFirstContactResolution Boolean   @default(false) // FCR
  reopenCount              Int       @default(0)
  reopenedAt               DateTime?
  abandonedAt              DateTime?
  wasAbandoned             Boolean   @default(false)

  // IA
  isAIHandled     Boolean   @default(false)
  aiTakeoverAt    DateTime?
  humanTakeoverAt DateTime?

  // Notas de resolucao
  resolutionNote String?

  // Snooze (adiamento)
  snoozedAt    DateTime?
  snoozedUntil DateTime?
  snoozeReason String?

  // Campanha de disparo em massa
  campaignId           Int?
  campaignDispatchedAt DateTime?

  // Historico de tickets
  previousTicketId String?

  // Timestamps
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  closedAt  DateTime?
}
```

### Enums

```prisma
enum TicketStatus {
  PENDING
  IN_PROGRESS
  WAITING
  SNOOZED
  RESOLVED
  CLOSED
}

enum TicketChannel {
  WHATSAPP
  INSTAGRAM
  EMAIL
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

## Interface do Usuario

### Lista de Tickets

```
+-----------------------------------------------------------------------------+
|  Tickets                                        [+ Novo] [Filtros] [Busca]  |
+-----------------------------------------------------------------------------+
|                                                                              |
|  +----+-------------------------------------------------------------+      |
|  | o  | #2024-001234 | Joao Silva | Comercial     | Pendente | Alta |      |
|  |    | "Gostaria de saber sobre o produto..."           ha 5 min   |      |
|  +----+-------------------------------------------------------------+      |
|  | *  | #2024-001233 | Maria Santos | Suporte  | Em Progresso | Media|      |
|  |    | "Estou com problema no login..."                 ha 15 min  |      |
|  +----+-------------------------------------------------------------+      |
|  | v  | #2024-001232 | Pedro Costa | Financeiro  | Resolvido | Baixa|      |
|  |    | "Solicitacao de segunda via..."                  ha 1 hora  |      |
|  +----+-------------------------------------------------------------+      |
|  | z  | #2024-001231 | Ana Lima | Comercial     | Adiado | Media    |      |
|  |    | "Retorno agendado para amanha"               adiado 2h     |      |
|  +----+-------------------------------------------------------------+      |
|                                                                              |
|  Mostrando 1-20 de 156 tickets                    [< Anterior] [Proximo >]  |
|                                                                              |
+-----------------------------------------------------------------------------+
```

### Detalhes do Ticket

```
+-----------------------------------------------------------------------------+
|  Ticket #2024-001234                                        [Fechar]        |
+-----------------------------------------------------------------------------+
|                                                                              |
|  +--------------------------------------+-------------------------------+   |
|  |                                      |                               |   |
|  |         AREA DE CHAT                 |       PAINEL LATERAL          |   |
|  |                                      |                               |   |
|  |    (Ver secao Chat)                  |  Contato                      |   |
|  |                                      |  Joao Silva                   |   |
|  |                                      |  +55 11 99999-9999            |   |
|  |                                      |  Canal: WhatsApp              |   |
|  |                                      |                               |   |
|  |                                      |  Ticket                       |   |
|  |                                      |  Status: [Pendente v]         |   |
|  |                                      |  Prioridade: [Alta v]         |   |
|  |                                      |  Departamento: [Comercial v]  |   |
|  |                                      |  Agente: [Atribuir v]         |   |
|  |                                      |  [Adiar] [Takeover]           |   |
|  |                                      |                               |   |
|  |                                      |  Metricas                     |   |
|  |                                      |  Tempo de Espera: 5 min       |   |
|  |                                      |  SLA: Dentro do prazo         |   |
|  |                                      |  FCR: Sim                     |   |
|  |                                      |  NPS: 9                       |   |
|  |                                      |                               |   |
|  |                                      |  Historico                    |   |
|  |                                      |  > Ver atividades             |   |
|  |                                      |  > Ver tickets anteriores     |   |
|  |                                      |                               |   |
|  +--------------------------------------+-------------------------------+   |
|                                                                              |
+-----------------------------------------------------------------------------+
```

## Status do Ticket

### Ciclo de Vida

```
                    +-------------+
                    |   PENDING   |
                    |  (Pendente) |
                    +------+------+
                           |
                           | Agente assume / Responde
                           v
                    +-------------+
            +------>| IN_PROGRESS |<------+
            |       |(Em Progresso)|       |
            |       +------+------+       |
            |              |              |
            |         +----+----+         |
            |         |         |         |
    Reaberto|         v         v         | Retomado
            |   +---------+ +---------+  |
            |   | WAITING | | SNOOZED |--+
            |   |(Aguard.)| | (Adiado)|
            |   +----+----+ +----+----+
            |        |           |
            |        | Cliente   | Tempo expira /
            |        | responde  | Unsnooze manual
            |        v           |
            |   +---------+     |
            +---| RESOLVED|<----+
                |(Resolvido)
                +----+----+
                     |
                     | Confirmacao / Tempo
                     v
                +----------+
                |  CLOSED  |
                | (Fechado)|
                +----------+
```

### Descricao dos Status

| Status | Descricao | Acao Esperada |
|--------|-----------|---------------|
| **PENDING** | Ticket recem-criado, aguardando atendimento | Agente deve assumir |
| **IN_PROGRESS** | Ticket sendo atendido ativamente | Agente resolve demanda |
| **WAITING** | Aguardando resposta do cliente | Cliente deve responder |
| **SNOOZED** | Ticket adiado com motivo e data de retorno | Automaticamente retorna na data definida |
| **RESOLVED** | Demanda resolvida, aguardando confirmacao | Cliente avalia ou tempo expira |
| **CLOSED** | Ticket encerrado definitivamente | Nenhuma - arquivo |

### Transicoes Permitidas

```
PENDING      -> IN_PROGRESS, CLOSED
IN_PROGRESS  -> WAITING, SNOOZED, RESOLVED, CLOSED
WAITING      -> IN_PROGRESS, RESOLVED, CLOSED
SNOOZED      -> IN_PROGRESS (unsnooze manual ou automatico)
RESOLVED     -> IN_PROGRESS (reaberto), CLOSED
CLOSED       -> IN_PROGRESS (reaberto)
```

## Canal de Origem

Cada ticket possui um campo `channel` que indica por qual canal a conversa foi iniciada:

| Canal | Conexao Vinculada | Descricao |
|-------|-------------------|-----------|
| **WHATSAPP** | `connectionId` (WhatsAppConnection) | Conversas via WhatsApp (padrao) |
| **INSTAGRAM** | `connectionId` (WhatsAppConnection) | Conversas via Instagram Direct |
| **EMAIL** | `emailConnectionId` (EmailConnection) | Conversas via email (IMAP/SMTP) |

O ticket pode estar vinculado a uma conexao WhatsApp (`connectionId`) ou a uma conexao de email (`emailConnectionId`), dependendo do canal.

## Prioridades

### Niveis de Prioridade

| Prioridade | Cor | Tempo SLA | Uso |
|------------|-----|-----------|-----|
| **URGENT** | Vermelho | 5 min | Emergencias criticas |
| **HIGH** | Laranja | 15 min | Problemas importantes |
| **MEDIUM** | Amarelo | 30 min | Solicitacoes normais |
| **LOW** | Verde | 60 min | Informacoes gerais |

### Criterios de Priorizacao

1. **Cliente VIP** - Automaticamente alta prioridade
2. **Tipo de problema** - Emergencias sao urgentes
3. **Tempo de espera** - Prioridade aumenta com tempo
4. **Departamento** - Alguns departamentos tem SLA diferente

## Snooze (Adiamento)

O snooze permite adiar um ticket temporariamente, removendo-o da fila principal ate uma data especifica.

### Campos de Snooze

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `snoozedAt` | DateTime | Quando o ticket foi adiado |
| `snoozedUntil` | DateTime | Data/hora de retorno automatico |
| `snoozeReason` | String | Motivo do adiamento (obrigatorio) |

### Comportamento na Listagem

A ordenacao de tickets na listagem segue regras especiais para snooze:

1. **Tickets com snooze vencido** (`snoozedUntil <= agora`) aparecem no topo com prioridade maxima
2. **Tickets com snooze ativo** (`snoozedUntil > agora`) vao para o final da lista
3. Dentro de cada grupo, ordena por `snoozedUntil` crescente

### Fluxo

```
Ticket ativo -> POST /:id/snooze (motivo + data) -> Status SNOOZED
                                                        |
                    +-----------------------------------+
                    |                                   |
                    v                                   v
            Unsnooze manual                    Snooze expira
            POST /:id/unsnooze                 (reordenacao automatica)
                    |                                   |
                    +-----------------------------------+
                    |
                    v
            Status volta para IN_PROGRESS
            Campos snoozedAt/snoozedUntil/snoozeReason limpos
```

## Atribuicao de Tickets

O campo `assignedToId` referencia o usuario (humano ou IA) responsavel pelo ticket. Nao se usa `userId` para atribuicao.

### Atribuicao Manual

```
+-------------------------------------+
|  Atribuir Ticket                    |
+-------------------------------------+
|                                     |
|  Departamento: [Comercial     v]    |
|                                     |
|  Agente:       [Selecionar    v]    |
|                 +----------------+  |
|                 | Maria Santos   |  |
|                 | Online (2)     |  |
|                 +----------------+  |
|                 | Pedro Costa    |  |
|                 | Offline (0)    |  |
|                 +----------------+  |
|                 | Bot IA         |  |
|                 | Online (IA)    |  |
|                 +----------------+  |
|                                     |
|  [Cancelar]            [Atribuir]   |
|                                     |
+-------------------------------------+
```

### Atribuicao Automatica

Quando habilitada (`autoAssign: true`), o sistema distribui tickets automaticamente:

**Regras de distribuicao:**

1. Apenas agentes **online** e **ativos** sao considerados
2. Respeita limite maximo de tickets por agente (`maxTicketsPerAgent`)
3. Prefere agentes com menor carga atual
4. Considera departamento do ticket
5. Se o departamento possui um agente IA externo, pode atribuir automaticamente a ele

### IA e Takeover

O ticket rastreia se esta sendo atendido por IA atraves dos campos:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `isAIHandled` | Boolean | Se esta sendo tratado por IA |
| `aiTakeoverAt` | DateTime | Quando a IA assumiu o ticket |
| `humanTakeoverAt` | DateTime | Quando um humano assumiu da IA |

O endpoint `POST /tickets/:id/takeover` permite que um agente humano assuma um ticket que esta com a IA. Ao fazer takeover:

1. `assignedToId` muda para o agente humano
2. `isAIHandled` e definido como `false`
3. `humanTakeoverAt` recebe a data atual
4. Se o ticket estava no departamento "Triagem", e movido para o primeiro departamento ativo do agente
5. Um registro de transferencia com `transferType: AI_TO_HUMAN` e criado

## Transferencia de Tickets

### Modelo de Transferencia

```prisma
model TicketTransfer {
  id           String       @id @default(cuid())
  ticketId     String
  fromUserId   String?
  toUserId     String?
  fromDeptId   String?      // NAO e fromDepartmentId
  toDeptId     String?      // NAO e toDepartmentId
  reason       String?
  transferType TransferType
  createdAt    DateTime     @default(now())
}

enum TransferType {
  USER_TO_USER
  DEPT_TO_DEPT
  AI_TO_HUMAN
  HUMAN_TO_AI
}
```

Os nomes dos campos de departamento sao `fromDeptId` e `toDeptId` (forma abreviada).

### Tipos de Transferencia

| Tipo | Descricao | Quando Ocorre |
|------|-----------|---------------|
| **USER_TO_USER** | Entre agentes humanos | Transferencia direta para outro agente |
| **DEPT_TO_DEPT** | Entre departamentos | Transferencia para outro departamento |
| **AI_TO_HUMAN** | De IA para humano | Takeover manual ou escalacao automatica |
| **HUMAN_TO_AI** | De humano para IA | Atribuicao a agente IA |

### Comportamento na Transferencia

Ao transferir para um usuario (`toUserId`), o sistema automaticamente:

1. Busca os departamentos do usuario destino
2. Usa o primeiro departamento ativo (ordenado por `order`) como `departmentId` do ticket
3. Se o destino for IA externa, envia webhook de atribuicao e processa resposta sincrona

Ao transferir para um departamento (`toDepartmentId`) sem usuario especifico:

1. Se o departamento possuir um agente IA externo, auto-atribui a ele
2. Caso contrario, o ticket fica como PENDING aguardando atribuicao

## Metricas de Qualidade

### First Contact Resolution (FCR)

O campo `isFirstContactResolution` indica se o ticket foi resolvido sem reaberturas. E calculado automaticamente: se `reopenCount` for 0 no momento da resolucao, o FCR e `true`.

### Reaberturas

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `reopenCount` | Int | Quantidade total de reaberturas |
| `reopenedAt` | DateTime | Data/hora da ultima reabertura |

Ao reabrir um ticket (de RESOLVED ou CLOSED), o `reopenCount` e incrementado e `reopenedAt` atualizado.

### Abandono

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `wasAbandoned` | Boolean | Se o ticket foi abandonado na fila |
| `abandonedAt` | DateTime | Quando foi marcado como abandonado |

Um ticket e considerado abandonado quando e fechado (`CLOSED`) sem nunca ter recebido uma primeira resposta (`firstResponse == null`).

## NPS (Net Promoter Score)

Ao resolver ou fechar um ticket, o sistema envia automaticamente uma pesquisa NPS ao cliente.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `npsScore` | Int (0-10) | 0-6 detratores, 7-8 neutros, 9-10 promotores |
| `npsComment` | String | Comentario opcional do cliente |
| `npsRatedAt` | DateTime | Quando o cliente respondeu |
| `npsToken` | String (unique) | Token unico para o link da pesquisa |

## Avaliacao de Atendimento (Rating)

Alem do NPS, o ticket possui campos de avaliacao classica por estrelas:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `rating` | Int (1-5) | Nota em estrelas |
| `ratingComment` | String | Comentario do cliente |
| `ratedAt` | DateTime | Quando avaliou |
| `ratingToken` | String (unique) | Token para link de avaliacao |

## Campanhas

Tickets podem ser originados por campanhas de disparo em massa (Mensageria):

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `campaignId` | Int | ID da campanha que originou o ticket |
| `campaignDispatchedAt` | DateTime | Quando o disparo foi enviado |

Na listagem, o filtro `massDispatchOnly` permite visualizar apenas tickets originados por campanhas.

## Historico e Atividades

### Tipos de Atividades

| Tipo | Descricao | Dados |
|------|-----------|-------|
| `TICKET_CREATED` | Ticket criado | contactId, protocol |
| `TICKET_ASSIGNED` | Ticket atribuido | assignedToId, departmentId |
| `TICKET_TRANSFERRED` | Ticket transferido | from, to, reason |
| `TICKET_RESOLVED` | Ticket resolvido | summary, resolutionNote |
| `TICKET_CLOSED` | Ticket fechado | summary |
| `TICKET_REOPENED` | Ticket reaberto | - |
| `TICKET_SNOOZED` | Ticket adiado | reason, snoozedUntil |
| `TICKET_UNSNOOZED` | Ticket retomado do snooze | - |
| `HUMAN_TAKEOVER` | Humano assumiu da IA | departmentId (se moveu de Triagem) |
| `STATUS_CHANGED` | Status alterado | oldStatus, newStatus |
| `PRIORITY_CHANGED` | Prioridade alterada | oldPriority, newPriority |
| `MESSAGE_SENT` | Mensagem enviada | messageId |
| `SLA_BREACH` | SLA violado | deadline, breachedAt |
| `RATING_RECEIVED` | Avaliacao recebida | rating, comment |

### Timeline de Atividades

```
+-------------------------------------------------------------+
|  Historico do Ticket #2024-001234                            |
+-------------------------------------------------------------+
|                                                              |
|  * 10:30  Ticket criado                                      |
|           Protocolo: #2024-001234                            |
|           Canal: WhatsApp                                    |
|                                                              |
|  * 10:31  Atribuido ao departamento Comercial                |
|           Sistema (Auto-assign)                              |
|                                                              |
|  * 10:32  Atribuido a Maria Santos                           |
|           Sistema (Auto-assign)                              |
|                                                              |
|  * 10:35  Status alterado: Pendente -> Em Progresso          |
|           Maria Santos                                       |
|                                                              |
|  * 10:40  Ticket adiado ate 11:00                            |
|           Maria Santos                                       |
|           Motivo: "Aguardando retorno do financeiro"         |
|                                                              |
|  * 11:00  Ticket retomado do adiamento                       |
|           Sistema (automatico)                               |
|                                                              |
|  * 11:15  Transferido para Suporte Tecnico                   |
|           Maria Santos                                       |
|           Tipo: DEPT_TO_DEPT                                 |
|                                                              |
|  * 11:20  Humano assumiu da IA (Takeover)                    |
|           Pedro Costa                                        |
|                                                              |
|  * 11:30  Status alterado: Em Progresso -> Resolvido         |
|           Pedro Costa                                        |
|           FCR: Sim                                           |
|                                                              |
|  * 11:35  NPS recebido: 9 (Promotor)                        |
|           "Excelente atendimento!"                           |
|                                                              |
+-------------------------------------------------------------+
```

## Filtros e Busca

### Filtros Disponiveis

| Filtro | Opcoes | Descricao |
|--------|--------|-----------|
| **Status** | Multi-select | Filtrar por status (incluindo SNOOZED) |
| **Prioridade** | Multi-select | Filtrar por prioridade |
| **Departamento** | Multi-select | Filtrar por departamento |
| **Agente** | Multi-select | Filtrar por `assignedToId` |
| **Periodo** | Date range | Filtrar por data de criacao |
| **SLA** | Dentro/Fora | Filtrar por status do SLA |
| **Canal** | WHATSAPP/INSTAGRAM/EMAIL | Filtrar por canal de origem |
| **IA** | Boolean | Filtrar tickets atendidos por IA (`isAIHandled`) |
| **Nao lidos** | Boolean | Apenas tickets com mensagens nao lidas |
| **Aguardando resposta** | Boolean | Ultima mensagem e do cliente |
| **Sem agente humano** | Boolean | Tickets sem atribuicao humana |
| **Disparo em massa** | Boolean | Apenas tickets de campanhas |
| **Ocultar resolvidos** | Boolean | Esconder RESOLVED da listagem |
| **Mencoes** | Boolean | Tickets com mencoes ao usuario |

### Busca

Campos pesquisaveis:

- Numero do protocolo
- Nome do contato
- Telefone do contato
- Conteudo das mensagens

## API - Endpoints

### Listagem e Consulta

#### `GET /tickets`

Lista tickets com filtros, paginacao e ordenacao inteligente.

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `status` | String | Filtrar por status |
| `departmentId` | String | Filtrar por departamento |
| `assignedToId` | String | Filtrar por agente atribuido |
| `priority` | String | Filtrar por prioridade |
| `isAIHandled` | Boolean | Filtrar por atendimento IA |
| `search` | String | Busca textual |
| `hideResolved` | Boolean | Ocultar resolvidos |
| `hasMentions` | Boolean | Com mencoes |
| `noHumanAssigned` | Boolean | Sem agente humano |
| `unreadOnly` | Boolean | Apenas nao lidos |
| `waitingReply` | Boolean | Aguardando resposta |
| `massDispatchOnly` | Boolean | Apenas disparos em massa |
| `sortOrder` | `asc` / `desc` | Ordem de data (padrao: desc) |
| `page` | Number | Pagina (padrao: 1) |
| `limit` | Number | Itens por pagina (padrao: 100) |

**Resposta:**

```typescript
{
  tickets: Ticket[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    pages: number,
  },
  aiStuckCount: number  // Tickets presos com IA ha mais de 15 min
}
```

**Ordenacao inteligente:**

1. Tickets com snooze vencido (prioridade maxima)
2. Mensagens nao lidas ou transferidos da IA (precisa atencao humana)
3. Tickets atendidos por IA
4. Respondidos mas ainda abertos
5. Tickets com snooze ativo (final da lista)

---

#### `GET /tickets/tab-counts`

Retorna contagem de tickets para as abas "Todos", "Fila" e "Meus". Usa os mesmos filtros secundarios do `GET /tickets` mas sem busca textual.

**Resposta:**

```typescript
{
  all: number,   // Todos os tickets visiveis
  queue: number, // Tickets na fila (sem atribuicao)
  mine: number,  // Tickets do usuario logado
}
```

---

#### `GET /tickets/:id`

Retorna detalhes completos de um ticket, incluindo contato, agente atribuido, departamento, conexao (WhatsApp ou email), ultimas 10 transferencias e ultimas 20 atividades.

### Criacao

#### `POST /tickets`

Cria um novo ticket (iniciar nova conversa).

**Body:**

```typescript
{
  phone: string,            // Telefone (min 10 digitos)
  contactName?: string,     // Nome do contato (se novo)
  contactId?: string,       // ID do contato existente
  connectionId: string,     // ID da conexao WhatsApp (obrigatorio)
  departmentId?: string,    // Departamento
  subject?: string,         // Assunto
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"  // Padrao: MEDIUM
}
```

Se ja existir um ticket aberto para o mesmo contato na mesma conexao, retorna o ticket existente com `isExisting: true`.

---

#### `POST /tickets/open-by-phone`

Abre ou localiza um ticket pelo numero de telefone (deep-link). Se o contato nao existir, cria automaticamente. Se ja existir ticket aberto, retorna o existente.

**Body:**

```typescript
{
  phone: string  // Telefone com no minimo 10 digitos
}
```

**Resposta:**

```typescript
{
  ticketId: string,
  contactId: string,
  isNew: boolean
}
```

O ticket e criado com status `IN_PROGRESS` e atribuido ao usuario logado. Busca automaticamente uma conexao WhatsApp ativa.

---

#### `POST /tickets/start-conversation`

Inicia conversa com um contato existente (usado na pagina de contatos). Se ja existir ticket aberto, retorna o existente.

**Body:**

```typescript
{
  contactId: string  // ID do contato (CUID)
}
```

**Resposta:**

```typescript
{
  id: string,
  isNew: boolean
}
```

### Atribuicao e Transferencia

#### `POST /tickets/:id/assign`

Atribui um ticket a um usuario (humano ou IA).

**Body:**

```typescript
{
  userId: string  // ID do usuario a atribuir
}
```

Se o usuario destino for IA externa, envia webhook de atribuicao e processa resposta sincrona. Se for IA interna, gera mensagem de abertura automaticamente. Cria notificacao para o agente destino (apenas humanos).

---

#### `POST /tickets/:id/transfer`

Transfere ticket para outro departamento e/ou usuario.

**Body:**

```typescript
{
  toDepartmentId?: string,  // Departamento destino
  toUserId?: string,        // Usuario destino (opcional)
  reason?: string           // Motivo da transferencia
}
```

Deve informar pelo menos `toDepartmentId` ou `toUserId`. Se ambos forem omitidos, retorna erro. Cria registro em `TicketTransfer` com os campos `fromDeptId`/`toDeptId` e `transferType` adequado.

---

#### `POST /tickets/:id/takeover`

Permite que um agente humano assuma um ticket que esta com a IA.

Nao requer body. O usuario logado assume o ticket. Se o ticket estiver no departamento "Triagem", e movido para o primeiro departamento ativo do agente. Cria transferencia com `transferType: AI_TO_HUMAN`.

### Status e Prioridade

#### `PUT /tickets/:id/status`

Altera o status de um ticket.

**Body:**

```typescript
{
  status: "PENDING" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED"
}
```

Para RESOLVED ou CLOSED, envia pesquisa NPS automaticamente.

---

#### `PUT /tickets/:id/priority`

Altera a prioridade de um ticket.

**Body:**

```typescript
{
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
}
```

---

#### `POST /tickets/:id/resolve`

Resolve ticket com resumo gerado por IA e nota de resolucao opcional.

**Body:**

```typescript
{
  resolutionNote?: string  // Observacao do agente
}
```

O sistema gera um resumo automatico da conversa usando IA (se configurada). Calcula `isFirstContactResolution` e `resolutionTime`. Envia pesquisa NPS automaticamente.

---

#### `POST /tickets/:id/close`

Fecha ticket com resumo gerado por IA.

Se o ticket nunca recebeu primeira resposta (`firstResponse == null`), e marcado como abandonado (`wasAbandoned: true`, `abandonedAt` preenchido). Envia pesquisa NPS automaticamente.

---

#### `POST /tickets/:id/reopen`

Reabre um ticket resolvido ou fechado. Incrementa `reopenCount`, atualiza `reopenedAt` e volta status para `IN_PROGRESS`.

### Snooze

#### `POST /tickets/:id/snooze`

Adia um ticket com motivo e data de retorno.

**Body:**

```typescript
{
  reason: string,       // Motivo (obrigatorio)
  snoozedUntil: string  // Data/hora ISO 8601 de retorno
}
```

Ticket deve estar com status diferente de RESOLVED ou CLOSED. Status muda para `SNOOZED`.

---

#### `POST /tickets/:id/unsnooze`

Reativa manualmente um ticket adiado. Limpa os campos de snooze e volta status para `IN_PROGRESS`.

### Avaliacao

#### `POST /tickets/:id/rate`

Registra avaliacao do atendimento.

**Body:**

```typescript
{
  rating: number,    // 1 a 5
  comment?: string   // Comentario opcional
}
```

### Operacoes em Lote

#### `POST /tickets/batch-close`

Fechamento em lote de tickets. Requer permissao de administrador (`requireAdmin`).

**Body:**

```typescript
{
  ticketIds: string[]  // Maximo 100 IDs
}
```

**Resposta:**

```typescript
{
  closed: number,    // Quantidade fechados com sucesso
  failed: number,    // Quantidade com erro
  errors?: Array<{
    ticketId: string,
    error: string
  }>
}
```

Tickets ja resolvidos ou fechados sao ignorados. Tickets sem primeira resposta sao marcados como abandonados. Nao gera resumo IA nem envia NPS (diferente do close individual).

## Configuracoes

### Configuracoes Gerais

| Configuracao | Tipo | Padrao | Descricao |
|--------------|------|--------|-----------|
| `autoAssign` | Boolean | false | Distribuicao automatica |
| `maxTicketsPerAgent` | Number | 5 | Limite de tickets por agente |
| `defaultDepartmentId` | String | null | Departamento padrao |
| `autoCloseAfterDays` | Number | 7 | Dias para fechar automaticamente |

### Configuracoes de SLA

Ver documentacao de [SLA e Metricas](/funcionalidades/sla-metricas).

## Eventos Socket.io

O sistema emite eventos em tempo real para manter a interface atualizada:

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `ticket:created` | Ticket completo | Novo ticket criado |
| `ticket:updated` | Ticket atualizado | Status, prioridade ou dados alterados |
| `ticket:assigned` | `{ ticketId, assignedToId }` | Ticket atribuido |
| `ticket:transferred` | Dados completos da transferencia | Ticket transferido |
| `ticket:unsnoozed` | `{ ticket, assignedToId }` | Ticket retomado do snooze |
| `message:received` | `{ message }` | Nova mensagem (incluindo sistema) |
| `notification` | Dados da notificacao | Notificacao para usuario especifico |

Eventos sao emitidos para rooms `company:{companyId}`, `ticket:{ticketId}` e `user:{userId}` conforme o contexto.

## Webhooks Outbound

O sistema dispara webhooks para integradores externos nos seguintes eventos:

| Evento | Quando |
|--------|--------|
| `conversation_created` | Ticket criado |
| `conversation_updated` | Status, atribuicao ou departamento alterados |
| `conversation_resolved` | Ticket resolvido ou fechado (inclui `resolutionTime`) |

## Casos de Uso

### 1. Novo Atendimento

**Cenario**: Cliente entra em contato pela primeira vez.

1. Sistema recebe mensagem pelo canal (WhatsApp/Instagram/Email)
2. Cria novo contato (se nao existir)
3. Cria ticket com status PENDING e canal correspondente
4. Aplica SLA do departamento padrao
5. Se auto-assign ativo, atribui agente (humano ou IA)
6. Notifica agentes disponiveis

### 2. Atendimento por IA com Takeover

**Cenario**: IA atende e precisa escalar para humano.

1. Ticket e atribuido a agente IA
2. IA interage com o cliente automaticamente
3. Se a IA nao resolve, agente humano faz takeover (`POST /tickets/:id/takeover`)
4. Transferencia registrada como `AI_TO_HUMAN`
5. Se estava em Triagem, ticket move para departamento do agente

### 3. Snooze para Follow-up

**Cenario**: Agente precisa aguardar informacao externa.

1. Agente adia ticket com motivo e data (`POST /tickets/:id/snooze`)
2. Ticket sai da fila ativa (status SNOOZED)
3. Na data definida, ticket reaparece no topo da fila
4. Agente pode antecipar com unsnooze manual

### 4. Escalacao de Ticket

**Cenario**: Demanda requer nivel superior.

1. Agente identifica necessidade
2. Altera prioridade para URGENT (`PUT /tickets/:id/priority`)
3. Transfere para departamento especializado (`POST /tickets/:id/transfer`)
4. Sistema recalcula SLA
5. Notifica supervisores

### 5. Fechamento em Lote

**Cenario**: Administrador precisa limpar tickets antigos.

1. Admin seleciona tickets na interface
2. Envia `POST /tickets/batch-close` com ate 100 IDs
3. Sistema fecha cada ticket individualmente
4. Tickets sem resposta sao marcados como abandonados
5. Retorna relatorio de sucesso/falha

### 6. Conversa Proativa

**Cenario**: Agente inicia contato com cliente.

1. Via pagina de contatos: `POST /tickets/start-conversation` com `contactId`
2. Via link externo: `POST /tickets/open-by-phone` com telefone
3. Se ja existir ticket aberto, retorna o existente
4. Caso contrario, cria novo ticket atribuido ao agente

### 7. Reativacao de Ticket

**Cenario**: Cliente retorna apos resolucao.

1. Cliente envia nova mensagem
2. Sistema busca ticket recente (< 24h)
3. Se encontrado, reabre ticket (incrementa `reopenCount`)
4. Status volta para IN_PROGRESS
5. `isFirstContactResolution` sera `false` na proxima resolucao

## Integracao com Outras Funcionalidades

### Chat

- Cada ticket possui uma conversa de chat
- Mensagens ficam vinculadas ao ticket
- Status do chat reflete status do ticket

### Contatos

- Ticket vinculado a um contato via `contactId`
- Historico de tickets anteriores visivel (`previousTicketId`)
- Tags do contato ajudam na priorizacao

### Departamentos

- Tickets pertencem a departamentos via `departmentId`
- Transferencia entre departamentos com registro em `TicketTransfer`
- SLA especifico por departamento

### SLA e Metricas

- Cada ticket tem prazos de SLA (`slaDeadline`)
- Metricas calculadas automaticamente (tempo de resposta, resolucao, FCR)
- Alertas de violacao (`slaBreached`)

### Notificacoes

- Novos tickets geram notificacoes
- Alertas de SLA
- Avaliacoes recebidas
- Atribuicoes e transferencias

### IA Externa

- Tickets podem ser atribuidos a agentes IA externos
- Webhooks enviados na atribuicao e desatribuicao
- Respostas sincronas processadas automaticamente
- Takeover permite humano reassumir a qualquer momento

## Boas Praticas

### Para Agentes

1. **Atualize o status** - Mantenha status correto
2. **Registre motivos** - Ao transferir, explique a razao
3. **Use snooze** - Adie quando aguardar informacao externa
4. **Verifique SLA** - Atente aos prazos antes de violar
5. **Use prioridades** - Classifique corretamente
6. **Resolva rapido** - Tempo impacta metricas e FCR

### Para Supervisores

1. **Monitore filas** - Evite acumulo e tickets snoozados esquecidos
2. **Redistribua carga** - Balance entre agentes
3. **Analise transferencias** - Identifique padroes de escalacao
4. **Acompanhe SLA** - Intervenha antes de violar
5. **Revise NPS e ratings** - Feedback para melhoria continua
6. **Monitore IA presa** - Use `aiStuckCount` para intervir

### Para Administradores

1. **Configure auto-assign** - Distribua automaticamente
2. **Defina SLAs realistas** - Baseado em capacidade
3. **Crie departamentos** - Organize por especialidade
4. **Limite tickets** - Evite sobrecarga por agente
5. **Use batch-close** - Limpe tickets antigos periodicamente
6. **Analise metricas** - FCR, abandono e reaberturas indicam qualidade

## Proximos Passos

- [Contatos](/funcionalidades/contatos) - Gestao de contatos
- [Departamentos](/funcionalidades/departamentos) - Hierarquia organizacional
- [SLA e Metricas](/funcionalidades/sla-metricas) - Acordos de nivel de servico
