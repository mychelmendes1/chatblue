---
sidebar_position: 2
title: Alertas de SLA
description: Guia para entender os alertas e notificacoes de SLA no ChatBlue
---

# Alertas de SLA

Os alertas de SLA notificam os agentes quando atendimentos estao em risco ou violaram os prazos estabelecidos. Este guia explica como o sistema de alertas funciona.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 10 minutos

## Tipos de Alertas

O sistema possui dois niveis de alerta:

| Tipo | Quando Dispara | Acao |
|------|----------------|------|
| **WARNING** | Tempo restante inferior a ~10% do SLA | Notifica o agente para prevenir violacao |
| **BREACH** | Deadline ultrapassado | Marca violacao, notifica o agente |

Nao existem niveis intermediarios (como 50%, 20%, 5%). O sistema trabalha exclusivamente com WARNING e BREACH.

## Como Funciona

### Job sla-check.processor

O processador de verificacao de SLA roda a cada **60 segundos** (configurado com `every: 60000` no BullMQ) e executa o seguinte fluxo:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Job de Verificacao (a cada 60 segundos)                                  │
│                                                                             │
│   ┌─────────────────┐                                                      │
│   │  Buscar tickets  │                                                      │
│   │  abertos com     │                                                      │
│   │  slaDeadline     │                                                      │
│   └────────┬────────┘                                                      │
│            │                                                                │
│            ▼                                                                │
│   Para cada ticket:                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │  1. Verificar deadline de firstResponse                            │  │
│   │     - Se ainda nao respondeu (firstResponse == null)               │  │
│   │                                                                     │  │
│   │  2. Verificar deadline de resolucao                                │  │
│   │     - Se ticket ainda esta aberto                                  │  │
│   │                                                                     │  │
│   │  Para cada verificacao:                                            │  │
│   │  ┌───────────────────────────────────────────────────────────────┐ │  │
│   │  │                                                               │ │  │
│   │  │  tempo restante > 10% do SLA  -->  OK (sem acao)             │ │  │
│   │  │                                                               │ │  │
│   │  │  tempo restante inferior a 10% do SLA -->  Enviar WARNING            │ │  │
│   │  │  (min 5min para FRT, 10min para resolucao)                   │ │  │
│   │  │                                                               │ │  │
│   │  │  deadline ultrapassado        -->  Enviar BREACH             │ │  │
│   │  │  (marca slaBreached = true, cria Activity SLA_BREACH)       │ │  │
│   │  │                                                               │ │  │
│   │  └───────────────────────────────────────────────────────────────┘ │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Calculo do Threshold de Warning

O warning e disparado quando o tempo restante e menor ou igual a ~10% do tempo total do SLA, com limites minimos:

| Tipo de SLA | Threshold | Minimo |
|-------------|-----------|--------|
| Primeira Resposta (FRT) | ~10% do firstResponseTime | 5 minutos |
| Resolucao | ~10% do resolutionTime | 10 minutos |

Exemplo: se o SLA de primeira resposta e 30 minutos, o warning dispara com ~3 minutos restantes (10% de 30). Se o SLA fosse de 20 minutos, o warning dispara com 5 minutos restantes (minimo de 5 minutos).

### O Que Acontece no BREACH

Quando o deadline e ultrapassado, o sistema:

1. Marca `ticket.slaBreached = true` no banco de dados
2. Cria um registro de Activity com tipo `SLA_BREACH`
3. Envia notificacao via WebSocket ao agente atribuido

## Notificacoes

### Canal de Notificacao

As notificacoes de SLA sao enviadas exclusivamente via **WebSocket** para o agente atribuido ao ticket (`assignedToId`).

### Eventos Socket

| Evento | Quando | Dados |
|--------|--------|-------|
| `sla:warning` | Tempo restante proximo do limite | ticketId, tipo (firstResponse/resolution), tempo restante |
| `sla:breach` | Deadline ultrapassado | ticketId, tipo (firstResponse/resolution) |

O agente recebe a notificacao em tempo real na interface do ChatBlue.

## Configuracao de SLA

Os alertas dependem da configuracao de SLA definida para a empresa/departamento. A configuracao e gerenciada pela API:

### Endpoints

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/settings/sla` | Listar configuracoes de SLA |
| `POST` | `/api/settings/sla` | Criar configuracao de SLA |
| `PUT` | `/api/settings/sla/:id` | Atualizar configuracao de SLA |
| `DELETE` | `/api/settings/sla/:id` | Remover configuracao de SLA |

### Campos da Configuracao

```typescript
{
  "name": "SLA Suporte",           // Nome da configuracao
  "firstResponseTime": 15,         // Tempo de primeira resposta (minutos)
  "resolutionTime": 240,           // Tempo de resolucao (minutos)
  "businessHours": {               // Horario comercial (opcional)
    "start": "09:00",
    "end": "18:00",
    "days": [1, 2, 3, 4, 5]
  },
  "isDefault": false,              // Se e a configuracao padrao
  "departmentId": "dept_123",      // Departamento (opcional)
  "isActive": true                 // Se esta ativa
}
```

Se `businessHours` estiver configurado, os calculos de deadline consideram apenas os horarios e dias definidos.

## Exemplo Pratico

### Cenario: Ticket de Suporte

```
Configuracao:
  - firstResponseTime: 15 minutos
  - resolutionTime: 240 minutos (4 horas)

Timeline:
  09:00 - Ticket criado, deadline FRT = 09:15
  09:13 - WARNING enviado (2 min restantes, inferior a 10% de 15min)
         Evento sla:warning enviado ao agente via socket
  09:14 - Agente responde (dentro do SLA)
  
  ...
  
  12:30 - Ticket ainda aberto, deadline resolucao = 13:00
  12:46 - WARNING de resolucao (14 min restantes, ~10% de 240min, min 10min)
  13:01 - BREACH de resolucao
         ticket.slaBreached = true
         Activity SLA_BREACH criada
         Evento sla:breach enviado ao agente via socket
```

## Solucao de Problemas

### Alertas nao estao chegando

**Verificacoes**:
1. O ticket tem `slaDeadline` definido?
2. O ticket tem um agente atribuido (`assignedToId`)?
3. O agente esta conectado via WebSocket?
4. O job sla-check.processor esta rodando?

### Warning nao dispara

**Possiveis causas**:
- O SLA e muito curto e o intervalo de 60s do job nao captura o momento exato
- O ticket ja foi respondido/resolvido antes do threshold
- A configuracao de SLA nao esta ativa (`isActive: false`)

## Boas Praticas

### 1. Configure SLAs Realistas

- Tempos muito curtos geram muitos breaches
- Tempos muito longos nao ajudam a monitorar qualidade
- Considere a capacidade real da equipe

### 2. Atribua Tickets Rapidamente

- Alertas so chegam ao agente atribuido
- Tickets sem atribuicao nao recebem notificacoes de SLA
- Use distribuicao automatica quando possivel

### 3. Monitore Breaches

- Use `GET /api/metrics/sla` para acompanhar taxa de violacoes
- Identifique padroes (horarios, departamentos)
- Ajuste SLAs se a taxa de breach for muito alta

## Proximos Passos

Apos entender os alertas:

- [Configurar SLA](/guias/sla/configuracao) - Criar e ajustar politicas
- [Relatorios de SLA](/guias/sla/relatorios) - Analisar dados de compliance
