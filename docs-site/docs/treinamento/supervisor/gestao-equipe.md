---
sidebar_position: 3
title: Gestao de Equipe
description: Aprenda a monitorar, apoiar e gerenciar sua equipe de atendentes
---

# Gestao de Equipe

Como supervisor, uma das suas principais responsabilidades e garantir que sua equipe esteja trabalhando de forma eficiente e que os clientes sejam bem atendidos. Este guia ensina como monitorar e apoiar seus atendentes.

## Acessando a Tela de Equipe

1. Faca login no ChatBlue
2. Clique em **Equipe** no menu lateral
3. Voce vera o painel de monitoramento da equipe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Gestao de Equipe                                            [Atualizar 🔄] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Resumo: 5 atendentes | 3 online | 1 away | 1 offline               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  [Todos ▼]  [Online ▼]  [Buscar atendente...]                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Visualizando Status dos Atendentes

A lista de atendentes mostra informacoes essenciais de cada membro da equipe:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Lista de Atendentes                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🟢 Maria Santos                                            [Detalhes]│   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  Status: Online         Departamento: Suporte                        │   │
│  │  Tickets: 4/5           Tempo Online: 3h 25min                       │   │
│  │  SLA Hoje: 98%          Avaliacao: 4.9/5                            │   │
│  │                                                                      │   │
│  │  Ultimo ticket: #1234 - "Problema com pagamento" - 5 min atras      │   │
│  │                                                                      │   │
│  │  [Ver Tickets]  [Enviar Mensagem]  [Transferir Tickets]             │   │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🟡 Joao Costa                                              [Detalhes]│   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  Status: Almoco (volta as 13:00)   Departamento: Vendas              │   │
│  │  Tickets: 2/5           Tempo Online: 4h 00min                       │   │
│  │  SLA Hoje: 95%          Avaliacao: 4.6/5                            │   │
│  │                                                                      │   │
│  │  Ultimo ticket: #1230 - "Duvida sobre produto" - 45 min atras       │   │
│  │                                                                      │   │
│  │  [Ver Tickets]  [Enviar Mensagem]  [Transferir Tickets]             │   │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  🔴 Pedro Silva                                             [Detalhes]│   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  Status: Offline (saiu as 18:00 ontem)   Departamento: Suporte       │   │
│  │  Tickets: 0/5           Proximo turno: Hoje 08:00                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Informacoes Disponiveis

| Campo | Descricao |
|-------|-----------|
| Status | Online, Away (com motivo), Offline |
| Departamento | Setor onde o atendente trabalha |
| Tickets | Quantidade atual / Limite maximo |
| Tempo Online | Ha quanto tempo esta logado |
| SLA Hoje | Percentual de SLA cumprido no dia |
| Avaliacao | Nota media recebida dos clientes |
| Ultimo Ticket | Informacao do ultimo atendimento |

## Monitorando a Carga de Trabalho

### Identificando Sobrecarga

Um atendente pode estar sobrecarregado quando:

1. **Tickets no limite**: 5/5 ou proximo do limite
2. **Tempo de resposta aumentando**: Demora para responder
3. **Muitos tickets em risco**: SLA proximo de estourar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ Alertas de Sobrecarga                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🔴 Maria Santos esta no limite de tickets (5/5)                            │
│     Recomendacao: Redistribuir pelo menos 1 ticket                          │
│     [Redistribuir Agora]                                                    │
│                                                                              │
│  🟠 Ana Lima tem 3 tickets em risco de SLA                                  │
│     Recomendacao: Verificar se precisa de ajuda                             │
│     [Ver Tickets em Risco]                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Verificando Tickets de um Atendente

Para ver todos os tickets de um atendente especifico:

1. Encontre o atendente na lista
2. Clique em **[Ver Tickets]**
3. Uma lista detalhada sera exibida:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Tickets de Maria Santos                                           [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   #      Cliente          Status          Tempo      SLA        Acoes       │
│  ──────────────────────────────────────────────────────────────────────────  │
│  1234   Joao Silva       Em atendimento   15 min   🟢 OK      [Ver][Trans.] │
│  1235   Maria Costa      Em atendimento   10 min   🟢 OK      [Ver][Trans.] │
│  1236   Pedro Santos     Aguardando       1h 20min 🟡 Risco   [Ver][Trans.] │
│  1237   Ana Oliveira     Em atendimento   5 min    🟢 OK      [Ver][Trans.] │
│  1238   Carlos Lima      Em atendimento   2 min    🟢 OK      [Ver][Trans.] │
│                                                                              │
│  Total: 5 tickets | 4 em atendimento | 1 aguardando cliente                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Redistribuindo Tickets

Quando um atendente esta sobrecarregado ou precisa sair, voce pode redistribuir seus tickets.

### Passo a Passo para Transferir um Ticket

1. Localize o ticket que deseja transferir
2. Clique no botao **[Transferir]** ou **[Trans.]**
3. Selecione o destino:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Transferir Ticket #1234                                           [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ticket: #1234 - "Problema com pagamento"                                   │
│  Cliente: Joao Silva                                                        │
│  Atendente atual: Maria Santos                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Transferir para:                                                           │
│                                                                              │
│  ( ) Atendente especifico:                                                  │
│      [Selecione um atendente ▼]                                            │
│      ┌─────────────────────────────────────────────────────────────────┐   │
│      │ 🟢 Joao Costa (2/5 tickets) - Vendas                            │   │
│      │ 🟢 Ana Lima (3/5 tickets) - Suporte                             │   │
│      │ 🟢 Pedro Silva (1/5 tickets) - Suporte ◄── Recomendado          │   │
│      └─────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ( ) Departamento (fila automatica):                                        │
│      [Selecione um departamento ▼]                                         │
│                                                                              │
│  ( ) Para mim (assumir ticket)                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Motivo da transferencia (opcional):                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Redistribuicao de carga - Maria no limite                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [ ] Notificar cliente sobre a transferencia                                │
│                                                                              │
│                              [Cancelar]  [Transferir]                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Opcoes de Transferencia

| Opcao | Quando Usar |
|-------|-------------|
| **Atendente especifico** | Quando sabe quem pode assumir |
| **Departamento** | Quando qualquer um do setor pode atender |
| **Para mim** | Quando voce mesmo vai resolver |

:::tip Dica de Transferencia
O sistema sugere atendentes com menor carga de trabalho. De preferencia a essas sugestoes.
:::

### Transferindo Multiplos Tickets

Para redistribuir varios tickets de uma vez:

1. Clique em **[Transferir Tickets]** no card do atendente
2. Selecione os tickets que deseja transferir
3. Escolha o destino
4. Confirme a transferencia

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Transferir Multiplos Tickets - Maria Santos                       [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Selecione os tickets para transferir:                                      │
│                                                                              │
│  [x] #1234 - Joao Silva - "Problema com pagamento"                         │
│  [x] #1235 - Maria Costa - "Duvida sobre produto"                          │
│  [ ] #1236 - Pedro Santos - "Reclamacao de entrega"                        │
│  [x] #1237 - Ana Oliveira - "Cancelamento de pedido"                       │
│  [ ] #1238 - Carlos Lima - "Informacoes de garantia"                       │
│                                                                              │
│  Selecionados: 3 tickets                                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Transferir todos para:                                                     │
│  [Pedro Silva (1/5 tickets) ▼]                                             │
│                                                                              │
│                              [Cancelar]  [Transferir 3 Tickets]            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Assistindo Atendentes em Casos Dificeis

### Visualizando uma Conversa

Para acompanhar um atendimento em tempo real:

1. Clique em **[Ver]** no ticket desejado
2. A conversa sera exibida em modo de visualizacao
3. Voce pode ler todas as mensagens sem interferir

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ticket #1234 - Joao Silva                   [Modo: Visualizacao] [Assumir] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Atendente: Maria Santos    Status: Em atendimento    Tempo: 15 min         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [14:30] Joao Silva:                                                        │
│  Boa tarde, fiz um pagamento ontem mas ainda nao foi confirmado             │
│                                                                              │
│  [14:31] Maria Santos:                                                      │
│  Ola Joao! Vou verificar isso para voce. Pode me informar o numero do      │
│  pedido?                                                                    │
│                                                                              │
│  [14:32] Joao Silva:                                                        │
│  Pedido #98765                                                              │
│                                                                              │
│  [14:35] Maria Santos:                                                      │
│  Encontrei seu pedido. O pagamento foi via boleto e pode levar ate 3 dias  │
│  uteis para confirmar. O boleto foi pago ontem?                            │
│                                                                              │
│  [14:36] Joao Silva:                                                        │
│  Sim, paguei ontem de manha. Mas preciso do produto urgente!               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [Enviar Mensagem Interna para Maria]  [Assumir Ticket]  [Intervir]        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Enviando Mensagem Interna

Voce pode enviar uma mensagem privada para o atendente (o cliente nao ve):

1. Clique em **[Enviar Mensagem Interna para Maria]**
2. Digite sua orientacao
3. Envie

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Mensagem Interna para Maria Santos                                [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Esta mensagem so sera vista por Maria, nao pelo cliente.                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Maria, podemos liberar esse pedido manualmente. Peca o comprovante │   │
│  │ de pagamento e envie para o financeiro validar.                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                               [Cancelar]  [Enviar]         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Intervindo no Atendimento

Em casos criticos, voce pode enviar uma mensagem diretamente ao cliente:

1. Clique em **[Intervir]**
2. Digite a mensagem
3. A mensagem sera enviada em nome do atendente ou identificada como supervisor

:::warning Cuidado ao Intervir
Intervir diretamente pode confundir o cliente. Use apenas quando realmente necessario.
:::

### Assumindo um Ticket

Para assumir um ticket completamente:

1. Clique em **[Assumir Ticket]**
2. Confirme a acao
3. O ticket sera transferido para voce

## Monitoramento de Desempenho Individual

### Acessando Metricas do Atendente

1. Clique em **[Detalhes]** no card do atendente
2. Veja as metricas completas:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Perfil: Maria Santos                                              [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Informacoes Gerais                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Nome: Maria Santos                                                         │
│  Email: maria@empresa.com                                                   │
│  Departamento: Suporte                                                      │
│  Status atual: 🟢 Online (3h 25min)                                        │
│                                                                              │
│  Metricas de Hoje                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Tickets      │  │ SLA          │  │ TMR          │  │ Avaliacao    │    │
│  │ Atendidos    │  │ Cumprido     │  │              │  │              │    │
│  │     12       │  │    98%       │  │   5 min      │  │   4.9/5      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  Metricas do Mes                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Total de tickets: 245        SLA geral: 96%                               │
│  Tempo medio resposta: 6 min  Avaliacao media: 4.8/5                       │
│  Tickets resolvidos: 238      Tickets transferidos: 7                      │
│                                                                              │
│  Historico de SLA (ultimos 7 dias)                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  100% ─────●─────●─────●─────●─────●─────●─────●                           │
│   95% ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                           │
│   90%                                                                        │
│        Seg   Ter   Qua   Qui   Sex   Sab   Dom                             │
│                                                                              │
│                              [Ver Relatorio Completo]                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Indicadores de Atencao

Fique atento a estes sinais:

| Indicador | Problema Potencial | Acao |
|-----------|-------------------|------|
| SLA abaixo de 90% | Atendente lento ou sobrecarregado | Conversar e apoiar |
| TMR acima de 15 min | Demora nas respostas | Verificar dificuldades |
| Avaliacao abaixo de 4.0 | Qualidade do atendimento | Treinar e acompanhar |
| Muitas transferencias | Pode nao saber resolver | Capacitar |

## Comunicacao com a Equipe

### Chat Interno

O ChatBlue possui um chat interno para comunicacao rapida:

1. Clique em **[Enviar Mensagem]** no card do atendente
2. Digite sua mensagem
3. O atendente recebera uma notificacao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Chat com Maria Santos                                             [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Hoje 14:00] Voce:                                                         │
│  Maria, esta tudo bem com os atendimentos?                                  │
│                                                                              │
│  [Hoje 14:02] Maria:                                                        │
│  Sim, tranquilo! So o ticket #1234 que esta um pouco complexo.             │
│                                                                              │
│  [Hoje 14:03] Voce:                                                         │
│  Vi aqui. Qualquer coisa me chama que ajudo.                               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Digite sua mensagem...                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                         [Enviar]           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mensagem para Toda a Equipe

Para enviar uma mensagem para todos os atendentes online:

1. Clique em **[Mensagem para Equipe]** no topo da pagina
2. Digite o aviso ou informacao
3. Todos os atendentes online receberao

## Gerenciando Ausencias

### Quando um Atendente Precisa Sair

1. O atendente deve alterar seu status para "Away" ou "Offline"
2. Verifique os tickets que ele possui
3. Decida se:
   - Os tickets podem aguardar o retorno
   - Os tickets devem ser redistribuidos

### Cobrindo Faltas

Se um atendente faltou:

1. Verifique se ele tem tickets pendentes
2. Redistribua os tickets entre os atendentes disponiveis
3. Ajuste a distribuicao automatica se necessario

## Boas Praticas de Gestao

:::tip Equilibre a Carga
Nao sobrecarregue sempre os mesmos atendentes. Distribua de forma equilibrada.
:::

:::tip Reconheca o Bom Trabalho
Quando um atendente tiver bom desempenho, reconheca e elogie.
:::

:::tip Identifique Padroes
Se um atendente sempre tem problemas com certo tipo de atendimento, considere treinamento especifico.
:::

:::caution Nao Microgerencie
Confie na sua equipe. Monitore, mas nao fique em cima de cada atendimento.
:::

## Perguntas Frequentes

### Como sei se um atendente precisa de ajuda?
Observe: tempo de resposta aumentando, tickets em risco de SLA, ou o proprio atendente pode solicitar ajuda.

### Posso ver a conversa sem o atendente saber?
Sim, o modo de visualizacao e discreto. Mas e etico informar sua equipe que supervisores podem acompanhar atendimentos.

### O que fazer se todos estiverem sobrecarregados?
Considere assumir alguns tickets voce mesmo, ou reporte ao administrador a necessidade de mais atendentes.

## Proximos Passos

Continue aprendendo:

- **[SLA e Qualidade](/treinamento/supervisor/sla-qualidade)** - Garanta o cumprimento dos prazos
- **[Relatorios](/treinamento/supervisor/relatorios)** - Analise o desempenho da equipe
