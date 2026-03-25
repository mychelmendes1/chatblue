---
sidebar_position: 1
title: AI Assistant API
description: Endpoints da API do AI Assistant para gerenciamento de fontes de dados, documentos, agentes e consultas inteligentes
---

# AI Assistant API

API completa para gerenciamento do assistente de IA do ChatBlue, incluindo fontes de dados, documentos, configuracoes de agentes, consultas e analytics.

## Autenticacao

Todos os endpoints requerem autenticacao via JWT e tenant.

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

---

## Queries (Consultas)

### Criar consulta

```
POST /api/ai-assistant/query
```

Processa uma consulta ao assistente de IA (`@ia`).

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `query` | string | Sim | Texto da consulta (1-2000 caracteres) |
| `ticketId` | string | Sim | ID do ticket associado |
| `selectedCategory` | string | Nao | Categoria especifica para direcionar a consulta |
| `includeContext` | boolean | Nao | Incluir contexto do ticket (padrao: true) |

**Response (200)**

```json
{
  "suggestedResponse": "Resposta sugerida pela IA...",
  "category": "suporte-tecnico",
  "confidence": 0.92,
  "relevantDocuments": [...],
  "processingMetrics": {
    "totalTime": 1250
  }
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados de requisicao invalidos (ZodError) |
| 500 | Falha ao processar consulta |

---

### Obter status da consulta

```
GET /api/ai-assistant/query/:queryId
```

Retorna o status e detalhes de uma consulta especifica.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `queryId` | string | ID da consulta |

**Response (200)**

Retorna o objeto completo da consulta com status, resposta e metricas.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 403 | Acesso negado (consulta de outra empresa) |
| 404 | Consulta nao encontrada |

---

### Enviar feedback

```
POST /api/ai-assistant/query/:queryId/feedback
```

Registra feedback do atendente sobre a resposta sugerida.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `queryId` | string | ID da consulta |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `wasUsed` | boolean | Sim | Se a resposta foi utilizada |
| `wasEdited` | boolean | Nao | Se a resposta foi editada antes do uso (padrao: false) |
| `editedResponse` | string | Nao | Texto da resposta editada |
| `rating` | number | Nao | Avaliacao de 1 a 5 |
| `ratingComment` | string | Nao | Comentario sobre a avaliacao (max 500 caracteres) |

**Response (200)**

```json
{
  "success": true
}
```

---

### Historico de consultas do ticket

```
GET /api/ai-assistant/ticket/:ticketId/history
```

Retorna o historico de consultas ao AI para um ticket especifico.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `ticketId` | string | ID do ticket |

**Response (200)**

Retorna array com todas as consultas realizadas para o ticket.

---

## Categories (Categorias)

### Listar categorias

```
GET /api/ai-assistant/categories
```

Retorna as categorias de IA disponiveis para a empresa.

**Response (200)**

Retorna array de categorias configuradas com seus respectivos agentes.

---

## Knowledge Gaps (Lacunas de Conhecimento)

### Listar lacunas

```
GET /api/ai-assistant/gaps
```

Retorna lacunas de conhecimento identificadas pelo sistema.

**Query Parameters**

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `status` | string | - | Filtrar por status da lacuna |
| `limit` | number | 20 | Quantidade maxima de resultados |

**Response (200)**

Retorna array de lacunas de conhecimento com informacoes sobre frequencia e impacto.

---

### Atualizar lacuna

```
PUT /api/ai-assistant/gaps/:gapId
```

Atualiza o status de uma lacuna de conhecimento.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `gapId` | string | ID da lacuna |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `status` | string | Sim | Novo status da lacuna |

**Response (200)**

```json
{
  "success": true
}
```

---

## Data Sources (Fontes de Dados)

### Listar fontes de dados

```
GET /api/ai-assistant/data-sources
```

Retorna todas as fontes de dados da empresa, ordenadas por prioridade e nome.

**Response (200)**

```json
[
  {
    "id": "clds01xxxxxxxxxxxxx",
    "name": "Base de Conhecimento Interna",
    "type": "INTERNAL",
    "description": "Documentos internos da empresa",
    "config": {},
    "category": "suporte",
    "tags": ["faq", "suporte"],
    "priority": 10,
    "syncEnabled": true,
    "syncInterval": 60,
    "_count": {
      "documents": 45
    }
  }
]
```

---

### Criar fonte de dados

```
POST /api/ai-assistant/data-sources
```

Cria uma nova fonte de dados para o assistente de IA.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome da fonte (1-100 caracteres) |
| `type` | string | Sim | Tipo: `INTERNAL`, `NOTION`, `GOOGLE_DRIVE`, `CONFLUENCE`, `SHAREPOINT`, `EXTERNAL_API`, `WEBSITE` |
| `description` | string | Nao | Descricao (max 500 caracteres) |
| `config` | object | Nao | Configuracoes especificas do tipo (padrao: {}) |
| `category` | string | Nao | Categoria da fonte |
| `tags` | string[] | Nao | Tags para organizacao (padrao: []) |
| `priority` | number | Nao | Prioridade de busca (padrao: 0) |
| `icon` | string | Nao | Icone para exibicao |
| `color` | string | Nao | Cor para exibicao |
| `syncEnabled` | boolean | Nao | Habilitar sincronizacao automatica (padrao: true) |
| `syncInterval` | number | Nao | Intervalo de sincronizacao em minutos (padrao: 60) |

**Response (201)**

Retorna o objeto da fonte de dados criada.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos (ZodError) |

---

### Obter fonte de dados

```
GET /api/ai-assistant/data-sources/:id
```

Retorna detalhes de uma fonte de dados, incluindo documentos e agentes vinculados.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da fonte de dados |

**Response (200)**

Retorna a fonte de dados com os 50 documentos mais recentes e as configuracoes de agentes associadas.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Fonte de dados nao encontrada |

---

### Atualizar fonte de dados

```
PUT /api/ai-assistant/data-sources/:id
```

Atualiza uma fonte de dados existente. Aceita atualizacao parcial dos campos.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da fonte de dados |

**Request Body**

Mesmos campos de criacao, todos opcionais (atualizacao parcial).

**Response (200)**

Retorna o objeto atualizado.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos |
| 404 | Fonte de dados nao encontrada |

---

### Deletar fonte de dados

```
DELETE /api/ai-assistant/data-sources/:id
```

Remove uma fonte de dados.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da fonte de dados |

**Response (200)**

```json
{
  "success": true
}
```

---

### Sincronizar fonte de dados

```
POST /api/ai-assistant/data-sources/:id/sync
```

Dispara sincronizacao manual de uma fonte de dados externa.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da fonte de dados |

**Response (200)**

Retorna o resultado da sincronizacao com contagem de documentos atualizados.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Fonte de dados nao encontrada |

---

## Documents (Documentos)

### Listar documentos

```
GET /api/ai-assistant/documents
```

Lista documentos da base de conhecimento com suporte a filtros e paginacao.

**Query Parameters**

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `dataSourceId` | string | - | Filtrar por fonte de dados |
| `category` | string | - | Filtrar por categoria |
| `status` | string | - | Filtrar por status |
| `search` | string | - | Busca por titulo ou conteudo (case insensitive) |
| `page` | number | 1 | Numero da pagina |
| `limit` | number | 20 | Itens por pagina |

**Response (200)**

```json
{
  "documents": [
    {
      "id": "cldoc01xxxxxxxxxxxxx",
      "title": "Como resetar senha",
      "status": "INDEXED",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:05:00.000Z",
      "dataSource": {
        "id": "clds01xxxxxxxxxxxxx",
        "name": "Base Interna",
        "type": "INTERNAL"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

---

### Criar documento

```
POST /api/ai-assistant/documents
```

Cria um novo documento e dispara indexacao automatica.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `title` | string | Sim | Titulo do documento (1-200 caracteres) |
| `content` | string | Sim | Conteudo do documento |
| `category` | string | Nao | Categoria |
| `tags` | string[] | Nao | Tags (padrao: []) |
| `dataSourceId` | string | Sim | ID da fonte de dados associada |
| `departmentId` | string | Nao | ID do departamento |

**Response (201)**

Retorna o documento criado com status `PENDING` (indexacao em andamento).

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos ou fonte de dados invalida |

---

### Atualizar documento

```
PUT /api/ai-assistant/documents/:id
```

Atualiza um documento e dispara re-indexacao automatica. O status volta para `PENDING`.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do documento |

**Request Body**

Mesmos campos de criacao, todos opcionais (atualizacao parcial).

**Response (200)**

Retorna o documento atualizado.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos |
| 404 | Documento nao encontrado |

---

### Deletar documento

```
DELETE /api/ai-assistant/documents/:id
```

Remove um documento (soft delete - marca como inativo).

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do documento |

**Response (200)**

```json
{
  "success": true
}
```

---

### Re-indexar documento

```
POST /api/ai-assistant/documents/:id/reindex
```

Forca a re-indexacao de um documento especifico no sistema de embeddings.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do documento |

**Response (200)**

Retorna o documento atualizado com novo status de indexacao.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | IA nao configurada para a empresa |
| 404 | Documento nao encontrado |

---

## Agent Configs (Configuracoes de Agente)

### Listar configuracoes

```
GET /api/ai-assistant/agent-configs
```

Retorna todas as configuracoes de agentes de IA da empresa, ordenadas por padrao, prioridade e nome.

**Response (200)**

```json
[
  {
    "id": "clagent01xxxxxxxxxxxxx",
    "name": "Agente de Suporte Tecnico",
    "category": "suporte-tecnico",
    "description": "Especialista em questoes tecnicas",
    "systemPrompt": "Voce e um especialista...",
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.7,
    "maxTokens": 1500,
    "tone": "friendly",
    "style": "detailed",
    "isDefault": true,
    "priority": 10,
    "dataSources": [
      {
        "dataSource": {
          "id": "clds01xxxxxxxxxxxxx",
          "name": "Base Tecnica",
          "type": "INTERNAL"
        }
      }
    ],
    "_count": {
      "queries": 234
    }
  }
]
```

---

### Criar configuracao

```
POST /api/ai-assistant/agent-configs
```

Cria uma nova configuracao de agente de IA.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome do agente (1-100 caracteres) |
| `category` | string | Sim | Categoria unica (1-50 caracteres) |
| `description` | string | Nao | Descricao (max 500 caracteres) |
| `systemPrompt` | string | Sim | Prompt do sistema (1-10000 caracteres) |
| `provider` | string | Sim | Provedor: `openai` ou `anthropic` |
| `model` | string | Sim | ID do modelo de IA |
| `temperature` | number | Nao | Temperatura 0-2 (padrao: 0.7) |
| `maxTokens` | number | Nao | Max tokens 100-4000 (padrao: 1500) |
| `tone` | string | Nao | Tom: `friendly`, `formal`, `technical`, `empathetic` |
| `style` | string | Nao | Estilo: `concise`, `detailed`, `conversational` |
| `rules` | object | Nao | Regras adicionais (padrao: {}) |
| `triggerKeywords` | string[] | Nao | Palavras-chave de ativacao (padrao: []) |
| `priority` | number | Nao | Prioridade (padrao: 0) |
| `icon` | string | Nao | Icone |
| `color` | string | Nao | Cor |
| `isDefault` | boolean | Nao | Definir como agente padrao (padrao: false) |
| `dataSourceIds` | string[] | Nao | IDs das fontes de dados vinculadas (padrao: []) |

**Response (201)**

Retorna a configuracao criada com fontes de dados associadas.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos ou categoria ja existe |

---

### Obter configuracao

```
GET /api/ai-assistant/agent-configs/:id
```

Retorna detalhes de uma configuracao de agente, incluindo fontes de dados completas.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da configuracao |

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Configuracao nao encontrada |

---

### Atualizar configuracao

```
PUT /api/ai-assistant/agent-configs/:id
```

Atualiza uma configuracao de agente. Se `dataSourceIds` for fornecido, as associacoes sao recriadas.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da configuracao |

**Request Body**

Mesmos campos de criacao, todos opcionais (atualizacao parcial).

**Response (200)**

Retorna a configuracao atualizada com fontes de dados.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos ou categoria ja existe |

---

### Deletar configuracao

```
DELETE /api/ai-assistant/agent-configs/:id
```

Remove uma configuracao de agente e limpa o cache do orquestrador.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da configuracao |

**Response (200)**

```json
{
  "success": true
}
```

---

### Testar agente

```
POST /api/ai-assistant/agent-configs/:id/test
```

Testa uma configuracao de agente com uma consulta de exemplo.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da configuracao |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `query` | string | Sim | Texto da consulta de teste |

**Response (200)**

```json
{
  "response": "Resposta gerada pelo agente...",
  "category": "suporte-tecnico",
  "confidence": 0.89,
  "documentsFound": 3,
  "processingTime": 1450
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Query obrigatoria ou IA nao configurada |
| 404 | Configuracao nao encontrada |

---

## Analytics

### Obter analytics

```
GET /api/ai-assistant/analytics
```

Retorna metricas de uso do assistente de IA.

**Query Parameters**

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `startDate` | string | 30 dias atras | Data inicial (ISO 8601) |
| `endDate` | string | agora | Data final (ISO 8601) |

**Response (200)**

Retorna metricas agregadas incluindo total de consultas, taxa de uso, ratings medios e distribuicao por categoria.

---

## Models (Modelos)

### Listar modelos disponiveis

```
GET /api/ai-assistant/models
```

Retorna a lista de modelos de IA disponiveis por provedor.

**Response (200)**

```json
{
  "openai": [
    {
      "id": "gpt-4-turbo-preview",
      "name": "GPT-4 Turbo",
      "description": "Modelo mais capaz da OpenAI"
    },
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "description": "Modelo otimizado multimodal"
    },
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4o Mini",
      "description": "Versao mais rapida e economica"
    },
    {
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo",
      "description": "Modelo rapido e economico"
    }
  ],
  "anthropic": [
    {
      "id": "claude-opus-4-6",
      "name": "Claude Opus 4",
      "description": "Modelo mais inteligente da Anthropic"
    },
    {
      "id": "claude-sonnet-4-6",
      "name": "Claude Sonnet 4",
      "description": "Equilibrio entre capacidade e velocidade"
    },
    {
      "id": "claude-3-5-sonnet-20241022",
      "name": "Claude 3.5 Sonnet",
      "description": "Excelente equilibrio"
    },
    {
      "id": "claude-3-haiku-20240307",
      "name": "Claude 3 Haiku",
      "description": "Modelo mais rapido e economico"
    }
  ]
}
```

---

## Erros Comuns

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados de requisicao invalidos |
| 401 | Token de autenticacao invalido ou expirado |
| 403 | Acesso negado |
| 404 | Recurso nao encontrado |
| 500 | Erro interno do servidor |

## Notas Importantes

1. **Cache**: Alteracoes em configuracoes de agentes limpam automaticamente o cache do orquestrador.

2. **Indexacao**: Documentos criados ou atualizados sao indexados automaticamente. Se a indexacao falhar, o documento e salvo mas precisa ser re-indexado manualmente.

3. **Soft Delete**: Documentos deletados sao marcados como inativos, nao removidos fisicamente.

4. **Categorias Unicas**: Cada configuracao de agente deve ter uma categoria unica por empresa.

5. **Agente Padrao**: Ao definir um agente como padrao, o flag e removido dos demais agentes da empresa.
