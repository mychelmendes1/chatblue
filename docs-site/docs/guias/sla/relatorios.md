---
sidebar_position: 3
title: Relatorios de SLA
description: Guia para gerar e analisar relatorios de SLA no ChatBlue
---

# Relatorios de SLA

Os relatorios de SLA permitem analisar o desempenho do atendimento e identificar oportunidades de melhoria. Este guia explica como gerar e interpretar esses relatorios.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 15-20 minutos

## Tipos de Relatorios

| Relatorio | Descricao | Frequencia Recomendada |
|-----------|-----------|------------------------|
| Visao Geral | Resumo de compliance | Diario |
| Detalhado | Analise por ticket | Semanal |
| Tendencias | Evolucao ao longo do tempo | Mensal |
| Por Equipe | Desempenho por agente/departamento | Semanal |
| Violacoes | Foco em tickets que violaram SLA | Diario |

## Acessar Relatorios

### Via Interface

1. Acesse **Relatorios > SLA**
2. Selecione o tipo de relatorio
3. Configure filtros e periodo
4. Clique em **Gerar Relatorio**

![Placeholder: Tela de relatorios SLA](/img/guias/sla-relatorios.png)

### Via API

```typescript
// Gerar relatorio
POST /api/reports/sla
{
  "type": "overview",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "filters": {
    "department": "suporte",
    "priority": ["high", "urgent"]
  },
  "format": "json" // json, csv, pdf
}
```

## Relatorio de Visao Geral

### Metricas Principais

```
┌─────────────────────────────────────────────────────────────┐
│              Relatorio de SLA - Janeiro 2024                │
│                    Departamento: Todos                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Total de Tickets: 1,234                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ COMPLIANCE GERAL                                      │   │
│  │                                                        │   │
│  │  ████████████████████████░░░░░░░░ 85%                │   │
│  │                                                        │   │
│  │  Dentro do SLA: 1,049 | Violados: 185                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PRIMEIRA RESPOSTA            │ RESOLUCAO              │   │
│  │                               │                        │   │
│  │  Meta: 15 min                │  Meta: 4 horas         │   │
│  │  Media: 8 min                │  Media: 2h 45min       │   │
│  │  Compliance: 92%             │  Compliance: 78%       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Configuracao

```typescript
{
  report: {
    type: "overview",
    metrics: [
      "total_tickets",
      "compliance_rate",
      "first_response_time",
      "resolution_time",
      "tickets_by_status",
      "violations_count"
    ],
    comparison: {
      enabled: true,
      period: "previous_month"
    }
  }
}
```

## Relatorio Detalhado

### Por Ticket

```
┌─────────────────────────────────────────────────────────────┐
│                    Relatorio Detalhado                       │
├─────────────────────────────────────────────────────────────┤
│ Ticket  │ Cliente      │ 1a Resp │ Resolucao │ Status │ SLA │
├─────────────────────────────────────────────────────────────┤
│ #1234   │ Joao Silva   │ 5 min   │ 1h 30min  │ Fechado│ ✅  │
│ #1235   │ Maria Santos │ 12 min  │ 3h 45min  │ Fechado│ ✅  │
│ #1236   │ Pedro Costa  │ 18 min* │ 5h 20min* │ Fechado│ ❌  │
│ #1237   │ Ana Lima     │ 8 min   │ Em aberto │ Aberto │ ⏳  │
│ #1238   │ Carlos Souza │ 3 min   │ 45 min    │ Fechado│ ✅  │
└─────────────────────────────────────────────────────────────┘
* = Violacao de SLA
```

### Exportar Detalhado

```typescript
// Exportar para CSV
GET /api/reports/sla/detailed?format=csv&period=2024-01

// Campos incluidos
{
  fields: [
    "ticket_id",
    "customer_name",
    "customer_phone",
    "agent_name",
    "department",
    "priority",
    "created_at",
    "first_response_at",
    "first_response_time",
    "first_response_sla",
    "closed_at",
    "resolution_time",
    "resolution_sla",
    "sla_status",
    "sla_policy"
  ]
}
```

## Relatorio de Tendencias

### Evolucao Mensal

```
┌─────────────────────────────────────────────────────────────┐
│              Tendencia de SLA - Ultimos 6 Meses             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Compliance (%)                                             │
│  100│                                                        │
│   90│          ●────●────●                                  │
│   80│    ●────●                    ●                        │
│   70│                         ●────                         │
│   60│                                                        │
│   50│                                                        │
│     └────┬────┬────┬────┬────┬────┬                        │
│         Ago  Set  Out  Nov  Dez  Jan                        │
│                                                              │
│  Tempo Medio de Primeira Resposta (min)                     │
│   20│                                                        │
│   15│────────────────────────────────── Meta                │
│   10│    ●    ●                   ●                         │
│    5│              ●    ●────●                              │
│     └────┬────┬────┬────┬────┬────┬                        │
│         Ago  Set  Out  Nov  Dez  Jan                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Configuracao de Tendencias

```typescript
{
  report: {
    type: "trends",
    period: {
      start: "2023-07-01",
      end: "2024-01-31"
    },
    granularity: "month", // day, week, month
    metrics: [
      "compliance_rate",
      "avg_first_response",
      "avg_resolution",
      "ticket_volume",
      "violation_rate"
    ],
    showTarget: true
  }
}
```

## Relatorio por Equipe

### Por Departamento

```
┌─────────────────────────────────────────────────────────────┐
│              Desempenho por Departamento                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Departamento    │ Tickets │ Compliance │ 1a Resp │ Resolucao│
│  ─────────────────────────────────────────────────────────  │
│  Vendas          │   234   │    95%     │  3 min  │  1h 20m │
│  Suporte         │   456   │    82%     │ 12 min  │  3h 45m │
│  Financeiro      │   123   │    88%     │  8 min  │  2h 10m │
│  Atendimento     │   421   │    79%     │ 15 min  │  4h 30m │
│  ─────────────────────────────────────────────────────────  │
│  TOTAL           │  1234   │    85%     │ 10 min  │  2h 56m │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Por Agente

```
┌─────────────────────────────────────────────────────────────┐
│              Desempenho por Agente - Suporte                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Agente          │ Tickets │ Compliance │ 1a Resp │ Satisfacao│
│  ─────────────────────────────────────────────────────────  │
│  Maria Silva     │    85   │    94%     │  5 min  │   4.8    │
│  Joao Santos     │    78   │    89%     │  8 min  │   4.5    │
│  Ana Costa       │    92   │    85%     │ 12 min  │   4.2    │
│  Pedro Lima      │    68   │    82%     │ 14 min  │   4.0    │
│  Carlos Souza    │    75   │    76%     │ 18 min  │   3.8    │
│  ─────────────────────────────────────────────────────────  │
│  Media Equipe    │  79.6   │    85%     │ 11 min  │   4.3    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Relatorio de Violacoes

### Analise de Violacoes

```
┌─────────────────────────────────────────────────────────────┐
│              Analise de Violacoes de SLA                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Total de Violacoes: 185 (15% dos tickets)                  │
│                                                              │
│  POR TIPO DE SLA:                                           │
│  ├─ Primeira Resposta: 45 (24%)                             │
│  └─ Resolucao: 140 (76%)                                    │
│                                                              │
│  POR DEPARTAMENTO:                                          │
│  ├─ Atendimento: 78 (42%)                                   │
│  ├─ Suporte: 65 (35%)                                       │
│  ├─ Financeiro: 28 (15%)                                    │
│  └─ Vendas: 14 (8%)                                         │
│                                                              │
│  POR HORARIO:                                               │
│  ├─ 09:00-12:00: 35% das violacoes                         │
│  ├─ 12:00-14:00: 45% das violacoes (pico)                  │
│  └─ 14:00-18:00: 20% das violacoes                         │
│                                                              │
│  PRINCIPAIS CAUSAS:                                         │
│  1. Falta de agentes no horario de almoco (45%)            │
│  2. Tickets de alta complexidade (30%)                      │
│  3. Transferencias entre departamentos (15%)                │
│  4. Outros (10%)                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Configuracao

```typescript
{
  report: {
    type: "violations",
    period: {
      start: "2024-01-01",
      end: "2024-01-31"
    },
    analysis: {
      byType: true,
      byDepartment: true,
      byAgent: true,
      byHour: true,
      byCause: true,
      byPriority: true
    },
    includeTicketList: true,
    limit: 100
  }
}
```

## Agendamento de Relatorios

### Configurar Envio Automatico

```typescript
{
  scheduledReports: [
    {
      name: "Resumo Diario SLA",
      type: "overview",
      schedule: {
        frequency: "daily",
        time: "08:00",
        timezone: "America/Sao_Paulo"
      },
      recipients: ["supervisor@empresa.com", "gerente@empresa.com"],
      format: "pdf"
    },
    {
      name: "Analise Semanal",
      type: "detailed",
      schedule: {
        frequency: "weekly",
        day: "monday",
        time: "09:00"
      },
      recipients: ["diretor@empresa.com"],
      format: "pdf"
    },
    {
      name: "Exportacao Mensal",
      type: "detailed",
      schedule: {
        frequency: "monthly",
        day: 1,
        time: "06:00"
      },
      recipients: ["bi@empresa.com"],
      format: "csv"
    }
  ]
}
```

### Gerenciar Agendamentos

```typescript
// Listar agendamentos
GET /api/reports/sla/scheduled

// Criar agendamento
POST /api/reports/sla/scheduled
{
  "name": "Relatorio Semanal",
  "type": "overview",
  "schedule": { ... },
  "recipients": [ ... ]
}

// Atualizar agendamento
PUT /api/reports/sla/scheduled/{id}

// Excluir agendamento
DELETE /api/reports/sla/scheduled/{id}

// Executar manualmente
POST /api/reports/sla/scheduled/{id}/run
```

## Formatos de Exportacao

### PDF

```typescript
{
  export: {
    format: "pdf",
    options: {
      pageSize: "A4",
      orientation: "landscape",
      includeCharts: true,
      includeHeader: true,
      header: {
        logo: "https://empresa.com/logo.png",
        title: "Relatorio de SLA"
      },
      includeFooter: true,
      footer: {
        text: "ChatBlue - Confidencial",
        pageNumbers: true
      }
    }
  }
}
```

### CSV

```typescript
{
  export: {
    format: "csv",
    options: {
      delimiter: ",",
      encoding: "utf-8",
      includeHeaders: true,
      dateFormat: "DD/MM/YYYY HH:mm"
    }
  }
}
```

### Excel

```typescript
{
  export: {
    format: "xlsx",
    options: {
      sheetName: "SLA Report",
      includeCharts: true,
      autoFilter: true,
      freezeHeader: true
    }
  }
}
```

## Filtros Avancados

```typescript
{
  filters: {
    // Periodo
    period: {
      start: "2024-01-01",
      end: "2024-01-31"
    },

    // Departamentos
    departments: ["suporte", "vendas"],

    // Agentes
    agents: ["agent_123", "agent_456"],

    // Prioridades
    priorities: ["high", "urgent"],

    // Status do SLA
    slaStatus: ["breached"], // ok, warning, breached

    // Tags
    tags: ["vip", "reclamacao"],

    // Status do ticket
    ticketStatus: ["closed", "resolved"],

    // Politica de SLA
    slaPolicy: "SLA Padrao",

    // Conexao WhatsApp
    connection: "conn_principal"
  }
}
```

## Integracao com BI

### Webhook para BI

```typescript
{
  integration: {
    bi: {
      enabled: true,

      // Enviar dados automaticamente
      webhook: {
        url: "https://bi.empresa.com/api/sla-data",
        headers: {
          "Authorization": "Bearer token"
        },
        frequency: "daily"
      },

      // Campos a enviar
      fields: [
        "date",
        "department",
        "total_tickets",
        "compliance_rate",
        "avg_first_response",
        "avg_resolution",
        "violations"
      ]
    }
  }
}
```

### API para Consulta

```typescript
// Endpoint para dashboards externos
GET /api/reports/sla/metrics
{
  "period": "last_30_days",
  "metrics": ["compliance", "volume", "avg_times"]
}

// Resposta
{
  "compliance": {
    "overall": 85,
    "firstResponse": 92,
    "resolution": 78
  },
  "volume": {
    "total": 1234,
    "byDay": [...]
  },
  "avgTimes": {
    "firstResponse": 480, // segundos
    "resolution": 9900
  }
}
```

## Solucao de Problemas

### Relatorio em branco

**Causas**:
- Filtros muito restritivos
- Periodo sem dados
- Permissao insuficiente

**Solucao**:
1. Verifique os filtros aplicados
2. Amplie o periodo
3. Verifique permissoes do usuario

### Dados inconsistentes

**Causas**:
- Tickets sem SLA aplicado
- Mudanca de politica de SLA
- Dados em processamento

**Solucao**:
1. Verifique se todos tickets tem SLA
2. Considere apenas periodo apos mudanca
3. Aguarde processamento completar

### Exportacao falha

**Causas**:
- Muitos dados
- Timeout
- Formato invalido

**Solucao**:
1. Reduza periodo ou adicione filtros
2. Exporte em partes
3. Use formato mais leve (CSV)

## Boas Praticas

### 1. Revisao Regular

- Analise relatorios diariamente
- Faca analise profunda semanalmente
- Apresente tendencias mensalmente

### 2. Acoes Baseadas em Dados

- Identifique padroes de violacao
- Ajuste escalas com base nos horarios de pico
- Capacite agentes com baixo desempenho

### 3. Metas Realistas

- Compare com benchmarks do setor
- Ajuste metas gradualmente
- Considere sazonalidade

### 4. Compartilhe Resultados

- Compartilhe metricas com a equipe
- Celebre melhorias
- Discuta desafios abertamente

## Proximos Passos

Apos configurar relatorios:

- [Configurar Departamentos](/guias/administracao/departamentos)
- [Configurar Usuarios](/guias/administracao/usuarios)
- [Configurar Permissoes](/guias/administracao/permissoes)
