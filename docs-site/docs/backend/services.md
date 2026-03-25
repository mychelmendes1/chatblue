---
sidebar_position: 3
title: Services
description: Servicos de negocio do ChatBlue
---

# Services

Os services encapsulam a logica de negocio do ChatBlue, separando-a das rotas e controllers.

## Estrutura

```
apps/api/src/services/
├── ai/
│   ├── ai.service.ts
│   ├── assistant.service.ts
│   ├── context-builder.service.ts
│   ├── embedding.service.ts
│   ├── guardrails.service.ts
│   ├── knowledge-sync.service.ts
│   ├── data-source-sync.service.ts
│   ├── orchestrator.service.ts
│   ├── personality.service.ts
│   ├── transcription.service.ts
│   └── transfer-analyzer.service.ts
│
├── blue/
│   ├── blue.service.ts
│   ├── blue-context-builder.service.ts
│   ├── code-rag.service.ts
│   └── doc-rag.service.ts
│
├── email/
│   └── email.service.ts
│
├── email-channel/
│   ├── imap.service.ts
│   ├── smtp.service.ts
│   ├── google-oauth.service.ts
│   ├── email-template.service.ts
│   └── crypto.util.ts
│
├── external-ai/
│   └── external-ai-webhook.service.ts
│
├── instagram/
│   └── instagram.service.ts
│
├── knowledge/
│   ├── context-retrieval.service.ts
│   ├── embedding.service.ts
│   └── ingestion.service.ts
│
├── ml/
│   ├── ml-integration.service.ts
│   ├── ml-response-generator.service.ts
│   ├── intent-classifier.service.ts
│   ├── pattern-detector.service.ts
│   ├── quality-scorer.service.ts
│   ├── training-pair-collector.service.ts
│   └── index.ts
│
├── notion/
│   └── notion.service.ts
│
├── nps/
│   └── nps.service.ts
│
├── push/
│   └── push.service.ts
│
├── sla/
│   ├── sla.service.ts
│   └── sla.service.test.ts
│
├── upload/
│   ├── upload.service.ts
│   └── upload.service.test.ts
│
├── whatsapp/
│   ├── whatsapp.service.ts
│   ├── baileys.service.ts
│   └── meta-cloud.service.ts
│
├── admin-assistant/
│   └── admin-assistant.service.ts
│
├── message-processor.service.ts
└── outbound-webhook.service.ts
```

---

## WhatsApp Services (`whatsapp/`)

### WhatsAppService

Servico principal que roteia para Baileys ou Meta Cloud com base no tipo da conexao. Recebe uma `WhatsAppConnection` no construtor e instancia automaticamente o provider correto:

```typescript
class WhatsAppService {
  constructor(connection: WhatsAppConnection) {
    if (connection.type === 'BAILEYS') {
      this.baileysService = BaileysService.getInstance(connection.id);
    } else {
      this.metaService = new MetaCloudService(connection);
    }
  }

  async sendMessage(to: string, content: string, options?: {
    quotedMessageId?: string;
  }): Promise<{ messageId: string }>;

  async sendMedia(to: string, mediaUrl: string, mediaType: string, caption?: string, options?: {
    quotedMessageId?: string;
    filename?: string;
    mimetype?: string;
  }): Promise<{ messageId: string; finalMediaUrl?: string }>;
}
```

Alem de texto e midia, suporta templates, mensagens interativas (botoes, listas) e conversao de audio (OGG/Opus via ffmpeg).

### BaileysService

Gerencia conexoes nao-oficiais via Baileys (library open-source). Usa um **singleton por conexao** (`Map<string, BaileysService>`) para manter a sessao do WebSocket ativa. Busca a versao do WhatsApp Web em cache (TTL de 6 horas) e faz fallback para uma versao conhecida se a busca falhar.

Principais responsabilidades:

- Conexao e geracao de QR Code (salvo no banco como base64)
- Reconexao automatica com backoff (exceto se desconectado por `loggedOut`)
- Roteamento de mensagens recebidas para `MessageProcessor`
- Download de midia recebida (imagens, audio, documentos, video, stickers)
- Envio de mensagens de texto, midia, templates e mensagens interativas
- Alerta por email (`emailService`) quando a conexao cai

### MetaCloudService

Gerencia conexoes oficiais via Meta Cloud API (`graph.facebook.com/v18.0`). Cada instancia recebe uma `WhatsAppConnection` com `accessToken` e `phoneNumberId`.

Principais responsabilidades:

- Envio de mensagens de texto, imagens, audio, video, documentos e stickers
- Envio de templates com variaveis e botoes
- Envio de mensagens interativas (botoes de resposta e listas)
- Processamento de webhooks da Meta (mensagens recebidas e status updates)
- Download de midia recebida via Media API da Meta
- Teste de conexao (`testConnection`)

---

## AI Services (`ai/`)

### AIService

Classe base para geracao de texto com suporte a OpenAI e Anthropic. Recebe `provider` e `apiKey` no construtor e instancia o client correto.

```typescript
type AIProvider = 'openai' | 'anthropic';

class AIService {
  constructor(provider: string, apiKey: string);

  async generateResponse(
    systemPrompt: string,
    userMessage: string,
    context: AIContext,
    options?: AIOptions
  ): Promise<string>;
}
```

Modelos disponiveis sao declarados em `AI_MODELS`: GPT-4 Turbo, GPT-4o, GPT-4o Mini, GPT-3.5 Turbo para OpenAI; Claude Opus 4, Claude Sonnet 4, Claude 3.5 Sonnet, Claude 3 Opus e Claude 3 Haiku para Anthropic.

O `AIContext` enriquece o system prompt com nome do contato, telefone, status de cliente, historico de mensagens, nome da empresa, departamento e atendente.

### AIAssistantService

Servico de alto nivel que processa consultas `@ia` feitas por atendentes dentro de um ticket. Gerencia um cache de `OrchestratorService` por empresa.

```typescript
class AIAssistantService {
  async processQuery(request: AIAssistantQueryRequest): Promise<AIAssistantQueryResponse>;
  async processAutoSuggestion(request: AIAutoSuggestionRequest): Promise<AIAssistantQueryResponse>;
  async submitFeedback(request: AIFeedbackRequest): Promise<void>;
}
```

A resposta inclui a categoria classificada, confianca, fontes utilizadas (com excerpts e scores), tempo de processamento e deteccao de lacunas de conhecimento (`hasKnowledgeGap`).

### OrchestratorService

Orquestra o pipeline completo de uma consulta IA: classificacao de categoria, busca semantica de documentos relevantes e geracao de resposta.

```typescript
class OrchestratorService {
  constructor(provider: string, apiKey: string);

  async processQuery(
    query: string,
    context: OrchestratorContext,
    selectedCategory?: string
  ): Promise<OrchestratorResult>;
}
```

O `OrchestratorResult` retorna metricas de processamento detalhadas: tempo de classificacao, busca e geracao.

### ContextBuilderService

Constroi o contexto completo para geracao de respostas da IA em atendimentos automaticos. Busca o ticket com contato, departamento, empresa, configuracoes e historico de mensagens, depois combina com os servicos de personalidade, guardrails e recuperacao de conhecimento.

```typescript
class ContextBuilderService {
  constructor(config?: Partial<ContextBuilderConfig>);

  async buildContext(
    ticketId: string,
    userMessage: string,
    aiAgentConfig: any
  ): Promise<BuiltContext>;
}
```

O `BuiltContext` retorna o system prompt montado, o `AIContext`, e as instancias de `PersonalityService` e `GuardrailsService` configuradas.

### EmbeddingService (`ai/embedding.service.ts`)

Gera embeddings vetoriais e faz busca semantica nos documentos da empresa. Suporta OpenAI (`text-embedding-3-small`) e referencia Voyage AI para Anthropic.

```typescript
class EmbeddingService {
  constructor(provider: string, apiKey: string);

  async generateEmbedding(text: string): Promise<EmbeddingResult>;
  async semanticSearch(
    companyId: string,
    query: string,
    options?: SemanticSearchOptions
  ): Promise<SearchResult[]>;
}
```

O `SemanticSearchOptions` permite filtrar por `dataSourceIds`, `categories`, `departmentId` e threshold minimo de similaridade.

### PersonalityService

Configura tom e estilo das respostas da IA. Suporta quatro tons (`friendly`, `formal`, `technical`, `empathetic`) e quatro estilos (`concise`, `detailed`, `conversational`, `whatsapp`). O estilo `whatsapp` e o padrao, otimizado para mensagens curtas e naturais.

Inclui variacoes de saudacao por idioma (pt-BR, en-US, es-ES) e gera system prompts adaptados a personalidade configurada.

### GuardrailsService

Valida mensagens de entrada contra regras de seguranca antes da geracao de respostas:

- **Dados sensiveis**: bloqueia solicitacoes de CPF, CNPJ, cartao de credito, senhas
- **Jailbreak**: detecta tentativas como "ignore your instructions", "pretend you are", "developer mode"
- **Off-topic**: filtra assuntos nao relacionados ao negocio (politica, religiao, esportes, etc.)

Retorna um `ValidationResult` com acao (`block`, `warn`, `redirect`) e resposta sugerida.

### TransferAnalyzerService

Analisa se uma conversa deve ser transferida da IA para um atendente humano. Usa Claude 3 Haiku para analise rapida e economica.

Opera em dois momentos:

- **Pre-analise**: antes de gerar a resposta, verifica se o caso e obviamente para humanos (evita gasto desnecessario com geracao)
- **Pos-analise**: apos a resposta da IA, avalia se ela nao conseguiu resolver e sugere transferencia com departamento especifico

```typescript
class TransferAnalyzerService {
  constructor(apiKey: string);

  async preAnalyze(userMessage: string, ...): Promise<PreAnalysisResult>;
  async postAnalyze(userMessage: string, aiResponse: string, ...): Promise<PostAnalysisResult>;
}
```

### TranscriptionService

Transcreve audio para texto usando OpenAI Whisper. Mesmo que o provider principal seja Anthropic, a transcricao usa OpenAI (Whisper e exclusivo da OpenAI).

```typescript
class TranscriptionService {
  constructor(apiKey: string);

  async transcribe(audioPath: string, language?: string): Promise<string>;
}
```

Valida tamanho do arquivo (limite de 25MB do Whisper) e usa `pt` como idioma padrao.

### KnowledgeSyncService (`ai/knowledge-sync.service.ts`)

Sincroniza automaticamente artigos da Base de Conhecimento e itens de FAQ com `AIDocument`. Cada empresa tem um data source interno (`type: 'INTERNAL'`) criado automaticamente.

- `syncKnowledgeBaseItem`: sincroniza um artigo especifico (cria, atualiza ou desativa o documento)
- `syncFAQItem`: sincroniza um item de FAQ
- `removeSyncedDocument`: remove documento sincronizado

Usa checksums MD5 para evitar re-sincronizacoes desnecessarias.

### DataSourceSyncService (`ai/data-source-sync.service.ts`)

Sincroniza fontes de dados externas com o sistema de documentos da IA. Suporta multiplos tipos de fonte:

- **Notion**: conecta via API do Notion, extrai paginas de um database
- **Google Drive**: acessa via OAuth2, suporta filtro por `mimeTypes`
- **Confluence**: conecta via API Token, filtra por `spaceKey` e labels

Gera embeddings automaticamente apos a ingestao de documentos novos/atualizados.

---

## Blue Services (`blue/`)

Servicos do assistente interno "Blue", que ajuda atendentes a usar o sistema de forma eficiente.

### BlueService

Servico principal do Blue. Gera dicas contextuais baseadas na pagina atual e responde perguntas dos atendentes via chat.

```typescript
class BlueService {
  constructor(provider: string, apiKey: string, companyId: string);

  async getContextualTip(context: PageContext): Promise<string>;
  async chat(messages: ChatMessage[], context: PageContext): Promise<string>;
}
```

Usa modelos mais rapidos e economicos (GPT-4o Mini ou Claude 3 Haiku) para manter baixo o custo.

### BlueContextBuilder

Constroi prompts contextuais para o Blue combinando informacoes da pagina atual com trechos de codigo-fonte e documentacao via RAG.

### CodeRAGService

Busca trechos de codigo-fonte relevantes usando o sistema `KnowledgeContext` com slug `system-code`.

### DocRAGService

Busca trechos de documentacao relevantes usando o sistema `KnowledgeContext` com slug `system-docs`.

---

## Email Services

### EmailService (`email/email.service.ts`)

Servico de envio de emails do sistema (alertas e notificacoes internas) via **Brevo** (antigo Sendinblue). Nao e usado para canal de atendimento -- apenas para alertas como:

- Aviso de SLA proximo do limite
- Notificacao de SLA violado
- Alerta de desconexao do WhatsApp
- Relatorios diarios

Os destinatarios de alerta sao configurados via variavel de ambiente `ALERT_RECIPIENTS`.

### Canal de Email (`email-channel/`)

Conjunto de servicos que implementam email como canal de atendimento (receber e responder tickets por email).

#### IMAPService

Conecta a caixas de entrada via IMAP (suporta senha e OAuth2/Gmail). Busca emails novos, faz threading (vincula respostas ao ticket correto) usando:

- Plus-addressing (`suporte+ticketid@empresa.com`)
- Protocolo no assunto (`[#ABC-123]`)
- Headers `In-Reply-To` / `References`

Cria tickets novos quando nao encontra threading. Sanitiza HTML recebido e extrai anexos.

#### SMTPService

Envia respostas por email via SMTP (suporta senha e OAuth2/Gmail). Gera HTML a partir de templates e insere headers de threading para manter a conversa no mesmo thread do cliente de email.

```typescript
async function sendTicketReply(opts: SendEmailOpts): Promise<{ messageId: string }>;
```

#### GoogleOAuthService

Gerencia o fluxo OAuth2 para contas Gmail. Gera URL de consentimento, troca authorization code por tokens e faz refresh automatico de access tokens expirados.

#### EmailTemplateService

Gera o HTML e texto plano dos emails enviados. Inclui historico de mensagens, branding da empresa e links para resposta.

#### CryptoUtil

Utilitario para criptografia AES-256-GCM de credenciais de email (senhas IMAP/SMTP) armazenadas no banco. Usa `EMAIL_ENCRYPTION_KEY` ou `JWT_SECRET` como chave.

---

## External AI (`external-ai/`)

### ExternalAIWebhookService

Integra o ChatBlue com provedores de IA externos via webhook. Envia o payload da conversa para uma URL configurada e recebe a resposta de volta. Suporta dois formatos de payload:

- **Formato ChatBlue** (`WebhookPayload`): formato padrao com evento, ticket, contato, mensagem e historico
- **Formato BlueChatPayload**: formato especifico para integracao com o bluetoken-ai, inclui `conversation_id`, canal, contexto e company metadata

Eventos suportados: `message.received`, `ticket.assigned`, `ticket.unassigned`.

---

## Instagram (`instagram/`)

### InstagramService

Gerencia a integracao com Instagram via Meta Graph API. Reutiliza a mesma `WhatsAppConnection` (com `instagramAccountId` adicional).

Funcionalidades:

- Teste de conexao e busca de informacoes da conta
- Envio de mensagens de texto, imagens, audio, video e stickers
- Envio de templates e mensagens interativas (generic templates)
- Processamento de webhooks da Meta (mensagens e stories)
- Download de midia recebida

---

## Knowledge Services (`knowledge/`)

### ContextRetrievalService

Busca o contexto de conhecimento mais relevante para uma mensagem do usuario. Navega pelos `KnowledgeContext` da empresa, detecta o mais relevante por palavras-chave e recupera o conteudo das fontes.

```typescript
class ContextRetrievalService {
  async findRelevantContext(
    companyId: string,
    userMessage: string,
    aiAgentId?: string,
    aiProvider?: string,
    aiApiKey?: string
  ): Promise<{ context: any; sources: any[]; content: string } | null>;
}
```

### EmbeddingService (`knowledge/embedding.service.ts`)

Versao simplificada do embedding service, focada em geracao de embeddings para o sistema de knowledge. Usa `text-embedding-3-small` da OpenAI (faz fallback para OpenAI mesmo quando o provider principal e Anthropic).

```typescript
class EmbeddingService {
  constructor(provider: EmbeddingProvider, apiKey: string);

  async generateEmbedding(text: string): Promise<number[]>;
  async cosineSimilarity(a: number[], b: number[]): Promise<number>;
}
```

### KnowledgeIngestionService

Processa fontes de conhecimento de diversos formatos e extrai o conteudo textual:

| Tipo | Descricao |
|------|-----------|
| `TEXT` | Texto plano direto |
| `PDF` | Extrai texto de PDFs (lazy-load do `pdf-parse`) |
| `NOTION` | Extrai paginas via NotionService |
| `URL` | Faz scraping de paginas web |
| `DOCX` | Extrai texto de documentos Word via `mammoth` |
| `CSV` | Processa arquivos CSV |
| `JSON` | Processa arquivos JSON |

---

## ML Services (`ml/`)

Sistema de Machine Learning que aprende com atendimentos reais para melhorar respostas futuras.

### MLIntegrationService

Ponto de integracao do sistema de ML com o fluxo de atendimento. Fornece hooks estaticos para eventos importantes:

- `onTicketResolved`: agenda coleta de training pairs quando um ticket e resolvido
- `onAIToHumanTransfer`: registra transferencias IA-para-humano para aprendizado futuro
- `onMessageRated`: registra avaliacoes de mensagens

Verifica se ML esta habilitado (`aiEnabled` no `CompanySettings`) antes de agendar jobs.

### TrainingPairCollectorService

Coleta pares de treinamento (pergunta do cliente + resposta do atendente) de alta qualidade. Filtra por criterios configuravies:

- Tamanho minimo da resposta
- Tempo maximo de resposta (padrao: 1 hora)
- Exclusao de respostas de template
- Rating minimo

Gera embeddings dos pares coletados para busca semantica futura.

### IntentClassifierService

Classifica a intencao de mensagens de clientes. Combina patterns predefinidos (keywords + frases exemplo) com classificacao por IA.

Categorias predefinidas: vendas (`PRICE_INQUIRY`, `PRODUCT_INFO`, `PURCHASE_INTENT`), suporte (`COMPLAINT`, `ORDER_STATUS`), financeiro, entre outras. Aprende novas intencoes a partir dos training pairs coletados.

### PatternDetectorService

Detecta padroes recorrentes em training pairs e extrai templates de resposta. Usa IA para agrupar mensagens similares e sugerir templates parametrizados.

### QualityScorerService

Avalia a qualidade de respostas (IA e humanas) em multiplas dimensoes:

- **Relevancia**: a resposta atende a pergunta?
- **Completude**: a resposta e completa?
- **Clareza**: a resposta e clara?
- **Tom**: o tom e apropriado?
- **Fidelidade factual**: confere com a base de conhecimento?

Retorna um score geral (0-100) com breakdown por dimensao.

### MLResponseGeneratorService

Gera respostas usando o conhecimento aprendido. Combina multiplas fontes para encontrar a melhor resposta:

- Templates extraidos de padroes
- Base de conhecimento (busca semantica)
- Padroes aprendidos de atendimentos anteriores
- Geracao via IA (fallback)

A fonte da resposta e rastreada (`TEMPLATE`, `KNOWLEDGE_BASE`, `LEARNED_PATTERN`, `GENERATED`, `HYBRID`).

---

## Notion Service (`notion/`)

### NotionService

Integracao com a API do Notion para sincronizacao de contatos com databases externos. Permite que empresas vinculem sua base de clientes no Notion.

```typescript
class NotionService {
  constructor(apiKey: string);

  async testConnection(databaseId?: string): Promise<boolean>;
  async searchContact(databaseId: string, phone: string, email?: string): Promise<NotionContact | null>;
  async updateContactFromNotion(contactId: string, databaseId: string): Promise<void>;
}
```

Detecta automaticamente o tipo da propriedade "Telefone" no database (phone_number ou rich_text) e adapta as queries.

---

## NPS Service (`nps/`)

### NPSService

Envia pesquisas de satisfacao (NPS) automaticamente quando um ticket e resolvido/fechado. Gera um token unico por pesquisa e envia via WhatsApp.

```typescript
class NPSService {
  static async sendNPSSurvey(ticketId: string): Promise<void>;
}
```

Validacoes antes do envio: verifica se NPS esta habilitado, se o ticket ja foi avaliado (`npsRatedAt`), e se o token ja existe (para evitar envio duplicado).

---

## SLA Service (`sla/`)

### SLAService

Gerencia SLA (Service Level Agreement) com metodos estaticos. Resolve a configuracao por departamento (especifica primeiro, depois default da empresa).

```typescript
class SLAService {
  static async getSLAConfig(
    companyId: string,
    departmentId?: string | null
  ): Promise<SLAConfig | null>;

  static async calculateFirstResponseDeadline(
    anchor: Date,
    companyId: string,
    departmentId?: string | null
  ): Promise<Date>;

  static async calculateResolutionDeadline(
    anchor: Date,
    companyId: string,
    departmentId?: string | null
  ): Promise<Date>;
}
```

- **First Response**: padrao de 15 minutos (`DEFAULT_FIRST_RESPONSE_MINUTES`)
- **Resolucao**: padrao de 240 minutos / 4 horas (`DEFAULT_RESOLUTION_MINUTES`)
- **Horario comercial**: quando configurado no `SLAConfig`, os deadlines sao calculados apenas dentro do horario util (pula finais de semana e horas fora do expediente)

---

## Push Service (`push/`)

### PushService

Notificacoes push via Web Push API usando o protocolo VAPID. Configurado via variaveis de ambiente `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`.

Gerencia subscriptions por usuario e envia notificacoes com suporte a titulo, corpo, icone, badge, tag e acoes interativas.

---

## Upload Service (`upload/`)

### UploadService

Gerencia upload de arquivos usando multer com armazenamento em disco. Organiza arquivos em subdiretorios:

| Diretorio | Uso |
|-----------|-----|
| `media/` | Imagens e midias gerais |
| `documents/` | PDFs, DOCX, planilhas |
| `avatars/` | Fotos de perfil |
| `temp/` | Arquivos temporarios |

Limites de tamanho: imagens (5MB), documentos (25MB), audio (16MB), video (100MB).

---

## Admin Assistant (`admin-assistant/`)

### AdminAssistantService

Assistente de IA para administradores que responde perguntas sobre o dia atual com base em dados reais. Coleta contexto em tempo real:

- Tickets criados, pendentes, em andamento, resolvidos e com SLA violado
- Desempenho por atendente (tickets, mensagens enviadas/recebidas, follow-ups)
- Status online dos atendentes

```typescript
class AdminAssistantService {
  constructor(openAiApiKey: string, companyId: string);

  async getTodayContext(): Promise<TodayContext>;
  async chat(messages: ChatMessage[]): Promise<string>;
}
```

O system prompt instrui a IA a responder **apenas** com base nos dados fornecidos, sem inventar numeros.

---

## MessageProcessor (raiz)

Servico central que processa todas as mensagens recebidas (WhatsApp e Instagram). Classe `MessageProcessor` com metodos estaticos.

Fluxo de processamento:

1. **Horario comercial**: verifica se esta dentro do expediente configurado (com cooldown de 4h para mensagens fora do horario)
2. **Contato**: busca ou cria o contato, sincroniza com Notion se configurado
3. **Ticket**: busca ticket aberto ou cria um novo com protocolo gerado, calcula deadlines de SLA
4. **Mensagem**: salva a mensagem no banco com tipo, conteudo, midia e metadados
5. **Transcricao**: se a mensagem for audio, transcreve via Whisper
6. **Notificacao**: emite evento via Socket.io para o frontend
7. **IA**: se o ticket esta em modo IA, processa com o pipeline de IA (pre-analise de transferencia, geracao de resposta, pos-analise)
8. **Webhook externo**: se configurado, envia para o provider de IA externo
9. **Outbound webhook**: dispara evento `message_created` para integracao externa

```typescript
class MessageProcessor {
  static async processIncomingMessage(data: IncomingMessage): Promise<void>;
}
```

Suporta metadados de plataforma (WhatsApp ou Instagram), localizacao, contatos compartilhados e respostas interativas (botoes e listas).

---

## Outbound Webhook (raiz)

### sendOutboundEvent

Funcao fire-and-forget que envia eventos para uma URL configurada no `CompanySettings` (ex: Supabase function).

```typescript
async function sendOutboundEvent(
  companyId: string,
  event: OutboundEvent,
  payload: Record<string, unknown>
): Promise<void>;
```

Eventos: `conversation_created`, `conversation_updated`, `conversation_resolved`, `message_created`.

Inclui header `X-Webhook-Secret` quando o secret esta configurado. Timeout de 10 segundos. Executa via `setImmediate` para nao bloquear o request.

---

## Proximos Passos

- [Middlewares](/backend/middlewares)
- [WebSocket](/backend/websocket)
- [Jobs](/backend/jobs)
