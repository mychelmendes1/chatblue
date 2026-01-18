---
sidebar_position: 5
title: Trabalhando com a IA
description: Como colaborar com a Inteligencia Artificial no atendimento
---

# Trabalhando com a IA

O ChatBlue conta com Inteligencia Artificial para ajudar no atendimento. Neste capitulo, voce aprendera a trabalhar em conjunto com a IA.

## O Que a IA Faz?

A IA do ChatBlue pode:

- ✅ Responder perguntas frequentes
- ✅ Coletar informacoes iniciais do cliente
- ✅ Fornecer informacoes sobre produtos/servicos
- ✅ Identificar quando precisa de humano
- ✅ Atender fora do horario comercial
- ✅ Transcrever mensagens de audio

A IA **NÃO** pode:

- ❌ Fazer negociacoes complexas
- ❌ Lidar com reclamacoes graves
- ❌ Acessar sistemas externos (em geral)
- ❌ Tomar decisoes que fogem das regras

---

## Identificando Atendimentos da IA

### Na Lista de Conversas

Tickets atendidos pela IA aparecem com indicador:

```
┌─────────────────────────────────────────┐
│ [🤖] Maria Silva               14:32    │
│      A IA esta atendendo               │
│      [🟢 IA] [1]                        │
└─────────────────────────────────────────┘
```

### Na Conversa

Mensagens da IA sao identificadas:

```
      ┌─────────────────────────────────────┐
      │ 🤖 Resposta Automatica               │
      │                                      │
      │ Ola! Sou o assistente virtual da    │
      │ [Empresa]. Como posso ajudar?        │
      │                                10:30 │
      └─────────────────────────────────────┘
```

### Aba "IA"

Na sidebar, a aba **"IA"** mostra todos os tickets sendo atendidos pela Inteligencia Artificial.

---

## Assumindo da IA

### Quando Assumir

A IA transfere automaticamente para humano quando:

- Cliente pede para falar com atendente
- Detecta assunto complexo
- Identifica insatisfacao
- Atinge limite de interacoes
- Nao sabe responder

### Notificacao de Transferencia

Voce recebera um alerta:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 A IA transferiu um atendimento para voce                    │
│                                                                 │
│  Cliente: Maria Silva                                           │
│  Motivo: Cliente solicitou atendente humano                     │
│                                                                 │
│                [Ver Conversa]  [Assumir]                        │
└─────────────────────────────────────────────────────────────────┘
```

### Assumindo Manualmente

Para assumir um ticket da IA:

1. Va para a aba **"IA"**
2. Clique no ticket desejado
3. Leia o historico (veja o que a IA ja conversou)
4. Clique em **"Assumir da IA"**
5. Apresente-se ao cliente

**Mensagem de apresentacao:**
```
Ola Maria! Meu nome e Joao e vou continuar seu atendimento.

Vi que voce estava conversando com nosso assistente virtual.
Como posso ajudar?
```

---

## Enviando para a IA

### Quando Enviar para IA

- Cliente com duvida simples
- Fora do horario de atendimento
- Ticket de baixa prioridade
- Triagem inicial

### Como Enviar

1. No menu do ticket (⋮)
2. Selecione **"Enviar para IA"**
3. Confirme a acao

:::warning Avise o Cliente
Informe o cliente que ele sera atendido pelo assistente virtual:
"Vou transferir voce para nosso assistente virtual que pode ajudar com essa duvida."
:::

---

## Revisando Respostas da IA

### Monitorando a Qualidade

Periodicamente, revise conversas da IA para:

- Verificar se as respostas estao corretas
- Identificar falhas de conhecimento
- Sugerir melhorias ao administrador

### Corrigindo a IA

Se a IA deu uma informacao errada:

1. Assuma o atendimento
2. Corrija a informacao com o cliente
3. Reporte ao administrador para ajuste

**Exemplo de correcao:**
```
Maria, notei que houve uma informacao incorreta na mensagem anterior.

O prazo correto de entrega e de 5 a 7 dias uteis, nao 3 dias como
foi informado.

Peco desculpas pelo equivoco!
```

---

## IA como Assistente

### Sugestoes de Resposta

A IA pode sugerir respostas para voce:

```
┌─────────────────────────────────────────────────────────────────┐
│  💡 Sugestao da IA:                                             │
│                                                                 │
│  "O prazo de entrega para sua regiao e de 3 a 5 dias uteis     │
│  apos a confirmacao do pagamento."                              │
│                                                                 │
│                              [Usar Sugestao]  [Ignorar]         │
└─────────────────────────────────────────────────────────────────┘
```

Voce pode:
- **Usar a sugestao** como esta
- **Editar** antes de enviar
- **Ignorar** e escrever sua propria resposta

### Transcricao de Audio

Quando o cliente envia audio, a IA transcreve automaticamente:

```
      ┌─────────────────────────────────────┐
      │ 🎵 Audio (0:45)              [▶️]   │
      ├─────────────────────────────────────┤
      │ 📝 Transcricao:                     │
      │ "Ola, estou ligando porque meu     │
      │ pedido ainda nao chegou. O numero  │
      │ e 12345 e ja faz uma semana."      │
      └─────────────────────────────────────┘
```

:::tip Use a Transcricao
A transcricao permite que voce leia rapidamente sem precisar ouvir o audio inteiro.
:::

---

## Entendendo o Comportamento da IA

### Personalidade da IA

A IA foi configurada com uma personalidade especifica:

| Aspecto | Configuracao |
|---------|--------------|
| **Tom** | Amigavel, profissional, etc. |
| **Estilo** | Conciso ou detalhado |
| **Emojis** | Usa ou nao usa |
| **Nome** | Como ela se apresenta |

### Limites da IA

A IA tem regras para evitar problemas:

- **Guardrails**: Evita respostas inadequadas
- **Escalamento**: Sabe quando chamar humano
- **Limites de conhecimento**: Admite quando nao sabe

### Contexto da IA

A IA considera:

- Historico da conversa atual
- Dados do cliente (nome, status, etc.)
- Base de conhecimento da empresa
- FAQs configurados

---

## Dicas para Trabalhar Bem com a IA

### Do (Faca)

✅ **Revise o historico** antes de assumir
✅ **Agradeca a paciencia** do cliente
✅ **Continue de onde parou** sem repetir perguntas
✅ **Reporte problemas** ao administrador
✅ **Use as sugestoes** como ponto de partida

### Don't (Evite)

❌ **Criticar a IA** para o cliente
❌ **Ignorar o contexto** ja coletado
❌ **Deixar a IA sozinha** em casos complexos
❌ **Assumir sem ler** o historico

---

## Cenarios Comuns

### Cenario 1: IA Nao Soube Responder

```
IA: Desculpe, nao tenho essa informacao. Vou transferir
    voce para um atendente.

[Voce assume]

Voce: Ola Maria! Meu nome e Joao. Vi que voce tinha uma
      duvida sobre [assunto]. Deixa eu verificar isso
      para voce!
```

### Cenario 2: Cliente Quer Falar com Humano

```
Cliente: Quero falar com uma pessoa de verdade!

IA: Entendo! Vou transferir voce para um de nossos
    atendentes agora mesmo.

[Voce assume]

Voce: Ola Maria! Sou o Joao, atendente humano 😊
      Como posso ajudar voce?
```

### Cenario 3: IA Deu Informacao Errada

```
IA: O prazo de entrega e de 1 dia util.

Cliente: Serio? Que otimo!

[Voce percebe o erro e assume]

Voce: Maria, peço desculpas! Houve um equivoco.
      O prazo correto é de 3 a 5 dias úteis.
      Desculpe pela confusao!
```

### Cenario 4: Duvida Simples Durante Atendimento Complexo

```
[Voce esta resolvendo um problema complexo]

Cliente: Alias, qual o horario de funcionamento de voces?

Voce: [Usa sugestao da IA]
      Nosso horario e de segunda a sexta, das 9h as 18h!

      Voltando ao seu problema...
```

---

## Exercicios Praticos

### Exercicio 1: Assumir da IA
1. Va para a aba "IA"
2. Escolha um ticket
3. Leia todo o historico
4. Assuma e se apresente

### Exercicio 2: Usar Sugestoes
1. Em um atendimento, aguarde sugestao da IA
2. Edite a sugestao antes de enviar
3. Compare com sua resposta original

### Exercicio 3: Reportar Problema
1. Identifique uma resposta incorreta da IA
2. Corrija para o cliente
3. Documente para reportar

---

## Proximo Passo

Agora que voce sabe trabalhar com a IA, vamos ver as boas praticas de atendimento:

**[Boas Praticas →](/treinamento/boas-praticas/comunicacao)**
