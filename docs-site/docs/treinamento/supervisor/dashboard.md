---
sidebar_position: 2
title: Dashboard do Supervisor
description: Aprenda a utilizar o dashboard de metricas para monitorar sua equipe
---

# Dashboard do Supervisor

O dashboard e sua central de comando. Nele, voce acompanha em tempo real o desempenho da sua equipe e identifica rapidamente situacoes que precisam de atencao.

## Acessando o Dashboard

1. Faca login no ChatBlue
2. Clique em **Dashboard** no menu lateral
3. O painel sera carregado com os dados do dia atual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ChatBlue - Dashboard                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Periodo: [Hoje ▼]   Departamento: [Todos ▼]   Atendente: [Todos ▼]  [🔄]  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Visao Geral do Dashboard

O dashboard e dividido em varias secoes. Vamos conhecer cada uma:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Dashboard do Supervisor                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        CARDS DE RESUMO                              │    │
│  │  (Metricas principais do periodo)                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐       │
│  │    GRAFICO DE EVOLUCAO       │  │    STATUS DA EQUIPE           │       │
│  │    (Linha do tempo)          │  │    (Quem esta online)         │       │
│  └───────────────────────────────┘  └───────────────────────────────┘       │
│                                                                              │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐       │
│  │    TICKETS EM RISCO          │  │    RANKING DE ATENDENTES      │       │
│  │    (Alertas de SLA)          │  │    (Desempenho individual)    │       │
│  └───────────────────────────────┘  └───────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Cards de Resumo

Os cards no topo mostram as metricas mais importantes em um relance:

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Total Tickets   │  │  SLA Cumprido    │  │  Tempo Medio     │  │  Avaliacao       │
│                  │  │                  │  │  de Resposta     │  │  Media           │
│      156         │  │     94.5%        │  │     8 min        │  │     4.6/5        │
│   ▲ +12%         │  │   ▲ +2.3%        │  │   ▼ -15%         │  │   ▲ +0.2         │
│  (vs ontem)      │  │  (vs ontem)      │  │  (vs ontem)      │  │  (vs ontem)      │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Entendendo Cada Metrica

| Card | O Que Significa | Como Interpretar |
|------|-----------------|------------------|
| **Total Tickets** | Quantidade de tickets no periodo | Indica o volume de trabalho |
| **SLA Cumprido** | % de tickets respondidos no prazo | Quanto maior, melhor. Meta: > 95% |
| **Tempo Medio de Resposta** | Media de tempo ate a 1a resposta | Quanto menor, melhor. Meta: < 10 min |
| **Avaliacao Media** | Nota media dada pelos clientes | Quanto maior, melhor. Meta: > 4.5 |

### Setas de Tendencia

- **▲ Verde**: Melhorou em relacao ao periodo anterior
- **▼ Vermelho**: Piorou em relacao ao periodo anterior
- **— Cinza**: Manteve-se estavel

:::tip Dica de Leitura
Ao analisar os cards, preste atencao nas setas. Uma queda brusca pode indicar um problema que precisa de atencao imediata.
:::

## Filtrando os Dados

Voce pode filtrar os dados do dashboard para analises mais especificas:

### Por Periodo

1. Clique no seletor **Periodo**
2. Escolha uma opcao:

| Opcao | Descricao |
|-------|-----------|
| Hoje | Dados do dia atual |
| Ontem | Dados de ontem |
| Ultimos 7 dias | Ultima semana |
| Ultimos 30 dias | Ultimo mes |
| Este mes | Mes atual completo |
| Mes passado | Mes anterior completo |
| Personalizado | Escolha as datas |

### Por Departamento

1. Clique no seletor **Departamento**
2. Escolha o departamento desejado
3. Os dados serao filtrados automaticamente

### Por Atendente

1. Clique no seletor **Atendente**
2. Escolha o atendente especifico
3. Veja as metricas individuais

:::info Combinando Filtros
Voce pode combinar filtros. Por exemplo: ver os dados da "Ana" no departamento "Suporte" nos "Ultimos 7 dias".
:::

## Grafico de Evolucao

O grafico de linha mostra como as metricas evoluiram ao longo do tempo:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Evolucao do SLA (Ultimos 7 dias)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  100% ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  ─  META  ─  ─  ─  ─    │
│   95% ─────────●─────────●─────────●                                        │
│   90%                              └───────●─────────●                       │
│   85%                                               └─────────●             │
│   80%                                                                        │
│                                                                              │
│         Seg       Ter       Qua       Qui       Sex       Sab               │
│                                                                              │
│  Legenda: ● SLA Cumprido   ─ ─ Meta (95%)                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Como Analisar

1. **Linha acima da meta**: Tudo bem, continue assim
2. **Linha na meta**: Atencao, margem pequena
3. **Linha abaixo da meta**: Problema, investigue as causas

### Trocando a Metrica do Grafico

Clique nos botoes acima do grafico para alternar entre:
- SLA Cumprido
- Tempo de Resposta
- Volume de Tickets
- Avaliacao Media

## Status da Equipe em Tempo Real

Esta secao mostra quem esta disponivel agora:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Status da Equipe                                          Atualizado agora │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Atendente        Status      Tickets    Tempo Online    Ultima Acao       │
│  ──────────────────────────────────────────────────────────────────────────  │
│   🟢 Maria Santos   Online       4/5       3h 25min       Respondeu #1234   │
│   🟢 Joao Costa     Online       3/5       2h 10min       Fechou #1230      │
│   🟡 Ana Lima       Almoco       2/5       4h 00min       Transferiu #1228  │
│   🟢 Pedro Silva    Online       5/5       1h 45min       Respondeu #1235   │
│   🔴 Carlos Souza   Offline      0/5       -              Saiu as 12:00     │
│                                                                              │
│  Resumo: 3 online | 1 away | 1 offline                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Significado dos Status

| Icone | Status | Significado |
|-------|--------|-------------|
| 🟢 | Online | Atendente disponivel e ativo |
| 🟡 | Away/Almoco | Atendente temporariamente ausente |
| 🔴 | Offline | Atendente nao esta logado |
| 🟠 | Ocupado | Atendente no limite de tickets |

### Coluna Tickets

O formato **X/Y** significa:
- **X**: Tickets atribuidos atualmente
- **Y**: Limite maximo de tickets simultaneos

:::warning Atencao
Se um atendente esta com **5/5** (ou no limite), ele nao recebera novos tickets automaticamente. Considere redistribuir.
:::

## Tickets em Risco de SLA

Esta e uma das secoes mais importantes! Mostra tickets que estao proximos de violar o SLA:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ Tickets em Risco de SLA                                      [Ver Todos]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   🔴 CRITICO (menos de 5 minutos)                                           │
│  ──────────────────────────────────────────────────────────────────────────  │
│   #1234  |  Joao Silva  |  Suporte  |  2 min restantes  |  [Ver] [Assumir] │
│                                                                              │
│   🟠 URGENTE (menos de 15 minutos)                                          │
│  ──────────────────────────────────────────────────────────────────────────  │
│   #1230  |  Maria Santos |  Vendas  |  12 min restantes  |  [Ver] [Assumir]│
│   #1228  |  Pedro Costa  |  Suporte |  14 min restantes  |  [Ver] [Assumir]│
│                                                                              │
│   🟡 ATENCAO (menos de 30 minutos)                                          │
│  ──────────────────────────────────────────────────────────────────────────  │
│   #1225  |  Ana Lima    |  Vendas   |  25 min restantes  |  [Ver] [Assumir]│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Niveis de Alerta

| Nivel | Tempo Restante | Acao Recomendada |
|-------|----------------|------------------|
| 🔴 Critico | < 5 minutos | Intervir imediatamente |
| 🟠 Urgente | 5-15 minutos | Verificar e apoiar atendente |
| 🟡 Atencao | 15-30 minutos | Monitorar de perto |

### Acoes Rapidas

- **[Ver]**: Abre o ticket para visualizar a conversa
- **[Assumir]**: Transfere o ticket para voce

:::caution Agir Rapido
Tickets criticos devem ser tratados imediatamente. Cada minuto conta!
:::

## Ranking de Atendentes

Mostra o desempenho individual de cada atendente:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ranking de Atendentes (Hoje)                               Ordenar por: SLA│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Pos   Atendente       Tickets   SLA%    TMR      Avaliacao                │
│  ──────────────────────────────────────────────────────────────────────────  │
│   🥇 1  Maria Santos      45      98%    5 min      4.9/5                    │
│   🥈 2  Pedro Costa       38      95%    8 min      4.6/5                    │
│   🥉 3  Ana Lima          42      93%    10 min     4.5/5                    │
│      4  Carlos Souza      35      91%    12 min     4.8/5                    │
│      5  Joao Silva        40      89%    15 min     4.2/5                    │
│                                                                              │
│   Media da Equipe         40      93%    10 min     4.6/5                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Colunas do Ranking

| Coluna | Significado |
|--------|-------------|
| Pos | Posicao no ranking |
| Atendente | Nome do atendente |
| Tickets | Total de tickets atendidos no periodo |
| SLA% | Percentual de cumprimento do SLA |
| TMR | Tempo Medio de Resposta |
| Avaliacao | Nota media dos clientes |

### Ordenando o Ranking

Clique no cabecalho da coluna para ordenar por aquele criterio.

## Distribuicao por Status

Grafico que mostra como os tickets estao distribuidos:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Distribuicao de Tickets por Status                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Pendentes      ████████████░░░░░░░░  45  (28%)                           │
│   Em Atendimento █████████████████░░░  78  (49%)                           │
│   Aguardando     ████░░░░░░░░░░░░░░░░  15  (9%)                            │
│   Resolvidos     ████████████████████  20  (13%)                           │
│   Fechados       ██░░░░░░░░░░░░░░░░░░   2  (1%)                            │
│                                                                              │
│   Total: 160 tickets                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Significado de Cada Status

| Status | Descricao | Acao |
|--------|-----------|------|
| Pendentes | Aguardando primeiro atendimento | Distribuir para atendentes |
| Em Atendimento | Sendo atendidos agora | Monitorar tempo |
| Aguardando | Esperando resposta do cliente | Verificar se cliente respondeu |
| Resolvidos | Problema solucionado | Verificar satisfacao |
| Fechados | Ticket finalizado | Nenhuma acao necessaria |

## Atualizacao dos Dados

O dashboard atualiza automaticamente a cada 30 segundos. Voce tambem pode:

1. **Atualizar manualmente**: Clique no botao 🔄 no canto superior direito
2. **Pausar atualizacao**: Util quando estiver analisando dados especificos

## Exportando Dados do Dashboard

Para exportar os dados visualizados:

1. Clique no botao **Exportar** (canto superior direito)
2. Escolha o formato:
   - **PDF**: Relatorio visual para apresentacoes
   - **Excel**: Dados em planilha para analise
   - **CSV**: Dados brutos

## Dicas de Uso do Dashboard

:::tip Rotina de Monitoramento
Mantenha o dashboard aberto em uma aba do navegador e verifique a cada 15-30 minutos.
:::

:::tip Use os Filtros
Analise departamentos especificos para identificar problemas localizados.
:::

:::tip Compare Periodos
Use o filtro de periodo para comparar desempenho entre dias ou semanas.
:::

:::caution Numeros Baixos
Se os numeros parecem estranhos (muito baixos), verifique se nao ha filtros ativos que estejam limitando os dados.
:::

## Perguntas Frequentes

### O dashboard nao esta atualizando. O que fazer?
1. Verifique sua conexao com a internet
2. Clique no botao de atualizar manualmente 🔄
3. Se persistir, tente recarregar a pagina (F5)

### Posso ver dados de meses anteriores?
Sim, use o filtro de periodo e selecione "Personalizado" para escolher datas especificas.

### Os dados do ranking sao confiaveis?
Sim, os dados sao calculados em tempo real com base nas acoes registradas no sistema.

## Proximos Passos

Agora que voce domina o dashboard, aprenda a:

- **[Gerenciar sua Equipe](/treinamento/supervisor/gestao-equipe)** - Monitorar e apoiar atendentes
- **[Entender o SLA](/treinamento/supervisor/sla-qualidade)** - Garantir qualidade no atendimento
- **[Gerar Relatorios](/treinamento/supervisor/relatorios)** - Criar analises detalhadas
