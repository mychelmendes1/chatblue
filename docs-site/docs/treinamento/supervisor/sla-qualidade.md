---
sidebar_position: 4
title: SLA e Qualidade
description: Entenda o sistema de SLA e como garantir a qualidade do atendimento
---

# SLA e Qualidade

O SLA (Service Level Agreement - Acordo de Nivel de Servico) define os prazos que sua equipe deve cumprir para garantir um atendimento de qualidade. Este guia explica como monitorar e garantir o cumprimento do SLA.

## O Que e SLA?

SLA e um acordo que define o tempo maximo para realizar determinadas acoes no atendimento. No ChatBlue, trabalhamos com dois tipos principais:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Tipos de SLA no ChatBlue                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TEMPO DE PRIMEIRA RESPOSTA (TPR)                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Cliente          Ticket           Atendente                                │
│  Envia            Criado           Responde                                 │
│  Mensagem                                                                   │
│                                                                              │
│     │               │                 │                                     │
│     ▼               ▼                 ▼                                     │
│  ───●───────────────●─────────────────●─────────────────────────────►      │
│     │               │                 │                          Tempo      │
│     │◄─────────────────────────────────►│                                    │
│            TEMPO DE PRIMEIRA RESPOSTA                                       │
│                  (Ex: 15 minutos)                                           │
│                                                                              │
│                                                                              │
│  TEMPO DE RESOLUCAO (TR)                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Ticket           Interacoes                          Ticket                │
│  Criado                                               Resolvido             │
│                                                                              │
│     │               │ │ │ │ │                            │                  │
│     ▼               ▼ ▼ ▼ ▼ ▼                            ▼                  │
│  ───●───────────────●─●─●─●─●────────────────────────────●───────────►      │
│     │                                                    │       Tempo      │
│     │◄──────────────────────────────────────────────────►│                  │
│                   TEMPO DE RESOLUCAO                                        │
│                    (Ex: 4 horas)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Definicoes Importantes

| Termo | Significado |
|-------|-------------|
| **TPR** (Tempo de Primeira Resposta) | Tempo ate o primeiro contato com o cliente |
| **TR** (Tempo de Resolucao) | Tempo total ate resolver o problema |
| **Horario Comercial** | Periodo em que o SLA e contabilizado |
| **SLA Cumprido** | Quando o prazo foi respeitado |
| **Violacao de SLA** | Quando o prazo foi excedido |

## Como o SLA e Calculado

### Horario Comercial

O SLA so conta durante o horario comercial configurado:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Exemplo de Horario Comercial                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Segunda a Sexta: 08:00 - 18:00 (10 horas uteis)                           │
│  Sabado: 08:00 - 12:00 (4 horas uteis)                                     │
│  Domingo: FECHADO                                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Exemplo pratico:                                                           │
│                                                                              │
│  Ticket criado: Sexta-feira as 17:30                                       │
│  SLA de primeira resposta: 2 horas                                         │
│                                                                              │
│  Calculo:                                                                   │
│  - Sexta 17:30 a 18:00 = 30 min (horario comercial)                        │
│  - Sabado 08:00 a 09:30 = 1h 30 min (para completar 2h)                    │
│                                                                              │
│  Deadline: Sabado 09:30                                                     │
│                                                                              │
│  (Noite de sexta e domingo nao contam!)                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### SLA por Prioridade

Diferentes prioridades podem ter diferentes prazos:

| Prioridade | Primeira Resposta | Resolucao |
|------------|-------------------|-----------|
| 🔴 Urgente | 5 minutos | 1 hora |
| 🟠 Alta | 15 minutos | 2 horas |
| 🟡 Media | 30 minutos | 4 horas |
| 🟢 Baixa | 60 minutos | 8 horas |

:::info Configuracao do Administrador
Os prazos de SLA sao configurados pelo administrador do sistema. Se achar que os prazos estao inadequados, converse com ele.
:::

## Monitorando o SLA

### Tela de Tickets em Risco

Acesse: **Dashboard > Tickets em Risco**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Tickets em Risco de SLA                                   Atualizado agora │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Filtros: [Todos ▼]  [Todos os atendentes ▼]  [Todas as prioridades ▼]     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  🔴 CRITICO - Menos de 5 minutos para estourar                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ #1234 | Joao Silva | Problema pagamento                             │   │
│  │ Atendente: Maria Santos | Prioridade: Alta | TPR: 15 min           │   │
│  │ ⏱️ 3 minutos restantes                                              │   │
│  │ [Ver Ticket] [Assumir] [Transferir]                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  🟠 URGENTE - Entre 5 e 15 minutos                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ #1235 | Maria Costa | Duvida sobre produto                          │   │
│  │ Atendente: Joao Costa | Prioridade: Media | TPR: 30 min            │   │
│  │ ⏱️ 12 minutos restantes                                             │   │
│  │ [Ver Ticket] [Assumir] [Transferir]                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ #1236 | Pedro Santos | Reclamacao entrega                           │   │
│  │ Atendente: Ana Lima | Prioridade: Alta | TPR: 15 min               │   │
│  │ ⏱️ 8 minutos restantes                                              │   │
│  │ [Ver Ticket] [Assumir] [Transferir]                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  🟡 ATENCAO - Entre 15 e 30 minutos                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  (3 tickets nesta categoria)                                      [Expandir]│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Indicadores de SLA no Ticket

Cada ticket mostra seu status de SLA:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Status de SLA do Ticket                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🟢 SLA OK                                                                  │
│  ──────────────────                                                         │
│  Ticket dentro do prazo                                                     │
│  Tempo restante confortavel                                                 │
│                                                                              │
│  🟡 SLA EM RISCO                                                            │
│  ──────────────────                                                         │
│  Menos de 50% do tempo restante                                             │
│  Precisa de atencao                                                         │
│                                                                              │
│  🟠 SLA URGENTE                                                             │
│  ──────────────────                                                         │
│  Menos de 20% do tempo restante                                             │
│  Acao imediata necessaria                                                   │
│                                                                              │
│  🔴 SLA VIOLADO                                                             │
│  ──────────────────                                                         │
│  Prazo estourado                                                            │
│  Registrar motivo e resolver o mais rapido possivel                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Alertas de SLA

O sistema envia alertas automaticos conforme o prazo se aproxima:

### Tipos de Alertas

| Alerta | Quando | Para Quem | Acao |
|--------|--------|-----------|------|
| **Aviso** | 50% do tempo | Atendente | Priorizar o ticket |
| **Urgente** | 20% do tempo | Atendente + Supervisor | Verificar e apoiar |
| **Critico** | 5% do tempo | Todos | Intervencao imediata |
| **Violado** | Prazo estourado | Todos + Registro | Documentar e resolver |

### Configurando suas Notificacoes

1. Clique no seu perfil (canto superior direito)
2. Acesse **Configuracoes > Notificacoes**
3. Configure os alertas de SLA:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configuracoes de Notificacao - SLA                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Receber alertas de SLA:                                                    │
│                                                                              │
│  [x] Alertas de AVISO (50% do tempo)                                       │
│  [x] Alertas URGENTES (20% do tempo)                                       │
│  [x] Alertas CRITICOS (5% do tempo)                                        │
│  [x] Notificar violacoes de SLA                                            │
│                                                                              │
│  Forma de notificacao:                                                      │
│                                                                              │
│  [x] Notificacao no sistema (sino)                                         │
│  [x] Notificacao sonora                                                    │
│  [x] Email (apenas criticos e violacoes)                                   │
│  [ ] Push no celular                                                        │
│                                                                              │
│                                                 [Salvar]                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Lidando com Violacoes de SLA

Quando um SLA e violado, siga estes passos:

### Passo 1: Identificar a Violacao

1. Voce recebera uma notificacao
2. Acesse o ticket imediatamente
3. Verifique o historico

### Passo 2: Resolver o Mais Rapido Possivel

1. Se possivel, assuma o ticket ou reforce o atendente
2. Priorize a resolucao
3. Mantenha o cliente informado

### Passo 3: Registrar o Motivo

Apos resolver, registre o motivo da violacao:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Registrar Violacao de SLA - Ticket #1234                          [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Informacoes da Violacao:                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Tipo: Tempo de Primeira Resposta                                          │
│  Prazo: 15 minutos                                                         │
│  Tempo real: 22 minutos                                                    │
│  Excesso: 7 minutos                                                        │
│                                                                              │
│  Motivo da violacao:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ( ) Alta demanda - Muitos tickets simultaneos                       │   │
│  │ ( ) Problema tecnico - Sistema lento/fora do ar                     │   │
│  │ ( ) Ausencia do atendente - Falta/intervalo                         │   │
│  │ ( ) Complexidade do caso - Precisou de pesquisa                     │   │
│  │ (●) Outro (especificar abaixo)                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Descricao detalhada:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ O atendente Maria estava em reuniao de equipe quando o ticket      │   │
│  │ entrou. A reuniao durou mais que o previsto.                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Acao corretiva:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Ajustar horario de reunioes para nao coincidir com horario de pico │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                               [Cancelar]  [Registrar]      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Passo 4: Analisar Tendencias

Periodicamente, analise as violacoes para identificar padroes:

- Sempre no mesmo horario?
- Sempre com o mesmo atendente?
- Sempre o mesmo tipo de ticket?

## Garantindo Qualidade no Atendimento

Alem do SLA, voce deve monitorar a qualidade geral do atendimento.

### Indicadores de Qualidade

| Indicador | O Que Mede | Meta |
|-----------|------------|------|
| **Avaliacao do Cliente** | Satisfacao pos-atendimento | > 4.5/5 |
| **Resolucao no Primeiro Contato** | Eficiencia do atendimento | > 70% |
| **Taxa de Reaberturas** | Resolucao definitiva | < 5% |
| **Taxa de Transferencias** | Direcionamento correto | < 10% |

### Acompanhando Avaliacoes

Os clientes podem avaliar o atendimento ao final:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Avaliacoes Recentes                                          [Ver Todas]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ★★★★★ (5/5) - Ticket #1230                                                │
│  Atendente: Maria Santos                                                    │
│  "Otimo atendimento! Resolveu meu problema rapidamente."                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ★★★★☆ (4/5) - Ticket #1228                                                │
│  Atendente: Joao Costa                                                      │
│  "Bom atendimento, mas demorou um pouco para responder."                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ★★☆☆☆ (2/5) - Ticket #1225                                                │
│  Atendente: Ana Lima                                                        │
│  "Nao resolveram meu problema."                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ⚠️ Avaliacoes negativas devem ser investigadas                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Investigando Avaliacoes Negativas

Quando um cliente da nota baixa:

1. Acesse o ticket e leia a conversa
2. Identifique o que pode ter causado insatisfacao
3. Se necessario, contate o cliente para remediar
4. Faca feedback com o atendente

## Leitura de Relatorios de SLA

### Relatorio de Cumprimento

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Relatorio de SLA - Janeiro 2024                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Resumo Geral                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Total de tickets: 1.250                                                    │
│  SLA cumprido: 1.188 (95.0%)                                               │
│  SLA violado: 62 (5.0%)                                                    │
│                                                                              │
│  Por Tipo de SLA:                                                           │
│  - Primeira Resposta: 96.5% cumprido                                       │
│  - Resolucao: 93.5% cumprido                                               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Detalhamento de Violacoes (62 tickets)                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Por Motivo:                          Por Departamento:                     │
│  ┌────────────────────────────┐      ┌────────────────────────────┐        │
│  │ Alta demanda      40 (65%) │      │ Suporte        35 (56%)    │        │
│  │ Problema tecnico  12 (19%) │      │ Vendas         18 (29%)    │        │
│  │ Ausencia          6 (10%)  │      │ Financeiro     9 (15%)     │        │
│  │ Outros            4 (6%)   │      └────────────────────────────┘        │
│  └────────────────────────────┘                                             │
│                                                                              │
│  Por Atendente:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Atendente       Tickets   SLA%    Violacoes                         │   │
│  │ Maria Santos     250      98%     5                                 │   │
│  │ Joao Costa       245      96%     10                                │   │
│  │ Ana Lima         240      94%     14                                │   │
│  │ Pedro Silva      235      92%     18                                │   │
│  │ Carlos Souza     230      93%     15                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### O Que Observar no Relatorio

1. **Tendencia**: O SLA esta melhorando ou piorando?
2. **Concentracao**: As violacoes sao de muitos ou poucos atendentes?
3. **Motivos**: Qual a principal causa das violacoes?
4. **Horarios**: Ha horarios com mais violacoes?

## Dicas para Manter o SLA em Dia

:::tip Monitore Constantemente
Verifique o dashboard a cada 15-30 minutos. Problemas identificados cedo sao mais faceis de resolver.
:::

:::tip Redistribua Rapidamente
Se um atendente esta sobrecarregado, redistribua tickets antes que o SLA seja violado.
:::

:::tip Priorize Tickets Urgentes
Tickets com prioridade alta devem ser atendidos primeiro.
:::

:::tip Comunique-se com a Equipe
Avise a equipe sobre picos de demanda e ajuste a distribuicao.
:::

:::caution Nao Deixe Acumular
Tickets pendentes acumulados sao a principal causa de violacoes de SLA.
:::

## Perguntas Frequentes

### Por que o SLA nao esta contando durante a noite?
O SLA respeita o horario comercial configurado. Noites e fins de semana (conforme configuracao) nao sao contabilizados.

### O cliente pediu para aguardar. O SLA pausa?
Depende da configuracao. Geralmente, quando o ticket esta "Aguardando Cliente", o SLA de resolucao pode pausar. Confirme com seu administrador.

### E possivel alterar a prioridade de um ticket?
Sim, voce pode alterar a prioridade, o que ajustara os prazos de SLA. Use com responsabilidade.

### O que acontece se violarmos muito o SLA?
Alem de afetar a satisfacao dos clientes, isso pode impactar metricas da empresa e indicadores de desempenho individual.

## Proximos Passos

Continue aprendendo:

- **[Relatorios](/treinamento/supervisor/relatorios)** - Gere e analise relatorios detalhados
