---
sidebar_position: 4
title: Gerenciando Tickets
description: Aprenda a gerenciar atendimentos do inicio ao fim
---

# Gerenciando Tickets

Um ticket representa uma conversa/atendimento com um cliente. Neste capitulo, voce aprendera a gerenciar tickets de forma eficiente.

## O Que e um Ticket?

Um ticket e criado automaticamente quando:
- Um cliente envia a primeira mensagem
- Um atendente cria manualmente
- A IA inicia uma conversa

Cada ticket possui:
- **Protocolo**: Numero unico (ex: #2024-0001)
- **Status**: Fase atual do atendimento
- **Prioridade**: Nivel de urgencia
- **Responsavel**: Quem esta atendendo
- **Departamento**: Area responsavel
- **SLA**: Prazo para resposta/resolucao

---

## Ciclo de Vida do Ticket

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PENDENTE  │───►│ EM ATENDIM. │───►│  AGUARDANDO │───►│  RESOLVIDO  │
│   (Novo)    │    │  (Seu)      │    │  (Cliente)  │    │ (Concluido) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       │                  │                  │                  ▼
       │                  │                  │           ┌─────────────┐
       │                  └──────────────────┼──────────►│   FECHADO   │
       │                                     │           │ (Arquivado) │
       └─────────────────────────────────────┘           └─────────────┘
```

### Status Detalhados

| Status | Cor | Descricao | Acao Esperada |
|--------|-----|-----------|---------------|
| **Pendente** | 🟡 | Novo, aguardando atendente | Assumir o ticket |
| **Em Atendimento** | 🔵 | Voce esta atendendo | Resolver ou transferir |
| **Aguardando** | 🟠 | Esperando resposta do cliente | Aguardar ou follow-up |
| **Resolvido** | 🟢 | Problema solucionado | Cliente pode reabrir |
| **Fechado** | ⚫ | Atendimento encerrado | Arquivo permanente |

---

## Assumindo um Ticket

### Da Fila de Espera

1. Va para a aba **"Fila"**
2. Veja os tickets disponiveis
3. Clique no ticket para visualizar
4. Leia o historico da conversa
5. Clique em **"Assumir Atendimento"**

```
┌─────────────────────────────────────────────────────────────────┐
│                    🎫 TICKET #2024-0042                          │
│                                                                  │
│  Cliente: Maria Silva                                            │
│  Aguardando ha: 5 minutos                                        │
│  SLA: ⏱️ 10:00 restantes                                         │
│                                                                  │
│  Ultima mensagem:                                                │
│  "Ola, preciso de ajuda com meu pedido"                          │
│                                                                  │
│              [👁️ Visualizar]  [✋ Assumir Atendimento]            │
└─────────────────────────────────────────────────────────────────┘
```

### Atribuicao Automatica

Dependendo da configuracao do sistema:
- Tickets podem ser atribuidos automaticamente
- Distribuicao por departamento
- Balanceamento por carga de trabalho

:::info Limite de Tickets
Voce pode ter um limite maximo de tickets simultaneos. Resolva os atuais antes de pegar novos.
:::

---

## Trabalhando no Ticket

### Painel de Acoes

```
┌─────────────────────────────────────────────┐
│  [⬆️ Prioridade] [↗️ Transferir] [✅ Resolver] │
│  [📝 Nota] [🏷️ Tags] [⋮ Mais]                │
└─────────────────────────────────────────────┘
```

### Alterar Prioridade

Quando o assunto e urgente:

1. Clique em **"Prioridade"**
2. Selecione o nivel adequado

| Prioridade | Quando usar |
|------------|-------------|
| **Baixa** | Duvidas gerais, sem urgencia |
| **Normal** | Maioria dos atendimentos |
| **Alta** | Problema afetando o cliente |
| **Urgente** | Situacao critica, precisa resolver agora |

:::tip Quando Priorizar
- Cliente VIP
- Problema grave
- Reclamacao
- SLA proximo de estourar

:::

### Adicionar Tags

Tags ajudam a categorizar o atendimento:

1. Clique em **"Tags"**
2. Selecione tags existentes ou crie novas
3. Salve

**Exemplos de tags:**
- `Reclamacao`
- `Duvida`
- `Pedido`
- `Financeiro`
- `Tecnico`
- `VIP`
- `Retorno`

### Adicionar Notas Internas

Notas sao visiveis apenas para a equipe:

1. Clique em **"Nota"**
2. Escreva a informacao
3. Salve

**Use notas para:**
- Informacoes para o proximo atendente
- Detalhes da situacao
- Decisoes tomadas
- Alertas importantes

---

## Transferindo Tickets

### Quando Transferir

- O assunto nao e da sua area
- Voce nao tem permissao para resolver
- Outro atendente conhece melhor o caso
- Precisa de aprovacao de supervisor

### Para Outro Atendente

1. Clique em **"Transferir"**
2. Selecione **"Para Atendente"**
3. Escolha o atendente na lista
4. Escreva o motivo da transferencia
5. Confirme

```
┌─────────────────────────────────────────────┐
│         TRANSFERIR TICKET                    │
├─────────────────────────────────────────────┤
│  Tipo: ( ) Atendente  ( ) Departamento      │
│                                             │
│  Atendente: [▼ Selecione...]                │
│                                             │
│  Motivo:                                    │
│  ┌─────────────────────────────────────┐   │
│  │ Cliente precisa de suporte tecnico │   │
│  │ que esta fora da minha area.       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│         [Cancelar]  [Transferir]            │
└─────────────────────────────────────────────┘
```

### Para Outro Departamento

1. Clique em **"Transferir"**
2. Selecione **"Para Departamento"**
3. Escolha o departamento
4. Escreva o motivo
5. Confirme

:::warning Informe o Cliente
Sempre avise o cliente antes de transferir:
"Vou transferir voce para nossa equipe de [departamento] que podera ajudar melhor com essa questao."
:::

### Para a IA

Se a IA pode continuar o atendimento:

1. Clique em **"Mais"** (⋮)
2. Selecione **"Enviar para IA"**
3. Confirme

---

## Resolvendo Tickets

### Quando Resolver

- Todas as duvidas foram esclarecidas
- O problema foi solucionado
- O cliente confirmou que esta satisfeito
- Nao ha mais pendencias

### Como Resolver

1. Certifique-se de que o cliente esta satisfeito
2. Envie uma mensagem de encerramento
3. Clique em **"Resolver"**
4. Selecione o motivo da resolucao
5. Confirme

```
┌─────────────────────────────────────────────┐
│         RESOLVER TICKET                      │
├─────────────────────────────────────────────┤
│  Motivo da resolucao:                       │
│                                             │
│  ( ) Duvida esclarecida                     │
│  ( ) Problema resolvido                     │
│  ( ) Solicitacao atendida                   │
│  ( ) Cliente satisfeito                     │
│  ( ) Outro: _____________                   │
│                                             │
│         [Cancelar]  [Resolver]              │
└─────────────────────────────────────────────┘
```

### Mensagem de Encerramento

**Exemplo:**
```
Maria, foi um prazer ajudar voce hoje! 😊

Seu problema foi resolvido e seu pedido sera entregue amanha.

Se precisar de mais alguma coisa, e so nos chamar.

Tenha um otimo dia!
```

:::tip Peca Avaliacao
Antes de encerrar, pergunte:
"Nosso atendimento atendeu suas expectativas? Sua opiniao e muito importante para nos!"
:::

---

## Lidando com Situacoes Especiais

### Cliente Insatisfeito

1. **Mantenha a calma** - Nao leve para o pessoal
2. **Demonstre empatia** - "Entendo sua frustracao..."
3. **Assuma responsabilidade** - "Vamos resolver isso"
4. **Ofereca solucao** - Seja proativo
5. **Escale se necessario** - Chame o supervisor

**Exemplo:**
```
Entendo sua frustracao, Maria. Realmente esse atraso nao
deveria ter acontecido e peco desculpas pelo transtorno.

Vou verificar pessoalmente o status do seu pedido e te
retorno em 5 minutos com uma solucao, ok?
```

### Cliente Ausente

Se o cliente nao responde:

1. Aguarde um tempo razoavel (5-10 min)
2. Envie mensagem de follow-up
3. Se nao responder, mude para "Aguardando"
4. Apos 24h sem resposta, resolva o ticket

**Mensagem de follow-up:**
```
Ola Maria! Continuo aqui para ajudar.

Conseguiu verificar a informacao que precisava?
```

### Conversa Longa/Complexa

Para tickets com muitas mensagens:

1. Faca resumos periodicos
2. Use notas internas para documentar
3. Confirme entendimento com o cliente
4. Divida em etapas se necessario

### Assunto Fora do Horario

Se voce precisa encerrar o expediente:

1. Informe o cliente
2. Registre o status em nota
3. Transfira ou deixe na fila
4. Documente proximos passos

**Exemplo:**
```
Maria, nosso horario de atendimento esta encerrando.

Um colega vai continuar te ajudando amanha as 8h.

Deixei todas as informacoes registradas para que ele
possa dar continuidade sem voce precisar repetir nada.

Tenha uma boa noite!
```

---

## Metricas do Seu Atendimento

### O Que e Medido

| Metrica | O que significa |
|---------|-----------------|
| **Tempo de Resposta** | Quanto tempo leva para responder |
| **Tempo de Resolucao** | Quanto tempo para resolver o ticket |
| **Tickets/Dia** | Quantos tickets voce atende por dia |
| **Satisfacao** | Nota dada pelos clientes |
| **SLA** | Porcentagem dentro do prazo |

### Onde Ver Suas Metricas

1. Clique no seu avatar
2. Selecione **"Minhas Metricas"**
3. Veja seu desempenho

:::tip Melhore Suas Metricas
- Responda rapidamente a novas mensagens
- Resolva no primeiro contato quando possivel
- Seja claro para evitar idas e vindas
- Documente bem para transferencias suaves
:::

---

## Exercicios Praticos

### Exercicio 1: Ciclo Completo
1. Pegue um ticket da fila
2. Atenda o cliente
3. Adicione uma tag apropriada
4. Deixe uma nota interna
5. Resolva o ticket

### Exercicio 2: Transferencia
1. Simule uma situacao que precisa transferir
2. Transfira para outro departamento
3. Observe o registro da transferencia

### Exercicio 3: Prioridades
1. Identifique tickets de diferentes prioridades
2. Altere a prioridade de um ticket
3. Observe como isso afeta a ordenacao

---

## Checklist do Atendimento

Antes de resolver um ticket, verifique:

- [ ] Li todo o historico da conversa
- [ ] Respondi todas as perguntas do cliente
- [ ] O cliente confirmou que esta satisfeito
- [ ] Adicionei tags relevantes
- [ ] Deixei notas para referencia futura
- [ ] Enviei mensagem de encerramento
- [ ] Selecionei o motivo correto da resolucao

---

## Proximo Passo

Agora que voce domina o gerenciamento de tickets, vamos aprender sobre a Inteligencia Artificial:

**[Trabalhando com a IA →](/treinamento/atendente/trabalhando-com-ia)**
