---
sidebar_position: 14
title: Assistente IA Avancado
description: Sistema de assistente IA com comando @ia para atendentes do ChatBlue
---

# Assistente IA Avancado

O Assistente IA Avancado permite que atendentes consultem uma base de conhecimento inteligente diretamente no chat usando o comando `@ia`. O sistema busca informacoes em multiplas fontes de dados, utiliza IAs especializadas por categoria e gera respostas contextuais com rastreabilidade completa.

## Visao Geral

O fluxo basico funciona assim:

1. O atendente digita `@ia` seguido da pergunta no chat do ticket
2. O sistema detecta a **categoria** mais adequada (vendas, suporte, financeiro, etc.)
3. A IA especializada busca nas **fontes de dados** relevantes
4. Uma **resposta contextual** e gerada com base nos documentos encontrados
5. O atendente pode usar a resposta diretamente, edita-la ou ignora-la
6. **Feedback** e coletado para melhoria continua

## Componentes Principais

### Data Sources

Fontes de dados que alimentam o conhecimento da IA. Cada fonte possui configuracao propria de sincronizacao.

**Tipos suportados:**

| Tipo | Descricao |
|------|-----------|
| `INTERNAL` | Documentos internos criados manualmente |
| `NOTION` | Paginas sincronizadas do Notion |
| `GOOGLE_DRIVE` | Documentos do Google Drive |
| `CONFLUENCE` | Paginas do Confluence |
| `SHAREPOINT` | Documentos do SharePoint |
| `EXTERNAL_API` | APIs externas de dados |
| `WEBSITE` | Conteudo extraido de websites |

**Configuracao de cada fonte:**

- **Nome** e **descricao**
- **Categoria** e **tags** para organizacao
- **Prioridade** - fontes com maior prioridade sao consultadas primeiro
- **Icone** e **cor** para identificacao visual
- **Sync habilitado** (`syncEnabled`) - ativa/desativa sincronizacao automatica
- **Intervalo de sync** (`syncInterval`) - frequencia em minutos (default: 60)
- **Config** - configuracoes especificas do tipo (credenciais, URLs, filtros)

A sincronizacao pode ser disparada manualmente via `POST /api/ai-assistant/data-sources/:id/sync`.

### Documents

Documentos indexados com embeddings vetoriais para busca semantica. Cada documento pertence a uma data source e possui:

- **Titulo** e **conteudo** textual
- **Categoria** e **tags**
- **Status** de indexacao (`PENDING`, indexado, etc.)
- **Data source** de origem
- **Departamento** associado (opcional)
- Flag `isActive` para soft delete

Ao criar ou atualizar um documento, o sistema dispara automaticamente a indexacao via `EmbeddingService`, que gera embeddings vetoriais para permitir busca por similaridade semantica.

### Agent Configs

Configuracoes de IAs especializadas por categoria. Cada agente tem seu proprio prompt, modelo e fontes de dados.

**Campos de configuracao:**

| Campo | Descricao |
|-------|-----------|
| `name` | Nome do agente (ex: "Especialista em Vendas") |
| `category` | Categoria unica (ex: "vendas", "suporte", "financeiro") |
| `systemPrompt` | Prompt de sistema personalizado (ate 10.000 caracteres) |
| `provider` | Provedor de IA (`openai` ou `anthropic`) |
| `model` | Modelo especifico a utilizar |
| `temperature` | Temperatura de geracao (0 a 2, default: 0.7) |
| `maxTokens` | Maximo de tokens na resposta (100 a 4000, default: 1500) |
| `tone` | Tom da resposta: `friendly`, `formal`, `technical`, `empathetic` |
| `style` | Estilo: `concise`, `detailed`, `conversational` |
| `rules` | Regras adicionais em formato JSON |
| `triggerKeywords` | Palavras-chave que ativam este agente automaticamente |
| `priority` | Prioridade de selecao entre agentes |
| `isDefault` | Se e o agente padrao (apenas um por empresa) |
| `dataSourceIds` | Fontes de dados associadas com peso por ordem |

Cada agente pode ser testado individualmente via `POST /api/ai-assistant/agent-configs/:id/test`.

### Queries

Historico completo de consultas `@ia` com rastreabilidade. Cada query registra:

- A **pergunta** original do atendente
- O **ticket** onde foi feita
- A **categoria** detectada/selecionada
- A **resposta** gerada
- Os **documentos** relevantes encontrados
- **Metricas** de processamento (tempo total, confianca)
- **Feedback** do atendente (se usou, se editou, avaliacao 1-5, comentario)

### Knowledge Gaps

Lacunas de conhecimento detectadas automaticamente quando a IA nao consegue encontrar informacoes suficientes para responder uma pergunta. O sistema:

- Registra a pergunta que nao teve resposta satisfatoria
- Permite atualizar o status da lacuna (pendente, resolvida, ignorada)
- Serve como guia para alimentar a base de conhecimento

### Analytics

Metricas de uso e qualidade do assistente IA em um periodo configuravel (default: ultimos 30 dias):

- Quantidade de consultas realizadas
- Taxa de uso das respostas
- Taxa de edicao das respostas
- Avaliacoes medias
- Categorias mais consultadas
- Tempo medio de processamento

## Modelos Disponiveis

### OpenAI

| Modelo | Descricao |
|--------|-----------|
| `gpt-4-turbo-preview` | Modelo mais capaz da OpenAI |
| `gpt-4o` | Modelo otimizado multimodal |
| `gpt-4o-mini` | Versao mais rapida e economica |
| `gpt-3.5-turbo` | Modelo rapido e economico |

### Anthropic

| Modelo | Descricao |
|--------|-----------|
| `claude-opus-4-6` | Modelo mais inteligente da Anthropic |
| `claude-sonnet-4-6` | Equilibrio entre capacidade e velocidade |
| `claude-3-5-sonnet-20241022` | Excelente equilibrio custo-beneficio |
| `claude-3-haiku-20240307` | Modelo mais rapido e economico |

## Endpoints da API

### Consultas @ia

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `POST` | `/api/ai-assistant/query` | Processa uma consulta @ia |
| `GET` | `/api/ai-assistant/query/:queryId` | Busca status e detalhes de uma consulta |
| `POST` | `/api/ai-assistant/query/:queryId/feedback` | Envia feedback sobre uma resposta |
| `GET` | `/api/ai-assistant/categories` | Lista categorias de IA disponiveis |
| `GET` | `/api/ai-assistant/ticket/:ticketId/history` | Historico de consultas @ia do ticket |
| `GET` | `/api/ai-assistant/analytics` | Metricas de uso e qualidade |

**Campos da consulta:** `query` (obrigatorio, ate 2000 caracteres), `ticketId` (obrigatorio), `selectedCategory` (opcional), `includeContext` (default: true)

**Campos do feedback:** `wasUsed` (obrigatorio), `wasEdited`, `editedResponse`, `rating` (1-5), `ratingComment` (ate 500 caracteres)

### Knowledge Gaps

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ai-assistant/gaps` | Lista lacunas de conhecimento |
| `PUT` | `/api/ai-assistant/gaps/:gapId` | Atualiza status de uma lacuna |

**Filtros:** `status`, `limit` (default: 20)

### Data Sources

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ai-assistant/data-sources` | Lista todas as fontes de dados |
| `POST` | `/api/ai-assistant/data-sources` | Cria nova fonte de dados |
| `GET` | `/api/ai-assistant/data-sources/:id` | Detalhes de uma fonte (inclui documentos e agentes associados) |
| `PUT` | `/api/ai-assistant/data-sources/:id` | Atualiza uma fonte de dados |
| `DELETE` | `/api/ai-assistant/data-sources/:id` | Remove uma fonte de dados |
| `POST` | `/api/ai-assistant/data-sources/:id/sync` | Dispara sincronizacao manual |

### Documents

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ai-assistant/documents` | Lista documentos com filtros e paginacao |
| `POST` | `/api/ai-assistant/documents` | Cria e indexa um novo documento |
| `PUT` | `/api/ai-assistant/documents/:id` | Atualiza documento (re-indexa automaticamente) |
| `DELETE` | `/api/ai-assistant/documents/:id` | Desativa documento (soft delete) |
| `POST` | `/api/ai-assistant/documents/:id/reindex` | Re-indexa um documento especifico |

**Filtros de listagem:** `dataSourceId`, `category`, `status`, `search` (busca textual em titulo e conteudo), `page`, `limit`

### Agent Configs

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ai-assistant/agent-configs` | Lista todas as configuracoes de agente |
| `POST` | `/api/ai-assistant/agent-configs` | Cria nova configuracao de agente |
| `GET` | `/api/ai-assistant/agent-configs/:id` | Detalhes de uma configuracao |
| `PUT` | `/api/ai-assistant/agent-configs/:id` | Atualiza configuracao de agente |
| `DELETE` | `/api/ai-assistant/agent-configs/:id` | Remove configuracao de agente |
| `POST` | `/api/ai-assistant/agent-configs/:id/test` | Testa agente com uma consulta de exemplo |

### Modelos

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ai-assistant/models` | Lista modelos disponiveis (OpenAI + Anthropic) |

## Fluxo Detalhado

```
Atendente digita "@ia como funciona a garantia?"
    |
    v
[POST /api/ai-assistant/query]
    |
    v
Detecta categoria automaticamente (ou usa selectedCategory)
    |
    v
Seleciona Agent Config da categoria
    |
    v
Busca documentos relevantes nas Data Sources do agente
    |  (busca semantica via embeddings)
    v
Gera resposta usando o modelo e prompt do agente
    |
    v
Retorna resposta + documentos fonte + confianca
    |
    v
Atendente usa, edita ou ignora
    |
    v
[POST /query/:queryId/feedback] --> Analytics
```

## Cache

O sistema utiliza cache interno no `OrchestratorService` para configuracoes de agentes por empresa. O cache e limpo automaticamente ao criar, atualizar ou remover configuracoes de agente via `aiAssistantService.clearCache(companyId)`.

## Configuracao

Todos os endpoints exigem autenticacao e isolamento por tenant. A empresa precisa ter configurado:

- `aiEnabled` - IA habilitada
- `aiProvider` - Provedor (`openai` ou `anthropic`)
- `aiApiKey` - Chave de API
