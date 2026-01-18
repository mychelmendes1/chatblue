---
sidebar_position: 1
title: Configuracao de IA
description: Visao geral da configuracao de Inteligencia Artificial no ChatBlue
---

# Configuracao de Inteligencia Artificial

O ChatBlue oferece atendimento automatizado com Inteligencia Artificial, integrando-se com os principais provedores de LLM (Large Language Models). Este guia apresenta uma visao geral das opcoes disponiveis.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 20-30 minutos

## Provedores Suportados

| Provedor | Modelos | Caracteristicas |
|----------|---------|-----------------|
| OpenAI | GPT-4, GPT-4 Turbo, GPT-3.5 Turbo | Mais popular, excelente para conversacao |
| Anthropic | Claude 3 Opus, Sonnet, Haiku | Respostas mais naturais, contexto longo |

## Arquitetura da IA no ChatBlue

```
┌─────────────────────────────────────────────────────────────┐
│                     Mensagem Recebida                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Verificar Contexto                        │
│        (Ticket com atendente? IA habilitada?)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
   ┌──────────────────┐    ┌──────────────────────┐
   │  Tem Atendente   │    │    Sem Atendente     │
   │  (Passa direto)  │    │    (Processa IA)     │
   └──────────────────┘    └──────────┬───────────┘
                                      │
                                      ▼
              ┌─────────────────────────────────────┐
              │         Construir Contexto          │
              │  - Historico de mensagens           │
              │  - Dados do contato (Notion)        │
              │  - Personalidade configurada        │
              │  - Informacoes da empresa           │
              └──────────────────────┬──────────────┘
                                     │
                                     ▼
              ┌─────────────────────────────────────┐
              │         Chamar LLM                  │
              │    (OpenAI ou Anthropic)            │
              └──────────────────────┬──────────────┘
                                     │
                                     ▼
              ┌─────────────────────────────────────┐
              │      Verificar Transferencia        │
              │  (Precisa de humano?)               │
              └──────────────────────┬──────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
         ┌──────────────────┐             ┌──────────────────┐
         │ Enviar Resposta  │             │   Transferir     │
         │    da IA         │             │  para Humano     │
         └──────────────────┘             └──────────────────┘
```

## Pre-requisitos

Antes de configurar a IA, voce precisa:

- [ ] Acesso de administrador ao ChatBlue
- [ ] Chave de API do provedor escolhido (OpenAI ou Anthropic)
- [ ] Conexao WhatsApp configurada
- [ ] Plano que suporte IA (PRO ou ENTERPRISE)

## Configuracao Basica

### Passo 1: Acessar Configuracoes de IA

1. Faca login como administrador
2. Acesse **Configuracoes > Inteligencia Artificial**
3. Clique em **Configurar IA**

![Placeholder: Menu de configuracoes de IA](/img/guias/ia-menu.png)

### Passo 2: Escolher Provedor

Selecione o provedor de IA que deseja utilizar:

| Provedor | Quando Usar |
|----------|-------------|
| OpenAI | Uso geral, integracao mais simples |
| Anthropic | Contextos mais longos, respostas mais naturais |

### Passo 3: Configurar Credenciais

Insira a chave de API do provedor escolhido:

```typescript
// Exemplo de configuracao
{
  provider: "openai",       // ou "anthropic"
  apiKey: "sk-...",         // Sua chave de API
  model: "gpt-4-turbo",     // Modelo a utilizar
  enabled: true
}
```

### Passo 4: Configuracoes Gerais

| Configuracao | Descricao | Valor Recomendado |
|--------------|-----------|-------------------|
| Modelo | Qual modelo usar | gpt-4-turbo / claude-3-sonnet |
| Temperatura | Criatividade (0-1) | 0.7 |
| Max Tokens | Limite de resposta | 500 |
| Timeout | Tempo maximo de resposta | 30s |

```typescript
{
  settings: {
    temperature: 0.7,
    maxTokens: 500,
    timeout: 30000,
    retryOnError: true,
    maxRetries: 2
  }
}
```

## Funcionalidades da IA

### 1. Atendimento Automatico

A IA responde automaticamente quando:
- Nao ha atendente designado ao ticket
- O atendimento esta fora do horario comercial
- A opcao de atendimento 24/7 esta habilitada

### 2. Transcricao de Audio

Audios recebidos podem ser transcritos automaticamente:

```typescript
{
  transcription: {
    enabled: true,
    provider: "whisper",
    language: "pt"
  }
}
```

Veja mais em [Transcricao de Audio](/guias/inteligencia-artificial/transcricao).

### 3. Transferencia Inteligente

A IA detecta quando deve transferir para um humano:

```typescript
{
  transfer: {
    enabled: true,
    triggers: [
      "falar com atendente",
      "falar com humano",
      "reclamacao",
      "cancelar"
    ]
  }
}
```

Veja mais em [Transferencia para Humano](/guias/inteligencia-artificial/transferencia).

### 4. Contexto do Notion

Se integrado ao Notion, a IA tem acesso aos dados do cliente:

```typescript
{
  context: {
    notion: {
      enabled: true,
      fields: ["nome", "empresa", "plano", "historico"]
    }
  }
}
```

## Configuracoes por Departamento

Cada departamento pode ter configuracoes diferentes de IA:

```typescript
// Departamento de Vendas
{
  department: "vendas",
  ai: {
    enabled: true,
    personality: "vendedor_consultivo",
    model: "gpt-4-turbo",
    temperature: 0.8
  }
}

// Departamento de Suporte
{
  department: "suporte",
  ai: {
    enabled: true,
    personality: "suporte_tecnico",
    model: "claude-3-sonnet",
    temperature: 0.5
  }
}
```

## Horarios de Funcionamento da IA

Configure quando a IA deve atuar:

```typescript
{
  schedule: {
    // IA ativa 24/7
    mode: "always",

    // OU: IA ativa apenas fora do horario comercial
    mode: "outside_business_hours",

    // OU: Horario personalizado
    mode: "custom",
    hours: {
      monday: { start: "18:00", end: "08:00" },
      saturday: { start: "00:00", end: "23:59" },
      sunday: { start: "00:00", end: "23:59" }
    }
  }
}
```

## Metricas e Monitoramento

### Dashboard de IA

Acompanhe o desempenho da IA:

| Metrica | Descricao |
|---------|-----------|
| Mensagens processadas | Total de mensagens respondidas pela IA |
| Taxa de transferencia | % de conversas transferidas para humanos |
| Tempo medio de resposta | Tempo para gerar resposta |
| Satisfacao | Nota media das avaliacoes pos-IA |
| Custo | Gasto com API por periodo |

### Logs de Conversas

Todas as interacoes da IA sao registradas:

```typescript
// Exemplo de log
{
  id: "log_123",
  ticketId: "ticket_456",
  timestamp: "2024-01-15T10:30:00Z",
  input: "Qual o preco do plano PRO?",
  output: "O plano PRO custa R$ 199/mes e inclui...",
  model: "gpt-4-turbo",
  tokens: { input: 45, output: 120 },
  latency: 1250,
  cost: 0.0052
}
```

## Custos Estimados

### OpenAI

| Modelo | Input (1K tokens) | Output (1K tokens) |
|--------|-------------------|-------------------|
| GPT-4 Turbo | $0.01 | $0.03 |
| GPT-4 | $0.03 | $0.06 |
| GPT-3.5 Turbo | $0.0005 | $0.0015 |

### Anthropic

| Modelo | Input (1K tokens) | Output (1K tokens) |
|--------|-------------------|-------------------|
| Claude 3 Opus | $0.015 | $0.075 |
| Claude 3 Sonnet | $0.003 | $0.015 |
| Claude 3 Haiku | $0.00025 | $0.00125 |

:::tip Dica
Para reduzir custos, use modelos mais economicos (GPT-3.5, Haiku) para perguntas simples e reserve modelos avancados para casos complexos.
:::

## Boas Praticas

### 1. Comece Simples
- Inicie com configuracoes padrao
- Ajuste gradualmente com base nos resultados

### 2. Defina Limites
- Configure limite de gastos mensal
- Monitore custos regularmente

### 3. Treine a Personalidade
- Crie uma personalidade alinhada com sua marca
- Inclua informacoes sobre produtos/servicos

### 4. Monitore Qualidade
- Revise conversas da IA periodicamente
- Ajuste triggers de transferencia conforme necessario

### 5. Tenha Fallback
- Configure transferencia automatica se a IA falhar
- Defina mensagem de erro amigavel

## Solucao de Problemas

### IA nao responde

**Verificacoes**:
1. IA esta habilitada nas configuracoes?
2. Chave de API esta valida?
3. Departamento tem IA ativa?
4. Ticket ja tem atendente designado?

### Respostas inadequadas

**Solucoes**:
1. Revise a personalidade configurada
2. Adicione mais contexto nas instrucoes
3. Ajuste a temperatura (menor = mais conservador)
4. Configure palavras/topicos proibidos

### Custo muito alto

**Solucoes**:
1. Use modelos mais economicos
2. Reduza maxTokens
3. Implemente cache de respostas frequentes
4. Configure limite de mensagens por conversa

### Respostas lentas

**Solucoes**:
1. Use modelos mais rapidos (GPT-3.5, Haiku)
2. Reduza o contexto enviado
3. Verifique latencia de rede
4. Configure timeout adequado

## Proximos Passos

Configure seu provedor de IA preferido:

- [Configurar OpenAI](/guias/inteligencia-artificial/openai)
- [Configurar Anthropic](/guias/inteligencia-artificial/anthropic)

Apos configurar o provedor:

- [Configurar Personalidade](/guias/inteligencia-artificial/personalidade)
- [Configurar Transcricao](/guias/inteligencia-artificial/transcricao)
- [Configurar Transferencia](/guias/inteligencia-artificial/transferencia)
