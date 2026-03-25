---
sidebar_position: 13
title: Machine Learning
description: Sistema de aprendizado de maquina baseado em interacoes reais do ChatBlue
---

# Machine Learning

O sistema de Machine Learning do ChatBlue aprende continuamente a partir das interacoes reais entre atendentes e clientes. Ele coleta pares de perguntas e respostas, detecta padroes de intencao, gera templates de resposta e treina modelos especializados para melhorar o atendimento ao longo do tempo.

## Visao Geral

O pipeline de ML funciona em quatro etapas principais:

1. **Coleta** - Training pairs sao extraidos automaticamente das conversas
2. **Avaliacao** - Cada par recebe uma pontuacao de qualidade
3. **Deteccao** - Padroes de intencao sao identificados nos dados coletados
4. **Treinamento** - Modelos sao treinados com os dados validados

## Componentes Principais

### Training Pairs

Pares de pergunta-cliente + resposta-atendente coletados automaticamente das conversas reais. Cada par contem:

- **Pergunta original** do cliente
- **Resposta do atendente** que resolveu a questao
- **Categoria** e **intencao** classificadas
- **Quality score** (pontuacao de qualidade de 0 a 100)
- **Flags de validacao** - se foi validado por humano e se ja foi usado em treinamento

Os pares podem ser filtrados por status de validacao, uso em treinamento, categoria e pontuacao minima de qualidade.

### Intent Patterns

Padroes de intencao detectados automaticamente a partir dos training pairs. Exemplos de intencoes:

- `PRICE_INQUIRY` - Consultas sobre precos
- `COMPLAINT` - Reclamacoes de clientes
- `ORDER_STATUS` - Verificacao de status de pedido
- `TECHNICAL_SUPPORT` - Suporte tecnico
- `CANCELLATION` - Solicitacoes de cancelamento

Cada padrao inclui:

- **Nome** e **categoria**
- **Keywords** - palavras-chave associadas
- **Frases de exemplo** (`examplePhrases`)
- **Template de resposta sugerido** (`suggestedResponseTemplate`)
- **Contagem de ocorrencias** (`occurrenceCount`)
- **Status de aprovacao** - padroes detectados precisam ser aprovados por um operador

### Response Templates

Templates de resposta com placeholders aprendidos a partir dos padroes identificados. Caracteristicas:

- Associados a uma **intencao** e **categoria**
- Suportam **variaveis** (placeholders) para personalizacao
- Podem ser criados **manualmente** (sourceType: `MANUAL`) ou aprendidos automaticamente
- Templates manuais sao aprovados automaticamente
- Contagem de uso (`usageCount`) para medir efetividade
- Embeddings vetoriais para busca semantica por similaridade

### Model Versions

Versoes de modelos treinados com os dados coletados. Tipos de modelo:

| Tipo | Descricao |
|------|-----------|
| `INTENT_CLASSIFIER` | Classificador de intencoes das mensagens |
| `RESPONSE_RANKER` | Ranqueador de respostas candidatas |
| `QUALITY_SCORER` | Avaliador de qualidade dos pares de treinamento |

Cada versao registra se esta ativa e quando foi criada, permitindo rollback para versoes anteriores.

### Training Batches

Lotes de treinamento que agrupam execucoes do pipeline de ML. Cada batch armazena:

- Status de execucao
- Dados de configuracao utilizados
- Timestamp de criacao
- Resultados e metricas do lote

## Services

O sistema e composto por services especializados:

| Service | Responsabilidade |
|---------|-----------------|
| `TrainingPairCollectorService` | Coleta pares pergunta-resposta das conversas |
| `QualityScorerService` | Avalia a qualidade de cada par coletado |
| `IntentClassifierService` | Classifica intencoes das mensagens |
| `PatternDetectorService` | Detecta padroes recorrentes nos dados |
| `MLResponseGeneratorService` | Gera respostas usando templates, padroes e base de conhecimento |
| `EmbeddingService` | Gera embeddings vetoriais para busca semantica |

Os services sao instanciados com as configuracoes de IA da empresa (`aiProvider`, `aiApiKey`, `aiDefaultModel`), suportando tanto OpenAI quanto Anthropic.

## Jobs Automaticos

O sistema executa jobs em background via filas:

| Job | Funcao |
|-----|--------|
| `ml-training-collector` | Coleta automatica de training pairs recentes ou de transferencias IA-humano |
| `ml-quality-scorer` | Avaliacao automatica de qualidade dos pares pendentes |
| `ml-pattern-detector` | Deteccao de padroes e treinamento completo |
| `ml-metrics` | Calculo diario de metricas de ML |

## Dashboard de Metricas

O endpoint `GET /api/ml-learning/dashboard` retorna um painel completo com:

### Overview (ultimos 30 dias)

- Taxa media de resolucao por IA (`avgAIResolutionRate`)
- Avaliacao media da IA (`avgAIRating`)
- NPS medio da IA (`avgAINps`)
- Total de tickets processados
- Tickets resolvidos por IA vs humanos
- Transferencias de IA para humano

### Learning

- Total de training pairs (total, validados, usados em treinamento)
- Quantidade de padroes ativos
- Quantidade de templates ativos
- Novos padroes aprendidos no periodo
- Novos pares coletados no periodo

### Metricas Recentes

Dados dos ultimos 7 dias para visualizacao em grafico temporal.

## Endpoints da API

### Dashboard e Metricas

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ml-learning/dashboard` | Dashboard com metricas agregadas |
| `POST` | `/api/ml-learning/calculate-metrics` | Dispara calculo de metricas diarias |

### Training Pairs

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ml-learning/training-pairs` | Lista pares com paginacao e filtros |
| `POST` | `/api/ml-learning/training-pairs/:id/validate` | Valida/rejeita um par |
| `POST` | `/api/ml-learning/training-pairs/collect` | Dispara coleta manual de pares |

**Filtros de listagem:** `isValidated`, `usedInTraining`, `category`, `minQualityScore`, `page`, `limit`

**Coleta manual:** Aceita `hoursBack` (default: 24) e `type` (`collect-recent` ou `collect-transfers`)

### Intent Patterns

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ml-learning/patterns` | Lista padroes de intencao |
| `POST` | `/api/ml-learning/patterns/:id/approve` | Aprova um padrao detectado |
| `PUT` | `/api/ml-learning/patterns/:id` | Atualiza um padrao |
| `POST` | `/api/ml-learning/patterns/detect` | Dispara deteccao de padroes |

**Filtros de listagem:** `category`, `isApproved`, `isActive`

**Deteccao:** Aceita `minOccurrences` (default: 3) e `minQualityScore` (default: 60)

### Response Templates

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ml-learning/templates` | Lista templates de resposta |
| `POST` | `/api/ml-learning/templates` | Cria template manualmente |
| `PUT` | `/api/ml-learning/templates/:id` | Atualiza um template |
| `DELETE` | `/api/ml-learning/templates/:id` | Remove um template |

**Filtros de listagem:** `category`, `intent`, `isApproved`, `isActive`

**Criacao manual:** Campos obrigatorios: `name`, `category`, `template`. Opcional: `intent`, `variables`.

### Geracao e Classificacao

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `POST` | `/api/ml-learning/generate-response` | Gera respostas candidatas usando ML |
| `POST` | `/api/ml-learning/classify-intent` | Classifica a intencao de uma mensagem |

**Geracao de resposta:** Recebe `message` (obrigatorio), `ticketId`, `category`, `intent`, `contactName`, `previousMessages`, `maxCandidates` (default: 3). Utiliza templates, padroes aprendidos e base de conhecimento.

**Classificacao de intencao:** Recebe `message` (obrigatorio) e `previousMessages` (opcional).

### Treinamento

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `POST` | `/api/ml-learning/train` | Dispara treinamento completo |
| `POST` | `/api/ml-learning/score-pairs` | Dispara avaliacao de qualidade dos pares |

**Treinamento completo:** Aceita `minOccurrences` (default: 5), `minQualityScore` (default: 70), `autoApprove` (default: false)

**Score de pares:** Aceita `limit` (default: 50) para quantidade de pares a avaliar

### Model Versions e Training Batches

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/api/ml-learning/model-versions` | Lista versoes de modelos |
| `GET` | `/api/ml-learning/training-batches` | Lista lotes de treinamento (ultimos 20) |

**Filtros de model versions:** `modelType`, `isActive`

## Fluxo de Treinamento

```
Conversas reais
    |
    v
[ml-training-collector] --> Training Pairs
    |
    v
[ml-quality-scorer] --> Pares com pontuacao
    |
    v
[ml-pattern-detector] --> Padroes de intencao + Templates
    |
    v
[train] --> Model Versions atualizadas
    |
    v
[generate-response / classify-intent] --> Respostas para atendentes
```

## Configuracao

O sistema de ML requer que a empresa tenha configurado:

- `aiProvider` - Provedor de IA (`openai` ou `anthropic`)
- `aiApiKey` - Chave de API do provedor
- `aiDefaultModel` - Modelo padrao (opcional)

Todos os endpoints exigem autenticacao e isolamento por tenant (empresa).
