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
- **Status** do atendimento
- **Prioridade** da demanda
- **Atribuicao** a agente e/ou departamento
- **Historico completo** de mensagens e atividades
- **Metricas** de tempo de resposta e resolucao
- **Avaliacao** do cliente

## Interface do Usuario

### Lista de Tickets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Tickets                                        [+ Novo] [Filtros] [Busca]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────┬─────────────────────────────────────────────────────────────────┐   │
│  │ ○  │ #2024-001234 | Joao Silva | Comercial        | Pendente | Alta │   │
│  │    │ "Gostaria de saber sobre o produto..."              ha 5 min   │   │
│  ├────┼─────────────────────────────────────────────────────────────────┤   │
│  │ ●  │ #2024-001233 | Maria Santos | Suporte       | Em Progresso | Media│  │
│  │    │ "Estou com problema no login..."                    ha 15 min  │   │
│  ├────┼─────────────────────────────────────────────────────────────────┤   │
│  │ ✓  │ #2024-001232 | Pedro Costa | Financeiro     | Resolvido | Baixa│   │
│  │    │ "Solicitacao de segunda via..."                     ha 1 hora  │   │
│  └────┴─────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Mostrando 1-20 de 156 tickets                    [< Anterior] [Proximo >]  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detalhes do Ticket

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ticket #2024-001234                                        [Fechar]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────┬───────────────────────────────┐   │
│  │                                      │                               │   │
│  │         AREA DE CHAT                 │       PAINEL LATERAL          │   │
│  │                                      │                               │   │
│  │    (Ver secao Chat)                  │  Contato                      │   │
│  │                                      │  ┌─────┐ Joao Silva           │   │
│  │                                      │  │     │ +55 11 99999-9999    │   │
│  │                                      │  └─────┘ Cliente desde 2023   │   │
│  │                                      │                               │   │
│  │                                      │  ─────────────────────────    │   │
│  │                                      │                               │   │
│  │                                      │  Ticket                       │   │
│  │                                      │  Status: [Pendente ▼]         │   │
│  │                                      │  Prioridade: [Alta ▼]         │   │
│  │                                      │  Departamento: [Comercial ▼]  │   │
│  │                                      │  Agente: [Atribuir ▼]         │   │
│  │                                      │                               │   │
│  │                                      │  ─────────────────────────    │   │
│  │                                      │                               │   │
│  │                                      │  Metricas                     │   │
│  │                                      │  Tempo de Espera: 5 min       │   │
│  │                                      │  SLA: ● Dentro do prazo       │   │
│  │                                      │                               │   │
│  │                                      │  ─────────────────────────    │   │
│  │                                      │                               │   │
│  │                                      │  Historico                    │   │
│  │                                      │  > Ver atividades             │   │
│  │                                      │  > Ver tickets anteriores     │   │
│  │                                      │                               │   │
│  └──────────────────────────────────────┴───────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Status do Ticket

### Ciclo de Vida

```
                    ┌─────────────┐
                    │   PENDING   │
                    │  (Pendente) │
                    └──────┬──────┘
                           │
                           │ Agente assume / Responde
                           ▼
                    ┌─────────────┐
            ┌──────►│ IN_PROGRESS │◄──────┐
            │       │(Em Progresso)│       │
            │       └──────┬──────┘       │
            │              │              │
    Reaberto│              │ Aguardando   │ Retomado
            │              │ cliente      │
            │              ▼              │
            │       ┌─────────────┐       │
            │       │   WAITING   │───────┘
            │       │ (Aguardando)│
            │       └──────┬──────┘
            │              │
            │              │ Cliente responde / Timeout
            │              ▼
            │       ┌─────────────┐
            └───────│  RESOLVED   │
                    │ (Resolvido) │
                    └──────┬──────┘
                           │
                           │ Confirmacao / Tempo
                           ▼
                    ┌─────────────┐
                    │   CLOSED    │
                    │  (Fechado)  │
                    └─────────────┘
```

### Descricao dos Status

| Status | Descricao | Acao Esperada |
|--------|-----------|---------------|
| **PENDING** | Ticket recem-criado, aguardando atendimento | Agente deve assumir |
| **IN_PROGRESS** | Ticket sendo atendido ativamente | Agente resolve demanda |
| **WAITING** | Aguardando resposta do cliente | Cliente deve responder |
| **RESOLVED** | Demanda resolvida, aguardando confirmacao | Cliente avalia ou tempo expira |
| **CLOSED** | Ticket encerrado definitivamente | Nenhuma - arquivo |

### Transicoes Permitidas

```
PENDING      → IN_PROGRESS, CLOSED
IN_PROGRESS  → WAITING, RESOLVED, CLOSED
WAITING      → IN_PROGRESS, RESOLVED, CLOSED
RESOLVED     → IN_PROGRESS (reaberto), CLOSED
CLOSED       → (final - nao permite transicao)
```

## Prioridades

### Niveis de Prioridade

| Prioridade | Icone | Cor | Tempo SLA | Uso |
|------------|-------|-----|-----------|-----|
| **URGENT** | 🔴 | Vermelho | 5 min | Emergencias criticas |
| **HIGH** | 🟠 | Laranja | 15 min | Problemas importantes |
| **MEDIUM** | 🟡 | Amarelo | 30 min | Solicitacoes normais |
| **LOW** | 🟢 | Verde | 60 min | Informacoes gerais |

### Criterios de Priorizacao

1. **Cliente VIP** - Automaticamente alta prioridade
2. **Tipo de problema** - Emergencias sao urgentes
3. **Tempo de espera** - Prioridade aumenta com tempo
4. **Departamento** - Alguns departamentos tem SLA diferente

## Atribuicao de Tickets

### Atribuicao Manual

```
┌─────────────────────────────────────┐
│  Atribuir Ticket                    │
├─────────────────────────────────────┤
│                                     │
│  Departamento: [Comercial     ▼]    │
│                                     │
│  Agente:       [Selecionar    ▼]    │
│                 ┌────────────────┐  │
│                 │ Maria Santos   │  │
│                 │ ● Online (2)   │  │
│                 ├────────────────┤  │
│                 │ Pedro Costa    │  │
│                 │ ○ Offline (0)  │  │
│                 ├────────────────┤  │
│                 │ Ana Lima       │  │
│                 │ ● Online (4)   │  │
│                 └────────────────┘  │
│                                     │
│  [Cancelar]            [Atribuir]   │
│                                     │
└─────────────────────────────────────┘
```

### Atribuicao Automatica

Quando habilitada (`autoAssign: true`), o sistema distribui tickets automaticamente:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Novo Ticket ──► Verificar Departamento ──► Buscar Agentes     │
│                                                     │           │
│                                                     ▼           │
│                                              ┌─────────────┐    │
│                                              │  Agentes    │    │
│                                              │  Online     │    │
│                                              │  Disponiveis│    │
│                                              └──────┬──────┘    │
│                                                     │           │
│                  ┌──────────────────────────────────┤           │
│                  │                                  │           │
│                  ▼                                  ▼           │
│           ┌─────────────┐                   ┌─────────────┐    │
│           │  Menor      │                   │ Round-Robin │    │
│           │  Carga      │                   │             │    │
│           └──────┬──────┘                   └──────┬──────┘    │
│                  │                                  │           │
│                  └────────────────┬─────────────────┘           │
│                                   │                             │
│                                   ▼                             │
│                            Atribuir ao                          │
│                            Agente Selecionado                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Regras de distribuicao:**

1. Apenas agentes **online** e **ativos** sao considerados
2. Respeita limite maximo de tickets por agente (`maxTicketsPerAgent`)
3. Prefere agentes com menor carga atual
4. Considera departamento do ticket

## Transferencia de Tickets

### Processo de Transferencia

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Ticket Original                    Ticket Transferido         │
│   (Agente A / Dept X)                (Agente B / Dept Y)        │
│                                                                 │
│   ┌─────────────┐                    ┌─────────────┐            │
│   │  Mensagens  │────────────────────│  Mensagens  │            │
│   │  Anteriores │   Copia completa   │  + Novas    │            │
│   └─────────────┘                    └─────────────┘            │
│                                                                 │
│   ┌─────────────┐                                               │
│   │ Registro de │  "Transferido de Agente A para Agente B"     │
│   │ Atividade   │  "Motivo: Especialista necessario"           │
│   └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Modal de Transferencia

```
┌─────────────────────────────────────┐
│  Transferir Ticket                  │
├─────────────────────────────────────┤
│                                     │
│  Para Departamento:                 │
│  [Suporte Tecnico            ▼]     │
│                                     │
│  Para Agente (opcional):            │
│  [Qualquer disponivel        ▼]     │
│                                     │
│  Motivo da transferencia:           │
│  ┌─────────────────────────────┐    │
│  │ Cliente precisa de suporte │    │
│  │ tecnico especializado...   │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ ] Manter copia do historico      │
│  [x] Notificar cliente              │
│                                     │
│  [Cancelar]         [Transferir]    │
│                                     │
└─────────────────────────────────────┘
```

### Registro de Transferencia

```prisma
model TicketTransfer {
  id            String   @id @default(uuid())
  ticketId      String
  fromUserId    String?
  toUserId      String?
  fromDepartmentId String?
  toDepartmentId String?
  reason        String?
  createdAt     DateTime @default(now())
}
```

## Historico e Atividades

### Tipos de Atividades

| Tipo | Descricao | Dados |
|------|-----------|-------|
| `TICKET_CREATED` | Ticket criado | contactId, protocol |
| `TICKET_ASSIGNED` | Ticket atribuido | userId, departmentId |
| `TICKET_TRANSFERRED` | Ticket transferido | from, to, reason |
| `STATUS_CHANGED` | Status alterado | oldStatus, newStatus |
| `PRIORITY_CHANGED` | Prioridade alterada | oldPriority, newPriority |
| `MESSAGE_SENT` | Mensagem enviada | messageId |
| `SLA_BREACH` | SLA violado | deadline, breachedAt |
| `RATING_RECEIVED` | Avaliacao recebida | rating, comment |

### Timeline de Atividades

```
┌─────────────────────────────────────────────────────────────────┐
│  Historico do Ticket #2024-001234                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ● 10:30  Ticket criado                                         │
│           Protocolo: #2024-001234                               │
│                                                                 │
│  ● 10:31  Atribuido ao departamento Comercial                   │
│           Sistema (Auto-assign)                                 │
│                                                                 │
│  ● 10:32  Atribuido a Maria Santos                              │
│           Sistema (Auto-assign)                                 │
│                                                                 │
│  ● 10:35  Status alterado: Pendente → Em Progresso              │
│           Maria Santos                                          │
│                                                                 │
│  ● 10:45  Transferido para Suporte Tecnico                      │
│           Maria Santos                                          │
│           Motivo: "Cliente precisa de ajuda tecnica"            │
│                                                                 │
│  ● 11:00  Atribuido a Pedro Costa                               │
│           Sistema (Auto-assign)                                 │
│                                                                 │
│  ● 11:30  Status alterado: Em Progresso → Resolvido             │
│           Pedro Costa                                           │
│                                                                 │
│  ● 11:35  Avaliacao recebida: ★★★★★ (5 estrelas)               │
│           "Excelente atendimento!"                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Filtros e Busca

### Filtros Disponiveis

| Filtro | Opcoes | Descricao |
|--------|--------|-----------|
| **Status** | Multi-select | Filtrar por status |
| **Prioridade** | Multi-select | Filtrar por prioridade |
| **Departamento** | Multi-select | Filtrar por departamento |
| **Agente** | Multi-select | Filtrar por agente atribuido |
| **Periodo** | Date range | Filtrar por data de criacao |
| **SLA** | Dentro/Fora | Filtrar por status do SLA |

### Busca

```
┌─────────────────────────────────────────────────────────────────┐
│  Buscar: [ protocolo, telefone, nome ou conteudo... ] [Buscar] │
└─────────────────────────────────────────────────────────────────┘
```

Campos pesquisaveis:
- Numero do protocolo
- Nome do contato
- Telefone do contato
- Conteudo das mensagens

## Avaliacao de Atendimento

### Solicitacao de Avaliacao

```
┌─────────────────────────────────────┐
│                                     │
│  Como voce avalia nosso             │
│  atendimento?                       │
│                                     │
│       ☆  ☆  ☆  ☆  ☆                │
│       1  2  3  4  5                 │
│                                     │
│  Comentario (opcional):             │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│              [Enviar Avaliacao]     │
│                                     │
└─────────────────────────────────────┘
```

### Metricas de Avaliacao

```typescript
{
  ticketId: "ticket_123",
  rating: 5,           // 1-5 estrelas
  ratingComment: "Otimo atendimento, muito rapido!",
  ratedAt: "2024-01-15T11:35:00Z"
}
```

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

## Casos de Uso

### 1. Novo Atendimento

**Cenario**: Cliente entra em contato pela primeira vez.

1. Sistema recebe mensagem
2. Cria novo contato
3. Cria ticket com status PENDING
4. Aplica SLA do departamento padrao
5. Se auto-assign ativo, atribui agente
6. Notifica agentes disponiveis

### 2. Escalacao de Ticket

**Cenario**: Demanda requer nivel superior.

1. Agente identifica necessidade
2. Altera prioridade para URGENT
3. Transfere para departamento especializado
4. Sistema recalcula SLA
5. Notifica supervisores

### 3. Atendimento Multi-departamento

**Cenario**: Cliente precisa de varios departamentos.

1. Ticket inicia no Comercial
2. Apos venda, transfere para Financeiro
3. Depois transfere para Suporte
4. Historico completo mantido
5. Metricas consolidadas

### 4. Reativacao de Ticket

**Cenario**: Cliente retorna apos resolucao.

1. Cliente envia nova mensagem
2. Sistema busca ticket recente (< 24h)
3. Se encontrado, reabre ticket
4. Status volta para IN_PROGRESS
5. SLA reiniciado

## Integracao com Outras Funcionalidades

### Chat

- Cada ticket possui uma conversa de chat
- Mensagens ficam vinculadas ao ticket
- Status do chat reflete status do ticket

### Contatos

- Ticket vinculado a um contato
- Historico de tickets anteriores visivel
- Tags do contato ajudam na priorizacao

### Departamentos

- Tickets pertencem a departamentos
- Transferencia entre departamentos
- SLA especifico por departamento

### SLA e Metricas

- Cada ticket tem prazos de SLA
- Metricas calculadas automaticamente
- Alertas de violacao

### Notificacoes

- Novos tickets geram notificacoes
- Alertas de SLA
- Avaliacoes recebidas

## Boas Praticas

### Para Agentes

1. **Atualize o status** - Mantenha status correto
2. **Registre motivos** - Ao transferir, explique
3. **Verifique SLA** - Atente aos prazos
4. **Use prioridades** - Classifique corretamente
5. **Resolva rapido** - Tempo impacta metricas

### Para Supervisores

1. **Monitore filas** - Evite acumulo
2. **Redistribua carga** - Balance entre agentes
3. **Analise transferencias** - Identifique padroes
4. **Acompanhe SLA** - Intervnha antes de violar
5. **Revise avaliacoes** - Feedback e melhoria

### Para Administradores

1. **Configure auto-assign** - Distribua automaticamente
2. **Defina SLAs realistas** - Baseado em capacidade
3. **Crie departamentos** - Organize por especialidade
4. **Limite tickets** - Evite sobrecarga
5. **Analise metricas** - Melhoria continua

## Proximos Passos

- [Contatos](/funcionalidades/contatos) - Gestao de contatos
- [Departamentos](/funcionalidades/departamentos) - Hierarquia organizacional
- [SLA e Metricas](/funcionalidades/sla-metricas) - Acordos de nivel de servico
