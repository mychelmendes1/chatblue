# Canal Instagram no ChatBlue — Direct (janela de 24 h) + automação de comentários (estilo ManyChat)

> Objetivo: atender o Instagram Direct dentro das regras da Meta (janela de 24 h) e, quando alguém
> comentar num post/reel, responder o comentário e mandar uma mensagem no Direct com link,
> como o ManyChat faz. Este documento diz o que já existe, o que a Meta exige e o que falta construir.

Data: 2026-11-01. Base analisada: clone `mychelmendes1/chatblue` (main `4db36f3`). ⚠️ = conferir no
`Grupo-Blue/chatblue` (v4.14), que pode ter evoluído.

---

## 1. O que já existe no código

| Peça | Estado |
|------|--------|
| `ConnectionType.INSTAGRAM` no Prisma, campos `instagramAccountId`, `instagramUsername` em `WhatsAppConnection`; `Contact.instagramId` | ✅ existe |
| `services/instagram/instagram.service.ts` | ✅ envia texto, imagem, vídeo, áudio, arquivo, sticker, reação, typing, mark_seen, quick replies, generic template (com botão `web_url`), product template; baixa mídia |
| `POST /connections/instagram` (`connection.routes.ts`) | ✅ cria conexão **colando manualmente** `accessToken`, `instagramAccountId`, `webhookToken` |
| `GET/POST /webhooks/instagram/:connectionId` (`webhook.routes.ts`) | ✅ recebe `entry.messaging` (mensagem, postback, reação, read, referral, story mention/reply) e joga no `MessageProcessor` |
| `message.routes.ts` | ✅ envia resposta do atendente pelo `InstagramService` quando a conexão é INSTAGRAM |
| UI `connections/page.tsx`, `chat-sidebar.tsx` | ✅ cadastro da conexão e indicação do canal |

### O que falta ou está errado

1. **Sem OAuth.** O admin precisa gerar token no painel da Meta e colar. Token de usuário expira
   (long-lived = 60 dias) e não há renovação → a conexão cai sozinha.
2. **API antiga e host errado para o caminho recomendado.** Usa `graph.facebook.com/v18.0`
   (fluxo "Facebook Login", exige Página do Facebook vinculada). A v18 está descontinuada.
3. **Webhook por conexão** (`/webhooks/instagram/:connectionId`). A Meta aceita **uma URL de callback
   por app**, não por conta. Hoje, cada conexão nova exigiria mexer no painel da Meta. O roteamento
   correto é pelo `entry.id` (ID da conta Instagram) → conexão.
4. **Sem validação de assinatura** (`X-Hub-Signature-256` com o App Secret). Qualquer um que descubra
   a URL consegue injetar mensagens. O webhook do WhatsApp Cloud tem o mesmo problema.
5. **Não trata `entry.changes` / `field: comments`.** Só `entry.messaging`. Comentários, menções e
   live_comments são ignorados → sem automação de comentário.
6. **Não controla a janela de 24 h.** Atendente/IA pode tentar responder fora da janela e a Meta
   devolve erro; não há aviso na tela nem tag `HUMAN_AGENT`.
7. **Ecos.** Não checa `message.is_echo` (mensagens enviadas pelo app/pelo próprio Instagram) — só
   compara `sender.id` com `instagramAccountId`, o que funciona para echo mas não cobre tudo.
8. Processamento do webhook é inline (depois do `res.sendStatus(200)`), sem fila nem dedupe de
   entregas duplicadas (a Meta reenvia).
9. Contato é criado com `phone = IGSID` (ID do usuário no Instagram) e `@@unique([phone, companyId])`.
   Funciona, mas mistura semântica e quebra deduplicação com WhatsApp. Não guarda `username`.

---

## 2. Regras da Meta que mandam no desenho

### 2.1 Qual API usar: **Instagram API with Instagram Login** (Business Login for Instagram)

| | Instagram Login (recomendado) | Facebook Login |
|---|---|---|
| Host | `graph.instagram.com` | `graph.facebook.com` |
| Precisa de Página do Facebook vinculada | **Não** | Sim |
| Login do cliente | tela do Instagram (`instagram.com/oauth/authorize`) | tela do Facebook, escolher Página |
| Scopes | `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments` (+ `instagram_business_content_publish` se publicar) | `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`, `pages_messaging`, `pages_show_list`… |
| Token | User token curto → long-lived **60 dias**, renovável via `refresh_access_token` (token ≥ 24 h e não expirado) | Page token (pode ser sem expiração via system user) |
| Private reply | `POST /{ig-id}/messages` com `recipient: {comment_id}` | `POST /{page-id}/messages` com `recipient: {comment_id}` |
| Limitações | não tem `story_insights`; sem recursos que dependem da Página | mais burocracia para o cliente |

Recomendação: **Instagram Login**. É o caminho que a Meta empurra desde 2024/2025, não obriga o
cliente a ter Página do Facebook, e o fluxo "clica → loga no Instagram → autoriza" é idêntico ao
que queremos para o Notion.

### 2.2 Permissões e revisão do app (App Review)

- App no Meta for Developers com o produto **Instagram** > "API setup with Instagram business login".
- **Verificação do negócio** (Business Verification) do Grupo Blue.
- **Advanced Access** nas permissões `instagram_business_manage_messages` e
  `instagram_business_manage_comments` — obrigatório para atender contas que **não são nossas**
  (clientes do ChatBlue). Com Standard Access só funciona para contas com papel no app (ótimo para
  desenvolver e testar).
- **Human Agent** (recurso adicional, passa por App Review): libera a tag `HUMAN_AGENT` que estende
  a janela para **7 dias** para resposta **humana** (não pode ser usada por bot/IA).
- Na conta do cliente, o dono precisa ligar **Configurações → Mensagens e respostas a stories →
  Controles de mensagens → Permitir acesso a mensagens** (Connected tools). Sem isso o webhook de
  mensagens não chega.
- Conta precisa ser **profissional** (Business ou Creator).

### 2.3 Janela de mensagens (Direct)

- Só podemos mandar mensagem **depois** que o usuário mandou primeiro (ou respondeu a um private reply).
- **24 h** a partir da última mensagem do usuário. Até **7 dias** se a conversa começou por anúncio
  Click-to-Direct.
- `HUMAN_AGENT` → **7 dias**, somente atendente humano, só com a permissão aprovada.
- Fora da janela a API devolve erro; não existe "template" como no WhatsApp para reabrir.
- Texto até 1000 bytes; imagem até 8 MB; áudio/vídeo/PDF até 25 MB; até 10 anexos por request.
- Não existe grupo; conversa inativa na pasta "Solicitações" por 30 dias deixa de aparecer.

### 2.4 Comentários e Private Reply (o "ManyChat")

- Webhooks: `comments` (posts, reels, anúncios; menções vêm junto) e `live_comments` (lives).
  Payload (Instagram Login): `entry.id` = conta, `field: "comments"`, `value: { id, text, from{id,username}, media{id,media_product_type}, parent_id? }`.
- **Resposta pública** no comentário: `POST /{comment-id}/replies` com `message`
  (scope `instagram_business_manage_comments`).
- **Private reply** (DM a partir do comentário): `POST /{ig-id}/messages` com
  `recipient: { comment_id }`. Regras duras:
  - **1 mensagem por comentário**, e só.
  - Até **7 dias** depois do comentário (live: só durante a transmissão).
  - **Não abre a janela de 24 h.** Só quando a pessoa **responde** no Direct a conversa segue.
  - Vai para Inbox se a pessoa segue a conta; senão cai em **Solicitações**. A mensagem já leva o
    link do post comentado.
  - Precisa de `instagram_business_manage_messages` + `instagram_business_manage_comments`.
  - Rate limit padrão da API; usar webhooks em vez de polling (a Meta avisa que polling toma limite).
- Dedupe: a Meta pode entregar o mesmo comentário mais de uma vez (anúncios ainda mais).
- Ignorar comentários do próprio dono (`from.id === entry.id`) e, opcionalmente, respostas a
  comentários (`parent_id` presente) para não responder quem respondeu o nosso reply.

---

## 3. Arquitetura alvo

```
Meta (um app "ChatBlue")
 ├─ OAuth: instagram.com/oauth/authorize ──▶ API /integrations/instagram/callback
 │        code → short token → long-lived (60d) → grava na conexão (cifrado) + refresh job
 ├─ POST /{ig-id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,
 │        message_reactions,messaging_seen,messaging_referral,comments,live_comments
 └─ Webhook ÚNICO: POST /webhooks/instagram  (valida X-Hub-Signature-256, responde 200, enfileira)
          │
          ▼ BullMQ "instagram-webhook" (dedupe por mid / comment id em Redis, TTL 7d)
   ┌──────┴───────────────┬────────────────────────────┐
   ▼                      ▼                            ▼
 messaging           field=comments / live_comments   reactions / seen / referral
 → MessageProcessor  → CommentAutomationService        → status das mensagens
   (ticket, IA,        1. casa regra (post/reel, keyword)
    atendente)         2. reply público (opcional)
                       3. private reply com link (1x)
                       4. registra InstagramCommentEvent
                       5. quando a pessoa responder no DM → ticket normal,
                          janela de 24h aberta, IA/fluxo continua
```

Envio (atendente/IA): `InstagramMessagingService.send()` → verifica janela (24 h / 7 dias
HUMAN_AGENT) → `POST graph.instagram.com/v21+/{ig-id}/messages` → grava `messageId`, trata erro de
janela com mensagem clara na UI.

---

## 4. O que desenvolver

### 4.1 Conexão por OAuth (substitui o "colar token")

**Backend (`apps/api`)**
- `GET /integrations/instagram/connect` → monta URL
  `https://www.instagram.com/oauth/authorize?client_id&redirect_uri&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments&state`
  (state no Redis, 10 min, amarrado a `companyId`/`userId`).
- `GET /integrations/instagram/callback` → troca `code` em `api.instagram.com/oauth/access_token`
  (remover `#_` do fim do code) → troca por long-lived em `graph.instagram.com/access_token?grant_type=ig_exchange_token`
  → `GET /me?fields=id,username,name,profile_picture_url` → cria/atualiza conexão INSTAGRAM
  (`instagramAccountId`, `instagramUsername`, `accessToken` **cifrado**, `tokenExpiresAt`, `scopes`)
  → `POST /{ig-id}/subscribed_apps` com os campos acima → redireciona para
  `${FRONTEND_URL}/connections?instagram=ok`.
- Job BullMQ `instagram-token-refresh` (diário): para tokens com > 24 h e < 60 d, chama
  `graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`; se falhar → status
  `ERROR` + notificação ao admin para reconectar.
- `DELETE /connections/:id` já existe; acrescentar revogação (`DELETE /{ig-id}/subscribed_apps`).
- `crypto.util.ts` (AES-256-GCM, `ENCRYPTION_KEY`) — o mesmo utilitário previsto no plano do Notion;
  hoje `accessToken` está em texto puro.
- Env: `META_APP_ID`, `META_APP_SECRET`, `INSTAGRAM_REDIRECT_URI`, `INSTAGRAM_GRAPH_VERSION`.

**Prisma**
```prisma
// WhatsAppConnection (ou renomear para Connection)
tokenExpiresAt   DateTime? @map("token_expires_at")
scopes           String[]  @default([])
webhookFields    String[]  @default([])
// Contact
instagramUsername String? @map("instagram_username")
lastInboundAt     DateTime? @map("last_inbound_at")        // base da janela de 24h
windowSource      String?   // "standard" | "ctd_ad" (7d) | "private_reply_pending"
```

**Frontend (`apps/web/app/(dashboard)/connections`)**
- Botão **"Conectar Instagram"** no lugar do formulário de token. Card com avatar, @username,
  status, "token válido até", botão Reconectar/Desconectar.
- Manter o formulário antigo escondido atrás de flag só para contas de teste.

### 4.2 Webhook único e robusto

- Nova rota `GET/POST /webhooks/instagram` (sem `:connectionId`). `GET` responde ao `hub.challenge`
  com `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` global.
- `POST`: validar `X-Hub-Signature-256` = HMAC-SHA256(raw body, `META_APP_SECRET`) — exige
  `express.raw`/`verify` no body parser dessa rota. Responder 200 imediatamente e enfileirar.
- Resolver conexão por `entry.id` (`instagramAccountId`). Se não achar, logar e descartar.
- Dedupe em Redis: `ig:evt:{mid|comment_id}` com TTL 7 dias.
- Processar `entry.messaging` (reaproveitar `extractInstagramMessageContent`), pular `is_echo`.
- Processar `entry.changes[]`/`field`: `comments`, `live_comments`, `message_reactions`,
  `messaging_seen` (marcar como lida), `messaging_referral` (anúncio → marcar `windowSource = ctd_ad`).
- Manter `/webhooks/instagram/:connectionId` por um tempo, só redirecionando para o mesmo handler.
- Atualizar `InstagramService` para `graph.instagram.com/v21.0+` e adicionar
  `replyToComment(commentId, text)`, `sendPrivateReply(commentId, message)`, `hideComment`,
  `getMedia(mediaId)` e `listRecentMedia()` (para a UI escolher o post da automação).

### 4.3 Janela de 24 h (e 7 dias)

- Ao receber qualquer mensagem do usuário: `contact.lastInboundAt = now`, `windowSource`.
- Antes de enviar: `canSend()` → `now - lastInboundAt < 24h` (ou 7 d se `ctd_ad`). Se expirou:
  - IA/automação: **não envia**; registra evento "fora da janela".
  - Atendente humano com permissão Human Agent aprovada e `< 7 d`: envia com `"tag": "HUMAN_AGENT"`.
  - Senão: bloqueia na UI com aviso "Janela do Instagram fechada. O cliente precisa mandar mensagem."
- UI do chat: contador da janela (igual já faz sentido para WhatsApp Cloud), ícone do canal.
- Tratar erro da Meta (código 10 / subcódigo 2534022 "outside allowed window") → traduzir no
  `meta-error-translator.ts`.

### 4.4 Automação de comentários (o "ManyChat")

**Prisma**
```prisma
model InstagramCommentAutomation {
  id             String   @id @default(cuid())
  companyId      String
  connectionId   String
  name           String
  isActive       Boolean  @default(true)
  // alvo
  mediaIds       String[] @default([])     // vazio = todos os posts/reels
  mediaTypes     String[] @default([])     // FEED, REELS, AD, LIVE
  keywords       String[] @default([])     // vazio = qualquer comentário
  matchMode      String   @default("contains") // contains | exact | regex
  excludeReplies Boolean  @default(true)   // ignora comentários com parent_id
  // ações
  publicReplies  String[] @default([])     // variações, sorteia 1 (evita spam idêntico)
  privateMessage Json                      // { text, linkUrl?, buttonTitle?, imageUrl? }
  openTicket     Boolean  @default(false)  // cria ticket já na automação ou só quando responder
  assignDeptId   String?
  aiAgentId      String?                   // agente que assume quando a pessoa responder
  // limites
  oncePerUser    Boolean  @default(true)
  dailyLimit     Int?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model InstagramCommentEvent {
  id            String   @id @default(cuid())
  companyId     String
  connectionId  String
  automationId  String?
  commentId     String   @unique
  mediaId       String
  fromIgId      String
  fromUsername  String?
  text          String
  parentId      String?
  publicReplyId String?
  privateReplyMessageId String?
  status        String   // RECEIVED | MATCHED | REPLIED | PRIVATE_SENT | SKIPPED | FAILED | USER_REPLIED
  error         String?
  createdAt     DateTime @default(now())
}
```

**Serviço `CommentAutomationService`**
1. Recebe o evento, descarta `from.id === entry.id`, descarta duplicado, respeita `excludeReplies`.
2. Busca automações ativas da conexão; filtra por mídia e keyword (normalizar acentos/caixa).
3. Executa: `replyToComment` (se configurado) → `sendPrivateReply(commentId, {text + link})`.
   Para link clicável use texto com URL; o generic template com botão `web_url` é opcional e deve
   ser testado em Advanced Access (a doc de private reply só garante texto).
4. Garante **1 private reply por comentário** (`commentId @unique`) e `oncePerUser` por automação.
5. Cria/atualiza `Contact` (`instagramId`, `instagramUsername`) com `windowSource = private_reply_pending`.
6. Quando o webhook `messages` chegar desse IGSID com `private_reply_pending` → marca
   `USER_REPLIED`, abre ticket no departamento/IA configurados e a conversa segue na janela de 24 h.
7. Fila BullMQ com concorrência baixa e backoff em 429; comentários de lives com prioridade.

**Rotas** `/instagram/automations` (CRUD), `/instagram/automations/:id/events` (log),
`/instagram/media` (lista posts/reels da conta para o seletor).

**Frontend** página **Instagram → Automações de comentário**: lista, editor (escolher posts com
thumbnail, keywords, respostas públicas, mensagem privada com preview, link, limites), log de eventos
com status e motivo de skip.

### 4.5 Contato e identidade

- Parar de usar `phone = IGSID`. Contato Instagram: `phone` nulo ou sintético `ig:<igsid>`,
  `instagramId` preenchido, `instagramUsername`. Ajustar `MessageProcessor.processIncoming`
  (`contactWhere.OR` já procura por `instagramId`) e a unique `[phone, companyId]`.
- Buscar perfil (`GET /{igsid}?fields=name,username,profile_pic,is_verified_user,follower_count,is_user_follow_business`)
  na primeira mensagem para enriquecer o contato.
- Merge manual com contato de WhatsApp quando o atendente identificar a mesma pessoa.

### 4.6 IA no Instagram

- O `MessageProcessor` já aciona IA por conexão (`aiEnabled`). Garantir que: (a) respostas respeitem
  `canSend()`; (b) textos ≤ 1000 bytes (quebrar em partes); (c) sem formatação WhatsApp (`*negrito*`
  não renderiza no Instagram) — criar formatter por canal; (d) IA **nunca** usa `HUMAN_AGENT`.

---

## 5. Fases e estimativa

| Fase | Entrega | Esforço |
|------|---------|---------|
| **0. Meta** | App com produto Instagram, Business Verification, pedir Advanced Access em `manage_messages` e `manage_comments`, pedir Human Agent, gravar vídeo do fluxo para a revisão. Prazo da Meta: 1–4 semanas. Começar já. | 1 dia de trabalho + espera |
| **1. OAuth + webhook único** | Botão "Conectar Instagram", callback, long-lived token cifrado, refresh job, `subscribed_apps`, webhook único com assinatura, dedupe, fila, roteamento por `entry.id`, migração para `graph.instagram.com` | 4–5 dias |
| **2. Janela de 24 h** | `lastInboundAt`, `canSend()`, HUMAN_AGENT, aviso/contador na UI, tradução de erros | 2–3 dias |
| **3. Automação de comentários** | Modelos, serviço, fila, CRUD, tela de automações, seletor de posts, log | 5–7 dias |
| **4. Contato/IA/polimento** | Identidade do contato IG, perfil, formatter por canal, limites de texto, métricas (comentários → DMs → tickets) | 2–3 dias |

Total: **~3 semanas** de um dev, com a aprovação da Meta correndo em paralelo (é o maior risco de prazo).

---

## 6. Decisões para você

1. **Instagram Login vs Facebook Login.** Recomendo Instagram Login. Só vale Facebook Login se
   algum cliente precisar de recurso de Página (ex.: `story_insights`) ou já tiver system user.
2. **Private reply com texto+link ou com botão (template).** Texto com link funciona sempre; botão
   é mais bonito mas precisa validar em produção. Sugiro texto primeiro, botão como melhoria.
3. **Comentário vira ticket na hora ou só quando a pessoa responde no DM?** Recomendo só quando
   responder (senão a fila enche de tickets sem conversa).
4. **Human Agent para quem?** Só atendentes humanos; IA e automações ficam nas 24 h.

---

## 7. Fontes

- Business Login for Instagram (OAuth, scopes, long-lived/refresh): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
- Messaging API (janela, tipos, limites): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
- Private Replies: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/private-replies
- Comment moderation (`/{comment-id}/replies`): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/comment-moderation
- Webhook fields e permissões: https://developers.facebook.com/documentation/instagram-platform/webhooks/fields
- Exemplos de payload (comments, messages, is_echo): https://developers.facebook.com/documentation/instagram-platform/webhooks/examples
- Política Messenger/IG Messaging (Human Agent): https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy/
