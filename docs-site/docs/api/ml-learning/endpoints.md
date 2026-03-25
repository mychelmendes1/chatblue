---
sidebar_position: 1
title: ML Learning API
description: Endpoints da API de Machine Learning para treinamento, deteccao de padroes e geracao de respostas
---

# ML Learning API

API para o sistema de Machine Learning do ChatBlue que aprende com interacoes passadas, detecta padroes de intencao, gera templates de resposta e acompanha metricas de desempenho da IA.

## Autenticacao

Todos os endpoints requerem autenticacao via JWT e tenant.

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Pre-requisitos

A empresa precisa ter `aiApiKey` e `aiProvider` configurados nas settings para utilizar os endpoints que dependem de servicos de IA.

---

## Dashboard e Metricas

### Obter dashboard

```
GET /api/ml-learning/dashboard
```

Retorna metricas e estatisticas agregadas do sistema de ML dos ultimos 30 dias.

**Response (200)**

```json
{
  "overview": {
    "avgAIResolutionRate": 72.5,
    "avgAIRating": 4.2,
    "avgAINps": 65,
    "totalTickets": 1500,
    "aiHandledTickets": 890,
    "humanHandledTickets": 610,
    "aiToHumanTransfers": 120
  },
  "learning": {
    "trainingPairs": {
      "total": 2500,
      "validated": 1800,
      "usedInTraining": 1200
    },
    "patternsCount": 45,
    "templatesCount": 78,
    "newPatternsLearned": 12,
    "newTrainingPairs": 350
  },
  "recentMetrics": [
    {
      "id": "clmetric01xxxxxxxxxxxxx",
      "date": "2024-01-15T00:00:00.000Z",
      "totalTickets": 50,
      "aiHandledTickets": 30,
      "humanHandledTickets": 20,
      "aiToHumanTransfers": 5,
      "aiResolutionRate": 75.0,
      "aiAvgRating": 4.3,
      "aiNpsScore": 70,
      "newTrainingPairs": 15,
      "newPatternsLearned": 2
    }
  ]
}
```

---

## Training Pairs (Pares de Treinamento)

### Listar pares de treinamento

```
GET /api/ml-learning/training-pairs
```

Lista pares de treinamento (pergunta/resposta) extraidos de conversas reais.

**Query Parameters**

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `page` | number | 1 | Numero da pagina |
| `limit` | number | 20 | Itens por pagina |
| `isValidated` | boolean | - | Filtrar por status de validacao |
| `usedInTraining` | boolean | - | Filtrar por uso em treinamento |
| `category` | string | - | Filtrar por categoria |
| `minQualityScore` | number | - | Score minimo de qualidade |

**Response (200)**

```json
{
  "data": [
    {
      "id": "cltp01xxxxxxxxxxxxx",
      "companyId": "clcompxxxxxxxxxxxxx",
      "inputText": "Como cancelo minha assinatura?",
      "outputText": "Para cancelar sua assinatura, acesse Configuracoes > Plano > Cancelar.",
      "category": "cancelamento",
      "intent": "cancel_subscription",
      "qualityScore": 85,
      "isValidated": true,
      "usedInTraining": false,
      "validatedBy": "cluserxxxxxxxxxxxxx",
      "validatedAt": "2024-01-15T10:00:00.000Z",
      "createdAt": "2024-01-14T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "totalPages": 13
  }
}
```

---

### Validar par de treinamento

```
POST /api/ml-learning/training-pairs/:id/validate
```

Valida ou rejeita um par de treinamento apos revisao humana.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do par de treinamento |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `approved` | boolean | Sim | Aprovar ou rejeitar o par |
| `category` | string | Nao | Corrigir categoria |
| `intent` | string | Nao | Corrigir intencao |

**Response (200)**

Retorna o par de treinamento atualizado.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Par de treinamento nao encontrado |

---

### Coletar pares de treinamento

```
POST /api/ml-learning/training-pairs/collect
```

Dispara coleta manual de pares de treinamento a partir de conversas recentes.

**Request Body**

| Campo | Tipo | Padrao | Descricao |
|-------|------|--------|-----------|
| `hoursBack` | number | 24 | Horas no passado para buscar conversas |
| `type` | string | `collect-recent` | Tipo de coleta: `collect-recent` ou `collect-transfers` |

**Response (200)**

```json
{
  "message": "Training pair collection job queued",
  "jobId": "job-123"
}
```

---

## Patterns (Padroes de Intencao)

### Listar padroes

```
GET /api/ml-learning/patterns
```

Lista padroes de intencao detectados pelo sistema, incluindo templates de resposta associados.

**Query Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `category` | string | Filtrar por categoria |
| `isApproved` | boolean | Filtrar por status de aprovacao |
| `isActive` | boolean | Filtrar por status ativo/inativo |

**Response (200)**

Retorna array de padroes ordenados por frequencia de ocorrencia, cada um com ate 3 templates de resposta ativos.

---

### Aprovar padrao

```
POST /api/ml-learning/patterns/:id/approve
```

Aprova um padrao de intencao detectado automaticamente.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do padrao |

**Response (200)**

Retorna o padrao atualizado com status de aprovacao.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Padrao nao encontrado |

---

### Atualizar padrao

```
PUT /api/ml-learning/patterns/:id
```

Atualiza um padrao de intencao existente.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do padrao |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Nao | Nome do padrao |
| `keywords` | string[] | Nao | Palavras-chave associadas |
| `examplePhrases` | string[] | Nao | Frases de exemplo |
| `suggestedResponseTemplate` | string | Nao | Template de resposta sugerido |
| `isActive` | boolean | Nao | Ativar/desativar padrao |

**Response (200)**

Retorna o padrao atualizado.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Padrao nao encontrado |

---

### Detectar padroes

```
POST /api/ml-learning/patterns/detect
```

Dispara deteccao automatica de novos padroes a partir dos pares de treinamento.

**Request Body**

| Campo | Tipo | Padrao | Descricao |
|-------|------|--------|-----------|
| `minOccurrences` | number | 3 | Numero minimo de ocorrencias para considerar um padrao |
| `minQualityScore` | number | 60 | Score minimo de qualidade dos pares |

**Response (200)**

```json
{
  "message": "Pattern detection job queued",
  "jobId": "job-456"
}
```

---

## Templates (Templates de Resposta)

### Listar templates

```
GET /api/ml-learning/templates
```

Lista templates de resposta gerados automaticamente ou criados manualmente.

**Query Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `category` | string | Filtrar por categoria |
| `intent` | string | Filtrar por intencao |
| `isApproved` | boolean | Filtrar por status de aprovacao |
| `isActive` | boolean | Filtrar por status ativo/inativo |

**Response (200)**

Retorna array de templates ordenados por contagem de uso.

---

### Criar template

```
POST /api/ml-learning/templates
```

Cria um novo template de resposta manualmente. Templates manuais sao automaticamente aprovados.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome do template |
| `category` | string | Sim | Categoria |
| `intent` | string | Nao | Intencao associada |
| `template` | string | Sim | Texto do template |
| `variables` | object | Nao | Variaveis disponiveis no template (padrao: {}) |

**Response (201)**

Retorna o template criado.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Name, category e template sao obrigatorios |

---

### Atualizar template

```
PUT /api/ml-learning/templates/:id
```

Atualiza um template de resposta existente.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do template |

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `name` | string | Nao | Nome do template |
| `template` | string | Nao | Texto do template |
| `variables` | object | Nao | Variaveis do template |
| `isActive` | boolean | Nao | Ativar/desativar template |
| `isApproved` | boolean | Nao | Aprovar/rejeitar template |

**Response (200)**

Retorna o template atualizado.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Template nao encontrado |

---

### Deletar template

```
DELETE /api/ml-learning/templates/:id
```

Remove um template de resposta permanentemente.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do template |

**Response (200)**

```json
{
  "message": "Template deleted"
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 404 | Template nao encontrado |

---

## Model Versions (Versoes de Modelo)

### Listar versoes de modelo

```
GET /api/ml-learning/model-versions
```

Lista versoes de modelos treinados pela empresa.

**Query Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `modelType` | string | Filtrar por tipo de modelo |
| `isActive` | boolean | Filtrar por status ativo/inativo |

**Response (200)**

Retorna array de versoes de modelo ordenadas por data de criacao (mais recente primeiro).

---

## Training Batches (Batches de Treinamento)

### Listar batches de treinamento

```
GET /api/ml-learning/training-batches
```

Lista os ultimos 20 batches de treinamento executados.

**Response (200)**

Retorna array de batches com informacoes de status, duracao e metricas.

---

## Jobs de Processamento

### Disparar treinamento completo

```
POST /api/ml-learning/train
```

Inicia um job de treinamento completo que inclui deteccao de padroes e atualizacao de modelos.

**Request Body**

| Campo | Tipo | Padrao | Descricao |
|-------|------|--------|-----------|
| `minOccurrences` | number | 5 | Minimo de ocorrencias para padroes |
| `minQualityScore` | number | 70 | Score minimo de qualidade |
| `autoApprove` | boolean | false | Aprovar automaticamente novos padroes |

**Response (200)**

```json
{
  "message": "Training job queued",
  "jobId": "job-789"
}
```

---

### Avaliar qualidade de pares

```
POST /api/ml-learning/score-pairs
```

Dispara avaliacao de qualidade dos pares de treinamento pendentes usando IA.

**Request Body**

| Campo | Tipo | Padrao | Descricao |
|-------|------|--------|-----------|
| `limit` | number | 50 | Quantidade maxima de pares a avaliar |

**Response (200)**

```json
{
  "message": "Quality scoring job queued",
  "jobId": "job-101"
}
```

---

### Calcular metricas

```
POST /api/ml-learning/calculate-metrics
```

Dispara calculo de metricas diarias do sistema de ML.

**Request Body**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `date` | string | Data para calculo (ISO 8601). Se omitido, calcula para o dia atual |

**Response (200)**

```json
{
  "message": "Metrics calculation job queued",
  "jobId": "job-102"
}
```

---

## Classificacao e Geracao

### Classificar intencao

```
POST /api/ml-learning/classify-intent
```

Classifica a intencao de uma mensagem usando o sistema de ML treinado.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `message` | string | Sim | Mensagem para classificar |
| `previousMessages` | array | Nao | Mensagens anteriores para contexto |

**Response (200)**

Retorna a classificacao de intencao com categoria, confianca e padroes identificados.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Mensagem obrigatoria |

---

### Gerar resposta

```
POST /api/ml-learning/generate-response
```

Gera candidatos de resposta usando templates aprendidos, padroes detectados e base de conhecimento.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `message` | string | Sim | Mensagem do cliente |
| `ticketId` | string | Nao | ID do ticket para contexto |
| `category` | string | Nao | Categoria para direcionar geracao |
| `intent` | string | Nao | Intencao pre-classificada |
| `contactName` | string | Nao | Nome do contato para personalizacao |
| `previousMessages` | array | Nao | Mensagens anteriores |
| `maxCandidates` | number | Nao | Numero maximo de respostas (padrao: 3) |

**Response (200)**

```json
{
  "responses": [
    {
      "text": "Ola Joao! Para cancelar sua assinatura, acesse Configuracoes > Plano > Cancelar.",
      "source": "template",
      "confidence": 0.92,
      "templateId": "cltmpl01xxxxxxxxxxxxx"
    },
    {
      "text": "Entendo que deseja cancelar. Posso ajudar com o processo...",
      "source": "knowledge_base",
      "confidence": 0.85
    }
  ],
  "count": 2
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Mensagem obrigatoria |

---

## Erros Comuns

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados de requisicao invalidos |
| 401 | Token de autenticacao invalido ou expirado |
| 404 | Recurso nao encontrado |
| 500 | Erro interno do servidor ou IA nao configurada |

## Notas Importantes

1. **Jobs assincronos**: Endpoints de treinamento, coleta, scoring e deteccao de padroes enfileiram jobs em background. O `jobId` retornado pode ser usado para acompanhar o progresso.

2. **Qualidade dos pares**: O quality score (0-100) e calculado automaticamente por IA e considera relevancia, clareza e adequacao da resposta.

3. **Aprovacao humana**: Padroes detectados automaticamente requerem aprovacao humana antes de serem usados na geracao de respostas, a menos que `autoApprove` seja ativado.

4. **Templates manuais**: Templates criados manualmente sao automaticamente marcados como aprovados com source type `MANUAL`.

5. **Dependencia de IA**: Endpoints de classificacao e geracao de resposta requerem que `aiApiKey` e `aiProvider` estejam configurados nas settings da empresa.
