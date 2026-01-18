---
sidebar_position: 6
title: Transferencia IA para Humano
description: Guia para configurar a logica de transferencia de atendimento da IA para agentes humanos
---

# Transferencia IA para Humano

Uma boa experiencia de atendimento requer saber quando a IA deve transferir para um humano. Este guia explica como configurar essa logica no ChatBlue.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 20-30 minutos

## Quando Transferir?

| Cenario | Razao |
|---------|-------|
| Cliente solicita | Respeitar a vontade do cliente |
| Problema complexo | IA nao consegue resolver |
| Reclamacao | Requer toque humano |
| Venda complexa | Negociacao precisa de humano |
| Assunto sensivel | Juridico, cancelamento, etc |
| IA confusa | Nao entende o cliente |

## Arquitetura da Transferencia

```
┌─────────────────────────────────────────────────────────────┐
│                   Mensagem do Cliente                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    IA Processa                               │
│              (Gera resposta + analisa)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Verificar Gatilhos de Transferencia             │
│  - Palavras-chave?                                          │
│  - Sentimento negativo?                                     │
│  - Confianca baixa?                                         │
│  - Limite de mensagens?                                     │
│  - IA decidiu transferir?                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        Nao transferir            Transferir
              │                         │
              ▼                         ▼
   ┌──────────────────┐    ┌──────────────────────┐
   │  Enviar resposta │    │  Selecionar destino  │
   │     da IA        │    │  - Departamento      │
   └──────────────────┘    │  - Agente especifico │
                           │  - Fila geral        │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │  Notificar agente    │
                           │  Atualizar ticket    │
                           │  Informar cliente    │
                           └──────────────────────┘
```

## Passo a Passo

### Passo 1: Acessar Configuracoes

1. Acesse **Configuracoes > Inteligencia Artificial**
2. Clique na aba **Transferencia**
3. Configure os gatilhos

![Placeholder: Tela de configuracao de transferencia](/img/guias/transferencia-config.png)

### Passo 2: Configurar Gatilhos por Palavras-chave

```typescript
{
  transfer: {
    keywords: {
      enabled: true,

      // Palavras que disparam transferencia imediata
      immediate: [
        "falar com humano",
        "falar com atendente",
        "falar com pessoa",
        "atendente humano",
        "pessoa de verdade",
        "gerente",
        "supervisor",
        "reclamacao",
        "advogado",
        "procon",
        "processo"
      ],

      // Palavras que aumentam probabilidade de transferencia
      weighted: [
        { keyword: "problema", weight: 0.3 },
        { keyword: "nao funciona", weight: 0.4 },
        { keyword: "cancelar", weight: 0.5 },
        { keyword: "reembolso", weight: 0.5 },
        { keyword: "urgente", weight: 0.3 }
      ]
    }
  }
}
```

### Passo 3: Configurar Analise de Sentimento

```typescript
{
  transfer: {
    sentiment: {
      enabled: true,

      // Transferir se sentimento for muito negativo
      negativeThreshold: -0.7, // -1 a 1

      // Considerar historico da conversa
      considerHistory: true,
      historyWeight: 0.3, // Peso do historico

      // Mensagens consecutivas negativas
      consecutiveNegative: 3 // Transferir apos 3 mensagens negativas
    }
  }
}
```

### Passo 4: Configurar Limites de Conversa

```typescript
{
  transfer: {
    limits: {
      // Maximo de mensagens da IA antes de transferir
      maxAIMessages: 10,

      // Maximo de tempo sem resolucao
      maxDuration: 15 * 60 * 1000, // 15 minutos

      // Transferir se IA responder "nao sei" X vezes
      maxUncertainResponses: 2,

      // Transferir se cliente repetir pergunta
      maxRepeatedQuestions: 2
    }
  }
}
```

### Passo 5: Permitir IA Decidir

Configure para que a IA possa decidir transferir via Tool Use:

```typescript
{
  transfer: {
    aiDecision: {
      enabled: true,

      // Funcao disponivel para IA
      tool: {
        name: "transfer_to_human",
        description: "Transfere para um atendente humano quando necessario",
        parameters: {
          department: {
            type: "string",
            enum: ["vendas", "suporte", "financeiro", "geral"]
          },
          reason: {
            type: "string",
            description: "Motivo da transferencia"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"]
          }
        }
      },

      // Instrucoes para IA
      instructions: `
Transfira para um humano quando:
- Cliente solicitar explicitamente
- Voce nao conseguir ajudar apos 2 tentativas
- Assunto envolver cancelamento, reembolso ou reclamacao
- Cliente parecer muito frustrado
- Assunto for juridico ou tecnico complexo
`
    }
  }
}
```

### Passo 6: Configurar Destino da Transferencia

```typescript
{
  transfer: {
    routing: {
      // Metodo de selecao de destino
      method: "department", // department, agent, queue, round_robin

      // Mapeamento por contexto
      departmentMapping: {
        default: "atendimento",

        rules: [
          {
            conditions: {
              keywords: ["preco", "comprar", "plano"],
              sentiment: "positive"
            },
            department: "vendas"
          },
          {
            conditions: {
              keywords: ["erro", "bug", "nao funciona"]
            },
            department: "suporte"
          },
          {
            conditions: {
              keywords: ["boleto", "pagamento", "nota fiscal"]
            },
            department: "financeiro"
          },
          {
            conditions: {
              keywords: ["cancelar", "encerrar", "reembolso"]
            },
            department: "retencao",
            priority: "high"
          }
        ]
      }
    }
  }
}
```

### Passo 7: Configurar Mensagem de Transferencia

```typescript
{
  transfer: {
    messages: {
      // Mensagem ao transferir
      transferring: "Entendi! Vou transferir voce para um de nossos especialistas que podera ajuda-lo melhor. Um momento, por favor.",

      // Mensagem quando nao ha agentes disponiveis
      noAgentsAvailable: "No momento todos os nossos atendentes estao ocupados. Voce sera atendido assim que possivel. Tempo estimado: {tempo_espera}",

      // Mensagem ao entrar na fila
      queued: "Voce esta na posicao {posicao} da fila. Tempo estimado de espera: {tempo_espera}",

      // Mensagem quando agente assume
      agentAssigned: "Ola! Meu nome e {agente_nome} e vou continuar seu atendimento. Como posso ajudar?"
    }
  }
}
```

## Fluxos de Transferencia

### Transferencia Simples

Cliente solicita humano → Transfere para fila geral

```typescript
{
  flow: "simple",
  settings: {
    askReason: false,
    selectDepartment: false,
    queue: "geral"
  }
}
```

### Transferencia com Triagem

IA coleta informacoes antes de transferir

```typescript
{
  flow: "triage",
  settings: {
    // Perguntas antes de transferir
    questions: [
      {
        question: "Para agilizar, pode me dizer o assunto?",
        options: ["Vendas", "Suporte", "Financeiro", "Outro"],
        required: true
      },
      {
        question: "Qual a urgencia?",
        options: ["Baixa", "Media", "Alta"],
        required: false
      }
    ],

    // Mapear respostas para departamento
    mapping: {
      "Vendas": "vendas",
      "Suporte": "suporte",
      "Financeiro": "financeiro",
      "Outro": "atendimento"
    }
  }
}
```

### Transferencia Inteligente

IA analisa contexto e decide melhor destino

```typescript
{
  flow: "intelligent",
  settings: {
    // IA decide departamento
    aiRouting: true,

    // Considerar historico do cliente
    considerHistory: true,

    // Priorizar agente que ja atendeu
    preferPreviousAgent: true,

    // Balanceamento de carga
    loadBalancing: true
  }
}
```

## Horarios e Disponibilidade

### Configurar Horario de Atendimento Humano

```typescript
{
  transfer: {
    availability: {
      // Horario de atendimento humano
      businessHours: {
        timezone: "America/Sao_Paulo",
        schedule: {
          monday: { start: "09:00", end: "18:00" },
          tuesday: { start: "09:00", end: "18:00" },
          wednesday: { start: "09:00", end: "18:00" },
          thursday: { start: "09:00", end: "18:00" },
          friday: { start: "09:00", end: "17:00" },
          saturday: null,
          sunday: null
        }
      },

      // Comportamento fora do horario
      outsideHours: {
        action: "queue_for_next_day", // queue_for_next_day, ai_only, message

        message: "No momento estamos fora do horario de atendimento. Um agente entrara em contato assim que possivel. Nosso horario: Seg-Sex 9h-18h.",

        // Coletar informacoes para callback
        collectInfo: true,
        infoFields: ["nome", "telefone", "assunto"]
      }
    }
  }
}
```

### Verificar Agentes Online

```typescript
{
  transfer: {
    agentCheck: {
      // Verificar se ha agentes online antes de transferir
      checkOnlineAgents: true,

      // Verificar carga de trabalho
      checkWorkload: true,
      maxTicketsPerAgent: 5,

      // Comportamento se nao houver agentes
      noAgentsAction: "queue", // queue, message, ai_continue
      noAgentsMessage: "Todos os atendentes estao ocupados. Aguarde na fila ou continue com nosso assistente virtual."
    }
  }
}
```

## Metricas de Transferencia

### Dashboard

Acompanhe metricas de transferencia:

| Metrica | Descricao |
|---------|-----------|
| Taxa de transferencia | % de conversas transferidas |
| Motivos | Razoes mais comuns |
| Tempo ate transferencia | Quanto tempo a IA atende antes de transferir |
| Satisfacao pos-transferencia | NPS apos atendimento humano |

### Configurar Alertas

```typescript
{
  transfer: {
    alerts: {
      // Alertar se taxa de transferencia muito alta
      highTransferRate: {
        threshold: 50, // %
        period: "hour",
        action: "email",
        recipients: ["supervisor@empresa.com"]
      },

      // Alertar se fila muito grande
      longQueue: {
        threshold: 10, // pessoas na fila
        action: "notification"
      }
    }
  }
}
```

## Solucao de Problemas

### IA transferindo demais

**Causas**:
- Gatilhos muito sensiveis
- Personalidade muito cautelosa
- Falta de informacoes para IA

**Solucoes**:
1. Revise palavras-chave - remova termos muito comuns
2. Aumente `maxAIMessages`
3. Melhore a base de conhecimento da IA
4. Ajuste threshold de sentimento

```typescript
{
  transfer: {
    keywords: {
      // Remover palavras muito comuns
      immediate: ["gerente", "supervisor"], // Remover "problema"
    },
    limits: {
      maxAIMessages: 15 // Aumentar
    },
    sentiment: {
      negativeThreshold: -0.8 // Mais tolerante
    }
  }
}
```

### IA nao transferindo quando deveria

**Causas**:
- Gatilhos muito restritos
- IA nao reconhece frustacao
- Falta de instrucoes claras

**Solucoes**:
1. Adicione mais palavras-chave
2. Reduza thresholds
3. Melhore instrucoes da IA

```typescript
{
  transfer: {
    keywords: {
      immediate: [
        // Adicionar mais variações
        "quero humano",
        "pessoa real",
        "nao quero robo",
        "falar com alguem"
      ]
    },
    limits: {
      maxAIMessages: 8 // Reduzir
    }
  }
}
```

### Cliente perdido na transferencia

**Causas**:
- Sem agentes disponiveis
- Timeout de conexao
- Erro no sistema

**Solucoes**:
1. Configure mensagens de espera
2. Implemente fila com posicao
3. Adicione fallback para IA

```typescript
{
  transfer: {
    fallback: {
      enabled: true,
      // Se transferencia falhar, voltar para IA
      returnToAI: true,
      message: "Desculpe, nao conseguimos conectar com um atendente. Vou continuar ajudando voce. O que precisa?"
    }
  }
}
```

### Informacoes perdidas na transferencia

**Causa**: Contexto nao e passado para o agente

**Solucao**: Configure passagem de contexto

```typescript
{
  transfer: {
    context: {
      // Passar resumo da conversa
      includeSummary: true,

      // Passar historico completo
      includeFullHistory: true,

      // Passar dados do cliente
      includeCustomerData: true,

      // Passar intencao detectada
      includeIntent: true,

      // Formato do contexto
      format: "structured" // structured, narrative
    }
  }
}
```

## Boas Praticas

### 1. Equilibrio e a Chave

- Nem todas conversas precisam de humano
- Nem todas devem ficar apenas com IA
- Encontre o equilibrio para seu negocio

### 2. Mensagens Claras

- Informe o cliente sobre a transferencia
- De expectativas de tempo de espera
- Explique o que acontecera

### 3. Contexto e Essencial

- Sempre passe o contexto para o agente
- O cliente nao deve repetir tudo

### 4. Monitore e Ajuste

- Revise metricas semanalmente
- Ajuste gatilhos conforme necessario
- Ouca feedback dos agentes

### 5. Treine sua IA

- A melhor transferencia e a que nao precisa acontecer
- Melhore a IA para resolver mais casos

## Proximos Passos

Apos configurar transferencia:

- [Configurar Departamentos](/guias/administracao/departamentos)
- [Configurar SLA](/guias/sla/configuracao)
- [Configurar Usuarios](/guias/administracao/usuarios)
