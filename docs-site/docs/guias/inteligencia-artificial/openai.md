---
sidebar_position: 2
title: Integracao OpenAI
description: Guia completo para configurar a integracao com OpenAI (GPT) no ChatBlue
---

# Integracao OpenAI

A OpenAI oferece os modelos GPT, que sao excelentes para atendimento ao cliente. Este guia detalha como configurar a integracao no ChatBlue.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 15-20 minutos

## Pre-requisitos

- [ ] Conta na [OpenAI](https://platform.openai.com/)
- [ ] Metodo de pagamento configurado na OpenAI
- [ ] Acesso de administrador ao ChatBlue

## Modelos Disponiveis

| Modelo | Descricao | Contexto | Custo | Uso Recomendado |
|--------|-----------|----------|-------|-----------------|
| gpt-4-turbo | Mais recente e capaz | 128K tokens | Medio | Atendimento complexo |
| gpt-4 | Muito capaz, mais lento | 8K tokens | Alto | Casos especiais |
| gpt-3.5-turbo | Rapido e economico | 16K tokens | Baixo | Alto volume |

## Passo a Passo

### Passo 1: Criar Conta na OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com/)
2. Clique em **Sign Up**
3. Complete o cadastro
4. Adicione um metodo de pagamento em **Billing**

### Passo 2: Gerar API Key

1. Acesse **API Keys** no menu lateral
2. Clique em **Create new secret key**
3. De um nome descritivo: "ChatBlue Production"
4. Copie a chave gerada

![Placeholder: Tela de criacao de API Key OpenAI](/img/guias/openai-apikey.png)

:::danger Atencao
A chave so e exibida uma vez. Guarde-a em local seguro!
:::

### Passo 3: Configurar no ChatBlue

1. Acesse **Configuracoes > Inteligencia Artificial**
2. Selecione **OpenAI** como provedor
3. Preencha os campos:

| Campo | Valor |
|-------|-------|
| API Key | sk-... (sua chave) |
| Organization ID | org-... (opcional) |
| Modelo | gpt-4-turbo |

![Placeholder: Configuracao OpenAI no ChatBlue](/img/guias/openai-config.png)

### Passo 4: Configuracoes Avancadas

```typescript
{
  provider: "openai",
  apiKey: "sk-...",
  organizationId: "org-...", // Opcional

  model: "gpt-4-turbo",

  settings: {
    // Criatividade das respostas (0 = deterministico, 1 = criativo)
    temperature: 0.7,

    // Maximo de tokens na resposta
    maxTokens: 500,

    // Penalidade para repeticao
    frequencyPenalty: 0.5,

    // Penalidade para novos topicos
    presencePenalty: 0.3,

    // Tokens de parada
    stopSequences: ["Cliente:", "Atendente:"],

    // Timeout em ms
    timeout: 30000
  }
}
```

### Passo 5: Testar Conexao

1. Clique em **Testar Conexao**
2. O sistema enviara uma mensagem de teste
3. Verifique se a resposta foi gerada corretamente

```typescript
// Teste de conexao
POST /api/ai/test
{
  "provider": "openai",
  "message": "Ola, estou testando a conexao"
}

// Resposta esperada
{
  "success": true,
  "response": "Ola! A conexao esta funcionando corretamente...",
  "model": "gpt-4-turbo",
  "tokens": { "input": 12, "output": 25 },
  "latency": 850
}
```

## Configuracao do System Prompt

O System Prompt define o comportamento da IA:

```typescript
{
  systemPrompt: `
Voce e um assistente de atendimento da empresa {empresa}.

Seu papel e:
- Responder duvidas sobre produtos e servicos
- Ajudar com problemas tecnicos simples
- Coletar informacoes para encaminhamento
- Ser cordial e profissional

Informacoes da empresa:
- Nome: {empresa}
- Segmento: {segmento}
- Produtos: {produtos}

Regras:
- Nunca invente informacoes sobre precos ou prazos
- Se nao souber, ofereça transferir para um atendente
- Mantenha respostas concisas (maximo 3 paragrafos)
- Use linguagem informal mas profissional

Dados do cliente atual:
- Nome: {cliente_nome}
- Empresa: {cliente_empresa}
- Historico: {cliente_historico}
`
}
```

## Funcoes (Function Calling)

O GPT-4 suporta chamada de funcoes para acoes especificas:

```typescript
{
  functions: [
    {
      name: "transfer_to_human",
      description: "Transfere o atendimento para um agente humano",
      parameters: {
        type: "object",
        properties: {
          department: {
            type: "string",
            enum: ["vendas", "suporte", "financeiro"],
            description: "Departamento para transferir"
          },
          reason: {
            type: "string",
            description: "Motivo da transferencia"
          }
        },
        required: ["department", "reason"]
      }
    },
    {
      name: "search_knowledge_base",
      description: "Busca informacoes na base de conhecimento",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Termo de busca"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "create_ticket",
      description: "Cria um ticket de suporte",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"]
          }
        },
        required: ["title", "description"]
      }
    }
  ]
}
```

## Limites e Custos

### Configurar Limites

```typescript
{
  limits: {
    // Limite de gastos mensal (USD)
    monthlyBudget: 100,

    // Maximo de tokens por conversa
    maxTokensPerConversation: 4000,

    // Maximo de mensagens IA por ticket
    maxAIMessagesPerTicket: 20,

    // Rate limit (requisicoes por minuto)
    requestsPerMinute: 60
  }
}
```

### Monitorar Custos

1. Acesse **Configuracoes > IA > Custos**
2. Visualize gastos por periodo
3. Configure alertas de limite

```typescript
// Webhook de alerta de custo
{
  alerts: {
    costThreshold: 50, // Alerta quando atingir $50
    webhookUrl: "https://seu-sistema.com/webhook/ai-cost",
    email: "admin@empresa.com"
  }
}
```

## Otimizacao de Custos

### 1. Use o Modelo Adequado

```typescript
// Para perguntas simples, use GPT-3.5
if (isSimpleQuestion(message)) {
  model = "gpt-3.5-turbo";
} else {
  model = "gpt-4-turbo";
}
```

### 2. Limite o Contexto

```typescript
{
  context: {
    // Apenas ultimas N mensagens
    maxMessages: 10,

    // Maximo de tokens de contexto
    maxContextTokens: 2000,

    // Resumir historico longo
    summarizeLongHistory: true
  }
}
```

### 3. Cache de Respostas

```typescript
{
  cache: {
    enabled: true,
    ttl: 3600, // 1 hora
    // Respostas para perguntas frequentes
    patterns: [
      { pattern: "horario funcionamento", response: "..." },
      { pattern: "formas pagamento", response: "..." }
    ]
  }
}
```

## Integracao com Assistants API

A OpenAI oferece a Assistants API para cenarios mais complexos:

```typescript
// Criar Assistant
const assistant = await openai.beta.assistants.create({
  name: "ChatBlue Support",
  instructions: "Voce e um assistente de suporte...",
  model: "gpt-4-turbo",
  tools: [
    { type: "retrieval" }, // Busca em documentos
    { type: "code_interpreter" } // Execucao de codigo
  ]
});

// Usar no ChatBlue
{
  openai: {
    mode: "assistant",
    assistantId: "asst_...",
    // Arquivos de conhecimento
    fileIds: ["file_...", "file_..."]
  }
}
```

## Solucao de Problemas

### Erro: "Insufficient quota"

**Causa**: Limite de creditos atingido

**Solucao**:
1. Acesse **Billing** na OpenAI
2. Adicione creditos
3. Verifique limites de uso

### Erro: "Rate limit exceeded"

**Causa**: Muitas requisicoes por minuto

**Solucao**:
```typescript
{
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 50,
    retryAfter: 1000 // ms
  }
}
```

### Erro: "Context length exceeded"

**Causa**: Conversa muito longa para o modelo

**Solucao**:
1. Reduza `maxMessages` no contexto
2. Ative `summarizeLongHistory`
3. Use modelo com contexto maior (gpt-4-turbo: 128K)

### Respostas muito longas

**Solucao**:
```typescript
{
  settings: {
    maxTokens: 300, // Reduza o limite
    stopSequences: ["\n\n"] // Pare em paragrafos
  }
}
```

### Respostas muito genericas

**Solucoes**:
1. Melhore o System Prompt com mais contexto
2. Aumente a temperatura para mais variacao
3. Adicione exemplos de respostas ideais

## Melhores Praticas

### 1. System Prompt Bem Estruturado

```typescript
// Estrutura recomendada
const systemPrompt = `
## Papel
[Defina claramente o papel da IA]

## Contexto da Empresa
[Informacoes relevantes sobre a empresa]

## Regras de Comportamento
[O que a IA deve e nao deve fazer]

## Formato de Resposta
[Como as respostas devem ser formatadas]

## Exemplos
[Exemplos de boas respostas]
`;
```

### 2. Few-Shot Learning

```typescript
// Inclua exemplos de conversas ideais
{
  examples: [
    {
      user: "Qual o preco do plano basico?",
      assistant: "O plano basico custa R$ 99/mes e inclui..."
    },
    {
      user: "Quero cancelar minha assinatura",
      assistant: "Entendo. Para prosseguir com o cancelamento, vou transferir voce para nosso time de atencao ao cliente. Antes, poderia me informar o motivo?"
    }
  ]
}
```

### 3. Monitoramento Continuo

- Revise conversas da IA semanalmente
- Ajuste System Prompt com base em problemas encontrados
- Acompanhe metricas de satisfacao

## Proximos Passos

Apos configurar a OpenAI:

- [Configurar Personalidade](/guias/inteligencia-artificial/personalidade)
- [Configurar Transcricao](/guias/inteligencia-artificial/transcricao)
- [Configurar Transferencia](/guias/inteligencia-artificial/transferencia)

Ou configure um provedor alternativo:

- [Configurar Anthropic](/guias/inteligencia-artificial/anthropic)
