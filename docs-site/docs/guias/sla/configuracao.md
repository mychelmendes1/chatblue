---
sidebar_position: 1
title: Configuracao de SLA
description: Guia para configurar acordos de nivel de servico (SLA) no ChatBlue
---

# Configuracao de SLA

O SLA (Service Level Agreement) define metas de tempo de resposta e resolucao para os atendimentos. Este guia explica como configurar SLAs no ChatBlue.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 15-20 minutos

## O Que e SLA?

SLA define compromissos de tempo para o atendimento:

| Metrica | Descricao | Exemplo |
|---------|-----------|---------|
| Primeira Resposta | Tempo ate a primeira resposta do agente | 15 minutos |
| Tempo de Resolucao | Tempo ate fechar o ticket | 4 horas |

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
│  Tempo correndo...                                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   OK     │  │ Warning  │  │ Breach   │                  │
│  │  Verde   │  │ Amarelo  │  │ Vermelho │                  │
│  │          │  │ (~10%    │  │(Deadline │                  │
│  │          │  │ restante)│  │ passou)  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼ (Primeira resposta enviada)
┌─────────────────────────────────────────────────────────────┐
│                   SLA: Resolucao                             │
│                      Meta: 4 horas                           │
├─────────────────────────────────────────────────────────────┤
│  Tempo correndo...                                          │
│                                                              │
│  (Conta apenas horario comercial, se configurado)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼ (Ticket fechado)
┌─────────────────────────────────────────────────────────────┐
│                   SLA Concluido                              │
│           Registrar metricas no ticket                       │
│    (responseTime, resolutionTime em segundos)               │
└─────────────────────────────────────────────────────────────┘
```

## API de Configuracao

A configuracao de SLA e gerenciada pelos seguintes endpoints:

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/settings/sla` | Listar todas as configuracoes de SLA |
| `POST` | `/api/settings/sla` | Criar nova configuracao de SLA |
| `PUT` | `/api/settings/sla/:id` | Atualizar configuracao existente |
| `DELETE` | `/api/settings/sla/:id` | Remover configuracao de SLA |

### Campos do SLAConfig

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome identificador da configuracao |
| `firstResponseTime` | number | Sim | Tempo de primeira resposta em minutos |
| `resolutionTime` | number | Sim | Tempo de resolucao em minutos |
| `businessHours` | object | Nao | Horario comercial (opcional) |
| `isDefault` | boolean | Sim | Se e a configuracao padrao da empresa |
| `departmentId` | string | Nao | Departamento associado (opcional) |
| `isActive` | boolean | Sim | Se a configuracao esta ativa |

## Passo a Passo

### Passo 1: Criar SLA Padrao

Crie uma configuracao padrao para toda a empresa:

```typescript
POST /api/settings/sla
{
  "name": "SLA Padrao",
  "firstResponseTime": 30,
  "resolutionTime": 240,
  "isDefault": true,
  "isActive": true
}
```

Esta configuracao sera usada para tickets de departamentos que nao possuem SLA proprio.

### Passo 2: Criar SLA por Departamento

Crie configuracoes especificas para departamentos que precisam de metas diferentes:

```typescript
// SLA para Suporte (mais rapido)
POST /api/settings/sla
{
  "name": "SLA Suporte",
  "firstResponseTime": 15,
  "resolutionTime": 120,
  "departmentId": "dept_suporte_123",
  "isDefault": false,
  "isActive": true
}

// SLA para Financeiro (mais tempo)
POST /api/settings/sla
{
  "name": "SLA Financeiro",
  "firstResponseTime": 60,
  "resolutionTime": 480,
  "departmentId": "dept_financeiro_456",
  "isDefault": false,
  "isActive": true
}
```

### Passo 3: Configurar Horario Comercial (Opcional)

Se o SLA deve contar apenas horas uteis, adicione o campo `businessHours`:

```typescript
POST /api/settings/sla
{
  "name": "SLA Comercial",
  "firstResponseTime": 15,
  "resolutionTime": 240,
  "businessHours": {
    "start": "09:00",
    "end": "18:00",
    "days": [1, 2, 3, 4, 5]
  },
  "isDefault": false,
  "departmentId": "dept_comercial_789",
  "isActive": true
}
```

O formato do `businessHours`:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `start` | string | Horario de inicio (HH:mm) |
| `end` | string | Horario de fim (HH:mm) |
| `days` | number[] | Dias da semana (1=segunda ... 7=domingo) |

Nao existe configuracao de horario diferente por dia da semana nem lista de feriados. O horario e o mesmo para todos os dias listados em `days`.

### Passo 4: Verificar Configuracao

Liste as configuracoes criadas:

```
GET /api/settings/sla
```

## Heranca de Configuracao

O sistema busca a configuracao de SLA na seguinte ordem:

```
1. Buscar SLAConfig do departamento do ticket
   - Se existe e isActive = true -> usar esta config
   
2. Se nao encontrou, buscar SLAConfig padrao (isDefault = true)
   - Usar como fallback
```

```
Empresa (SLA Padrao - isDefault: true)
├── FRT: 30 min
└── RT: 4 horas

    ├── Comercial (sem config propria -> herda padrao)
    │   ├── FRT: 30 min
    │   └── RT: 4 horas
    │
    ├── Suporte (config propria)
    │   ├── FRT: 15 min
    │   └── RT: 2 horas
    │
    └── Financeiro (config propria)
        ├── FRT: 60 min
        └── RT: 8 horas
```

O SLA nao diferencia por prioridade do ticket. A diferenciacao e feita exclusivamente por departamento.

## Atualizar Configuracao

Para alterar uma configuracao existente:

```typescript
PUT /api/settings/sla/sla_config_id_123
{
  "name": "SLA Suporte Atualizado",
  "firstResponseTime": 10,
  "resolutionTime": 180,
  "isActive": true
}
```

## Desativar Configuracao

Para desativar sem remover:

```typescript
PUT /api/settings/sla/sla_config_id_123
{
  "isActive": false
}
```

## Como o SLA e Verificado

O job `sla-check.processor` roda a cada 60 segundos e verifica os tickets abertos:

1. **WARNING**: enviado quando o tempo restante e inferior a ~10% do SLA (minimo 5 min para FRT, 10 min para resolucao)
2. **BREACH**: enviado quando o deadline passou. Marca `ticket.slaBreached = true` e cria Activity `SLA_BREACH`

As notificacoes sao enviadas via WebSocket ao agente atribuido (`assignedToId`) nos eventos `sla:warning` e `sla:breach`.

## Metricas Armazenadas

Quando o ticket e respondido ou resolvido, o sistema registra:

| Campo | Descricao | Unidade |
|-------|-----------|---------|
| `firstResponse` | Timestamp da primeira resposta | DateTime |
| `responseTime` | Tempo ate primeira resposta | Segundos |
| `resolutionTime` | Tempo total de resolucao | Segundos |
| `waitingTime` | Tempo aguardando cliente | Segundos |
| `slaBreached` | Se o SLA foi violado | Boolean |

Os tempos sao armazenados em **segundos** no banco de dados.

## Visualizacao no Dashboard

### Indicadores de SLA

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard de SLA                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tickets Abertos: 45        SLA OK: 38 (84%)                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Dentro do SLA       │████████████████      │ 38     │    │
│  │  Em risco (Warning)  │███                   │ 5      │    │
│  │  Violado (Breach)    │██                    │ 2      │    │
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
| Amarelo | Warning | Proximo do limite (~10% restante) |
| Vermelho | Breach | SLA violado |

## Solucao de Problemas

### SLA nao esta sendo aplicado

**Verificacoes**:
1. A configuracao existe? (`GET /api/settings/sla`)
2. A configuracao esta ativa? (`isActive: true`)
3. O departamento esta correto? (`departmentId`)
4. Existe uma configuracao padrao? (`isDefault: true`)

### Horario comercial calculado errado

**Causa**: Campo `businessHours` com valores incorretos.

**Solucao**: Verifique os campos `start`, `end` e `days`:

```json
{
  "start": "09:00",
  "end": "18:00",
  "days": [1, 2, 3, 4, 5]
}
```

Lembre-se: 1 = segunda, 7 = domingo.

### Alertas nao estao chegando

**Verificacoes**:
1. O ticket tem `slaDeadline` definido?
2. O ticket tem agente atribuido (`assignedToId`)?
3. O agente esta conectado via WebSocket?
4. O job sla-check.processor esta rodando?

## Boas Praticas

### 1. Metas Realistas

- Baseie metas em dados historicos (consulte `GET /api/metrics/sla`)
- Considere a capacidade da equipe
- Deixe margem para imprevistos

### 2. Horario Comercial

- Configure `businessHours` se a equipe nao atende 24h
- Use os dias corretos no array `days`
- Lembre que o horario e o mesmo para todos os dias configurados

### 3. SLA por Departamento

- Crie SLAs especificos para departamentos com necessidades diferentes
- Mantenha sempre um SLA padrao (`isDefault: true`) como fallback
- Desative configs que nao estao mais em uso (`isActive: false`)

### 4. Revisao Periodica

- Analise metricas mensalmente via `GET /api/metrics/sla`
- Compare periodos via `GET /api/metrics/comparison`
- Ajuste metas conforme necessario via `PUT /api/settings/sla/:id`

## Proximos Passos

Apos configurar SLA:

- [Alertas de SLA](/guias/sla/alertas) - Entender as notificacoes
- [Relatorios de SLA](/guias/sla/relatorios) - Consultar e exportar metricas
