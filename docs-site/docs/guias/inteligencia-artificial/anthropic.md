---
sidebar_position: 3
title: Integracao Anthropic
description: Guia completo para configurar a integracao com Anthropic (Claude) no ChatBlue
---

# Integracao Anthropic

O Anthropic Claude e conhecido por respostas mais naturais e contextos longos. Este guia detalha como configurar a integracao no ChatBlue.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 15-20 minutos

## Pre-requisitos

- [ ] Conta na [Anthropic](https://console.anthropic.com/)
- [ ] Metodo de pagamento configurado
- [ ] Acesso de administrador ao ChatBlue

## Modelos Disponiveis

| Modelo | Descricao | Contexto | Custo | Uso Recomendado |
|--------|-----------|----------|-------|-----------------|
| claude-3-opus | Mais inteligente | 200K tokens | Alto | Tarefas complexas |
| claude-3-sonnet | Equilibrado | 200K tokens | Medio | Uso geral |
| claude-3-haiku | Mais rapido | 200K tokens | Baixo | Alto volume |

## Diferenciais do Claude

| Caracteristica | Descricao |
|----------------|-----------|
| Contexto longo | Ate 200K tokens (equivalente a um livro) |
| Respostas naturais | Tom mais humano e menos robotico |
| Seguranca | Menos propenso a respostas problematicas |
| Raciocinio | Melhor em tarefas que exigem analise |

## Passo a Passo

### Passo 1: Criar Conta na Anthropic

1. Acesse [console.anthropic.com](https://console.anthropic.com/)
2. Clique em **Sign Up**
3. Complete o cadastro
4. Adicione creditos em **Billing**

### Passo 2: Gerar API Key

1. Acesse **API Keys** no menu
2. Clique em **Create Key**
3. De um nome: "ChatBlue Production"
4. Copie a chave gerada

![Placeholder: Tela de criacao de API Key Anthropic](/img/guias/anthropic-apikey.png)

:::danger Atencao
A chave so e exibida uma vez. Guarde-a em local seguro!
:::

### Passo 3: Configurar no ChatBlue

1. Acesse **Configuracoes > Inteligencia Artificial**
2. Selecione **Anthropic** como provedor
3. Preencha os campos:

| Campo | Valor |
|-------|-------|
| API Key | sk-ant-... (sua chave) |
| Modelo | claude-3-sonnet-20240229 |

![Placeholder: Configuracao Anthropic no ChatBlue](/img/guias/anthropic-config.png)

### Passo 4: Configuracoes Avancadas

```typescript
{
  provider: "anthropic",
  apiKey: "sk-ant-...",

  model: "claude-3-sonnet-20240229",

  settings: {
    // Criatividade das respostas (0 = deterministico, 1 = criativo)
    temperature: 0.7,

    // Maximo de tokens na resposta
    maxTokens: 1024,

    // Top P (amostragem de nucleus)
    topP: 0.9,

    // Top K (limitar vocabulario)
    topK: 50,

    // Timeout em ms
    timeout: 60000
  }
}
```

### Passo 5: Testar Conexao

1. Clique em **Testar Conexao**
2. O sistema enviara uma mensagem de teste
3. Verifique a resposta

```typescript
// Teste de conexao
POST /api/ai/test
{
  "provider": "anthropic",
  "message": "Ola, estou testando a conexao"
}

// Resposta esperada
{
  "success": true,
  "response": "Ola! Estou funcionando corretamente...",
  "model": "claude-3-sonnet-20240229",
  "tokens": { "input": 15, "output": 30 },
  "latency": 920
}
```

## Configuracao do System Prompt

O Claude usa um formato especifico para System Prompt:

```typescript
{
  systemPrompt: `
Voce e o assistente virtual da {empresa}, especializado em atendimento ao cliente.

<contexto_empresa>
Nome: {empresa}
Segmento: Tecnologia
Produtos: Software de atendimento ao cliente
Horario: Segunda a sexta, 9h as 18h
</contexto_empresa>

<regras>
1. Seja cordial e profissional
2. Responda em portugues brasileiro
3. Mantenha respostas concisas (3-4 frases)
4. Se nao souber a resposta, ofereca transferir para um humano
5. Nunca invente precos ou informacoes tecnicas
</regras>

<formato_resposta>
- Use linguagem informal mas profissional
- Evite jargoes tecnicos desnecessarios
- Inclua emojis apenas se o cliente usar primeiro
</formato_resposta>

<cliente_atual>
Nome: {cliente_nome}
Empresa: {cliente_empresa}
Plano: {cliente_plano}
Historico: {cliente_historico}
</cliente_atual>
`
}
```

## Tool Use (Funcoes)

O Claude 3 suporta chamada de ferramentas:

```typescript
{
  tools: [
    {
      name: "transfer_to_human",
      description: "Transfere a conversa para um atendente humano quando o cliente solicitar ou quando a IA nao conseguir ajudar",
      input_schema: {
        type: "object",
        properties: {
          department: {
            type: "string",
            enum: ["vendas", "suporte", "financeiro"],
            description: "Departamento para transferencia"
          },
          reason: {
            type: "string",
            description: "Motivo da transferencia"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Prioridade do atendimento"
          }
        },
        required: ["department", "reason"]
      }
    },
    {
      name: "search_faq",
      description: "Busca respostas na base de conhecimento da empresa",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Pergunta ou termo de busca"
          },
          category: {
            type: "string",
            description: "Categoria opcional para filtrar"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "get_order_status",
      description: "Consulta o status de um pedido do cliente",
      input_schema: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Numero do pedido"
          }
        },
        required: ["order_id"]
      }
    }
  ]
}
```

## Aproveitando o Contexto Longo

O Claude suporta ate 200K tokens de contexto. Use isso a seu favor:

### 1. Historico Completo

```typescript
{
  context: {
    // Incluir todas as mensagens da conversa
    includeFullHistory: true,

    // Incluir conversas anteriores do mesmo contato
    includePreviousTickets: true,
    maxPreviousTickets: 5,

    // Incluir dados completos do Notion
    includeNotionData: true
  }
}
```

### 2. Base de Conhecimento

```typescript
{
  knowledgeBase: {
    enabled: true,
    // Incluir documentos relevantes no contexto
    documents: [
      { name: "FAQ", content: "..." },
      { name: "Catalogo", content: "..." },
      { name: "Politicas", content: "..." }
    ]
  }
}
```

### 3. Exemplos de Atendimento

```typescript
{
  examples: {
    enabled: true,
    conversations: [
      {
        context: "Cliente perguntando sobre preco",
        messages: [
          { role: "user", content: "Quanto custa o plano PRO?" },
          { role: "assistant", content: "O plano PRO custa R$ 199/mes..." }
        ]
      },
      {
        context: "Cliente com problema tecnico",
        messages: [
          { role: "user", content: "O sistema nao esta funcionando" },
          { role: "assistant", content: "Sinto muito pelo inconveniente..." }
        ]
      }
    ]
  }
}
```

## Limites e Custos

### Precos Claude 3

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|-------------------|
| Opus | $15.00 | $75.00 |
| Sonnet | $3.00 | $15.00 |
| Haiku | $0.25 | $1.25 |

### Configurar Limites

```typescript
{
  limits: {
    // Limite mensal em USD
    monthlyBudget: 100,

    // Limite por conversa
    maxTokensPerConversation: 50000,

    // Limite de requisicoes por minuto
    requestsPerMinute: 50,

    // Alerta de custo
    alertThreshold: 80 // % do budget
  }
}
```

## Otimizacao de Performance

### 1. Escolher Modelo Adequado

```typescript
// Logica de selecao de modelo
function selectModel(message, context) {
  // Perguntas simples -> Haiku (rapido e barato)
  if (isSimpleQuestion(message)) {
    return "claude-3-haiku-20240307";
  }

  // Contexto muito longo -> Sonnet (equilibrado)
  if (context.length > 10000) {
    return "claude-3-sonnet-20240229";
  }

  // Tarefas complexas -> Opus (mais capaz)
  if (requiresComplexReasoning(message)) {
    return "claude-3-opus-20240229";
  }

  // Padrao
  return "claude-3-sonnet-20240229";
}
```

### 2. Streaming de Respostas

```typescript
{
  streaming: {
    enabled: true,
    // Enviar resposta conforme e gerada
    sendPartialResponses: true,
    // Intervalo de envio (ms)
    chunkInterval: 100
  }
}
```

### 3. Cache Inteligente

```typescript
{
  cache: {
    enabled: true,
    // Tempo de vida do cache
    ttl: 3600,
    // Respostas padrao para perguntas frequentes
    staticResponses: {
      "horario": "Nosso horario de funcionamento e...",
      "contato": "Voce pode nos contatar por..."
    }
  }
}
```

## Solucao de Problemas

### Erro: "Invalid API Key"

**Causa**: Chave de API incorreta ou expirada

**Solucao**:
1. Verifique se a chave esta correta
2. Gere uma nova chave no console Anthropic
3. Atualize no ChatBlue

### Erro: "Rate limit exceeded"

**Causa**: Muitas requisicoes por minuto

**Solucao**:
```typescript
{
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 40,
    retryStrategy: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000
    }
  }
}
```

### Erro: "Output blocked by content filter"

**Causa**: Resposta bloqueada por filtro de seguranca

**Solucao**:
1. Revise o System Prompt
2. Evite solicitar conteudo potencialmente problematico
3. Ajuste as instrucoes para serem mais claras

### Respostas muito formais

**Solucao**:
Ajuste o System Prompt:
```typescript
{
  systemPrompt: `
...
IMPORTANTE: Use linguagem informal e amigavel, como se estivesse conversando
com um amigo. Evite ser excessivamente formal ou usar linguagem corporativa.
...
`
}
```

### Respostas muito longas

**Solucao**:
```typescript
{
  settings: {
    maxTokens: 300,
  },
  systemPrompt: `
...
FORMATO: Mantenha respostas curtas e objetivas, com no maximo 3-4 frases.
Se precisar de mais detalhes, pergunte ao cliente se deseja saber mais.
...
`
}
```

## Comparacao com OpenAI

| Aspecto | OpenAI GPT-4 | Anthropic Claude 3 |
|---------|--------------|-------------------|
| Contexto | 128K tokens | 200K tokens |
| Naturalidade | Muito boa | Excelente |
| Velocidade | Rapido | Medio |
| Preco | Medio | Variavel |
| Seguranca | Boa | Excelente |
| Funcoes/Tools | Excelente | Muito boa |

## Proximos Passos

Apos configurar a Anthropic:

- [Configurar Personalidade](/guias/inteligencia-artificial/personalidade)
- [Configurar Transcricao](/guias/inteligencia-artificial/transcricao)
- [Configurar Transferencia](/guias/inteligencia-artificial/transferencia)

Ou configure um provedor alternativo:

- [Configurar OpenAI](/guias/inteligencia-artificial/openai)
