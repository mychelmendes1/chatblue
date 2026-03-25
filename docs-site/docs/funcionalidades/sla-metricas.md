---
sidebar_position: 6
title: SLA e Metricas
description: Configuracao de SLA e dashboard de metricas do ChatBlue
---

# SLA e Metricas

O sistema de SLA (Service Level Agreement) e metricas do ChatBlue permite monitorar e garantir a qualidade do atendimento atraves de acordos de nivel de servico configuraveis e dashboards detalhados.

## Visao Geral

O modulo de SLA oferece:

- **Configuracao flexivel** de tempos de resposta e resolucao
- **SLA por departamento** independente
- **Horario comercial** configuravel
- **Alertas automaticos** de warning e breach
- **Dashboard em tempo real**
- **Exportacao** em JSON e CSV

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

O SLA pode considerar apenas horario comercial. O formato real do campo `businessHours` e:

```json
{
  "start": "09:00",
  "end": "18:00",
  "days": [1, 2, 3, 4, 5]
}
```

Os dias sao representados como numeros (1 = segunda, 7 = domingo). Nao ha suporte a configuracao por dia individual nem a feriados.

Exemplo de calculo:

```
Ticket criado sexta 17:00 com SLA de 2h:
- Deadline real: segunda 10:00 (apenas horas uteis contam)
```

## Modelo de Dados

### Configuracao de SLA

```prisma
model SLAConfig {
  id                String   @id @default(uuid())
  companyId         String
  name              String
  departmentId      String?  @unique
  firstResponseTime Int      @default(15)   // minutos
  resolutionTime    Int      @default(240)  // minutos (4 horas)
  businessHours     Json?                   // { start, end, days }
  isDefault         Boolean  @default(false)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  company    Company     @relation(fields: [companyId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
}
```

### Estrutura do Horario Comercial

```typescript
// Formato do campo businessHours (JSON)
{
  "start": "09:00",
  "end": "18:00",
  "days": [1, 2, 3, 4, 5]  // 1=segunda ... 7=domingo
}
```

Nao existe configuracao por dia individual (horarios diferentes por dia da semana) nem lista de feriados.

### Metricas do Ticket

```prisma
model Ticket {
  // ... outros campos

  slaDeadline     DateTime?  // Deadline do SLA
  slaBreached     Boolean    @default(false)
  firstResponse   DateTime?  // Quando houve primeira resposta
  resolvedAt      DateTime?  // Quando foi resolvido
  responseTime    Int?       // Tempo de primeira resposta (segundos)
  resolutionTime  Int?       // Tempo total de resolucao (segundos)
  waitingTime     Int?       // Tempo aguardando cliente (segundos)
}
```

Os campos `responseTime`, `resolutionTime` e `waitingTime` sao armazenados em **segundos** no banco de dados.

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
│   │  Deadline   │────► Considera horario comercial (se configurado)        │
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

O SLA nao diferencia por prioridade do ticket. A configuracao e feita por departamento ou como padrao da empresa.

### Logica de Calculo

```typescript
class SLAService {
  async calculateDeadline(ticket: Ticket): Promise<Date> {
    // 1. Buscar configuracao de SLA (departamento ou padrao)
    const config = await this.getConfig(ticket.companyId, ticket.departmentId);

    // 2. Pegar tempo de primeira resposta da config
    const responseMinutes = config.firstResponseTime;

    // 3. Calcular deadline considerando horario comercial (se configurado)
    const now = new Date();
    const deadline = config.businessHours
      ? this.addBusinessMinutes(now, responseMinutes, config.businessHours)
      : addMinutes(now, responseMinutes);

    return deadline;
  }
}
```

## Alertas de SLA

### Tipos de Alerta

O sistema possui dois niveis de alerta:

| Alerta | Condicao | Destinatario |
|--------|----------|--------------|
| **WARNING** | Tempo restante inferior a ~10% do SLA (minimo 5min para FRT, 10min para resolucao) | Agente atribuido (assignedToId) |
| **BREACH** | Deadline ultrapassado | Agente atribuido (assignedToId) |

### Job de Verificacao

O job `sla-check.processor` roda a cada **60 segundos** (`every: 60000`) e verifica:

1. Tickets abertos que possuem `slaDeadline` definido
2. Calcula tempo restante para primeira resposta e resolucao
3. Envia WARNING via socket quando o tempo restante esta proximo do limite
4. Envia BREACH quando o deadline passou, marca `ticket.slaBreached = true` e cria uma Activity do tipo `SLA_BREACH`

### Notificacoes

As notificacoes sao enviadas via WebSocket para o agente atribuido:

| Evento Socket | Quando |
|---------------|--------|
| `sla:warning` | Tempo restante proximo do limite |
| `sla:breach` | Deadline ultrapassado |

## Metricas Disponiveis

### Endpoints de Metricas

| Endpoint | Descricao |
|----------|-----------|
| `GET /api/metrics/sla` | Metricas de SLA (compliance, tempos, violacoes) |
| `GET /api/metrics/dashboard` | Dashboard geral de metricas |
| `GET /api/metrics/agents` | Metricas por agente |
| `GET /api/metrics/departments` | Metricas por departamento |
| `GET /api/metrics/nps` | Metricas de NPS |
| `GET /api/metrics/quality` | Metricas de qualidade |
| `GET /api/metrics/ai` | Metricas da IA |
| `GET /api/metrics/executive` | Resumo executivo |
| `GET /api/metrics/comparison` | Comparacoes entre periodos |
| `GET /api/metrics/history` | Historico de metricas |
| `GET /api/metrics/export` | Exportacao de dados (JSON/CSV) |

### Metas e Alertas

| Endpoint | Descricao |
|----------|-----------|
| `GET /api/metrics/goals` | Listar metas |
| `POST /api/metrics/goals` | Criar meta |
| `PUT /api/metrics/goals/:id` | Atualizar meta |
| `DELETE /api/metrics/goals/:id` | Remover meta |
| `GET /api/metrics/alerts` | Listar alertas de metricas |
| `POST /api/metrics/alerts` | Criar alerta de metrica |
| `PUT /api/metrics/alerts/:id` | Atualizar alerta de metrica |
| `DELETE /api/metrics/alerts/:id` | Remover alerta de metrica |

### Metricas de Tempo

| Metrica | Descricao | Campo no Ticket |
|---------|-----------|-----------------|
| **FRT** (First Response Time) | Tempo ate primeira resposta | `firstResponse` - `createdAt` (armazenado em `responseTime` em segundos) |
| **RT** (Resolution Time) | Tempo total de resolucao | `resolvedAt` - `createdAt` (armazenado em `resolutionTime` em segundos) |
| **WT** (Waiting Time) | Tempo aguardando cliente | Soma dos periodos WAITING (armazenado em `waitingTime` em segundos) |

### Metricas de Volume

| Metrica | Descricao |
|---------|-----------|
| **Tickets Criados** | Total de tickets novos no periodo |
| **Tickets Resolvidos** | Total de tickets finalizados |
| **Tickets Pendentes** | Total de tickets em aberto |
| **Tickets em Risco** | Tickets proximos de violar SLA |

### Metricas de Qualidade

| Metrica | Descricao |
|---------|-----------|
| **SLA Compliance** | % tickets dentro do SLA |
| **Breach Count** | Quantidade de violacoes no periodo |
| **Tempo Medio de Resposta** | Media do responseTime |
| **Tempo Medio de Resolucao** | Media do resolutionTime |

## Exportacao de Dados

### Formatos Disponiveis

O endpoint `GET /api/metrics/export` suporta dois formatos:

- **JSON**: Para APIs e automacoes
- **CSV**: Dados brutos para analise e importacao

Nao ha suporte a exportacao em PDF ou Excel.

## Configuracao de SLA

### API

A configuracao de SLA e feita via endpoints REST:

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/settings/sla` | Listar configuracoes |
| `POST` | `/api/settings/sla` | Criar configuracao |
| `PUT` | `/api/settings/sla/:id` | Atualizar configuracao |
| `DELETE` | `/api/settings/sla/:id` | Remover configuracao |

### Exemplo de Criacao

```typescript
POST /api/settings/sla
{
  "name": "SLA Suporte",
  "firstResponseTime": 15,      // minutos
  "resolutionTime": 240,         // minutos (4 horas)
  "businessHours": {             // opcional
    "start": "09:00",
    "end": "18:00",
    "days": [1, 2, 3, 4, 5]
  },
  "isDefault": false,
  "departmentId": "dept_123",
  "isActive": true
}
```

## SLA por Departamento

### Configuracao Hierarquica

```
Empresa (SLA Padrao - isDefault: true)
├── FRT: 30 min
└── RT: 4 horas

    ├── Comercial (Herda padrao, sem config propria)
    │   ├── FRT: 30 min
    │   └── RT: 4 horas
    │
    ├── Suporte (Config propria)
    │   ├── FRT: 15 min
    │   └── RT: 2 horas
    │
    └── Financeiro (Config propria)
        ├── FRT: 60 min
        └── RT: 8 horas
```

### Heranca de Configuracao

```typescript
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

## Interface do Usuario

### Dashboard de Metricas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard de Metricas                        Periodo: [Ultimos 30 dias v]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Resumo Geral                                                                │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total        │  │ SLA          │  │ Tempo Medio  │  │ Violacoes    │    │
│  │ Tickets      │  │ Cumprido     │  │ Resposta     │  │              │    │
│  │    456       │  │   94.5%      │  │   8 min      │  │     12       │    │
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
│  │                                   │                                  │   │
│  └────────────────────────────────────┴─────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Casos de Uso

### 1. Monitoramento em Tempo Real

**Cenario**: Supervisor monitora equipe.

```
1. Acessa dashboard de metricas
2. Visualiza tickets em risco (warning)
3. Identifica agente sobrecarregado
4. Redistribui tickets
5. Evita violacoes de SLA (breach)
```

### 2. Analise de Tendencias

**Cenario**: Gestor analisa performance mensal.

```
1. Consulta GET /api/metrics/history
2. Compara com periodo anterior via GET /api/metrics/comparison
3. Identifica padroes (picos, quedas)
4. Ajusta configuracoes de SLA
5. Define metas via POST /api/metrics/goals
```

### 3. Exportacao de Dados

**Cenario**: Equipe de BI precisa dos dados.

```
1. Chama GET /api/metrics/export?format=csv&startDate=...&endDate=...
2. Recebe arquivo CSV com metricas do periodo
3. Importa em ferramenta de BI
4. Alternativa: GET /api/metrics/export?format=json para integracao via API
```

### 4. SLA Diferenciado por Departamento

**Cenario**: Suporte precisa de SLA mais agressivo que Financeiro.

```
1. Cria config SLA para Suporte: POST /api/settings/sla (FRT: 15min)
2. Cria config SLA para Financeiro: POST /api/settings/sla (FRT: 60min)
3. Tickets de cada departamento usam o SLA correspondente
4. SLA monitorado separadamente por departamento
```

## Integracao com Outras Funcionalidades

### Tickets

- SLA calculado na criacao do ticket
- Deadline atualizado em transferencias
- Metricas registradas no ticket (responseTime, resolutionTime, waitingTime em segundos)
- Campo slaBreached marcado em caso de violacao

### Departamentos

- SLA configurado por departamento via departmentId
- Heranca da configuracao padrao
- Metricas agregadas via GET /api/metrics/departments

### Notificacoes

- Alertas WARNING e BREACH via WebSocket
- Eventos sla:warning e sla:breach enviados ao agente atribuido

## Boas Praticas

### Configuracao

1. **Defina metas realistas** - Base na capacidade atual da equipe
2. **Considere horarios** - Configure businessHours corretamente
3. **Use departamentos** - Crie SLAs diferentes para necessidades diferentes
4. **Revise periodicamente** - Ajuste conforme demanda muda

### Monitoramento

1. **Acompanhe diariamente** - Use GET /api/metrics/dashboard
2. **Configure alertas** - Os warnings previnem violacoes
3. **Analise tendencias** - Use GET /api/metrics/history
4. **Exporte dados** - Use GET /api/metrics/export para analises detalhadas

## Proximos Passos

- [Configuracao de SLA](/guias/sla/configuracao) - Como criar e editar politicas
- [Alertas de SLA](/guias/sla/alertas) - Configurar notificacoes
- [Relatorios de SLA](/guias/sla/relatorios) - Gerar e analisar relatorios
