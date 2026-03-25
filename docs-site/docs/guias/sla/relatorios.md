---
sidebar_position: 3
title: Relatorios de SLA
description: Guia para consultar e exportar metricas de SLA no ChatBlue
---

# Relatorios de SLA

Os relatorios de SLA permitem analisar o desempenho do atendimento e identificar oportunidades de melhoria. Este guia explica como consultar e exportar esses dados.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 10-15 minutos

## Endpoints Reais

### Consultar Metricas de SLA

O endpoint principal para metricas de SLA e:

```
GET /api/metrics/sla
```

**Query Parameters:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `startDate` | string | Data de inicio do periodo (ISO 8601) |
| `endDate` | string | Data de fim do periodo (ISO 8601) |
| `departmentId` | string | Filtrar por departamento (opcional) |

**Exemplo de requisicao:**

```
GET /api/metrics/sla?startDate=2024-01-01&endDate=2024-01-31&departmentId=dept_123
```

### Exportar Dados

Para exportar metricas em arquivo:

```
GET /api/metrics/export
```

Formatos suportados: **JSON** e **CSV**.

Nao existe endpoint `POST /api/reports/sla`. Todas as consultas sao feitas via GET nos endpoints de metricas.

## Metricas Disponiveis

O endpoint `GET /api/metrics/sla` retorna as seguintes metricas:

### Taxa de Compliance

Percentual de tickets que cumpriram o SLA dentro do periodo.

### Tempos Medios

| Metrica | Descricao | Unidade no Banco |
|---------|-----------|------------------|
| Tempo medio de primeira resposta | Media do campo `responseTime` | Segundos |
| Tempo medio de resolucao | Media do campo `resolutionTime` | Segundos |

### Contagem de Violacoes

Quantidade de tickets com `slaBreached = true` no periodo.

### Tickets em Risco

Tickets abertos que estao proximos de violar o SLA (em estado de warning).

## Outros Endpoints de Metricas

Alem do endpoint de SLA, o sistema oferece metricas complementares:

| Endpoint | Descricao |
|----------|-----------|
| `GET /api/metrics/dashboard` | Dashboard geral com resumo de metricas |
| `GET /api/metrics/agents` | Desempenho por agente |
| `GET /api/metrics/departments` | Desempenho por departamento |
| `GET /api/metrics/nps` | Metricas de NPS |
| `GET /api/metrics/quality` | Metricas de qualidade |
| `GET /api/metrics/ai` | Metricas da IA |
| `GET /api/metrics/executive` | Resumo executivo |
| `GET /api/metrics/comparison` | Comparacao entre periodos |
| `GET /api/metrics/history` | Historico de metricas |

## Visualizacao de Dados

### Visao Geral de SLA

```
┌─────────────────────────────────────────────────────────────┐
│              Metricas de SLA - Janeiro 2024                  │
│                    Departamento: Todos                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Total de Tickets: 1,234                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ COMPLIANCE GERAL                                      │   │
│  │                                                        │   │
│  │  Dentro do SLA: 1,049 | Violados: 185                 │   │
│  │  Taxa: 85%                                             │   │
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
│  Violacoes (Breaches): 185                                  │
│  Tickets em Risco (Warning): 12                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Por Departamento

Usando `GET /api/metrics/departments`:

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

Usando `GET /api/metrics/agents`:

```
┌─────────────────────────────────────────────────────────────┐
│              Desempenho por Agente                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Agente          │ Tickets │ Compliance │ 1a Resp │ Resolucao│
│  ─────────────────────────────────────────────────────────  │
│  Maria Silva     │    85   │    94%     │  5 min  │  1h 40m │
│  Joao Santos     │    78   │    89%     │  8 min  │  2h 30m │
│  Ana Costa       │    92   │    85%     │ 12 min  │  3h 10m │
│  Pedro Lima      │    68   │    82%     │ 14 min  │  3h 50m │
│  ─────────────────────────────────────────────────────────  │
│  Media Equipe    │  80.8   │    87%     │ 10 min  │  2h 47m │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Exportacao

### Formato CSV

```
GET /api/metrics/export?format=csv&startDate=2024-01-01&endDate=2024-01-31
```

Retorna um arquivo CSV com as metricas do periodo.

### Formato JSON

```
GET /api/metrics/export?format=json&startDate=2024-01-01&endDate=2024-01-31
```

Retorna os dados estruturados em JSON para integracao com outros sistemas.

Nao ha suporte a exportacao em PDF ou Excel.

## Metas

O sistema permite definir metas para as metricas de SLA:

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/metrics/goals` | Listar metas |
| `POST` | `/api/metrics/goals` | Criar meta |
| `PUT` | `/api/metrics/goals/:id` | Atualizar meta |
| `DELETE` | `/api/metrics/goals/:id` | Remover meta |

## Solucao de Problemas

### Dados em branco

**Causas possiveis**:
- Periodo sem dados (startDate/endDate muito restritivos)
- departmentId invalido
- Permissao insuficiente

**Solucao**:
1. Verifique os parametros da query
2. Amplie o periodo
3. Remova o filtro de departamento para testar

### Tempos parecem incorretos

**Nota importante**: os campos `responseTime`, `resolutionTime` e `waitingTime` sao armazenados em **segundos** no banco de dados. Certifique-se de converter para minutos ou horas na exibicao.

### Exportacao nao funciona

**Verificacoes**:
1. O formato e `json` ou `csv`? (unicos suportados)
2. O periodo esta definido corretamente?
3. Ha dados no periodo selecionado?

## Boas Praticas

### 1. Revisao Regular

- Consulte metricas de SLA diariamente
- Faca analise por departamento semanalmente
- Compare periodos usando `GET /api/metrics/comparison`

### 2. Acoes Baseadas em Dados

- Identifique departamentos com alta taxa de breach
- Ajuste SLAs se a taxa de compliance for muito baixa
- Use `GET /api/metrics/agents` para identificar necessidade de treinamento

### 3. Exportacao Periodica

- Exporte dados em CSV para analise em planilhas
- Use formato JSON para integracoes automatizadas
- Mantenha historico de exportacoes para auditorias

## Proximos Passos

Apos consultar relatorios:

- [Configurar SLA](/guias/sla/configuracao) - Ajustar politicas com base nos dados
- [Alertas de SLA](/guias/sla/alertas) - Entender as notificacoes
