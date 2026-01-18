---
sidebar_position: 3
title: Mapeamento de Campos
description: Guia para configurar o mapeamento de campos entre ChatBlue e Notion
---

# Mapeamento de Campos

O mapeamento de campos define como os dados sao transferidos entre o ChatBlue e o Notion. Este guia explica como configurar o mapeamento corretamente.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 15-20 minutos

## Por Que Mapear Campos?

| Beneficio | Descricao |
|-----------|-----------|
| Consistencia | Dados corretos em ambos sistemas |
| Automacao | Transferencia automatica de dados |
| Integridade | Tipos de dados compativeis |
| Flexibilidade | Adaptar a sua estrutura existente |

## Tipos de Campo Suportados

### Campos do Notion

| Tipo Notion | Descricao | Exemplo |
|-------------|-----------|---------|
| Title | Titulo da pagina | Nome do contato |
| Rich Text | Texto formatado | Observacoes |
| Number | Numero | Total de tickets |
| Select | Selecao unica | Status |
| Multi-select | Selecao multipla | Tags |
| Date | Data | Data de cadastro |
| Phone | Telefone | Telefone |
| Email | Email | Email |
| URL | Link | Site |
| Checkbox | Sim/Nao | Ativo |
| Relation | Relacao com outra database | Empresa |
| Formula | Campo calculado | Tempo de cliente |
| Rollup | Agregacao de relacao | Total de compras |

### Campos do ChatBlue

| Campo | Tipo | Descricao |
|-------|------|-----------|
| name | string | Nome do contato |
| phone | string | Telefone (formato E.164) |
| email | string | Email |
| company | string | Nome da empresa |
| tags | array | Tags/etiquetas |
| notes | string | Observacoes |
| status | enum | Status do contato |
| source | string | Origem do contato |
| createdAt | date | Data de criacao |
| updatedAt | date | Data de atualizacao |
| lastContact | date | Data do ultimo contato |
| ticketCount | number | Total de tickets |
| rating | number | Avaliacao media |

## Configurar Mapeamento

### Passo 1: Acessar Configuracoes

1. Acesse **Configuracoes > Integracoes > Notion**
2. Clique na aba **Mapeamento de Campos**

![Placeholder: Tela de mapeamento de campos](/img/guias/notion-mapeamento.png)

### Passo 2: Mapear Campos Basicos

| ChatBlue | Notion | Obrigatorio |
|----------|--------|-------------|
| name | Nome (Title) | Sim |
| phone | Telefone (Phone) | Sim |
| email | Email (Email) | Nao |

### Passo 3: Configurar Mapeamento Completo

```typescript
{
  fieldMapping: {
    // Campos obrigatorios
    required: [
      {
        chatblue: "name",
        notion: "Nome",
        notionType: "title",
        transform: null
      },
      {
        chatblue: "phone",
        notion: "Telefone",
        notionType: "phone_number",
        transform: "normalizePhone"
      }
    ],

    // Campos opcionais
    optional: [
      {
        chatblue: "email",
        notion: "Email",
        notionType: "email",
        transform: "lowercase"
      },
      {
        chatblue: "company",
        notion: "Empresa",
        notionType: "relation",
        relationDatabase: "empresas_db_id",
        matchField: "Nome"
      },
      {
        chatblue: "tags",
        notion: "Tags",
        notionType: "multi_select",
        transform: null
      },
      {
        chatblue: "notes",
        notion: "Observacoes",
        notionType: "rich_text",
        transform: null
      },
      {
        chatblue: "status",
        notion: "Status",
        notionType: "select",
        valueMapping: {
          "active": "Ativo",
          "inactive": "Inativo",
          "lead": "Lead"
        }
      },
      {
        chatblue: "createdAt",
        notion: "Data Cadastro",
        notionType: "date",
        transform: "dateToISO"
      },
      {
        chatblue: "ticketCount",
        notion: "Total Tickets",
        notionType: "number",
        transform: null
      }
    ]
  }
}
```

## Transformacoes de Dados

### Transformacoes Disponiveis

| Transformacao | Descricao | Exemplo |
|---------------|-----------|---------|
| normalizePhone | Formata telefone para E.164 | (11) 99999-8888 -> +5511999998888 |
| lowercase | Converte para minusculo | JOAO -> joao |
| uppercase | Converte para maiusculo | joao -> JOAO |
| capitalize | Primeira letra maiuscula | joao silva -> Joao Silva |
| trim | Remove espacos extras | " joao " -> "joao" |
| dateToISO | Converte data para ISO | 15/01/2024 -> 2024-01-15 |
| isoToDate | Converte ISO para data | 2024-01-15 -> 15/01/2024 |
| split | Divide string em array | "a,b,c" -> ["a","b","c"] |
| join | Une array em string | ["a","b","c"] -> "a,b,c" |
| default | Valor padrao se vazio | null -> "Nao informado" |

### Exemplo de Transformacao

```typescript
{
  chatblue: "phone",
  notion: "Telefone",
  notionType: "phone_number",
  transform: {
    type: "normalizePhone",
    options: {
      countryCode: "+55",
      format: "E164"
    }
  }
}
```

### Transformacao Customizada

```typescript
{
  chatblue: "fullName",
  notion: "Nome",
  notionType: "title",
  transform: {
    type: "custom",
    function: "(value) => value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')"
  }
}
```

## Mapeamento de Valores

### Select/Multi-select

```typescript
{
  chatblue: "status",
  notion: "Status",
  notionType: "select",
  valueMapping: {
    // ChatBlue -> Notion
    "active": "Ativo",
    "inactive": "Inativo",
    "pending": "Pendente",
    "blocked": "Bloqueado"
  },
  reverseMapping: {
    // Notion -> ChatBlue
    "Ativo": "active",
    "Inativo": "inactive",
    "Pendente": "pending",
    "Bloqueado": "blocked"
  },
  defaultValue: {
    toNotion: "Novo",
    toChatblue: "pending"
  }
}
```

### Relacoes

```typescript
{
  chatblue: "company",
  notion: "Empresa",
  notionType: "relation",

  // Database relacionada
  relationDatabase: "abc123_empresas",

  // Campo para buscar correspondencia
  matchField: "Nome",

  // Criar se nao existir
  createIfNotExists: true,

  // Template para novo registro
  createTemplate: {
    "Nome": "{value}",
    "Origem": "ChatBlue"
  }
}
```

## Campos Calculados

### Formula no Notion

Se o Notion tem campos calculados (Formula), eles sao somente leitura:

```typescript
{
  chatblue: null, // Nao mapeia para ChatBlue
  notion: "Tempo de Cliente",
  notionType: "formula",
  direction: "notion_to_chatblue", // Apenas leitura
  readOnly: true
}
```

### Campos Computados no ChatBlue

```typescript
{
  chatblue: "ticketCount",
  notion: "Total Tickets",
  notionType: "number",
  computed: true,
  computeFunction: "count(tickets where contact = this)"
}
```

## Mapeamento Avancado

### Campos Condicionais

```typescript
{
  conditionalMapping: [
    {
      condition: {
        field: "status",
        equals: "lead"
      },
      mapping: {
        chatblue: "leadScore",
        notion: "Score Lead",
        notionType: "number"
      }
    },
    {
      condition: {
        field: "status",
        equals: "active"
      },
      mapping: {
        chatblue: "contractValue",
        notion: "Valor Contrato",
        notionType: "number"
      }
    }
  ]
}
```

### Campos Compostos

Combinar multiplos campos:

```typescript
{
  chatblue: "address",
  notion: null,
  type: "composite",
  components: [
    { notion: "Rua", part: "street" },
    { notion: "Numero", part: "number" },
    { notion: "Cidade", part: "city" },
    { notion: "Estado", part: "state" },
    { notion: "CEP", part: "zip" }
  ],
  // Resultado: { street: "...", number: "...", city: "...", state: "...", zip: "..." }
}
```

### Campos de Sistema

```typescript
{
  systemFields: {
    // ID do Notion para referencia
    notionId: {
      storeIn: "externalId",
      type: "notion"
    },

    // URLs
    notionUrl: {
      storeIn: "externalUrl",
      generated: true
    },

    // Timestamps
    notionCreated: {
      storeIn: "notionCreatedAt",
      type: "created_time"
    },
    notionUpdated: {
      storeIn: "notionUpdatedAt",
      type: "last_edited_time"
    }
  }
}
```

## Validacao de Dados

### Regras de Validacao

```typescript
{
  validation: {
    phone: {
      required: true,
      format: "phone",
      minLength: 10,
      maxLength: 15
    },
    email: {
      required: false,
      format: "email"
    },
    name: {
      required: true,
      minLength: 2,
      maxLength: 100
    }
  }
}
```

### Tratamento de Erros de Validacao

```typescript
{
  validation: {
    onError: {
      // Comportamento quando validacao falha
      action: "skip_field", // skip_field, skip_record, error, use_default

      // Valor padrao se skip_field ou use_default
      defaults: {
        phone: null,
        email: null,
        name: "Desconhecido"
      },

      // Logar erros
      logErrors: true
    }
  }
}
```

## Testar Mapeamento

### Via Interface

1. Acesse **Configuracoes > Notion > Mapeamento**
2. Clique em **Testar Mapeamento**
3. Selecione um contato de exemplo
4. Visualize a conversao

![Placeholder: Teste de mapeamento](/img/guias/notion-mapeamento-teste.png)

### Via API

```typescript
// Testar mapeamento
POST /api/notion/mapping/test
{
  "direction": "chatblue_to_notion",
  "data": {
    "name": "Joao Silva",
    "phone": "(11) 99999-8888",
    "email": "JOAO@EMAIL.COM",
    "status": "active"
  }
}

// Resposta
{
  "success": true,
  "result": {
    "Nome": "Joao Silva",
    "Telefone": "+5511999998888",
    "Email": "joao@email.com",
    "Status": "Ativo"
  },
  "transformations": [
    { "field": "phone", "before": "(11) 99999-8888", "after": "+5511999998888" },
    { "field": "email", "before": "JOAO@EMAIL.COM", "after": "joao@email.com" },
    { "field": "status", "before": "active", "after": "Ativo" }
  ]
}
```

## Solucao de Problemas

### Campo nao sincroniza

**Causas**:
- Mapeamento incorreto
- Tipo incompativel
- Campo nao existe em uma das pontas

**Solucao**:
1. Verifique o nome exato do campo no Notion
2. Confirme o tipo do campo
3. Teste o mapeamento individualmente

### Valores nao correspondem

**Causa**: Value mapping incorreto

**Solucao**:
```typescript
// Verificar opcoes disponiveis no Notion
GET /api/notion/database/{id}/properties

// Ajustar valueMapping para corresponder exatamente
```

### Erro de tipo de dados

**Causa**: Tipo incompativel

**Verificacoes**:
- Number no ChatBlue -> Number no Notion (OK)
- String no ChatBlue -> Number no Notion (ERRO)
- Array no ChatBlue -> Multi-select no Notion (OK)

### Relacao nao encontrada

**Causas**:
- Database relacionada incorreta
- Campo de match incorreto
- Valor nao existe na database relacionada

**Solucao**:
```typescript
{
  relation: {
    // Verificar se createIfNotExists esta ativo
    createIfNotExists: true,

    // Ou buscar por campo diferente
    matchField: "Telefone" // Em vez de "Nome"
  }
}
```

## Boas Praticas

### 1. Comece Simples

- Mapeie campos essenciais primeiro (nome, telefone)
- Adicione campos opcionais gradualmente
- Teste cada adicao

### 2. Use Transformacoes

- Normalize telefones para formato padrao
- Padronize capitalizacao de nomes
- Converta datas para formato consistente

### 3. Documente o Mapeamento

- Mantenha registro das configuracoes
- Documente transformacoes customizadas
- Registre value mappings

### 4. Valide Regularmente

- Teste apos mudancas no Notion
- Verifique se novos campos precisam de mapeamento
- Revise logs de sincronizacao

## Proximos Passos

Apos configurar mapeamento:

- [Configurar Sincronizacao](/guias/notion/sincronizacao)
- [Configurar IA com Dados do Notion](/guias/inteligencia-artificial/personalidade)
- [Configurar Departamentos](/guias/administracao/departamentos)
