---
sidebar_position: 3
title: Gestao de Departamentos
description: Guia para configurar e gerenciar departamentos no ChatBlue
---

# Gestao de Departamentos

Os departamentos organizam sua equipe e permitem direcionar atendimentos para os especialistas corretos. Este guia explica como configurar e gerenciar departamentos.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 15-20 minutos

## O Que Sao Departamentos?

Departamentos sao divisoes organizacionais que:

| Funcao | Descricao |
|--------|-----------|
| Organizar | Agrupar agentes por especialidade |
| Rotear | Direcionar tickets automaticamente |
| Transferir | Permitir transferencias entre equipes |
| Medir | Metricas separadas por area |
| Configurar | SLA e configuracoes especificas |

## Estrutura de Departamentos

```
┌─────────────────────────────────────────────────────────────┐
│                        Empresa                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Vendas    │  │   Suporte   │  │ Financeiro  │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ Maria (L)   │  │ Joao (L)    │  │ Ana (L)     │         │
│  │ Carlos      │  │ Pedro       │  │ Lucas       │         │
│  │ Julia       │  │ Fernanda    │  │             │         │
│  │             │  │ Rafael      │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  (L) = Lider do departamento                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Criar Departamento

### Via Interface

1. Acesse **Configuracoes > Departamentos**
2. Clique em **+ Novo Departamento**
3. Preencha os campos:

| Campo | Descricao | Obrigatorio |
|-------|-----------|-------------|
| Nome | Nome do departamento | Sim |
| Descricao | Descricao das funcoes | Nao |
| Cor | Cor de identificacao | Nao |
| Lider | Usuario responsavel | Nao |
| Membros | Usuarios do departamento | Nao |

![Placeholder: Formulario de criacao de departamento](/img/guias/departamento-criar.png)

### Via API

```typescript
// Criar departamento
POST /api/departments
{
  "name": "Vendas",
  "description": "Equipe de vendas e novos negocios",
  "color": "#10B981",
  "leaderId": "user_123",
  "memberIds": ["user_456", "user_789"],
  "settings": {
    "autoAssign": true,
    "maxTicketsPerAgent": 5,
    "businessHours": {
      "enabled": true,
      "schedule": {...}
    }
  }
}

// Resposta
{
  "id": "dept_vendas",
  "name": "Vendas",
  "description": "Equipe de vendas e novos negocios",
  "color": "#10B981",
  "leader": {
    "id": "user_123",
    "name": "Maria Silva"
  },
  "membersCount": 3,
  "status": "active"
}
```

## Configuracoes do Departamento

### Configuracoes Gerais

```typescript
{
  department: {
    id: "dept_vendas",
    name: "Vendas",
    description: "Equipe de vendas e novos negocios",

    // Identificacao visual
    color: "#10B981",
    icon: "shopping-cart",

    // Hierarquia
    leaderId: "user_123",
    parentDepartmentId: null, // Para subdepartamentos

    // Status
    active: true
  }
}
```

### Distribuicao de Tickets

```typescript
{
  settings: {
    distribution: {
      // Modo de distribuicao
      mode: "round_robin", // round_robin, least_busy, manual, skill_based

      // Auto-atribuicao
      autoAssign: true,

      // Limite por agente
      maxTicketsPerAgent: 5,

      // Considerar apenas agentes online
      onlyOnlineAgents: true,

      // Peso dos agentes (para distribuicao ponderada)
      weighted: false,

      // Prioridade de skills
      skillBased: {
        enabled: false,
        skills: ["tecnico", "comercial"]
      }
    }
  }
}
```

### Horario de Funcionamento

```typescript
{
  settings: {
    businessHours: {
      enabled: true,
      timezone: "America/Sao_Paulo",

      schedule: {
        monday: { start: "09:00", end: "18:00" },
        tuesday: { start: "09:00", end: "18:00" },
        wednesday: { start: "09:00", end: "18:00" },
        thursday: { start: "09:00", end: "18:00" },
        friday: { start: "09:00", end: "17:00" },
        saturday: null,
        sunday: null
      },

      // Mensagem fora do horario
      outsideHoursMessage: "Nosso horario de atendimento e de segunda a sexta, das 9h as 18h. Responderemos assim que possivel!",

      // Comportamento fora do horario
      outsideHoursAction: "queue" // queue, ai_only, close
    }
  }
}
```

### Roteamento Automatico

```typescript
{
  settings: {
    routing: {
      enabled: true,

      // Regras de roteamento
      rules: [
        {
          // Se mensagem contem palavras de venda
          condition: {
            type: "message_contains",
            keywords: ["comprar", "preco", "orcamento", "plano"]
          },
          action: "route_to_department",
          priority: 1
        },
        {
          // Se contato tem tag VIP
          condition: {
            type: "contact_tag",
            tag: "vip"
          },
          action: "route_to_agent",
          agentId: "user_senior",
          priority: 2
        },
        {
          // Se fora do horario
          condition: {
            type: "outside_business_hours"
          },
          action: "route_to_ai",
          priority: 3
        }
      ],

      // Fallback
      defaultAction: "queue"
    }
  }
}
```

### Configuracoes de SLA

```typescript
{
  settings: {
    sla: {
      // Politica especifica do departamento
      policyId: "sla_vendas",

      // Ou metas customizadas
      custom: {
        firstResponse: {
          target: 5,
          unit: "minutes"
        },
        resolution: {
          target: 120,
          unit: "minutes"
        }
      }
    }
  }
}
```

### Configuracoes de IA

```typescript
{
  settings: {
    ai: {
      enabled: true,
      personalityId: "vendedor_consultivo",

      // Usar IA apenas fora do horario
      onlyOutsideBusinessHours: false,

      // IA como primeiro atendimento
      firstLineSupport: true,

      // Limite de mensagens antes de transferir
      maxMessages: 5
    }
  }
}
```

## Membros do Departamento

### Adicionar Membros

```typescript
// Adicionar membro
POST /api/departments/{id}/members
{
  "userId": "user_456",
  "role": "member" // member, leader
}

// Adicionar multiplos
POST /api/departments/{id}/members/batch
{
  "userIds": ["user_456", "user_789", "user_101"],
  "role": "member"
}
```

### Remover Membros

```typescript
// Remover membro
DELETE /api/departments/{id}/members/{userId}
{
  "reassignTickets": true, // Redistribuir tickets
  "reassignTo": "user_789" // Ou null para fila
}
```

### Definir Lider

```typescript
// Definir lider do departamento
PUT /api/departments/{id}/leader
{
  "userId": "user_123"
}
```

## Transferencias Entre Departamentos

### Configurar Transferencias

```typescript
{
  transfers: {
    // Permitir transferencias de/para
    allowIncoming: true,
    allowOutgoing: true,

    // Departamentos permitidos
    allowedFrom: ["dept_atendimento"], // Ou "*" para todos
    allowedTo: ["dept_suporte", "dept_financeiro"],

    // Requer justificativa
    requireReason: true,

    // Notificar lider
    notifyLeaderOnTransfer: true,

    // Mensagem automatica ao cliente
    customerMessage: {
      enabled: true,
      template: "Estou transferindo seu atendimento para o departamento de {departamento} que podera ajuda-lo melhor."
    }
  }
}
```

### Realizar Transferencia

```typescript
// Via API
POST /api/tickets/{id}/transfer
{
  "toDepartmentId": "dept_suporte",
  "reason": "Cliente com problema tecnico",
  "note": "Cliente relatou erro ao fazer login",
  "keepAssigned": false // Remover atendente atual
}
```

### Via Interface

1. No ticket, clique em **Transferir**
2. Selecione o departamento de destino
3. Adicione uma observacao (opcional)
4. Confirme a transferencia

![Placeholder: Modal de transferencia](/img/guias/departamento-transferir.png)

## Fila do Departamento

### Visualizar Fila

```
┌─────────────────────────────────────────────────────────────┐
│              Fila do Departamento: Suporte                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tickets na Fila: 8        Tempo Medio Espera: 12 min       │
│                                                              │
│  # │ Cliente      │ Assunto           │ Espera │ Prioridade│
│  ──────────────────────────────────────────────────────────│
│  1 │ Maria Santos │ Erro no sistema   │ 18 min │ Alta      │
│  2 │ Joao Silva   │ Duvida sobre uso  │ 15 min │ Normal    │
│  3 │ Ana Costa    │ Problema login    │ 12 min │ Alta      │
│  4 │ Pedro Lima   │ Solicitacao       │ 8 min  │ Normal    │
│  ...                                                         │
│                                                              │
│  [Assumir Proximo]  [Distribuir Todos]                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Gerenciar Fila

```typescript
// Obter fila do departamento
GET /api/departments/{id}/queue

// Resposta
{
  "department": {
    "id": "dept_suporte",
    "name": "Suporte"
  },
  "queue": {
    "count": 8,
    "avgWaitTime": 720, // segundos
    "tickets": [
      {
        "id": "ticket_123",
        "customer": "Maria Santos",
        "subject": "Erro no sistema",
        "waitTime": 1080,
        "priority": "high"
      },
      // ...
    ]
  },
  "agents": {
    "online": 3,
    "available": 1,
    "busy": 2
  }
}

// Assumir proximo da fila
POST /api/departments/{id}/queue/next
{
  "agentId": "user_456"
}

// Distribuir todos na fila
POST /api/departments/{id}/queue/distribute
```

## Metricas do Departamento

### Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│              Metricas - Departamento Suporte                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Hoje                                                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │   Tickets      │  │   Resolvidos   │  │   Na Fila      ││
│  │      45        │  │      38        │  │      7         ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│                                                              │
│  SLA Compliance: 92%    Tempo Medio Resposta: 8 min         │
│                                                              │
│  Por Agente:                                                │
│  Joao Santos  ████████████████░░░░  15 tickets | 4.8 ⭐    │
│  Pedro Lima   ████████████░░░░░░░░  12 tickets | 4.5 ⭐    │
│  Fernanda     ████████░░░░░░░░░░░░  8 tickets  | 4.7 ⭐    │
│  Rafael       ███░░░░░░░░░░░░░░░░░  3 tickets  | 4.9 ⭐    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### API de Metricas

```typescript
// Obter metricas do departamento
GET /api/departments/{id}/metrics?period=today

// Resposta
{
  "department": "Suporte",
  "period": "2024-01-15",
  "metrics": {
    "tickets": {
      "created": 45,
      "resolved": 38,
      "pending": 7,
      "transferred_in": 5,
      "transferred_out": 2
    },
    "sla": {
      "compliance": 92,
      "avgFirstResponse": 480,
      "avgResolution": 7200
    },
    "satisfaction": {
      "avg": 4.6,
      "total": 35
    },
    "agents": {
      "total": 4,
      "online": 3
    }
  }
}
```

## Subdepartamentos

Para estruturas maiores, crie subdepartamentos:

```typescript
{
  department: {
    id: "dept_suporte",
    name: "Suporte",
    subDepartments: [
      {
        id: "dept_suporte_n1",
        name: "Suporte N1",
        description: "Primeiro nivel de suporte"
      },
      {
        id: "dept_suporte_n2",
        name: "Suporte N2",
        description: "Suporte tecnico avancado"
      },
      {
        id: "dept_suporte_n3",
        name: "Suporte N3",
        description: "Especialistas e desenvolvedores"
      }
    ]
  }
}
```

## Solucao de Problemas

### Tickets nao sendo distribuidos

**Verificacoes**:
1. Auto-atribuicao esta ativa?
2. Ha agentes online no departamento?
3. Agentes nao atingiram limite de tickets?

```typescript
// Verificar status do departamento
GET /api/departments/{id}/status

// Resposta
{
  "autoAssign": true,
  "onlineAgents": 2,
  "availableCapacity": 3, // Slots disponiveis
  "queueSize": 5
}
```

### Transferencia nao permitida

**Causas**:
- Departamento nao permite transferencias
- Usuario sem permissao
- Departamento destino inativo

**Solucao**: Verificar configuracoes de transferencia

### Fila crescendo muito

**Causas**:
- Poucos agentes online
- Pico de atendimento
- Limite de tickets muito baixo

**Solucoes**:
1. Aumentar limite de tickets por agente
2. Adicionar mais agentes
3. Ativar IA para primeiro atendimento

## Boas Praticas

### 1. Estrutura Clara

- Nomes descritivos
- Hierarquia logica
- Responsabilidades definidas

### 2. Distribuicao Equilibrada

- Monitore carga dos agentes
- Ajuste limites conforme demanda
- Use distribuicao ponderada se necessario

### 3. SLA Adequado

- Defina metas realistas por departamento
- Considere complexidade dos atendimentos
- Revise periodicamente

### 4. Transferencias Eficientes

- Treine equipe sobre quando transferir
- Exija justificativas
- Monitore padroes de transferencia

## Proximos Passos

Apos configurar departamentos:

- [Configurar Permissoes](/guias/administracao/permissoes)
- [Configurar SLA](/guias/sla/configuracao)
- [Configurar IA por Departamento](/guias/inteligencia-artificial/configuracao)
