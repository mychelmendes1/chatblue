# Sistema de Aprendizagem de Máquina - ChatBlue

## Visão Geral

Este documento descreve o plano para implementar um sistema de Machine Learning que aprende continuamente com as interações dos atendentes humanos, tornando a IA do ChatBlue progressivamente mais autônoma e eficiente.

### Objetivo Principal

Criar um ciclo de aprendizado contínuo onde:
1. A IA atende inicialmente com base na knowledge base existente
2. Quando a IA não consegue responder, transfere para humano
3. As respostas dos humanos são coletadas e analisadas
4. O sistema aprende padrões de respostas bem-sucedidas
5. A IA incorpora esse conhecimento e atende mais casos autonomamente

---

## Arquitetura do Sistema de ML

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CICLO DE APRENDIZAGEM CONTÍNUA                      │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │   Cliente    │────▶│   IA Bot     │────▶│   Humano     │
    │   Pergunta   │     │   Responde   │     │   Responde   │
    └──────────────┘     └──────────────┘     └──────────────┘
           │                    │                    │
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    DATA COLLECTION LAYER                         │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
    │  │  Mensagens  │  │  Feedback   │  │  Métricas   │              │
    │  │  + Context  │  │  + Ratings  │  │  + Outcomes │              │
    │  └─────────────┘  └─────────────┘  └─────────────┘              │
    └─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    ML PROCESSING PIPELINE                        │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
    │  │  Training   │  │  Model      │  │  Quality    │              │
    │  │  Data Prep  │  │  Training   │  │  Validation │              │
    │  └─────────────┘  └─────────────┘  └─────────────┘              │
    └─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    KNOWLEDGE ENHANCEMENT                         │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
    │  │  Response   │  │  Intent     │  │  Auto FAQ   │              │
    │  │  Templates  │  │  Patterns   │  │  Generation │              │
    │  └─────────────┘  └─────────────┘  └─────────────┘              │
    └─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────┐
                    │   IA Melhorada   │
                    │   (Mais Autônoma)│
                    └──────────────────┘
```

---

## Componentes do Sistema

### 1. Data Collection Layer (Coleta de Dados)

#### 1.1 Conversation Pairs Collector

Coleta pares de pergunta-resposta de alta qualidade dos atendentes humanos.

**Schema Proposto:**

```prisma
model MLTrainingPair {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  // Contexto da conversa
  ticketId        String
  ticket          Ticket   @relation(fields: [ticketId], references: [id])

  // Pergunta do cliente
  customerMessageId  String
  customerMessage    Message @relation("CustomerMessage", fields: [customerMessageId], references: [id])
  customerQuery      String  @db.Text  // Texto normalizado
  customerEmbedding  Float[] // Embedding vetorial

  // Resposta do atendente
  agentMessageId  String
  agentMessage    Message @relation("AgentMessage", fields: [agentMessageId], references: [id])
  agentResponse   String  @db.Text
  agentId         String
  agent           User    @relation(fields: [agentId], references: [id])

  // Metadados de qualidade
  responseTime    Int     // Tempo em segundos até resposta
  wasAIAssisted   Boolean // Se usou @ia para ajudar
  aiSuggestionUsed Boolean? // Se usou sugestão da IA
  aiSuggestionEdited Boolean? // Se editou sugestão da IA

  // Classificação automática
  category        String?  // Categoria detectada
  intent          String?  // Intenção detectada
  sentiment       String?  // Sentimento do cliente
  complexity      String?  // SIMPLE, MEDIUM, COMPLEX

  // Outcome do ticket (para medir qualidade)
  ticketResolved  Boolean?
  customerRating  Int?     // 1-5
  npsScore        Int?     // 0-10
  firstContactResolution Boolean?

  // Status de uso no treinamento
  qualityScore    Float?   // Score de qualidade calculado
  isValidated     Boolean  @default(false)
  validatedBy     String?
  validatedAt     DateTime?
  usedInTraining  Boolean  @default(false)
  trainingBatchId String?

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([companyId])
  @@index([category])
  @@index([qualityScore])
  @@index([isValidated])
}

model MLIntentPattern {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  // Padrão identificado
  intent          String   // Ex: "PRICE_INQUIRY", "COMPLAINT", "ORDER_STATUS"
  category        String   // Ex: "vendas", "suporte", "financeiro"

  // Exemplos de frases
  examplePhrases  String[] // Lista de frases exemplo
  keywords        String[] // Palavras-chave associadas

  // Embedding médio dos exemplos
  centroidEmbedding Float[]

  // Resposta padrão sugerida
  suggestedResponseTemplate String? @db.Text

  // Estatísticas
  occurrenceCount Int      @default(0)
  successRate     Float?   // Taxa de sucesso quando IA responde
  avgCustomerRating Float?

  // Status
  isActive        Boolean  @default(true)
  confidence      Float    // Confiança do padrão (0-1)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([companyId, intent])
  @@index([companyId])
  @@index([category])
}

model MLResponseTemplate {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  // Identificação
  name            String
  category        String
  intent          String?

  // Template de resposta
  template        String   @db.Text  // Com placeholders {{variable}}
  variables       Json?    // Descrição das variáveis

  // Origem
  sourceType      String   // MANUAL, LEARNED, GENERATED
  sourceTrainingPairId String?

  // Qualidade
  usageCount      Int      @default(0)
  successCount    Int      @default(0)
  avgRating       Float?

  // Status
  isActive        Boolean  @default(true)
  isApproved      Boolean  @default(false)
  approvedBy      String?
  approvedAt      DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([companyId])
  @@index([category])
  @@index([intent])
}

model MLModelVersion {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  // Versão do modelo
  version         String
  modelType       String   // INTENT_CLASSIFIER, RESPONSE_RANKER, QUALITY_SCORER

  // Métricas de treinamento
  trainingPairsCount Int
  accuracy        Float?
  precision       Float?
  recall          Float?
  f1Score         Float?

  // Artefatos
  modelPath       String?  // Caminho para artefatos salvos
  configJson      Json?    // Configuração do modelo

  // Status
  status          String   // TRAINING, READY, DEPLOYED, DEPRECATED
  isActive        Boolean  @default(false)

  // Deployment
  deployedAt      DateTime?
  deprecatedAt    DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([companyId])
  @@index([modelType])
  @@index([isActive])
}

model MLLearningMetric {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  // Período
  date            DateTime @db.Date

  // Métricas de atendimento
  totalTickets    Int
  aiHandledTickets Int
  humanHandledTickets Int
  aiToHumanTransfers Int

  // Métricas de qualidade da IA
  aiResolutionRate Float   // % tickets resolvidos só com IA
  aiAvgRating     Float?   // Rating médio quando IA resolve
  aiNpsScore      Float?   // NPS médio quando IA resolve

  // Métricas de aprendizado
  newTrainingPairs Int     // Novos pares coletados
  newPatternsLearned Int   // Novos padrões identificados
  knowledgeGapsFound Int   // Lacunas detectadas

  // Comparação com período anterior
  aiResolutionRateDelta Float? // Mudança vs período anterior

  createdAt       DateTime @default(now())

  @@unique([companyId, date])
  @@index([companyId])
  @@index([date])
}
```

#### 1.2 Critérios de Coleta de Training Pairs

Um par pergunta-resposta é coletado quando:

1. **Transferência AI→Humano**: A IA não conseguiu responder e transferiu
2. **Resposta de Alta Qualidade**: O ticket foi resolvido com rating >= 4
3. **First Contact Resolution**: Resolvido na primeira interação
4. **Resposta Sem IA**: Atendente respondeu sem usar @ia (conhecimento próprio)
5. **IA Editada**: Atendente usou @ia mas editou significativamente a resposta

**Filtros de Qualidade:**
- Resposta tem pelo menos 20 caracteres
- Não é resposta automática/template
- Ticket não foi reaberto após resolução
- Tempo de resposta dentro do SLA

---

### 2. ML Processing Pipeline

#### 2.1 Intent Classification Model

Modelo para classificar a intenção do cliente automaticamente.

```typescript
// src/services/ml/intent-classifier.service.ts

interface IntentClassification {
  intent: string;           // Ex: "PRICE_INQUIRY"
  category: string;         // Ex: "vendas"
  confidence: number;       // 0-1
  subIntents: string[];     // Intenções secundárias
}

class IntentClassifierService {
  /**
   * Classifica a intenção de uma mensagem do cliente
   */
  async classify(
    message: string,
    companyId: string,
    context?: ConversationContext
  ): Promise<IntentClassification>

  /**
   * Treina/atualiza o modelo com novos dados
   */
  async train(
    trainingPairs: MLTrainingPair[],
    companyId: string
  ): Promise<MLModelVersion>

  /**
   * Detecta novos padrões de intenção
   */
  async detectNewPatterns(
    companyId: string,
    minOccurrences: number
  ): Promise<MLIntentPattern[]>
}
```

**Abordagem de Classificação:**

1. **Fase 1 - Keyword + Embedding Matching**
   - Usa keywords existentes no AIAgentConfig
   - Calcula similaridade coseno com padrões conhecidos
   - Rápido e eficiente para casos claros

2. **Fase 2 - LLM Classification**
   - Para casos ambíguos (confidence < 0.7)
   - Usa GPT-4o-mini ou Claude Haiku (custo baixo)
   - Prompt com exemplos few-shot dos padrões aprendidos

3. **Fase 3 - Clustering de Novos Padrões**
   - Agrupa mensagens não classificadas
   - Identifica novos padrões emergentes
   - Sugere novos intents para aprovação humana

#### 2.2 Response Quality Scorer

Avalia a qualidade de respostas (da IA ou humano).

```typescript
// src/services/ml/quality-scorer.service.ts

interface QualityScore {
  overallScore: number;     // 0-100
  relevanceScore: number;   // Quão relevante é a resposta
  completenessScore: number; // Responde completamente
  clarityScore: number;     // Clareza da resposta
  toneScore: number;        // Tom apropriado
  factualScore: number;     // Factualmente correto (vs knowledge base)
}

class QualityScorerService {
  /**
   * Avalia qualidade de uma resposta
   */
  async scoreResponse(
    customerMessage: string,
    response: string,
    companyId: string,
    context?: {
      knowledgeBase?: string[];
      previousMessages?: Message[];
    }
  ): Promise<QualityScore>

  /**
   * Compara duas respostas e determina qual é melhor
   */
  async compareResponses(
    customerMessage: string,
    responseA: string,
    responseB: string,
    companyId: string
  ): Promise<{
    winner: 'A' | 'B' | 'TIE';
    reasoning: string;
  }>
}
```

#### 2.3 Response Ranker/Generator

Gera ou seleciona a melhor resposta.

```typescript
// src/services/ml/response-generator.service.ts

interface GeneratedResponse {
  response: string;
  confidence: number;
  source: 'TEMPLATE' | 'KNOWLEDGE_BASE' | 'LEARNED_PATTERN' | 'GENERATED';
  templateId?: string;
  documentIds?: string[];
  patternId?: string;
}

class ResponseGeneratorService {
  /**
   * Gera resposta usando conhecimento aprendido
   */
  async generateResponse(
    customerMessage: string,
    companyId: string,
    options: {
      ticketId?: string;
      category?: string;
      intent?: string;
      useTemplates?: boolean;
      useLearnedPatterns?: boolean;
      maxCandidates?: number;
    }
  ): Promise<GeneratedResponse[]>

  /**
   * Ranking de respostas candidatas
   */
  async rankResponses(
    customerMessage: string,
    candidates: string[],
    companyId: string
  ): Promise<{
    ranked: Array<{
      response: string;
      score: number;
      reasoning: string;
    }>;
  }>
}
```

---

### 3. Learning Jobs (BullMQ)

#### 3.1 Novos Jobs a Implementar

```typescript
// src/jobs/queues/ml-queues.ts

// 1. Coleta de training pairs
export const trainingPairCollectorQueue = new Queue('ml-training-pair-collector', {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  }
});

// 2. Cálculo de quality scores
export const qualityScoringQueue = new Queue('ml-quality-scoring', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  }
});

// 3. Detecção de padrões
export const patternDetectionQueue = new Queue('ml-pattern-detection', {
  defaultJobOptions: {
    removeOnComplete: 10,
  }
});

// 4. Treinamento de modelos
export const modelTrainingQueue = new Queue('ml-model-training', {
  defaultJobOptions: {
    timeout: 30 * 60 * 1000, // 30 minutos
  }
});

// 5. Geração de FAQs automáticas
export const autoFaqGenerationQueue = new Queue('ml-auto-faq-generation');

// 6. Métricas diárias de aprendizado
export const learningMetricsQueue = new Queue('ml-learning-metrics');
```

#### 3.2 Schedulers

```typescript
// Coletar training pairs - A cada hora
trainingPairCollectorQueue.add('collect', {}, {
  repeat: { pattern: '0 * * * *' } // Every hour
});

// Calcular quality scores - A cada 30 min
qualityScoringQueue.add('score-pending', {}, {
  repeat: { pattern: '*/30 * * * *' }
});

// Detectar padrões - Diariamente às 2 AM
patternDetectionQueue.add('detect', {}, {
  repeat: { pattern: '0 2 * * *' }
});

// Treinar modelos - Semanalmente (domingo 3 AM)
modelTrainingQueue.add('train-all', {}, {
  repeat: { pattern: '0 3 * * 0' }
});

// Gerar FAQs - Diariamente às 4 AM
autoFaqGenerationQueue.add('generate', {}, {
  repeat: { pattern: '0 4 * * *' }
});

// Métricas - Diariamente à meia-noite
learningMetricsQueue.add('calculate', {}, {
  repeat: { pattern: '0 0 * * *' }
});
```

---

### 4. Knowledge Enhancement

#### 4.1 Auto FAQ Generation

Gera FAQs automaticamente baseado em perguntas frequentes.

```typescript
// src/services/ml/auto-faq.service.ts

class AutoFaqService {
  /**
   * Identifica perguntas frequentes que não estão na FAQ
   */
  async identifyMissingFaqs(
    companyId: string,
    options: {
      minOccurrences: number;      // Mínimo de vezes que pergunta apareceu
      minSimilarity: number;       // Similaridade mínima para agrupar
      lookbackDays: number;        // Período de análise
    }
  ): Promise<Array<{
    question: string;
    frequency: number;
    suggestedAnswer: string;
    confidence: number;
    exampleTickets: string[];
  }>>

  /**
   * Gera resposta sugerida baseada em respostas anteriores dos atendentes
   */
  async generateSuggestedAnswer(
    question: string,
    trainingPairs: MLTrainingPair[]
  ): Promise<string>
}
```

#### 4.2 Knowledge Gap Detector (Aprimorado)

```typescript
// Melhorias no sistema existente de AIKnowledgeGap

interface EnhancedKnowledgeGap {
  gap: string;                    // Descrição da lacuna
  frequency: number;              // Quantas vezes ocorreu
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  suggestedContent: string;       // Sugestão de conteúdo a adicionar
  exampleQueries: string[];       // Queries que geraram essa lacuna
  humanResponses: string[];       // Como humanos responderam
}

class KnowledgeGapDetectorService {
  /**
   * Detecta lacunas baseado em:
   * 1. Queries sem documentos relevantes
   * 2. Transferências AI→Humano por falta de conhecimento
   * 3. Baixa confiança nas respostas
   */
  async detectGaps(companyId: string): Promise<EnhancedKnowledgeGap[]>

  /**
   * Gera conteúdo sugerido para preencher lacuna
   * baseado nas respostas dos humanos
   */
  async suggestContent(gap: EnhancedKnowledgeGap): Promise<string>
}
```

---

### 5. Fluxo de Aprendizado Integrado

#### 5.1 Fluxo: Mensagem Recebida → Aprendizado

```
CLIENTE ENVIA MENSAGEM
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    INTENT CLASSIFICATION                          │
│  IntentClassifier.classify(message)                               │
│  → intent: "PRICE_INQUIRY", category: "vendas", confidence: 0.85 │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PATTERN MATCHING                               │
│  Verifica se existe MLIntentPattern para este intent             │
│  → Encontrou padrão com 95% success rate                         │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    RESPONSE GENERATION                            │
│  1. Busca templates aprendidos (MLResponseTemplate)               │
│  2. Busca em Knowledge Base (existente)                           │
│  3. Gera resposta com LLM se necessário                          │
│  → ResponseGenerator retorna 3 candidatos                        │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    QUALITY SCORING                                │
│  QualityScorer avalia cada candidato                             │
│  → Candidato 1: 92/100 (template aprendido)                      │
│  → Candidato 2: 85/100 (knowledge base)                          │
│  → Candidato 3: 78/100 (gerado)                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DECISION                                       │
│  Se melhor candidato tem score >= 80 E confidence >= 0.75:       │
│    → IA responde automaticamente                                  │
│  Senão:                                                           │
│    → Transfere para humano (marca para aprendizado)              │
└──────────────────────────────────────────────────────────────────┘
```

#### 5.2 Fluxo: Humano Responde → Coleta de Dados

```
HUMANO RESPONDE AO CLIENTE
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    TRAINING PAIR COLLECTOR                        │
│  Job assíncrono coleta o par (pergunta, resposta)                │
│  Aplica filtros de qualidade                                      │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    EMBEDDING GENERATION                           │
│  Gera embedding da pergunta do cliente                           │
│  Armazena em MLTrainingPair.customerEmbedding                    │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    INTENT LABELING                                │
│  Classifica automaticamente o intent                              │
│  Associa à categoria                                              │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    AWAIT OUTCOME                                  │
│  Aguarda resolução do ticket para medir:                         │
│  - Rating do cliente                                              │
│  - NPS score                                                      │
│  - First Contact Resolution                                       │
│  - Reabertura                                                     │
└──────────────────────────────────────────────────────────────────┘
```

#### 5.3 Fluxo: Treinamento Periódico

```
JOB SEMANAL DE TREINAMENTO
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DATA SELECTION                                 │
│  Seleciona training pairs com:                                    │
│  - qualityScore >= 70                                             │
│  - ticketResolved = true                                          │
│  - customerRating >= 4 (se disponível)                           │
│  - usedInTraining = false                                        │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PATTERN CLUSTERING                             │
│  Agrupa training pairs similares                                  │
│  Identifica novos MLIntentPattern                                │
│  Atualiza padrões existentes com mais exemplos                   │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    TEMPLATE EXTRACTION                            │
│  Para cada cluster com alta qualidade:                           │
│  - Extrai template generalizado                                   │
│  - Identifica variáveis ({{nome}}, {{produto}}, etc)             │
│  - Cria MLResponseTemplate                                        │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    MODEL FINE-TUNING (Opcional)                   │
│  Se dados suficientes:                                            │
│  - Fine-tune embedding model para domínio específico             │
│  - Treina classificador de intent customizado                    │
│  - Salva nova versão em MLModelVersion                           │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT                                     │
│  Ativa novos padrões e templates                                 │
│  Marca training pairs como usedInTraining = true                 │
│  Atualiza métricas em MLLearningMetric                           │
└──────────────────────────────────────────────────────────────────┘
```

---

### 6. Interface de Administração

#### 6.1 Dashboard de Aprendizado

Nova página: `/dashboard/ml-learning`

**Métricas Principais:**
- Taxa de resolução IA vs Humano (gráfico temporal)
- Novos padrões aprendidos por semana
- Qualidade média das respostas IA
- Lacunas de conhecimento pendentes
- Training pairs coletados

**Visualizações:**
- Gráfico de evolução: % tickets resolvidos pela IA
- Heatmap de intents mais frequentes
- Lista de padrões aprendidos recentemente
- Fila de templates para aprovação

#### 6.2 Gestão de Padrões Aprendidos

Nova página: `/dashboard/ml-patterns`

**Funcionalidades:**
- Visualizar padrões detectados automaticamente
- Aprovar/rejeitar novos padrões
- Editar templates de resposta
- Definir regras de ativação
- Ver exemplos de uso

#### 6.3 Quality Review Queue

Nova página: `/dashboard/ml-review`

**Funcionalidades:**
- Revisar training pairs antes de usar em treinamento
- Aprovar/rejeitar pares de baixa qualidade
- Corrigir classificações de intent
- Marcar respostas exemplares

---

### 7. Métricas de Sucesso

#### 7.1 KPIs Principais

| Métrica | Descrição | Meta |
|---------|-----------|------|
| **AI Resolution Rate** | % tickets resolvidos só com IA | > 60% em 6 meses |
| **Transfer Rate** | % transferências AI→Humano | < 30% |
| **AI Customer Rating** | Rating médio quando IA resolve | >= 4.0/5.0 |
| **Learning Velocity** | Novos padrões/semana | > 10 |
| **Knowledge Coverage** | % intents cobertos por templates | > 80% |
| **Response Accuracy** | Respostas IA sem necessidade de correção | > 90% |

#### 7.2 Métricas de Qualidade do Modelo

| Métrica | Descrição | Threshold |
|---------|-----------|-----------|
| **Intent Accuracy** | Precisão na classificação de intent | > 85% |
| **Template Match Rate** | % queries com template aplicável | > 70% |
| **Quality Score Avg** | Score médio das respostas IA | > 80 |
| **False Positive Rate** | Respostas IA incorretas não detectadas | < 5% |

---

### 8. Considerações de Segurança e Privacidade

#### 8.1 Isolamento de Dados

- Cada empresa (tenant) tem seus próprios modelos e padrões
- Training pairs nunca são compartilhados entre empresas
- Embeddings são específicos por empresa

#### 8.2 Anonimização

- Dados pessoais (nomes, telefones) são removidos antes do treinamento
- Templates usam placeholders genéricos
- Logs de treinamento são anonimizados

#### 8.3 Controle de Qualidade

- Respostas geradas passam por guardrails existentes
- Novos padrões requerem aprovação humana para ativar
- Rate limiting em geração de respostas

#### 8.4 Auditoria

- Todas as decisões da IA são logadas
- Training pairs mantêm rastreabilidade
- Versões de modelos são versionadas

---

### 9. Roadmap de Implementação

#### Fase 1: Fundação (2-3 semanas)

- [ ] Criar schema do banco de dados (migrations Prisma)
- [ ] Implementar coleta de training pairs
- [ ] Criar job de coleta automática
- [ ] Implementar quality scorer básico

#### Fase 2: Classificação de Intent (2-3 semanas)

- [ ] Implementar IntentClassifierService
- [ ] Criar padrões iniciais baseados em AIAgentConfig
- [ ] Integrar classificação no fluxo de mensagens
- [ ] Dashboard de visualização de intents

#### Fase 3: Aprendizado de Padrões (3-4 semanas)

- [ ] Implementar clustering de training pairs
- [ ] Criar extração automática de templates
- [ ] Job de detecção de padrões
- [ ] Interface de aprovação de padrões

#### Fase 4: Geração de Respostas Aprimorada (3-4 semanas)

- [ ] Implementar ResponseGeneratorService
- [ ] Integrar templates aprendidos no OrchestratorService
- [ ] A/B testing de respostas
- [ ] Métricas de sucesso

#### Fase 5: Auto-Conhecimento (2-3 semanas)

- [ ] Implementar Auto FAQ Generation
- [ ] Aprimorar Knowledge Gap Detection
- [ ] Sugestões automáticas de conteúdo
- [ ] Dashboard de gestão de conhecimento

#### Fase 6: Otimização e Refinamento (Contínuo)

- [ ] Fine-tuning de modelos (se volume suficiente)
- [ ] Otimização de thresholds
- [ ] Expansão de métricas
- [ ] Feedback loop contínuo

---

### 10. Tecnologias Sugeridas

#### 10.1 Já Disponíveis no Projeto

- **PostgreSQL + Prisma**: Armazenamento de dados e embeddings
- **OpenAI API**: Embeddings (text-embedding-3-small) e LLM
- **Anthropic API**: Claude para classificação e geração
- **BullMQ + Redis**: Jobs assíncronos
- **Socket.io**: Atualizações real-time

#### 10.2 Adições Sugeridas

| Tecnologia | Uso | Prioridade |
|------------|-----|------------|
| **pgvector** | Busca vetorial nativa no Postgres | Alta |
| **LangChain** | Orquestração de LLM e RAG | Média |
| **Weights & Biases** | Tracking de experimentos ML | Baixa |
| **Hugging Face** | Modelos de classificação leves | Média |

---

### 11. Estimativa de Custos

#### 11.1 Custos de API (por empresa/mês)

| Operação | Volume Estimado | Custo |
|----------|-----------------|-------|
| Embeddings | 10,000 queries | ~$2 |
| Intent Classification (GPT-4o-mini) | 5,000 calls | ~$5 |
| Quality Scoring | 1,000 calls | ~$2 |
| Response Generation | Existente | Já incluído |

**Total adicional estimado: ~$10/empresa/mês**

#### 11.2 Custos de Infraestrutura

- Jobs BullMQ adicionais: Mínimo (já tem Redis)
- Storage de embeddings: ~1KB por embedding
- Processamento: Dentro da capacidade existente

---

### 12. Conclusão

Este sistema de aprendizagem permitirá que o ChatBlue evolua continuamente, aprendendo com cada interação dos atendentes humanos. Com o tempo:

1. **Mais tickets serão resolvidos automaticamente** pela IA
2. **Menos transferências** para humanos serão necessárias
3. **Qualidade das respostas** aumentará progressivamente
4. **Conhecimento** será expandido automaticamente
5. **Atendentes** poderão focar em casos realmente complexos

O sistema é projetado para ser:
- **Incremental**: Aprende continuamente sem necessidade de retraining completo
- **Supervisionado**: Mantém humanos no loop para validação
- **Escalável**: Funciona para qualquer volume de tickets
- **Multi-tenant**: Isolado por empresa

---

## Próximos Passos

1. Revisar e aprovar este plano
2. Priorizar fases com base em necessidades do negócio
3. Criar tasks detalhadas no backlog
4. Iniciar implementação da Fase 1

---

*Documento criado em: Janeiro 2026*
*Versão: 1.0*
