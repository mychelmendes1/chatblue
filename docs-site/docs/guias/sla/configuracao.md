---
sidebar_position: 1
title: Configuracao de SLA
description: Guia para configurar acordos de nivel de servico (SLA) no ChatBlue
---

# Configuracao de SLA

O SLA (Service Level Agreement) define metas de tempo de resposta e resolucao para os atendimentos. Este guia explica como configurar e monitorar SLAs no ChatBlue.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 20-30 minutos

## O Que e SLA?

SLA define compromissos de tempo para o atendimento:

| Metrica | Descricao | Exemplo |
|---------|-----------|---------|
| Primeira Resposta | Tempo ate a primeira resposta | 15 minutos |
| Tempo de Resolucao | Tempo ate fechar o ticket | 4 horas |
| Tempo de Espera | Tempo maximo aguardando atendente | 5 minutos |

## Por Que Usar SLA?

| Beneficio | Descricao |
|-----------|-----------|
| Qualidade | Garante atendimento em tempo adequado |
| Monitoramento | Identifica gargalos no atendimento |
| Priorizacao | Destaca tickets que precisam de atencao |
| Transparencia | Compromissos claros com clientes |
| Metricas | Dados para melhoria continua |

## Arquitetura do SLA

```
┌─────────────────────────────────────────────────────────────┐
│                       Ticket Criado                          │
│                     (SLA Timer Inicia)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SLA: Primeira Resposta                     │
│                      Meta: 15 minutos                        │
├─────────────────────────────────────────────────────────────┤
│  ⏱️ Tempo correndo...                                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 0-10 min │  │10-14 min │  │ 15+ min  │                  │
│  │  Verde   │  │ Amarelo  │  │ Vermelho │                  │
│  │          │  │ (Alerta) │  │(Violacao)│                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼ (Primeira resposta enviada)
┌─────────────────────────────────────────────────────────────┐
│                   SLA: Resolucao                             │
│                      Meta: 4 horas                           │
├─────────────────────────────────────────────────────────────┤
│  ⏱️ Tempo correndo...                                        │
│                                                              │
│  (Conta apenas horario comercial)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼ (Ticket fechado)
┌─────────────────────────────────────────────────────────────┐
│                   SLA Concluido                              │
│           Registrar metricas no historico                    │
└─────────────────────────────────────────────────────────────┘
```

## Passo a Passo

### Passo 1: Acessar Configuracoes de SLA

1. Acesse **Configuracoes > SLA**
2. Clique em **+ Nova Politica de SLA**

![Placeholder: Tela de configuracao de SLA](/img/guias/sla-config.png)

### Passo 2: Configurar Politica Basica

| Campo | Descricao | Exemplo |
|-------|-----------|---------|
| Nome | Identificador da politica | SLA Padrao |
| Descricao | Descricao da politica | Politica para atendimento geral |
| Prioridade | Ordem de aplicacao | 1 (mais alta) |
| Ativo | Se esta em uso | Sim |

```typescript
{
  sla: {
    name: "SLA Padrao",
    description: "Politica padrao para todos os tickets",
    priority: 1,
    active: true
  }
}
```

### Passo 3: Definir Metas de Tempo

```typescript
{
  sla: {
    targets: {
      // Primeira resposta
      firstResponse: {
        target: 15, // minutos
        warning: 10, // alerta em 10 minutos
        unit: "minutes"
      },

      // Resolucao do ticket
      resolution: {
        target: 240, // 4 horas
        warning: 180, // alerta em 3 horas
        unit: "minutes"
      },

      // Tempo entre respostas
      nextResponse: {
        target: 30, // minutos
        warning: 20,
        unit: "minutes"
      }
    }
  }
}
```

### Passo 4: Configurar Horario Comercial

O SLA pode considerar apenas horario comercial:

```typescript
{
  sla: {
    businessHours: {
      enabled: true,
      timezone: "America/Sao_Paulo",

      schedule: {
        monday: { start: "09:00", end: "18:00" },
        tuesday: { start: "09:00", end: "18:00" },
        wednesday: { start: "09:00", end: "18:00" },
        thursday: { start: "09:00", end: "18:00" },
        friday: { start: "09:00", end: "17:00" },
        saturday: null, // Fechado
        sunday: null    // Fechado
      },

      // Feriados
      holidays: [
        { date: "2024-01-01", name: "Ano Novo" },
        { date: "2024-02-12", name: "Carnaval" },
        { date: "2024-02-13", name: "Carnaval" },
        { date: "2024-04-21", name: "Tiradentes" },
        { date: "2024-05-01", name: "Dia do Trabalho" },
        { date: "2024-12-25", name: "Natal" }
      ]
    }
  }
}
```

### Passo 5: Definir Condicoes de Aplicacao

Configure quando a politica deve ser aplicada:

```typescript
{
  sla: {
    conditions: {
      // Aplicar a todos os tickets
      applyTo: "all",

      // OU: Condicoes especificas
      rules: [
        {
          field: "department",
          operator: "equals",
          value: "suporte"
        },
        {
          field: "priority",
          operator: "in",
          value: ["high", "urgent"]
        },
        {
          field: "tags",
          operator: "contains",
          value: "vip"
        }
      ],

      // Logica das condicoes
      logic: "any" // all, any
    }
  }
}
```

## Politicas por Prioridade

Crie politicas diferentes por prioridade:

### SLA Urgente

```typescript
{
  name: "SLA Urgente",
  priority: 1,
  conditions: {
    rules: [{ field: "priority", equals: "urgent" }]
  },
  targets: {
    firstResponse: { target: 5, unit: "minutes" },
    resolution: { target: 60, unit: "minutes" }
  }
}
```

### SLA Alta

```typescript
{
  name: "SLA Alta Prioridade",
  priority: 2,
  conditions: {
    rules: [{ field: "priority", equals: "high" }]
  },
  targets: {
    firstResponse: { target: 15, unit: "minutes" },
    resolution: { target: 120, unit: "minutes" }
  }
}
```

### SLA Normal

```typescript
{
  name: "SLA Normal",
  priority: 3,
  conditions: {
    rules: [{ field: "priority", equals: "normal" }]
  },
  targets: {
    firstResponse: { target: 30, unit: "minutes" },
    resolution: { target: 480, unit: "minutes" }
  }
}
```

### SLA Baixa

```typescript
{
  name: "SLA Baixa Prioridade",
  priority: 4,
  conditions: {
    rules: [{ field: "priority", equals: "low" }]
  },
  targets: {
    firstResponse: { target: 60, unit: "minutes" },
    resolution: { target: 1440, unit: "minutes" } // 24 horas
  }
}
```

## Politicas por Departamento

```typescript
// SLA para Vendas
{
  name: "SLA Vendas",
  conditions: {
    rules: [{ field: "department", equals: "vendas" }]
  },
  targets: {
    firstResponse: { target: 5, unit: "minutes" }, // Resposta rapida
    resolution: { target: 1440, unit: "minutes" } // Ciclo de venda mais longo
  }
}

// SLA para Suporte Tecnico
{
  name: "SLA Suporte",
  conditions: {
    rules: [{ field: "department", equals: "suporte" }]
  },
  targets: {
    firstResponse: { target: 15, unit: "minutes" },
    resolution: { target: 240, unit: "minutes" }
  }
}

// SLA para Financeiro
{
  name: "SLA Financeiro",
  conditions: {
    rules: [{ field: "department", equals: "financeiro" }]
  },
  targets: {
    firstResponse: { target: 30, unit: "minutes" },
    resolution: { target: 480, unit: "minutes" }
  }
}
```

## Politicas VIP

Para clientes especiais:

```typescript
{
  name: "SLA VIP",
  priority: 0, // Maior prioridade
  conditions: {
    rules: [
      { field: "tags", contains: "vip" },
      // OU
      { field: "contact.plan", equals: "enterprise" }
    ],
    logic: "any"
  },
  targets: {
    firstResponse: { target: 2, unit: "minutes" },
    resolution: { target: 60, unit: "minutes" }
  },
  escalation: {
    onWarning: {
      notify: ["supervisor@empresa.com"]
    },
    onBreach: {
      notify: ["gerente@empresa.com"],
      assignTo: "senior_agent"
    }
  }
}
```

## Pausas no SLA

Configure quando o timer deve pausar:

```typescript
{
  sla: {
    pause: {
      // Pausar quando aguardando resposta do cliente
      onWaitingCustomer: true,

      // Pausar quando em status especifico
      onStatus: ["pending", "on_hold"],

      // Pausar fora do horario comercial
      outsideBusinessHours: true,

      // Pausar em feriados
      onHolidays: true
    }
  }
}
```

## Escalacao Automatica

Configure acoes automaticas quando SLA esta em risco:

```typescript
{
  sla: {
    escalation: {
      // Quando atingir tempo de alerta (warning)
      onWarning: {
        actions: [
          {
            type: "notification",
            to: ["agent", "supervisor"],
            message: "SLA em risco para ticket {ticket.id}"
          },
          {
            type: "priority_increase",
            newPriority: "high"
          }
        ]
      },

      // Quando violar SLA
      onBreach: {
        actions: [
          {
            type: "notification",
            to: ["supervisor", "manager"],
            message: "SLA violado no ticket {ticket.id}"
          },
          {
            type: "reassign",
            to: "available_senior"
          },
          {
            type: "tag_add",
            tag: "sla_violado"
          }
        ]
      }
    }
  }
}
```

## Visualizacao no Dashboard

### Indicadores de SLA

O dashboard exibe o status do SLA em tempo real:

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard de SLA                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tickets Abertos: 45        SLA OK: 38 (84%)                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🟢 Dentro do SLA    │████████████████      │ 38     │    │
│  │  🟡 Em risco         │███                   │ 5      │    │
│  │  🔴 SLA violado      │██                    │ 2      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Tempo Medio Primeira Resposta: 8 min (meta: 15 min)        │
│  Tempo Medio Resolucao: 2h 15min (meta: 4h)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Cores de Status

| Cor | Status | Descricao |
|-----|--------|-----------|
| Verde | OK | Dentro do tempo |
| Amarelo | Warning | Proximo do limite |
| Vermelho | Breach | SLA violado |
| Cinza | Pausado | Timer pausado |

## Solucao de Problemas

### SLA nao esta sendo aplicado

**Verificacoes**:
1. Politica esta ativa?
2. Condicoes estao corretas?
3. Prioridade esta adequada?

```typescript
// Verificar qual SLA foi aplicado ao ticket
GET /api/tickets/{id}/sla

// Resposta
{
  "appliedPolicy": "SLA Padrao",
  "status": "ok",
  "firstResponse": {
    "target": 15,
    "elapsed": 8,
    "remaining": 7
  }
}
```

### Timer nao pausa corretamente

**Causa**: Configuracao de pausa incorreta

**Solucao**: Verifique as condicoes de pausa

```typescript
{
  pause: {
    // Verificar se status esta na lista
    onStatus: ["pending", "waiting_customer", "on_hold"]
  }
}
```

### Horario comercial calculado errado

**Causa**: Timezone incorreto

**Solucao**: Configure o timezone correto

```typescript
{
  businessHours: {
    timezone: "America/Sao_Paulo" // Verificar timezone
  }
}
```

## Boas Praticas

### 1. Metas Realistas

- Baseie metas em dados historicos
- Considere capacidade da equipe
- Deixe margem para imprevistos

### 2. Horario Comercial

- Configure corretamente
- Inclua feriados
- Atualize anualmente

### 3. Escalacao

- Configure alertas antes da violacao
- Tenha plano de acao claro
- Notifique pessoas certas

### 4. Revisao Periodica

- Analise metricas mensalmente
- Ajuste metas conforme necessario
- Identifique padroes de violacao

## Proximos Passos

Apos configurar SLA:

- [Configurar Alertas](/guias/sla/alertas)
- [Configurar Relatorios](/guias/sla/relatorios)
- [Configurar Departamentos](/guias/administracao/departamentos)
