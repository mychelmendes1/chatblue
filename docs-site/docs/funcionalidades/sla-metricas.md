---
sidebar_position: 6
title: SLA e Metricas
description: Configuracao de SLA e dashboard de metricas do ChatBlue
---

# SLA e Metricas

O sistema de SLA (Service Level Agreement) e metricas do ChatBlue permite monitorar e garantir a qualidade do atendimento atraves de acordos de nivel de servico configuraveise dashboards detalhados.

## Visao Geral

O modulo de SLA oferece:

- **Configuracao flexivel** de tempos de resposta
- **SLA por departamento** independente
- **Horario comercial** configuravel
- **Alertas automaticos** de violacao
- **Dashboard em tempo real**
- **Relatorios historicos**

## Conceitos Fundamentais

### Tempo de Primeira Resposta (FRT)

Tempo entre a criacao do ticket e a primeira resposta do agente.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Cliente          Ticket           Agente                                  │
│   Envia            Criado           Responde                                │
│   Mensagem                                                                  │
│                                                                             │
│      │               │                 │                                    │
│      ▼               ▼                 ▼                                    │
│   ───●───────────────●─────────────────●───────────────────────────►       │
│      │               │                 │                        Tempo       │
│      │               │                 │                                    │
│      │◄─────────────►│◄───────────────►│                                    │
│        Tempo de        Tempo de                                             │
│        Espera          Primeira Resposta (FRT)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tempo de Resolucao (RT)

Tempo total desde a criacao ate a resolucao do ticket.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Ticket           Primeira         Interacoes          Ticket              │
│   Criado           Resposta                             Resolvido           │
│                                                                             │
│      │               │                  │                  │                │
│      ▼               ▼                  ▼                  ▼                │
│   ───●───────────────●──────────────────●──────────────────●───────►       │
│      │               │                  │                  │       Tempo    │
│      │               │                  │                  │                │
│      │◄─────────────────────────────────────────────────────►│              │
│                    Tempo de Resolucao (RT)                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Horario Comercial

SLA considera apenas horario comercial configurado:

```
Segunda a Sexta: 08:00 - 18:00
Sabado: 08:00 - 12:00
Domingo: Fechado

Ticket criado sexta 17:00 com SLA de 2h:
- Deadline real: segunda 10:00 (apenas horas uteis contam)
```

## Interface do Usuario

### Dashboard de Metricas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard de Metricas                        Periodo: [Ultimos 30 dias ▼]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Resumo Geral                                                                │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total        │  │ SLA          │  │ Tempo Medio  │  │ Avaliacao    │    │
│  │ Tickets      │  │ Cumprido     │  │ Resposta     │  │ Media        │    │
│  │    456       │  │   94.5%      │  │   8 min      │  │   4.6/5      │    │
│  │  ▲ +12%      │  │  ▲ +2.3%     │  │  ▼ -15%      │  │  ▲ +0.2      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌────────────────────────────────────┬─────────────────────────────────┐   │
│  │  Tickets por Status               │  SLA por Departamento           │   │
│  │  ───────────────────               │  ─────────────────────           │   │
│  │                                   │                                  │   │
│  │  Pendentes    ████ 45             │  Comercial    ████████████ 98%  │   │
│  │  Em Progresso ██████ 78           │  Suporte      █████████░░░ 92%  │   │
│  │  Aguardando   ███ 34              │  Financeiro   ██████████░░ 95%  │   │
│  │  Resolvidos   ████████████ 289    │  TI           █████████████ 99%  │   │
│  │  Fechados     █ 10                │                                  │   │
│  │                                   │                                  │   │
│  └────────────────────────────────────┴─────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Evolucao do SLA (30 dias)                                           │   │
│  │  ─────────────────────────                                           │   │
│  │                                                                      │   │
│  │  100%  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─     │   │
│  │   95%  ─ ─  ─ ─ ─ ─  ─  ─ ─ ─ ─ ─ ┌───┐  ─ ─ ─  ─  ─  ─  ─  ─     │   │
│  │   90%         ┌───────┐           │   │     ┌───────────────────     │   │
│  │   85%  ───────┤       └───────────┘   └─────┤                        │   │
│  │   80%                                                                │   │
│  │        01/01  05/01  10/01  15/01  20/01  25/01  30/01              │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────┬─────────────────────────────────┐   │
│  │  Ranking de Agentes               │  Tickets em Risco               │   │
│  │  ────────────────────              │  ─────────────────               │   │
│  │                                   │                                  │   │
│  │  1. Maria Santos  98% | 45 tkts  │  #2024-1234 | 5 min  | Urgente  │   │
│  │  2. Pedro Costa   95% | 38 tkts  │  #2024-1230 | 12 min | Alta     │   │
│  │  3. Ana Lima      93% | 42 tkts  │  #2024-1228 | 18 min | Media    │   │
│  │  4. Carlos Souza  91% | 35 tkts  │                                  │   │
│  │  5. Julia Pereira 89% | 40 tkts  │                                  │   │
│  │                                   │                                  │   │
│  └────────────────────────────────────┴─────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuracao de SLA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configuracao de SLA                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SLA Padrao da Empresa                                                       │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Tempo de Primeira Resposta:                                                 │
│  ┌───────────────────────────────────────┐                                  │
│  │  15  minutos                          │                                  │
│  └───────────────────────────────────────┘                                  │
│                                                                              │
│  Tempo de Resolucao:                                                         │
│  ┌───────────────────────────────────────┐                                  │
│  │  4  horas                             │                                  │
│  └───────────────────────────────────────┘                                  │
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Horario Comercial                                                           │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Dia          Inicio    Fim       Ativo                               │  │
│  │  ─────────────────────────────────────────────                        │  │
│  │  Segunda      08:00     18:00     [x]                                 │  │
│  │  Terca        08:00     18:00     [x]                                 │  │
│  │  Quarta       08:00     18:00     [x]                                 │  │
│  │  Quinta       08:00     18:00     [x]                                 │  │
│  │  Sexta        08:00     18:00     [x]                                 │  │
│  │  Sabado       08:00     12:00     [x]                                 │  │
│  │  Domingo      -         -         [ ]                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  SLA por Prioridade                                                          │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Prioridade   Primeira Resposta   Resolucao                           │  │
│  │  ─────────────────────────────────────────────                        │  │
│  │  Urgente      5 min               1 hora                              │  │
│  │  Alta         15 min              2 horas                             │  │
│  │  Media        30 min              4 horas                             │  │
│  │  Baixa        60 min              8 horas                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Salvar Configuracoes]                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Modelo de Dados

### Configuracao de SLA

```prisma
model SLAConfig {
  id                String   @id @default(uuid())
  companyId         String
  departmentId      String?  @unique        // Se null, e o padrao da empresa
  firstResponseTime Int      @default(15)   // minutos
  resolutionTime    Int      @default(240)  // minutos (4 horas)
  businessHours     Json?                   // Horario comercial
  isDefault         Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
}
```

### Estrutura do Horario Comercial

```typescript
// Formato do businessHours
{
  "monday": { "start": "08:00", "end": "18:00", "active": true },
  "tuesday": { "start": "08:00", "end": "18:00", "active": true },
  "wednesday": { "start": "08:00", "end": "18:00", "active": true },
  "thursday": { "start": "08:00", "end": "18:00", "active": true },
  "friday": { "start": "08:00", "end": "18:00", "active": true },
  "saturday": { "start": "08:00", "end": "12:00", "active": true },
  "sunday": { "start": null, "end": null, "active": false },
  "holidays": [
    "2024-01-01",  // Ano Novo
    "2024-12-25"   // Natal
  ]
}
```

### Metricas do Ticket

```prisma
model Ticket {
  // ... outros campos

  slaDeadline     DateTime?  // Deadline do SLA
  firstResponseAt DateTime?  // Quando houve primeira resposta
  resolvedAt      DateTime?  // Quando foi resolvido
  resolutionTime  Int?       // Tempo total de resolucao (minutos)
  waitingTime     Int?       // Tempo aguardando cliente (minutos)
  responseTime    Int?       // Tempo de primeira resposta (minutos)
}
```

## Calculo do SLA

### Fluxo de Calculo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Novo Ticket                                                               │
│       │                                                                     │
│       ▼                                                                     │
│   ┌─────────────┐                                                          │
│   │  Buscar     │                                                          │
│   │  Config SLA │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐    Sim    ┌─────────────┐                                │
│   │  Tem SLA do │──────────►│  Usar SLA   │                                │
│   │  Departamento│          │  do Depto   │                                │
│   └──────┬──────┘           └──────┬──────┘                                │
│          │ Nao                     │                                        │
│          ▼                         │                                        │
│   ┌─────────────┐                  │                                        │
│   │  Usar SLA   │◄─────────────────┘                                        │
│   │  Padrao     │                                                           │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │  Calcular   │                                                          │
│   │  Deadline   │────► Considera horario comercial                         │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │  Salvar     │                                                          │
│   │  slaDeadline│                                                          │
│   └─────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Logica de Calculo

```typescript
class SLAService {
  async calculateDeadline(ticket: Ticket): Promise<Date> {
    // 1. Buscar configuracao de SLA
    const config = await this.getConfig(ticket.companyId, ticket.departmentId);

    // 2. Pegar tempo baseado na prioridade
    const responseTime = this.getResponseTime(config, ticket.priority);

    // 3. Calcular deadline considerando horario comercial
    const now = new Date();
    const deadline = this.addBusinessMinutes(
      now,
      responseTime,
      config.businessHours
    );

    return deadline;
  }

  private addBusinessMinutes(
    startDate: Date,
    minutes: number,
    businessHours: BusinessHours
  ): Date {
    let remainingMinutes = minutes;
    let currentDate = new Date(startDate);

    while (remainingMinutes > 0) {
      // Verificar se e dia util
      if (this.isBusinessDay(currentDate, businessHours)) {
        const dayConfig = this.getDayConfig(currentDate, businessHours);

        // Se estamos no horario comercial
        if (this.isBusinessHour(currentDate, dayConfig)) {
          const endOfDay = this.getEndOfBusinessDay(currentDate, dayConfig);
          const minutesToEndOfDay = this.diffMinutes(currentDate, endOfDay);

          if (remainingMinutes <= minutesToEndOfDay) {
            // Termina hoje
            return addMinutes(currentDate, remainingMinutes);
          } else {
            // Continua no proximo dia
            remainingMinutes -= minutesToEndOfDay;
            currentDate = this.getNextBusinessDayStart(currentDate, businessHours);
          }
        } else {
          // Fora do horario, pular para proximo inicio
          currentDate = this.getNextBusinessDayStart(currentDate, businessHours);
        }
      } else {
        // Dia nao util, pular para proximo
        currentDate = this.getNextBusinessDayStart(currentDate, businessHours);
      }
    }

    return currentDate;
  }
}
```

## Alertas de SLA

### Tipos de Alerta

| Alerta | Condicao | Destinatarios |
|--------|----------|---------------|
| **Aviso** | 50% do tempo restante | Agente atribuido |
| **Urgente** | 20% do tempo restante | Agente + Supervisor |
| **Critico** | 5% do tempo restante | Todos + Admin |
| **Violado** | SLA expirado | Todos + Notificacao externa |

### Fluxo de Alertas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Job de Verificacao (a cada 1 minuto)                                      │
│                                                                             │
│   ┌─────────────┐                                                          │
│   │  Buscar     │                                                          │
│   │  Tickets    │                                                          │
│   │  Abertos    │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   Para cada ticket:                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │  Calcular tempo restante = slaDeadline - now                       │  │
│   │                                                                     │  │
│   │  ┌───────────────────────────────────────────────────────────────┐ │  │
│   │  │                                                               │ │  │
│   │  │  tempo > 50%    →  OK (sem acao)                             │ │  │
│   │  │                                                               │ │  │
│   │  │  50% >= tempo > 20%  →  Enviar AVISO                         │ │  │
│   │  │                                                               │ │  │
│   │  │  20% >= tempo > 5%   →  Enviar URGENTE                       │ │  │
│   │  │                                                               │ │  │
│   │  │  5% >= tempo > 0%    →  Enviar CRITICO                       │ │  │
│   │  │                                                               │ │  │
│   │  │  tempo <= 0%         →  Registrar VIOLACAO + Notificar       │ │  │
│   │  │                                                               │ │  │
│   │  └───────────────────────────────────────────────────────────────┘ │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Notificacao de Violacao

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 ALERTA: SLA Violado                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Ticket: #2024-001234                                           │
│  Cliente: Joao Silva                                            │
│  Departamento: Suporte                                          │
│  Agente: Maria Santos                                           │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  SLA: Primeira Resposta                                         │
│  Prazo: 15 minutos                                              │
│  Tempo decorrido: 18 minutos                                    │
│  Violacao: 3 minutos                                            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Ver Ticket]    [Assumir Ticket]    [Notificar Supervisor]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Metricas Disponíveis

### Metricas de Tempo

| Metrica | Descricao | Calculo |
|---------|-----------|---------|
| **FRT** (First Response Time) | Tempo ate primeira resposta | firstResponseAt - createdAt |
| **RT** (Resolution Time) | Tempo total de resolucao | resolvedAt - createdAt |
| **WT** (Waiting Time) | Tempo aguardando cliente | Soma dos periodos WAITING |
| **HT** (Handle Time) | Tempo de tratamento efetivo | RT - WT |

### Metricas de Volume

| Metrica | Descricao |
|---------|-----------|
| **Tickets Criados** | Total de tickets novos no periodo |
| **Tickets Resolvidos** | Total de tickets finalizados |
| **Tickets Pendentes** | Total de tickets em aberto |
| **Backlog** | Tickets antigos ainda abertos |

### Metricas de Qualidade

| Metrica | Descricao | Meta Sugerida |
|---------|-----------|---------------|
| **SLA Compliance** | % tickets dentro do SLA | > 95% |
| **CSAT** (Customer Satisfaction) | Avaliacao do cliente | > 4.5/5 |
| **FCR** (First Contact Resolution) | % resolvidos no primeiro contato | > 70% |
| **Escalation Rate** | % tickets escalados | < 10% |

## Relatorios

### Relatorio Diario

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Relatorio Diario - 15/01/2024                              [Exportar PDF]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Resumo do Dia                                                               │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Tickets Criados: 45          Tickets Resolvidos: 42                        │
│  SLA Cumprido: 93.3% (42/45)  Tempo Medio Resposta: 8 min                  │
│  Avaliacao Media: 4.7/5       Tickets Escalados: 3 (6.7%)                  │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Por Departamento                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Departamento    Criados  Resolvidos  SLA%   TMR    Aval  │             │ │
│  │ ──────────────────────────────────────────────────────── │             │ │
│  │ Comercial       15       14          100%   5min   4.8   │             │ │
│  │ Suporte         20       18          90%    12min  4.5   │             │ │
│  │ Financeiro      10       10          100%   6min   4.9   │             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Por Agente                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Agente          Atendidos  SLA%   TMR    Avaliacao                    │ │
│  │ ──────────────────────────────────────────────────────────            │ │
│  │ Maria Santos    12         100%   4min   4.9                          │ │
│  │ Pedro Costa     10         90%    10min  4.6                          │ │
│  │ Ana Lima        8          87.5%  15min  4.5                          │ │
│  │ Carlos Souza    7          100%   6min   4.8                          │ │
│  │ ChatBlue IA     8          100%   1min   4.2                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Violacoes de SLA (3)                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Ticket      Agente         Tempo      Motivo                          │ │
│  │ ──────────────────────────────────────────────────────────            │ │
│  │ #2024-1234  Ana Lima       +5min      Alta demanda                    │ │
│  │ #2024-1235  Pedro Costa    +3min      Problema tecnico               │ │
│  │ #2024-1236  (nao atrib.)   +10min     Fora do horario                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Exportacao de Dados

Formatos disponiveis:
- **PDF**: Relatorio formatado para impressao
- **Excel**: Dados completos para analise
- **CSV**: Dados brutos para integracao
- **JSON**: Para APIs e automacoes

## SLA por Departamento

### Configuracao Hierarquica

```
Empresa (SLA Padrao)
├── FRT: 30 min
└── RT: 4 horas

    ├── Comercial (Herda padrao)
    │   ├── FRT: 30 min
    │   └── RT: 4 horas
    │
    ├── Suporte (Customizado)
    │   ├── FRT: 15 min  ← Mais rapido
    │   └── RT: 2 horas  ← Mais rapido
    │
    └── Financeiro (Customizado)
        ├── FRT: 60 min  ← Mais lento
        └── RT: 8 horas  ← Mais lento
```

### Heranca de Configuracao

```typescript
// Buscar configuracao de SLA para um ticket
async function getSLAConfig(companyId: string, departmentId: string | null) {
  // 1. Tentar buscar config do departamento
  if (departmentId) {
    const deptConfig = await prisma.sLAConfig.findUnique({
      where: { departmentId }
    });
    if (deptConfig) return deptConfig;
  }

  // 2. Buscar config padrao da empresa
  const defaultConfig = await prisma.sLAConfig.findFirst({
    where: { companyId, isDefault: true }
  });

  return defaultConfig;
}
```

## Casos de Uso

### 1. Monitoramento em Tempo Real

**Cenario**: Supervisor monitora equipe.

```
1. Acessa dashboard de metricas
2. Visualiza tickets em risco
3. Identifica agente sobrecarregado
4. Redistribui tickets
5. Evita violacoes de SLA
```

### 2. Analise de Tendencias

**Cenario**: Gestor analisa performance mensal.

```
1. Gera relatorio do periodo
2. Compara com mes anterior
3. Identifica padroes (picos, quedas)
4. Ajusta configuracoes de SLA
5. Define metas para proximo periodo
```

### 3. Ajuste de Capacidade

**Cenario**: SLA sendo violado frequentemente.

```
1. Analisa relatorios de violacao
2. Identifica horarios criticos
3. Opcoes:
   - Aumentar equipe nos horarios
   - Ajustar metas de SLA
   - Ativar IA para picos
4. Monitora resultados
```

### 4. SLA Diferenciado por Cliente

**Cenario**: Clientes VIP precisam de atendimento prioritario.

```
1. Cria departamento "VIP"
2. Configura SLA agressivo (FRT: 5min)
3. Aloca agentes dedicados
4. Tickets VIP vao para esse departamento
5. SLA monitorado separadamente
```

## Integracao com Outras Funcionalidades

### Tickets

- SLA calculado na criacao
- Deadline atualizado em transferencias
- Metricas registradas no ticket

### Departamentos

- SLA configurado por departamento
- Heranca de configuracao
- Metricas agregadas

### Usuarios

- Performance individual
- Rankings de agentes
- Metas pessoais

### Notificacoes

- Alertas de SLA
- Resumos periodicos
- Escalacao automatica

### IA

- IA ajuda a cumprir SLA
- Metricas separadas
- Analise de impacto

## Boas Praticas

### Configuracao

1. **Defina metas realistas** - Base na capacidade atual
2. **Considere horarios** - Configure horario comercial corretamente
3. **Diferencie prioridades** - SLA por urgencia
4. **Revise periodicamente** - Ajuste conforme demanda

### Monitoramento

1. **Acompanhe diariamente** - Identifique problemas cedo
2. **Use alertas** - Configure notificacoes
3. **Analise tendencias** - Preveja problemas
4. **Compartilhe metricas** - Transparencia com equipe

### Melhoria Continua

1. **Investigue violacoes** - Entenda causas
2. **Documente aprendizados** - Crie base de conhecimento
3. **Automatize** - Use IA para casos simples
4. **Treine equipe** - Capacite para eficiencia

## Proximos Passos

- [Base de Conhecimento](/funcionalidades/base-conhecimento) - Artigos de suporte
- [FAQ](/funcionalidades/faq) - Perguntas frequentes
- [Notificacoes](/funcionalidades/notificacoes) - Alertas e lembretes
