# Canal Instagram no ChatBlue — documento de handoff

> Tudo o que foi planejado e construído nesta sessão sobre o canal Instagram, num só lugar, para
> ser aplicado no repositório `Grupo-Blue/chatblue`. Reúne: requisitos, regras da Meta, arquitetura,
> modelo de dados, rotas, serviços, frontend, decisões, bugs encontrados, variáveis, fases e onde
> está a implementação de referência.
>
> Documentos complementares (já no repositório de referência): `INSTAGRAM_CHANNEL_PLAN.md`
> (análise e desenho) e `INSTAGRAM_SETUP.md` (passo a passo do app na Meta e operação).

Data: 2026-11-01.

---

## 1. Objetivo (o que o Mychel pediu)

1. **Atendimento pelo Instagram Direct** dentro da janela de 24 horas da Meta, no mesmo fluxo de
   tickets, IA e atendentes que já existe para WhatsApp e e-mail.
2. **Automação de comentários estilo ManyChat**: quando alguém comenta num post ou reel, o sistema
   responde o comentário e manda uma mensagem no Direct com um link. Quando a pessoa responde no
   Direct, a conversa vira ticket normal.
3. Conexão da conta do cliente por **login no Instagram** (clica → loga → autoriza), sem colar token.

---

## 2. Regras da Meta que determinam o desenho

### 2.1 API escolhida: Instagram API with Instagram Login (Business Login for Instagram)

| | Instagram Login (**escolhida**) | Facebook Login |
|---|---|---|
| Host | `graph.instagram.com` | `graph.facebook.com` |
| Precisa de Página do Facebook vinculada | Não | Sim |
| Login do cliente | tela do Instagram | tela do Facebook, escolher Página |
| Scopes | `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments` | `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`, `pages_messaging`… |
| Token | user token curto → long-lived **60 dias**, renovável (`refresh_access_token`, token ≥ 24 h) | Page token |
| Private reply | `POST /{ig-id}/messages` com `recipient: {comment_id}` | `POST /{page-id}/messages` |
| Limitação | sem `story_insights` | mais burocracia para o cliente |

Endpoints OAuth:
- Autorização: `https://www.instagram.com/oauth/authorize?client_id&redirect_uri&response_type=code&scope=...&state&force_reauth=true`
- Troca do code: `POST https://api.instagram.com/oauth/access_token` (form: client_id, client_secret, grant_type=authorization_code, redirect_uri, code). Remover `#_` do fim do code. Code vale 1 h e é de uso único.
- Long-lived: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret&access_token` → `expires_in ≈ 60 dias`.
- Refresh: `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token` (token precisa ter ≥ 24 h e não estar expirado; sem renovar em 60 dias, expira e não renova mais).
- Perfil: `GET /me?fields=id,user_id,username,name,profile_picture_url,account_type`.
- Inscrição de webhooks por conta: `POST /{ig-id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_seen,message_reactions,messaging_referral,comments,live_comments`.

### 2.2 Permissões e App Review

- App do tipo Business no Meta for Developers com o produto **Instagram → "API setup with Instagram business login"**.
- **Verificação do negócio** obrigatória para Advanced Access.
- **Advanced Access** em `instagram_business_manage_messages` e `instagram_business_manage_comments` para atender contas de clientes. Com Standard Access só funciona para contas com papel no app (desenvolvimento/teste).
- **Human Agent**: recurso adicional via App Review; libera a tag `HUMAN_AGENT` (7 dias) só para resposta humana.
- Na conta do cliente: profissional (Business/Creator) e **Configurações → Mensagens e respostas a stories → Controles de mensagens → Ferramentas conectadas → Permitir acesso a mensagens** ligado.
- Prazo típico da Meta: 1 a 4 semanas. É o maior risco de cronograma.

### 2.3 Janela de mensagens (Direct)

- Só se envia depois que a pessoa mandou mensagem. Janela padrão **24 h** desde a última mensagem dela.
- Até **7 dias** se a conversa começou por anúncio Click-to-Direct (`referral` com `ad_id`/`source=ADS`).
- `HUMAN_AGENT` → **7 dias**, somente atendente humano, só com o recurso aprovado.
- Fora da janela a API devolve erro (`(#10) ... outside of allowed window`). Não existe template para reabrir, como no WhatsApp.
- Texto ≤ 1000 bytes; imagem ≤ 8 MB; áudio/vídeo/PDF ≤ 25 MB; até 10 anexos por request; sem grupos.
- Formatação `*negrito*` do WhatsApp não renderiza no Instagram.

### 2.4 Comentários e private reply (o "ManyChat")

- Webhooks `comments` (posts, reels, anúncios; menções vêm junto) e `live_comments`.
- Payload (Instagram Login): `entry.id` = conta; `entry.changes[].field = "comments"`, `value = { id, text, from{id,username}, media{id, media_product_type, ad_id?}, parent_id? }`.
- Resposta pública: `POST /{comment-id}/replies` com `message`.
- Private reply: `POST /{ig-id}/messages` com `recipient: { comment_id }`. Regras: **1 mensagem por comentário**; até **7 dias** depois do comentário (live: só durante a transmissão); **não abre a janela de 24 h**, só quando a pessoa responde; vai para Inbox se ela segue a conta, senão para Solicitações; a mensagem já leva o link do post. Só texto é garantido pela documentação.
- A Meta reenvia eventos (dedupe obrigatório). Ignorar comentários da própria conta (`from.id === entry.id` ou mesmo username) e, por padrão, respostas a comentários (`parent_id`).
- Uma única URL de callback por app (não por conta). Rotear pelo `entry.id`.
- Validar `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256(raw body, App Secret).

---

## 3. O que existia antes (clone `mychelmendes1/chatblue`) e os problemas

Já havia meio canal: `ConnectionType.INSTAGRAM`, `instagramAccountId/Username` em `WhatsAppConnection`, `Contact.instagramId`, `InstagramService` (texto, mídia, reação, quick replies, template) na `graph.facebook.com/v18`, webhook `/webhooks/instagram/:connectionId` só para `entry.messaging`, cadastro manual de token na tela de conexões.

Problemas corrigidos no desenho:
1. Token colado à mão, sem OAuth e sem renovação (expira em 60 dias).
2. API antiga (v18, fluxo Facebook Login com Página).
3. Webhook por conexão (a Meta só aceita uma URL por app).
4. Sem validação de assinatura.
5. Comentários ignorados.
6. Sem controle da janela de 24 h.
7. **Bug grave**: `WhatsAppService` instanciava `MetaCloudService` para qualquer tipo ≠ BAILEYS, então respostas da IA, mensagem de abertura, fora de horário, NPS, IA externa e upload em conexões Instagram iam para a API do WhatsApp Cloud.
8. Contato Instagram criado com `phone = IGSID`; e o IGSID (16–17 dígitos) era confundido com LID do WhatsApp (`isLikelyLid`), gerando contatos duplicados.

---

## 4. Arquitetura alvo

```
Meta (um app "ChatBlue")
 ├─ OAuth: instagram.com/oauth/authorize ──▶ API /api/integrations/instagram/callback
 │        code → short token → long-lived (60d) → conexão (token cifrado) + job de refresh 12h
 ├─ POST /{ig-id}/subscribed_apps (messages, postbacks, seen, reactions, referral, comments, live_comments)
 └─ Webhook ÚNICO: POST /webhooks/instagram  (valida X-Hub-Signature-256, responde 200, enfileira)
          │
          ▼ BullMQ "instagram-webhook" (jobId = hash da entry; dedupe Redis ig:evt:{mid|comment_id} TTL 7d)
   ┌──────┴───────────────┬────────────────────────────┐
   ▼                      ▼                            ▼
 messaging           field=comments / live_comments   read / reaction / postback / referral
 → MessageProcessor  → CommentAutomationService        → status READ, reações, janela ctd_ad
   .processIncoming    1. dedupe por comment id
   (ticket, IA)        2. casa regra (post/reel, tipo, keyword)
 → CommentAutomation   3. reply público (sorteado)
   .onInstagramUser-   4. private reply com link (1x)
    Message            5. InstagramCommentEvent + contato windowSource=private_reply_pending
```

Envio (atendente/IA/automação): `ChannelSender.sendText|sendMedia(connection, contact, …, { actor })`
→ para INSTAGRAM: relê contato, `InstagramWindowService.getState` → `resolveSendOptions(actor)`
(HUMAN_AGENT só para `actor='human'`) → `InstagramService` em `graph.instagram.com`; para os demais →
`WhatsAppService`. Fora da janela: `InstagramWindowClosedError` → rota devolve `422 INSTAGRAM_WINDOW_CLOSED`;
IA/automação marcam a mensagem como FAILED com o motivo e não lançam.

---

## 5. Modelo de dados (Prisma)

```prisma
// WhatsAppConnection (acrescentar)
authMethod         String?   @map("auth_method")           // "oauth" | "manual"
tokenExpiresAt     DateTime? @map("token_expires_at")
scopes             String[]  @default([])
webhookFields      String[]  @default([]) @map("webhook_fields")
lastTokenRefreshAt DateTime? @map("last_token_refresh_at")
lastError          String?   @map("last_error")
instagramCommentAutomations InstagramCommentAutomation[]
instagramCommentEvents      InstagramCommentEvent[]
@@index([instagramAccountId])

// Contact (acrescentar)
instagramUsername String? @map("instagram_username")
windowSource      String? @map("window_source") // "standard" | "ctd_ad" | "private_reply_pending"
@@index([companyId, instagramId])
// (já existia) lastMessageAt = base da janela

// Company (acrescentar relações)
instagramCommentAutomations InstagramCommentAutomation[]
instagramCommentEvents      InstagramCommentEvent[]

enum InstagramCommentEventStatus { RECEIVED MATCHED REPLIED PRIVATE_SENT USER_REPLIED SKIPPED FAILED }

model InstagramCommentAutomation {
  id String @id @default(cuid())
  name String
  isActive Boolean @default(true) @map("is_active")
  mediaIds String[] @default([]) @map("media_ids")       // vazio = todos
  mediaTypes String[] @default([]) @map("media_types")   // FEED | REELS | AD | LIVE
  keywords String[] @default([])                          // vazio = qualquer
  matchMode String @default("contains") @map("match_mode") // contains | exact | regex
  excludeReplies Boolean @default(true) @map("exclude_replies")
  publicReplies String[] @default([]) @map("public_replies") // sorteia 1; placeholder {{nome}}
  privateMessage Json @map("private_message")             // { text, linkUrl?, buttonTitle?, imageUrl? } ; {{nome}}, {{link}}
  departmentId String? @map("department_id")
  aiEnabled Boolean @default(true) @map("ai_enabled")
  oncePerUser Boolean @default(true) @map("once_per_user")
  dailyLimit Int? @map("daily_limit")
  matchedCount Int @default(0) @map("matched_count")
  privateSentCount Int @default(0) @map("private_sent_count")
  userRepliedCount Int @default(0) @map("user_replied_count")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  companyId String @map("company_id");    company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  connectionId String @map("connection_id"); connection WhatsAppConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  events InstagramCommentEvent[]
  @@index([companyId]) @@index([connectionId, isActive]) @@map("instagram_comment_automations")
}

model InstagramCommentEvent {
  id String @id @default(cuid())
  commentId String @unique @map("comment_id")   // idempotência
  mediaId String @map("media_id"); mediaType String? @map("media_type")
  fromIgId String @map("from_ig_id"); fromUsername String? @map("from_username")
  text String; parentId String? @map("parent_id")
  status InstagramCommentEventStatus @default(RECEIVED)
  skipReason String? @map("skip_reason"); error String?
  publicReplyId String? @map("public_reply_id")
  privateReplyMessageId String? @map("private_reply_message_id")
  privateSentAt DateTime? @map("private_sent_at"); userRepliedAt DateTime? @map("user_replied_at")
  ticketId String? @map("ticket_id")
  createdAt DateTime @default(now()) @map("created_at"); updatedAt DateTime @updatedAt @map("updated_at")
  companyId String @map("company_id");    company Company @relation(... onDelete: Cascade)
  connectionId String @map("connection_id"); connection WhatsAppConnection @relation(... onDelete: Cascade)
  automationId String? @map("automation_id"); automation InstagramCommentAutomation? @relation(... onDelete: SetNull)
  @@index([companyId, createdAt]) @@index([connectionId, fromIgId]) @@index([automationId, fromIgId])
  @@map("instagram_comment_events")
}
```

Tickets criados a partir do Instagram recebem `channel = INSTAGRAM` (enum `TicketChannel` já existe no Grupo-Blue).
Migration gerada com `prisma migrate diff --from-schema-datamodel <schema atual> --to-schema-datamodel <novo> --script`
(nome usado: `20261101000000_instagram_oauth_comment_automation`; no Grupo-Blue, usar data posterior à última migration de lá).

---

## 6. Backend — componentes

### 6.1 Utilitários
- `utils/crypto.util.ts`: `encryptSecret(plain)` / `decryptSecret(stored)` / `isEncrypted` — AES-256-GCM, chave `ENCRYPTION_KEY` (32 bytes hex ou base64). Formato `enc:v1:<iv>:<tag>:<cipher>`. Sem chave: aviso único e texto puro (compatibilidade). Valores que não começam com `enc:` passam direto (tokens legados).
- `utils/meta-signature.util.ts`: `verifyMetaSignature(rawBody, header, secret)` com comparação em tempo constante.
- `utils/meta-error-translator.ts`: traduções do Instagram (`outside of allowed window`, `(#551) pessoa indisponível`, `Human Agent` não aprovado, `(#100)` em comentário), checadas antes das do WhatsApp.
- `utils/connection-for-ticket.ts`: fallback de conexão **nunca cruza canal** (ticket Instagram não cai em conexão WhatsApp e vice-versa).

### 6.2 OAuth — `services/instagram/instagram-oauth.service.ts`
`createState/consumeState` (Redis `ig:oauth:state:{state}`, TTL 600 s, uso único atômico com MULTI GET+DEL),
`buildAuthorizeUrl`, `exchangeCode`, `exchangeLongLived`, `refreshLongLived`, `getMe`, `subscribeWebhooks`, `unsubscribeWebhooks`.

### 6.3 Rotas de integração — `routes/instagram-integration.routes.ts` em `/api/integrations/instagram`
| Rota | Função |
|---|---|
| `GET /config` | `{ configured, redirectUri, webhookUrl }` |
| `GET /connect?returnTo=` (admin) | gera state, devolve `{ authorizeUrl }` |
| `GET /callback` (público) | valida state; `error=access_denied` → `…/connections?instagram=denied`; troca code → long-lived → `getMe` → upsert conexão INSTAGRAM (`authMethod='oauth'`, token cifrado, `tokenExpiresAt`, `scopes`, `lastTokenRefreshAt=now`) → `subscribeWebhooks` → redireciona `…/connections?instagram=ok&connectionId=` (`&warning=webhooks` se a inscrição falhar) ou `?instagram=error&reason=` |
| `GET /status` | conexões Instagram do tenant sem tokens |
| `POST /:connectionId/refresh-token` (admin) | força renovação |
| `POST /:connectionId/resubscribe` (admin) | refaz `subscribed_apps` |

### 6.4 Cliente da Graph API — `services/instagram/instagram.service.ts`
Base `https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}` (padrão `v21.0`); fallback para `graph.facebook.com` só se `authMethod !== 'oauth'` e `INSTAGRAM_LEGACY_FACEBOOK_GRAPH=true`. Sempre `decryptSecret(token)`.
- `sendTextMessage(to, text, { tag?: 'HUMAN_AGENT', replyToMid? })` — quebra em partes de ≤ 1000 bytes (`splitTextByBytes`), `reply_to` só na 1ª, devolve último `messageId`.
- `sendImage/Video/Audio/File/MediaMessage(..., { tag? })`, `sendSticker`, `sendReaction`, `markAsSeen`, `sendTypingIndicator`, quick replies, generic/product template.
- `replyToComment(commentId, text)`, `sendPrivateReply(commentId, { text } | { attachment })`, `hideComment`, `getMedia(mediaId)`, `listMedia(limit, after)`, `getUserProfile(igsid)` (name, username, profile_pic, follower_count, is_user_follow_business, is_business_follow_user, is_verified_user).
- Erros da Meta → `Error` com `err.meta = { code, error_subcode, type, fbtrace_id }`.

### 6.5 Webhook — `routes/webhook.routes.ts` (seção Instagram) + `services/instagram/instagram-webhook.handlers.ts`
- `GET /webhooks/instagram` → verifica `hub.verify_token === INSTAGRAM_WEBHOOK_VERIFY_TOKEN`, responde `hub.challenge`.
- `POST /webhooks/instagram` → valida assinatura (401 se `META_APP_SECRET` definido e inválida; aceita com aviso se não definido), responde 200 e enfileira cada `entry` (`addInstagramWebhookJob`). Fallback inline se a fila falhar.
- Rotas antigas `/webhooks/instagram/:connectionId` passam pelo mesmo handler.
- `server.ts`: `express.json({ verify: (req,_res,buf) => req.rawBody = buf })` para ter o corpo bruto.
- `extractInstagramMessageContent`, `handleInstagramReaction`, `extractInstagramReferral` movidos para os handlers.

### 6.6 Processador — `jobs/processors/instagram-webhook.processor.ts` (fila `instagram-webhook`, concorrência 5)
- Resolve conexão por `entry.id` (`type='INSTAGRAM'`, `instagramAccountId`, `isActive`).
- Dedupe Redis `ig:evt:{mid|comment_id}` TTL 7 d (libera a chave se o processamento falhar para o retry funcionar); além disso pula mensagens/postbacks cujo `wamid` já existe (retry do BullMQ após falha parcial duplicava mensagem e resposta da IA).
- `entry.messaging[]`: pula `is_echo` e remetente = própria conta; mensagens → `MessageProcessor.processIncoming` (platform `instagram`, `pushName` via `getUserProfile`, `metadata.referral` quando houver) e depois `CommentAutomationService.onInstagramUserMessage`; `read` → marca mensagens do contato como READ; `reaction`; `postback`; `referral` solto de anúncio → `InstagramWindowService.registerInbound(contact, ts, { fromAd: true })`.
- `entry.changes[]` com `field` `comments`/`live_comments` (ou `entry.field/value` no topo) → `CommentAutomationService.handleCommentEvent`.

### 6.7 Renovação de token — `jobs/processors/instagram-token-refresh.processor.ts` (fila `instagram-token-refresh`, repeat 12 h)
Conexões `oauth` ativas com `tokenExpiresAt` em < 15 dias e `lastTokenRefreshAt` > 24 h → `refreshLongLived`; grava token cifrado, expiração e `lastTokenRefreshAt`. Só marca `status=ERROR` quando o token de fato expirou (ou Meta devolve código 190); outras falhas só registram `lastError`. Exporta `refreshInstagramToken(connectionId)`.

### 6.8 Janela de 24 h — `services/instagram/instagram-window.service.ts`
```ts
type InstagramWindowSource = 'standard' | 'ctd_ad' | 'private_reply_pending' | null;
interface InstagramWindowState { isOpen; expiresAt; minutesRemaining; source; humanAgentAvailable; humanAgentExpiresAt; lastInboundAt; reason? }
InstagramWindowService.getState(contact, now?)            // 24h padrão; 7d ctd_ad; private_reply_pending sem lastMessageAt = fechado com motivo próprio
InstagramWindowService.getStateForTicket(ticketId, companyId)
InstagramWindowService.resolveSendOptions(state, actor: 'human'|'ai'|'automation') // { tag?: 'HUMAN_AGENT' } ou lança InstagramWindowClosedError
InstagramWindowService.registerInbound(contactId, timestamp, { fromAd? })         // seta lastMessageAt/windowSource; janela de anúncio não é estendida por mensagem comum
```
`humanAgentAvailable` = `INSTAGRAM_HUMAN_AGENT_ENABLED === 'true'` e última mensagem da pessoa há < 7 dias.
Textos de bloqueio (pt-BR): "Janela de 24h do Instagram fechada. O cliente precisa enviar uma mensagem para reabrir." (+ "Você pode responder como agente humano (até 7 dias).") e "Enviamos a mensagem a partir do comentário. Só é possível continuar quando a pessoa responder no Direct."

### 6.9 Envio por canal — `services/outbound/channel-sender.service.ts`
`ChannelSender.sendText(connection, contact, text, { actor, senderName?, senderSeparator?, quotedMessageId?, replyToMid? })`,
`ChannelSender.sendMedia(connection, contact, url, type, caption?, { actor })`, `formatText`, `stripWhatsAppFormatting`.
Instagram: destinatário `contact.instagramId || contact.phone`; relê janela do banco; remove `*negrito*`, `_itálico_`, `~riscado~`, `**negrito**`; prefixo do nome `Nome: ` sem asteriscos e só na 1ª parte; legenda de mídia enviada como texto separado (Instagram não aceita caption).
Substitui `new WhatsAppService(...)` em: `message.routes.ts` (texto e mídia, actor `human`), `message-processor.service.ts` (IA `ai`; abertura e fora de horário `automation`), `upload.routes.ts` (`human`), `external-ai.routes.ts` (`ai`), `nps.service.ts` (`automation`). `webform.routes.ts` ficou como estava (só WhatsApp).
No `processIncoming`, o registro da janela (`registerInbound`/`lastMessageAt`) roda logo depois de salvar a mensagem recebida (antes rodava depois da resposta automática de fora de horário).
`message.routes.ts`: `GET /api/messages/ticket/:ticketId/window` → `{ channel, connectionType, windowApplies, isOpen, expiresAt, minutesRemaining, hoursRemaining, source, humanAgentAvailable, humanAgentExpiresAt, lastInboundAt, lastMessageAt, requiresTemplate, reason? }`. Envio fora da janela → `422 { message, code: 'INSTAGRAM_WINDOW_CLOSED', window, failedMessage }` e socket `message:error`.
Envio com tag HUMAN_AGENT registra `metadata.instagramTag`.

### 6.10 Automação de comentários — `services/instagram/comment-automation.service.ts` + `comment-automation.matching.ts`
`handleCommentEvent({ connection, value, field, receivedAt })`:
1. ignora sem `id/from`, da própria conta (id ou username);
2. `instagramCommentEvent.create` com `commentId` único (P2002 → já processado);
3. automações ativas da conexão em ordem de criação; `matchAutomation` (mediaIds, mediaTypes FEED/REELS/AD/LIVE, excludeReplies, keywords normalizadas sem acento/caixa, contains/exact/regex) — primeira que casar vence; nenhuma → `SKIPPED` com `skipReason` (`no_active_automation`, `media_not_targeted`, `media_type_not_targeted`, `is_reply`, `keyword_not_matched`, `invalid_regex`, `no_match:<último>`);
4. limites: `oncePerUser` (evento anterior REPLIED/PRIVATE_SENT/USER_REPLIED do mesmo usuário) e `dailyLimit` (PRIVATE_SENT+USER_REPLIED desde 0h America/Sao_Paulo);
5. `MATCHED` → resposta pública sorteada (`{{nome}}` → `@username`) via `replyToComment` (falha não impede o DM) → `REPLIED`;
6. private reply **único**: texto com `{{nome}}`/`{{link}}`, link anexado se não estiver no texto, cortado para caber em 1000 bytes preservando o link; `imageUrl` ignorado (só 1 mensagem por comentário); sucesso → `PRIVATE_SENT`; falha → `FAILED`;
7. upsert do contato (`instagramId`, `instagramUsername`, `phone = ig:<igsid>` se novo; também encontra contatos antigos com `phone`/`lidId` = IGSID) com `windowSource = private_reply_pending` quando não há janela aberta; nunca mexe em `lastMessageAt`.
`onInstagramUserMessage({ connection, igsid, ticketId?, contactId? })`: último evento `PRIVATE_SENT` do usuário → `USER_REPLIED`, `userRepliedAt`, `ticketId`, incrementa `userRepliedCount`; aplica `departmentId` da automação se o ticket está PENDING; `windowSource` → `standard`.

### 6.11 Rotas da automação — `routes/instagram-automation.routes.ts` em `/api/instagram` (authenticate + ensureTenant; escrita = admin)
| Rota | Payload / retorno |
|---|---|
| `GET /automations?connectionId=` | lista com `connection {id,name,instagramUsername}` e `_count.events` |
| `POST /automations` | `{ connectionId, name, isActive?, mediaIds?, mediaTypes?, keywords?, matchMode?, excludeReplies?, publicReplies?, privateMessage:{ text(1–900), linkUrl?, buttonTitle?(≤20), imageUrl? }, departmentId?, aiEnabled?, oncePerUser?, dailyLimit? }` |
| `GET/PUT/DELETE /automations/:id`, `POST /automations/:id/toggle { isActive? }` | |
| `GET /automations/:id/events`, `GET /events?connectionId=&status=&page=&limit=` | `{ items, total, page, limit, totalPages }` |
| `GET /media?connectionId=&after=` | `{ items:[{ id, caption, mediaType, mediaProductType, thumbnailUrl, permalink, timestamp }], paging:{ after } }` |
| `POST /automations/test-match { automationId, text, mediaId?, mediaType?, isReply? }` | `{ matched, reason, keyword }` |
| `GET /stats?connectionId=` | `{ since, last30Days:{ total, byStatus }, automations:[{ id, name, isActive, events, matched, privateSent, userReplied, replyRate }] }` |

### 6.12 Conexões — `routes/connection.routes.ts`
`POST /instagram` (manual) grava `authMethod='manual'` e token cifrado; `GET /` devolve `authMethod`, `tokenExpiresAt`; `DELETE /:id` chama `unsubscribeWebhooks` para conexões OAuth. Corrigido bug onde `testConnection()` (objeto) era tratado como booleano.

### 6.13 Filas — `jobs/index.ts`
`instagram-webhook` (removeOnComplete 500, 3 tentativas, backoff exponencial 2 s, worker 5) e `instagram-token-refresh` (repeat 12 h, worker 1). Helper `addInstagramWebhookJob(entry, receivedAt)` (jobId `ig-<sha256 da entry>`).

### 6.14 Variáveis de ambiente (`apps/api/.env.example`)
`META_APP_ID`, `META_APP_SECRET`, `INSTAGRAM_REDIRECT_URI` (padrão `${API_URL}/api/integrations/instagram/callback`), `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`, `INSTAGRAM_GRAPH_VERSION` (`v21.0`), `INSTAGRAM_HUMAN_AGENT_ENABLED` (`true` só após aprovação da Meta), `INSTAGRAM_LEGACY_FACEBOOK_GRAPH` (manter conexões manuais antigas de Página), `ENCRYPTION_KEY` (`openssl rand -hex 32`), `FRONTEND_URL`, `API_URL`.

---

## 7. Frontend (`apps/web`)

### 7.1 Conexões (`app/(dashboard)/connections/page.tsx`)
- Aba Instagram do diálogo "Nova conexão": botão **"Conectar com Instagram"** (gradiente rosa, ícone Instagram) → `GET /integrations/instagram/connect?returnTo=/connections` → `window.location.href = authorizeUrl`. Explicação curta (conta profissional, login no Instagram, autoriza mensagens e comentários).
- Se `GET /integrations/instagram/config` → `configured: false`: botão desabilitado e Alert pedindo `META_APP_ID`/`META_APP_SECRET`, exibindo `redirectUri` e `webhookUrl` com botões de copiar.
- Formulário manual recolhido em "Configuração manual (avançado)".
- Lê `?instagram=ok|denied|error&reason=&warning=webhooks` ao montar, mostra toast e limpa a URL.
- Card da conexão Instagram: badge OAuth/Manual, "Token válido até dd/MM/yyyy" (âmbar < 10 dias, vermelho expirado), campos de webhook inscritos, `lastError`, botões "Renovar token" e "Reinscrever webhooks" (admin). URL de webhook única do app (não mais por conexão).

### 7.2 Página Instagram (`app/(dashboard)/instagram/page.tsx`, item "Instagram" no sidebar, admin)
- **Automações**: seletor de conta (se > 1), cards com alvo, keywords, contadores (casou / DMs / responderam), switch ativo, editar, excluir com confirmação.
- **Editor** (`components/instagram/automation-editor.tsx`, tipos em `components/instagram/types.ts`): nome; alvo "todos os posts e reels" ou seletor de posts com grid de thumbnails (`GET /instagram/media`, "carregar mais" por `paging.after`); tipos de mídia; palavras-chave (chips), modo (contém/exato/regex), "ignorar respostas a comentários"; respostas públicas (lista, `{{nome}}`, aviso de sorteio); mensagem privada (≤ 900 caracteres com contador, link, preview em bolha de DM); aviso fixo "O Instagram permite 1 mensagem por comentário e só continua a conversa quando a pessoa responder."; departamento; "IA assume quando a pessoa responder"; "1 vez por pessoa"; limite diário; seção "Testar" (só ao editar) → `POST /instagram/automations/test-match`.
- **Eventos**: tabela paginada (data, @usuário, comentário, automação, status colorido, motivo/erro, link `/chat?ticket=`), filtros por status/automação.
- **Visão geral**: cards (recebidos, casaram, DMs enviadas, responderam, conversão) + tabela por automação + "Como funciona" com as regras da Meta.

### 7.3 Chat
- `components/chat/instagram-window-badge.tsx`: para tickets INSTAGRAM, busca `GET /messages/ticket/:id/window` ao trocar de ticket e a cada 60 s. Badge verde "aberta · expira em Xh Ym", âmbar "agente humano até dd/MM HH:mm", vermelho "fechada" com motivo. Botão de enviar desabilitado (tooltip com motivo) quando fechada sem agente humano; notas internas continuam liberadas.
- `chat-window.tsx`: usa o badge para Instagram; erros de envio de texto/arquivo mostram toast com a `message` do 422.

---

## 8. Decisões tomadas

1. **Instagram Login** em vez de Facebook Login (sem Página do Facebook, fluxo igual ao planejado para o Notion MCP).
2. **Private reply em texto com link**; botão/template fica como melhoria depois de validar em Advanced Access.
3. **Ticket só quando a pessoa responde no Direct**, não no comentário (evita fila de tickets sem conversa).
4. **HUMAN_AGENT só para atendente humano**; IA e automações ficam nas 24 h.
5. **Padrão de IA nas automações**: a IA segue a configuração da conexão (`aiEnabled` da automação é salvo, mas ainda não muda comportamento).
6. Private reply **não** abre a janela; o contato fica em `private_reply_pending` até responder.
7. **Uma conta Instagram por empresa** (mesma conta em duas empresas: webhook roteia para uma só; callback só loga aviso).
8. Conexões manuais antigas (token de Página) continuam só com `INSTAGRAM_LEGACY_FACEBOOK_GRAPH=true`.
9. Com `META_APP_SECRET` definido, a rota antiga por conexão também exige assinatura válida.

---

## 9. Bugs encontrados e corrigidos na revisão (para não repetir)

1. Retry do BullMQ após falha parcial em `processIncoming` duplicava mensagem e resposta da IA → checar `wamid` já existente.
2. IGSID (16–17 dígitos) tratado como LID do WhatsApp → contato duplicado e janela dividida → `isLid = !isInstagram && …`.
3. Lookups da automação não achavam contatos criados por DM (`phone = IGSID`) → buscar também por `phone`/`lidId`.
4. Qualquer falha de refresh marcava `ERROR` (inclusive refresh < 24 h após conectar) → só quando expirado/código 190.
5. Fallback de conexão podia mover ticket Instagram para conexão WhatsApp → nunca cruzar canal.
6. Private reply > 1000 bytes rejeitado → cortar preservando o link.
7. Automação respondia comentários da própria conta quando `from.id` ≠ `instagramAccountId` → checar username também.
8. `state` do OAuth não era estritamente de uso único → MULTI GET+DEL.
9. Referral de anúncio sem mensagem setava `ctd_ad` sem `lastMessageAt` → `registerInbound(fromAd)`.
10. UI dizia "webhooks inscritos" mesmo com `warning=webhooks` → aviso para "Reinscrever".

Pendências conhecidas (não implementadas): `aiEnabled` da automação sem efeito; evento pode se perder se o worker cair no meio (chave de dedupe setada antes do processamento); SUPER_ADMIN vê conexões de todas as empresas mas rotas filtram pela própria; test-match não envia tipo de mídia; texto de motivo após private reply quando há `lastMessageAt` antigo mostra o genérico.

---

## 10. Testes escritos (vitest, `apps/api`)
- `utils/crypto.util.test.ts` — roundtrip e passthrough legado.
- `utils/meta-signature.util.test.ts` — assinatura válida/inválida/ausente.
- `services/instagram/comment-automation.matching.test.ts` (15) — normalização, modos, filtros.
- `services/instagram/instagram-window.service.test.ts` (17) — estados da janela, `resolveSendOptions` por ator, `registerInbound`.
Total 41 testes novos. `tsc` da API e do web passando. Os testes `auth.middleware.test.ts` e `auth.e2e.test.ts` já falhavam antes.

---

## 11. Fases (como foi planejado)

| Fase | Entrega | Esforço |
|---|---|---|
| 0. Meta | App, Business Verification, Advanced Access (`manage_messages`, `manage_comments`), Human Agent, vídeo para revisão | 1 dia + espera (1–4 semanas) |
| 1. Conexão | OAuth, token cifrado, refresh, `subscribed_apps`, webhook único assinado, fila, `graph.instagram.com` | 4–5 dias |
| 2. Janela 24 h | `InstagramWindowService`, `ChannelSender`, HUMAN_AGENT, badge na UI, erros traduzidos | 2–3 dias |
| 3. Automação | modelos, serviço, fila, CRUD, tela, seletor de posts, log | 5–7 dias |
| 4. Contato/IA | identidade do contato IG, perfil, formatação por canal, métricas | 2–3 dias |

Fases 1–4 estão implementadas na referência abaixo; falta só a Fase 0 (Meta) e o teste contra a API real.

---

## 12. Implementação de referência (pronta para portar)

Repositório `mychelmendes1/chatblue`, branch **`feat/instagram-channel`** (PR #22), 10 commits sobre `main` (`4db36f3`):

1. `docs: add Instagram channel (Direct + comment automation) analysis and plan`
2. `feat(instagram): schema for OAuth connections, 24h window source and comment automation`
3. `docs(instagram): setup and operations guide (Meta app, env, webhook, App Review)`
4. `feat(instagram): OAuth (Business Login), unified signed webhook, token refresh and Graph API client`
5. `feat(instagram): comment automation (public reply + private DM with link)`
6. `feat(instagram): enforce 24h messaging window and route Instagram outbound through the right API`
7. `feat(instagram): unsubscribe webhook when an OAuth connection is deleted`
8. `feat(web): Instagram connect via OAuth, comment automation page and 24h window badge`
9. `fix(instagram): review fixes for retries, contact identity and connection fallback`
10. `fix(instagram): rebase on main - restore email-poll queue definition and set ticket channel INSTAGRAM`

Arquivos (41): ver `git diff --name-status main..feat/instagram-channel`. Novos: `.env.example`, migration, `instagram-oauth.service.ts`, `instagram-webhook.handlers.ts`, `instagram-window.service.ts`(+test), `comment-automation.service.ts`, `comment-automation.matching.ts`(+test), `outbound/channel-sender.service.ts`, `crypto.util.ts`(+test), `meta-signature.util.ts`(+test), `instagram-integration.routes.ts`, `instagram-automation.routes.ts`, 2 processors, `app/(dashboard)/instagram/page.tsx`, `components/instagram/*`, `components/chat/instagram-window-badge.tsx`. Modificados: `schema.prisma`, `jobs/index.ts`, `server.ts`, `connection.routes.ts`, `message.routes.ts`, `webhook.routes.ts`, `upload.routes.ts`, `external-ai.routes.ts`, `instagram.service.ts`, `message-processor.service.ts`, `nps.service.ts`, `connection-for-ticket.ts`, `meta-error-translator.ts`, `connections/page.tsx`, `chat-window.tsx`, `sidebar.tsx`.

### 12.1 Como aplicar no `Grupo-Blue/chatblue`
```bash
git remote add origem https://github.com/mychelmendes1/chatblue.git
git fetch origem feat/instagram-channel main
git checkout -b feat/instagram-channel origin/main
git log --oneline origem/main..origem/feat/instagram-channel   # os 10 commits
git cherry-pick -x <sha1> <sha2> ...                           # um a um, por área
```
Conflitos esperados (o Grupo-Blue está na v4.14 com Exército, aprovações, e-mail, MCP, Composio):
- `schema.prisma`: reaplicar só as adições da seção 5 e regenerar a migration com `prisma migrate diff` a partir do schema do `main` de lá, com data posterior à última migration.
- `jobs/index.ts`: acrescentar filas/workers sem remover os existentes (no primeiro rebase a fila `email-poll` ficou cortada no meio).
- `server.ts`: `verify` no `express.json` + mounts `/api/integrations/instagram` e `/api/instagram`.
- `message.routes.ts` e `message-processor.service.ts`: todo envio de conexão INSTAGRAM via `ChannelSender`; preservar e-mail, aprovações e Exército; `quotedMessageId` deve ser o `wamid` (`metaQuotedWamid`) no WhatsApp Cloud.
- `webhook.routes.ts`: só a seção Instagram muda.
- `chat-window.tsx` e `connections/page.tsx`: imports e trechos do Instagram.
- O Grupo-Blue já tem branches de Instagram não mergeadas (`feat/composio-instagram-outbound`, `feat/ig-sender-name-echo-and-settings-ai`, `claude/instagram-direct-messages-WDItL`) e `feat/notion-mcp-oauth`: conferir o que já existe em `main` (nome do remetente, echo, envio via Composio, IA por conexão) e integrar em vez de substituir.
- Se o Grupo-Blue tiver cartão de aprovação humana para ações dos soldados (`humanApprovalSummary`, `army-dispatch`), as escritas do Instagram (responder comentário, private reply, HUMAN_AGENT) são candidatas a passar por ele.
- Instalação: a dependência `libsignal` do Baileys vem de tarball do GitHub (`codeload.github.com`); se a rede bloquear, clonar `whiskeysockets/libsignal-node` no commit do lockfile, `npm pack` e override temporário `pnpm.overrides.libsignal=file:<tgz>` sem commitar `package.json`/lockfile.
- Validar: `npx prisma generate`, `npx tsc --skipLibCheck --noEmit` (api), `npx tsc --noEmit` (web), `npx vitest run` (api).

### 12.2 Descrição de PR pronta
Em `docs/INSTAGRAM_SETUP.md` está o passo a passo operacional; o texto de PR usado no repositório de referência está na PR #22 de `mychelmendes1/chatblue` (resumo, o que muda, migração, variáveis, atenção antes do merge, testes).

---

## 13. Checklist de operação depois do merge
1. Criar o app na Meta e preencher as variáveis (seção 6.14).
2. Registrar `redirectUri` e `webhookUrl` no app; salvar o Callback URL (a Meta chama o `GET` de verificação).
3. Conectar a conta de teste pelo botão; mandar um Direct → ticket; responder pelo ChatBlue.
4. Criar automação para um post com a palavra "quero"; comentar com outra conta → resposta pública + DM; responder a DM → ticket e evento `USER_REPLIED`.
5. Pedir Advanced Access e Human Agent; ligar `INSTAGRAM_HUMAN_AGENT_ENABLED=true` só após aprovação.
6. Para clientes: conta profissional + "Permitir acesso a mensagens" ligado.
