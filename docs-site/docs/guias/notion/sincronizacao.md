---
sidebar_position: 2
title: Sincronizacao com Notion
description: Guia para configurar a sincronizacao de contatos entre ChatBlue e Notion
---

# Sincronizacao com Notion

A sincronizacao permite manter os dados de contatos atualizados entre o ChatBlue e o Notion. Este guia explica como configurar e gerenciar essa funcionalidade.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 15-20 minutos

## Modos de Sincronizacao

| Modo | Descricao | Uso Recomendado |
|------|-----------|-----------------|
| Notion para ChatBlue | Dados do Notion sao a fonte da verdade | Notion e o CRM principal |
| ChatBlue para Notion | Novos contatos do WhatsApp vao para Notion | Captura de leads |
| Bidirecional | Sincroniza em ambas direcoes | Equipes usando ambos sistemas |
| Manual | Sincroniza apenas quando solicitado | Controle total |

## Pre-requisitos

- [ ] Integracao Notion configurada ([ver guia](/guias/notion/configuracao))
- [ ] Database de contatos conectada
- [ ] Mapeamento de campos configurado

## Configurar Sincronizacao

### Passo 1: Acessar Configuracoes

1. Acesse **Configuracoes > Integracoes > Notion**
2. Clique na aba **Sincronizacao**

### Passo 2: Escolher Modo

```typescript
{
  sync: {
    // Modo de sincronizacao
    mode: "bidirectional", // notion_to_chatblue, chatblue_to_notion, bidirectional, manual

    // Ativar sincronizacao automatica
    autoSync: true,

    // Intervalo (em minutos)
    interval: 30
  }
}
```

### Passo 3: Configurar Gatilhos

```typescript
{
  sync: {
    triggers: {
      // Sincronizar ao receber mensagem de novo contato
      onNewMessage: true,

      // Sincronizar ao criar contato no ChatBlue
      onContactCreate: true,

      // Sincronizar ao atualizar contato
      onContactUpdate: true,

      // Sincronizar ao fechar ticket
      onTicketClose: true,

      // Sincronizacao periodica
      scheduled: {
        enabled: true,
        cron: "0 */30 * * * *" // A cada 30 minutos
      }
    }
  }
}
```

## Sincronizacao Notion para ChatBlue

### Configuracao

```typescript
{
  sync: {
    notionToChatblue: {
      enabled: true,

      // Quando sincronizar
      triggers: ["scheduled", "onWebhook"],

      // Filtros do Notion
      filter: {
        property: "Status",
        select: { equals: "Ativo" }
      },

      // Campos a importar
      fields: [
        { notion: "Nome", chatblue: "name" },
        { notion: "Telefone", chatblue: "phone" },
        { notion: "Email", chatblue: "email" },
        { notion: "Empresa", chatblue: "company" },
        { notion: "Tags", chatblue: "tags" }
      ],

      // Comportamento para registros existentes
      onExisting: "update" // update, skip, error
    }
  }
}
```

### Processo de Importacao

```
┌─────────────────────────────────────────────────────────────┐
│                    Notion Database                           │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Joao     │ │ Maria    │ │ Pedro    │ │ Ana      │       │
│  │ Ativo    │ │ Ativo    │ │ Inativo  │ │ Ativo    │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Filtro                                  │
│                (Status = Ativo)                              │
└──────────┬────────────┬──────────────────────┬──────────────┘
           │            │                      │
           ▼            ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│                     ChatBlue                                  │
│                                                               │
│  ┌──────────┐ ┌──────────┐             ┌──────────┐          │
│  │ Joao     │ │ Maria    │             │ Ana      │          │
│  │ Importado│ │ Importado│             │ Importado│          │
│  └──────────┘ └──────────┘             └──────────┘          │
│                                                               │
│                    (Pedro excluido pelo filtro)              │
└──────────────────────────────────────────────────────────────┘
```

## Sincronizacao ChatBlue para Notion

### Configuracao

```typescript
{
  sync: {
    chatblueToNotion: {
      enabled: true,

      // Quando sincronizar
      triggers: ["onContactCreate", "onContactUpdate", "onTicketClose"],

      // Criar nova pagina se contato nao existe no Notion
      createIfNotExists: true,

      // Campos a exportar
      fields: [
        { chatblue: "name", notion: "Nome" },
        { chatblue: "phone", notion: "Telefone" },
        { chatblue: "email", notion: "Email" },
        { chatblue: "createdAt", notion: "Data Cadastro" },
        { chatblue: "source", notion: "Origem" },
        { chatblue: "lastContact", notion: "Ultimo Contato" },
        { chatblue: "ticketCount", notion: "Total Tickets" }
      ],

      // Template para novas paginas
      newPageTemplate: {
        "Status": "Novo Lead",
        "Origem": "WhatsApp ChatBlue"
      }
    }
  }
}
```

### Mapeamento de Novos Contatos

```typescript
// Quando um novo contato envia mensagem no WhatsApp
{
  onNewContact: {
    // Criar automaticamente no Notion
    createInNotion: true,

    // Dados iniciais
    initialData: {
      "Nome": "{contato.pushName || contato.phone}",
      "Telefone": "{contato.phone}",
      "Origem": "WhatsApp",
      "Data Entrada": "{data_atual}",
      "Status": "Novo Lead",
      "Primeiro Contato": "{ticket.firstMessage}"
    }
  }
}
```

## Sincronizacao Bidirecional

### Configuracao

```typescript
{
  sync: {
    bidirectional: {
      enabled: true,

      // Prioridade em caso de conflito
      conflictResolution: "newest", // newest, notion_wins, chatblue_wins, manual

      // Campos sincronizados em ambas direcoes
      fields: [
        {
          chatblue: "name",
          notion: "Nome",
          sync: "bidirectional"
        },
        {
          chatblue: "email",
          notion: "Email",
          sync: "bidirectional"
        },
        {
          chatblue: "company",
          notion: "Empresa",
          sync: "notion_to_chatblue" // Apenas nessa direcao
        },
        {
          chatblue: "ticketCount",
          notion: "Total Tickets",
          sync: "chatblue_to_notion" // Apenas nessa direcao
        }
      ]
    }
  }
}
```

### Resolucao de Conflitos

```
┌─────────────────────────────────────────────────────────────┐
│                   Conflito Detectado                         │
│                                                              │
│  Notion: Nome = "Joao da Silva"  (atualizado 10:00)        │
│  ChatBlue: Nome = "Joao Silva"   (atualizado 10:05)        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Estrategia de Resolucao                      │
├─────────────────────────────────────────────────────────────┤
│  newest:         "Joao Silva" (ChatBlue - mais recente)     │
│  notion_wins:    "Joao da Silva"                            │
│  chatblue_wins:  "Joao Silva"                               │
│  manual:         Notifica administrador para decidir        │
└─────────────────────────────────────────────────────────────┘
```

## Sincronizacao Incremental

Para grandes volumes de dados, use sincronizacao incremental:

```typescript
{
  sync: {
    incremental: {
      enabled: true,

      // Sincronizar apenas registros modificados
      onlyModified: true,

      // Usar campo de data de modificacao
      lastModifiedField: {
        notion: "Ultima Atualizacao",
        chatblue: "updatedAt"
      },

      // Janela de tempo para verificar mudancas
      lookbackMinutes: 60
    }
  }
}
```

## Sincronizacao Manual

### Via Interface

1. Acesse **Configuracoes > Notion > Sincronizacao**
2. Clique em **Sincronizar Agora**
3. Selecione a direcao
4. Acompanhe o progresso

![Placeholder: Interface de sincronizacao manual](/img/guias/notion-sync-manual.png)

### Via API

```typescript
// Iniciar sincronizacao
POST /api/notion/sync
{
  "direction": "bidirectional",
  "fullSync": false
}

// Verificar status
GET /api/notion/sync/status

// Resposta
{
  "status": "running",
  "progress": {
    "total": 1000,
    "processed": 450,
    "created": 10,
    "updated": 35,
    "errors": 2
  },
  "startedAt": "2024-01-15T10:00:00Z",
  "estimatedCompletion": "2024-01-15T10:15:00Z"
}
```

## Logs e Historico

### Visualizar Logs

```typescript
// Obter logs de sincronizacao
GET /api/notion/sync/logs?limit=100

// Resposta
{
  "logs": [
    {
      "id": "log_123",
      "timestamp": "2024-01-15T10:00:00Z",
      "type": "sync_complete",
      "direction": "bidirectional",
      "stats": {
        "created": 5,
        "updated": 23,
        "deleted": 0,
        "errors": 1
      }
    },
    {
      "id": "log_124",
      "timestamp": "2024-01-15T10:00:01Z",
      "type": "sync_error",
      "error": "Telefone duplicado",
      "contact": "5511999998888"
    }
  ]
}
```

### Exportar Historico

```typescript
// Exportar historico de sincronizacao
GET /api/notion/sync/export?format=csv&period=30d
```

## Tratamento de Erros

### Erros Comuns

| Erro | Causa | Solucao |
|------|-------|---------|
| Telefone duplicado | Contato ja existe | Usar merge ou skip |
| Campo obrigatorio vazio | Dado faltando | Preencher no Notion |
| Formato invalido | Tipo de dado incorreto | Corrigir formato |
| Rate limit | Muitas requisicoes | Aumentar intervalo |

### Configurar Tratamento

```typescript
{
  sync: {
    errorHandling: {
      // Comportamento em caso de erro
      onError: "skip", // skip, retry, stop

      // Numero de tentativas
      maxRetries: 3,

      // Intervalo entre tentativas (ms)
      retryDelay: 5000,

      // Notificar em caso de erro
      notifyOnError: true,
      notifyEmail: "admin@empresa.com",

      // Quarentena para erros repetidos
      quarantine: {
        enabled: true,
        maxErrors: 5,
        duration: 24 * 60 * 60 * 1000 // 24 horas
      }
    }
  }
}
```

## Performance

### Otimizacao para Grande Volume

```typescript
{
  sync: {
    performance: {
      // Processar em lotes
      batchSize: 100,

      // Processamento paralelo
      concurrency: 5,

      // Rate limit para API do Notion
      rateLimit: {
        requests: 3,
        perSecond: 1
      },

      // Cache de dados
      cache: {
        enabled: true,
        ttl: 300 // 5 minutos
      }
    }
  }
}
```

### Agendamento Inteligente

```typescript
{
  sync: {
    schedule: {
      // Sincronizacao completa uma vez por dia
      fullSync: {
        cron: "0 0 3 * * *", // 3h da manha
        enabled: true
      },

      // Sincronizacao incremental frequente
      incrementalSync: {
        cron: "0 */15 * * * *", // A cada 15 minutos
        enabled: true
      },

      // Pausar durante horario de pico
      pauseDuring: {
        start: "10:00",
        end: "12:00"
      }
    }
  }
}
```

## Solucao de Problemas

### Sincronizacao nao inicia

**Verificacoes**:
1. Integracao esta conectada?
2. Database tem permissoes corretas?
3. Cron esta configurado?

```bash
# Verificar status do job de sincronizacao
pnpm --filter api jobs:status notion-sync
```

### Dados nao atualizando

**Causas**:
- Filtros muito restritivos
- Campo de busca incorreto
- Cache desatualizado

**Solucoes**:
1. Revise os filtros de sincronizacao
2. Verifique o mapeamento de campos
3. Limpe o cache: `POST /api/notion/cache/clear`

### Muitos erros de duplicacao

**Solucao**: Configure merge de contatos

```typescript
{
  sync: {
    merge: {
      enabled: true,
      matchField: "phone", // Campo para identificar duplicatas
      strategy: "update" // update, skip, create_new
    }
  }
}
```

## Boas Praticas

### 1. Comece Pequeno

- Teste com poucos registros primeiro
- Valide o mapeamento de campos
- Expanda gradualmente

### 2. Use Filtros

- Sincronize apenas dados relevantes
- Exclua registros inativos ou de teste

### 3. Monitore Regularmente

- Verifique logs de sincronizacao
- Configure alertas para erros
- Revise dados periodicamente

### 4. Faca Backups

- Exporte dados antes de grandes sincronizacoes
- Tenha plano de rollback

## Proximos Passos

Apos configurar sincronizacao:

- [Configurar Mapeamento de Campos](/guias/notion/mapeamento-campos)
- [Configurar IA com Contexto do Notion](/guias/inteligencia-artificial/personalidade)
- [Configurar SLA](/guias/sla/configuracao)
