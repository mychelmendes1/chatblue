---
sidebar_position: 2
title: Alertas de SLA
description: Guia para configurar alertas e notificacoes de SLA no ChatBlue
---

# Alertas de SLA

Os alertas de SLA notificam a equipe quando atendimentos estao em risco ou violaram as metas estabelecidas. Este guia explica como configurar alertas efetivos.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 15-20 minutos

## Tipos de Alertas

| Tipo | Quando Dispara | Objetivo |
|------|----------------|----------|
| Warning | Proximo do limite | Prevenir violacao |
| Breach | Limite ultrapassado | Acao imediata |
| Resumo | Periodico | Visao geral |
| Escalacao | Apos violacao | Resolver urgente |

## Canais de Notificacao

| Canal | Descricao | Uso |
|-------|-----------|-----|
| Interface | Alerta no dashboard | Tempo real |
| Email | Mensagem por email | Notificacoes formais |
| WhatsApp | Mensagem no WhatsApp | Alertas urgentes |
| Webhook | HTTP POST | Integracoes |
| Slack | Mensagem no Slack | Equipes tech |

## Passo a Passo

### Passo 1: Acessar Configuracoes

1. Acesse **Configuracoes > SLA > Alertas**
2. Ative **Alertas de SLA**

![Placeholder: Configuracao de alertas SLA](/img/guias/sla-alertas.png)

### Passo 2: Configurar Alerta de Warning

```typescript
{
  alerts: {
    warning: {
      enabled: true,

      // Quando disparar (% do tempo total)
      threshold: 80, // Alerta quando 80% do tempo passou

      // Canais de notificacao
      channels: {
        interface: true,
        email: false,
        whatsapp: false
      },

      // Quem notificar
      recipients: {
        agent: true, // Atendente responsavel
        supervisor: false,
        manager: false
      },

      // Mensagem
      message: {
        title: "SLA em Risco",
        body: "O ticket #{ticketId} esta proximo de violar o SLA de {slaType}. Tempo restante: {timeRemaining}."
      }
    }
  }
}
```

### Passo 3: Configurar Alerta de Breach

```typescript
{
  alerts: {
    breach: {
      enabled: true,

      // Canais de notificacao
      channels: {
        interface: true,
        email: true,
        whatsapp: true // Para urgentes
      },

      // Quem notificar
      recipients: {
        agent: true,
        supervisor: true,
        manager: false
      },

      // Notificar gerente se continuar violado por X minutos
      escalateAfter: {
        enabled: true,
        minutes: 30,
        to: ["manager"]
      },

      // Mensagem
      message: {
        title: "SLA Violado!",
        body: "O ticket #{ticketId} violou o SLA de {slaType}. Tempo excedido: {timeExceeded}. Acao imediata necessaria."
      }
    }
  }
}
```

### Passo 4: Configurar Resumos Periodicos

```typescript
{
  alerts: {
    summary: {
      enabled: true,

      // Frequencia
      frequency: {
        daily: {
          enabled: true,
          time: "08:00",
          timezone: "America/Sao_Paulo"
        },
        weekly: {
          enabled: true,
          day: "monday",
          time: "09:00"
        }
      },

      // Conteudo do resumo
      include: {
        totalTickets: true,
        slaCompliance: true,
        violations: true,
        topViolators: true,
        trends: true
      },

      // Destinatarios
      recipients: {
        supervisors: true,
        managers: true,
        custom: ["diretor@empresa.com"]
      }
    }
  }
}
```

## Configuracao Avancada

### Alertas por Prioridade

```typescript
{
  alerts: {
    byPriority: {
      urgent: {
        warning: {
          threshold: 50, // Alerta mais cedo
          channels: ["interface", "email", "whatsapp"],
          recipients: ["agent", "supervisor"]
        },
        breach: {
          channels: ["interface", "email", "whatsapp"],
          recipients: ["agent", "supervisor", "manager"],
          escalateAfter: 15 // minutos
        }
      },
      high: {
        warning: {
          threshold: 70,
          channels: ["interface", "email"],
          recipients: ["agent", "supervisor"]
        },
        breach: {
          channels: ["interface", "email"],
          recipients: ["agent", "supervisor"],
          escalateAfter: 30
        }
      },
      normal: {
        warning: {
          threshold: 80,
          channels: ["interface"],
          recipients: ["agent"]
        },
        breach: {
          channels: ["interface", "email"],
          recipients: ["agent", "supervisor"]
        }
      },
      low: {
        warning: {
          threshold: 90,
          channels: ["interface"],
          recipients: ["agent"]
        },
        breach: {
          channels: ["interface"],
          recipients: ["agent"]
        }
      }
    }
  }
}
```

### Alertas por Departamento

```typescript
{
  alerts: {
    byDepartment: {
      vendas: {
        warning: {
          recipients: ["agent", "gerente_vendas@empresa.com"]
        },
        breach: {
          recipients: ["agent", "supervisor_vendas@empresa.com", "diretor_comercial@empresa.com"]
        }
      },
      suporte: {
        warning: {
          recipients: ["agent", "supervisor_suporte@empresa.com"]
        },
        breach: {
          recipients: ["agent", "supervisor_suporte@empresa.com", "gerente_ti@empresa.com"]
        }
      }
    }
  }
}
```

### Alertas VIP

```typescript
{
  alerts: {
    vip: {
      // Condicao para cliente VIP
      condition: {
        or: [
          { field: "tags", contains: "vip" },
          { field: "contact.plan", equals: "enterprise" }
        ]
      },

      // Alertas especiais
      warning: {
        threshold: 50, // Alertar antes
        channels: ["interface", "email", "whatsapp"],
        recipients: ["agent", "supervisor", "account_manager"]
      },
      breach: {
        channels: ["interface", "email", "whatsapp"],
        recipients: ["agent", "supervisor", "manager", "account_manager"],
        escalateAfter: 5 // Escalar rapidamente
      }
    }
  }
}
```

## Configurar Canais

### Email

```typescript
{
  channels: {
    email: {
      enabled: true,

      // Configuracao SMTP
      smtp: {
        host: "smtp.empresa.com",
        port: 587,
        secure: true,
        auth: {
          user: "alertas@empresa.com",
          pass: "senha"
        }
      },

      // Remetente
      from: {
        name: "ChatBlue Alertas",
        email: "alertas@empresa.com"
      },

      // Template
      template: {
        subject: "[SLA {type}] Ticket #{ticketId}",
        bodyHtml: `
          <h2>Alerta de SLA</h2>
          <p><strong>Tipo:</strong> {type}</p>
          <p><strong>Ticket:</strong> #{ticketId}</p>
          <p><strong>Cliente:</strong> {customerName}</p>
          <p><strong>Atendente:</strong> {agentName}</p>
          <p><strong>Departamento:</strong> {department}</p>
          <p><strong>Tempo:</strong> {timeInfo}</p>
          <a href="{ticketUrl}">Ver Ticket</a>
        `
      }
    }
  }
}
```

### WhatsApp

```typescript
{
  channels: {
    whatsapp: {
      enabled: true,

      // Conexao a usar para enviar alertas
      connectionId: "conn_alertas",

      // Numeros para receber alertas
      recipients: {
        supervisor: "+5511999990001",
        manager: "+5511999990002"
      },

      // Template de mensagem
      template: {
        warning: "⚠️ *SLA em Risco*\n\nTicket: #{ticketId}\nCliente: {customerName}\nTempo restante: {timeRemaining}\n\n{ticketUrl}",
        breach: "🚨 *SLA Violado!*\n\nTicket: #{ticketId}\nCliente: {customerName}\nTempo excedido: {timeExceeded}\n\n*Acao imediata necessaria!*\n\n{ticketUrl}"
      }
    }
  }
}
```

### Webhook

```typescript
{
  channels: {
    webhook: {
      enabled: true,

      // URL do webhook
      url: "https://seu-sistema.com/webhooks/sla-alerts",

      // Headers
      headers: {
        "Authorization": "Bearer seu-token",
        "Content-Type": "application/json"
      },

      // Eventos a enviar
      events: ["warning", "breach", "resolved"],

      // Payload
      payloadTemplate: {
        event: "{eventType}",
        ticket: {
          id: "{ticketId}",
          customer: "{customerName}",
          agent: "{agentName}",
          department: "{department}"
        },
        sla: {
          type: "{slaType}",
          target: "{slaTarget}",
          elapsed: "{timeElapsed}",
          status: "{slaStatus}"
        },
        timestamp: "{timestamp}"
      }
    }
  }
}
```

### Slack

```typescript
{
  channels: {
    slack: {
      enabled: true,

      // Webhook URL do Slack
      webhookUrl: "https://hooks.slack.com/services/XXX/YYY/ZZZ",

      // Canal
      channel: "#atendimento-alertas",

      // Formato da mensagem
      format: {
        warning: {
          color: "warning",
          title: "SLA em Risco",
          fields: [
            { title: "Ticket", value: "#{ticketId}", short: true },
            { title: "Cliente", value: "{customerName}", short: true },
            { title: "Tempo Restante", value: "{timeRemaining}", short: true },
            { title: "Atendente", value: "{agentName}", short: true }
          ],
          actions: [
            { type: "button", text: "Ver Ticket", url: "{ticketUrl}" }
          ]
        },
        breach: {
          color: "danger",
          title: "🚨 SLA Violado!",
          text: "Acao imediata necessaria!",
          fields: [
            { title: "Ticket", value: "#{ticketId}", short: true },
            { title: "Cliente", value: "{customerName}", short: true },
            { title: "Tempo Excedido", value: "{timeExceeded}", short: true },
            { title: "Atendente", value: "{agentName}", short: true }
          ]
        }
      }
    }
  }
}
```

## Regras de Frequencia

Evite spam de alertas:

```typescript
{
  alerts: {
    rateLimit: {
      // Nao repetir alerta para mesmo ticket
      sameTicket: {
        warning: 15 * 60, // 15 minutos
        breach: 30 * 60   // 30 minutos
      },

      // Limite global de alertas
      global: {
        maxPerHour: 50,
        maxPerMinute: 5
      },

      // Agrupar alertas
      grouping: {
        enabled: true,
        window: 5 * 60, // 5 minutos
        maxPerGroup: 10
      }
    }
  }
}
```

## Silenciamento

### Silenciar Temporariamente

```typescript
// Via API
POST /api/sla/alerts/mute
{
  "duration": 60, // minutos
  "reason": "Manutencao programada",
  "scope": {
    "type": "department",
    "value": "suporte"
  }
}
```

### Horarios de Silencio

```typescript
{
  alerts: {
    quietHours: {
      enabled: true,

      // Nao enviar alertas nesses horarios
      schedule: {
        weekdays: { start: "22:00", end: "07:00" },
        weekends: { start: "20:00", end: "09:00" }
      },

      // Exceto para emergencias
      exceptions: {
        vip: false, // Sempre alertar VIP
        urgent: false // Sempre alertar urgentes
      }
    }
  }
}
```

## Visualizacao de Alertas

### Na Interface

```
┌─────────────────────────────────────────────────────────────┐
│  🔔 Alertas de SLA                              [Ver Todos] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🚨 Ticket #1234 - SLA Violado (Primeira Resposta)          │
│     Cliente: Joao Silva | Tempo: 18min (meta: 15min)        │
│     [Ver Ticket] [Marcar Visto]                    2min     │
│  ─────────────────────────────────────────────────────────  │
│  ⚠️ Ticket #1235 - SLA em Risco (Resolucao)                 │
│     Cliente: Maria Santos | Restante: 30min                 │
│     [Ver Ticket] [Marcar Visto]                    5min     │
│  ─────────────────────────────────────────────────────────  │
│  ⚠️ Ticket #1236 - SLA em Risco (Primeira Resposta)         │
│     Cliente: Pedro Costa | Restante: 5min                   │
│     [Ver Ticket] [Marcar Visto]                    8min     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Notificacao Push

```
┌──────────────────────────────────┐
│ 🚨 ChatBlue                      │
│                                  │
│ SLA Violado!                     │
│ Ticket #1234 excedeu o tempo     │
│ de primeira resposta.            │
│                                  │
│ [Ver]  [Assumir]  [Ignorar]      │
└──────────────────────────────────┘
```

## Solucao de Problemas

### Alertas nao chegando

**Verificacoes**:
1. Canal esta habilitado?
2. Destinatarios estao configurados?
3. Rate limit foi atingido?

```bash
# Verificar logs de alertas
GET /api/sla/alerts/logs?status=failed
```

### Muitos alertas

**Solucoes**:
1. Ajuste thresholds de warning
2. Configure rate limiting
3. Agrupe alertas similares
4. Configure quiet hours

### Email nao enviado

**Verificacoes**:
1. Configuracao SMTP correta?
2. Credenciais validas?
3. Email nao esta em spam?

```bash
# Testar envio de email
POST /api/notifications/test-email
{
  "to": "teste@empresa.com"
}
```

## Boas Praticas

### 1. Seja Seletivo

- Nem todo alerta precisa de todos os canais
- Reserve WhatsApp/SMS para urgentes
- Use interface para alertas comuns

### 2. Defina Responsaveis

- Alertas devem ter destinatarios claros
- Evite alertas para "todos"
- Configure escalacao progressiva

### 3. Mensagens Claras

- Inclua informacoes essenciais
- Link direto para o ticket
- Acao necessaria clara

### 4. Revise Regularmente

- Monitore efetividade dos alertas
- Ajuste thresholds conforme necessario
- Colete feedback da equipe

## Proximos Passos

Apos configurar alertas:

- [Configurar Relatorios de SLA](/guias/sla/relatorios)
- [Configurar Departamentos](/guias/administracao/departamentos)
- [Configurar Usuarios](/guias/administracao/usuarios)
