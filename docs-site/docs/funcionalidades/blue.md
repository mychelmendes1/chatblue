---
sidebar_position: 15
title: Blue Assistant
description: Assistente interno Blue para atendentes do ChatBlue
---

# Blue Assistant

O Blue e o assistente interno inteligente do ChatBlue, projetado para ajudar **atendentes** (nao clientes) a utilizar o sistema de forma mais eficiente. Ele aparece como um mascote azul no canto da interface (componente `BlueMascot`) e oferece dicas contextuais e chat livre.

## Visao Geral

O Blue funciona em dois modos:

1. **Dicas Contextuais** (`context-tip`) - O Blue analisa a pagina atual e oferece uma dica relevante automaticamente
2. **Chat Livre** (`chat`) - O atendente pode fazer perguntas ao Blue sobre como usar o sistema

O Blue utiliza RAG (Retrieval-Augmented Generation) com duas fontes de contexto:

- **CodeRAG** - Busca no codigo-fonte do sistema para entender funcionalidades
- **DocRAG** - Busca na documentacao do sistema para referencias precisas

Isso permite que o Blue responda com base no funcionamento real do sistema, nao apenas em conhecimento generico.

## Personalidade

O Blue possui uma personalidade definida:

- **Tom** - Amigavel e profissional
- **Estilo** - Conciso mas completo
- **Abordagem** - Usa exemplos praticos quando possivel
- **Honestidade** - Quando nao tem certeza, informa ao usuario

## Modos de Funcionamento

### Dicas Contextuais

Quando o atendente navega pelo sistema, o Blue pode oferecer dicas curtas (maximo 2 frases) sobre como usar a pagina atual de forma eficiente.

**Fluxo:**

1. O frontend envia o contexto da pagina atual (`route`, `routeParams`, `searchParams`, etc.)
2. O `BlueContextBuilder` constroi uma query semantica a partir do contexto
3. O `CodeRAGService` busca trechos de codigo relevantes para a pagina
4. O `DocRAGService` busca documentacao relevante
5. O Blue gera uma dica curta usando um modelo rapido e economico

**Configuracao de geracao:**
- Temperatura: 0.7
- Max tokens: 150 (dicas curtas)
- Modelo: `gpt-4o-mini` (OpenAI) ou `claude-3-haiku` (Anthropic)

### Chat Livre

O atendente pode fazer perguntas ao Blue sobre qualquer aspecto do sistema. O chat mantem historico das ultimas 5 mensagens para contexto da conversa.

**Fluxo:**

1. O atendente envia uma mensagem de texto
2. O contexto da pagina atual e incluido
3. O historico da conversa (ultimas 5 mensagens) e anexado
4. CodeRAG e DocRAG buscam informacoes relevantes para a pergunta
5. O Blue gera uma resposta detalhada

**Configuracao de geracao:**
- Temperatura: 0.8
- Max tokens: 500 (respostas mais elaboradas)
- Modelo: `gpt-4o-mini` (OpenAI) ou `claude-3-haiku` (Anthropic)

## Contexto de Pagina

Ambos os modos recebem um objeto de contexto (`PageContext`) que descreve onde o atendente esta no sistema:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `route` | string | Rota atual (ex: `/tickets`, `/contacts`) |
| `routeParams` | Record | Parametros da rota (ex: `{ id: "abc123" }`) |
| `searchParams` | Record | Parametros de busca da URL |
| `ticketId` | string | ID do ticket atual (se aplicavel) |
| `contactId` | string | ID do contato atual (se aplicavel) |
| `departmentId` | string | ID do departamento (se aplicavel) |
| `metadata` | Record | Dados adicionais (status do ticket, se e IA, etc.) |

## Analytics

Cada interacao com o Blue e registrada no model `BlueInteraction` para analytics:

- **userId** - Quem interagiu
- **companyId** - Empresa do usuario
- **type** - Tipo da interacao (`tip` ou `chat`)
- **context** - Contexto da pagina no momento
- **message** - Mensagem enviada (apenas no chat)
- **response** - Resposta gerada pelo Blue
- **page** - Rota da pagina

Esses dados permitem analisar quais paginas geram mais duvidas, quais perguntas sao mais frequentes e como o Blue esta sendo utilizado.

## Endpoints da API

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `POST` | `/api/blue/context-tip` | Recebe contexto da pagina e retorna uma dica contextual |
| `POST` | `/api/blue/chat` | Chat livre com o Blue |

### POST /api/blue/context-tip

**Request body:**

```json
{
  "context": {
    "route": "/tickets/abc123",
    "routeParams": { "id": "abc123" },
    "ticketId": "abc123",
    "metadata": { "ticketStatus": "OPEN", "isAIHandled": false }
  }
}
```

**Response:**

```json
{
  "tip": "Voce pode usar o atalho Ctrl+Enter para enviar mensagens rapidamente neste ticket."
}
```

### POST /api/blue/chat

**Request body:**

```json
{
  "message": "Como funciona o sistema de SLA?",
  "context": {
    "route": "/tickets",
    "metadata": {}
  },
  "history": [
    { "role": "user", "content": "Oi Blue" },
    { "role": "assistant", "content": "Ola! Como posso ajudar?" }
  ]
}
```

**Response:**

```json
{
  "response": "O sistema de SLA permite definir prazos de atendimento por prioridade..."
}
```

## Arquitetura

```
Frontend (BlueMascot component)
    |
    v
[POST /api/blue/context-tip]  ou  [POST /api/blue/chat]
    |
    v
BlueService
    |
    v
BlueContextBuilder
    |--- CodeRAGService (busca codigo-fonte)
    |--- DocRAGService (busca documentacao)
    |
    v
AIService (gera resposta com modelo rapido)
    |
    v
BlueInteraction (salva analytics)
```

## Configuracao

### Ativar/Desativar o Blue

O Blue e controlado pela configuracao `CompanySettings.blueEnabled`. Quando desabilitado, ambos os endpoints retornam erro 403.

### Pre-requisitos

Para o Blue funcionar, a empresa precisa ter:

- `blueEnabled` = `true` nas configuracoes da empresa
- `aiEnabled` = `true` - IA habilitada
- `aiProvider` - Provedor configurado (`openai` ou `anthropic`)
- `aiApiKey` - Chave de API valida

Se qualquer pre-requisito nao for atendido, o endpoint retorna 403 com mensagem descritiva.

### Selecao de Modelo

O Blue utiliza automaticamente o modelo mais rapido e economico do provedor configurado:

- **OpenAI**: `gpt-4o-mini`
- **Anthropic**: `claude-3-haiku-20240307`

Isso garante respostas rapidas com baixo custo, adequado para dicas curtas e respostas de assistencia.
