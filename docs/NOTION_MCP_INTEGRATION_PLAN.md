# Integração Notion via MCP (OAuth) — Análise e Plano de Desenvolvimento

> Objetivo: o usuário clica em "Conectar com Notion", faz login no Notion, autoriza, e o ChatBlue
> passa a ter acesso a **todas as ferramentas do Notion MCP** em nome daquele usuário.
> O ChatBlue deixa de depender de API Key manual e passa a ser um **cliente MCP** do servidor
> remoto oficial do Notion (`https://mcp.notion.com/mcp`).

Data da análise: 2026-10-25
Base analisada: clone `mychelmendes1/chatblue` (main `4db36f3`). O repositório `Grupo-Blue/chatblue`
(v4.14.01) não estava acessível nesta sessão; os pontos marcados com ⚠️ devem ser conferidos lá.

---

## 1. Como está hoje

### 1.1 Autenticação: API Key manual (Internal Integration)

| Onde | O que existe |
|------|--------------|
| `CompanySettings` (Prisma) | `notionApiKey`, `notionDatabaseId`, `notionSyncEnabled` — **1 chave por empresa**, salva em texto puro |
| `PUT /settings/notion`, `POST /settings/notion/test` | Admin cola a API Key e o ID do database |
| `apps/web/app/(dashboard)/settings/page.tsx` (aba "Notion") | Formulário com API Key + Database ID + toggle de sync |
| `AIDataSource.config` (tipo `NOTION`) | `{ apiKey, databaseId, titleProperty, contentProperty, ... }` — **outra** API Key, por fonte de dados |
| `.env` | `NOTION_API_KEY`, `NOTION_DATABASE_ID` (scripts de batch) |

### 1.2 Consumo: SDK REST `@notionhq/client` 2.2.14

| Serviço | Uso |
|---------|-----|
| `services/notion/notion.service.ts` | Verificação de cliente (`findContact` por telefone/e-mail), `createContact`, `updateContact`, `addNote`, leitura de página (`readPageContent`) e de database |
| `jobs/processors/notion-sync.processor.ts` | Job `NOTION_SYNC`: enriquece `Contact` com dados do Notion (`isClient`, `isExClient`, `notionPageId`) |
| `services/ai/data-source-sync.service.ts` → `syncNotion()` | Varre um database e grava `AIDocument` para o RAG |
| `services/knowledge/ingestion.service.ts` → `processNotionSource()` | Ingere uma página do Notion como `KnowledgeSource` |
| `scripts/notion-batch-sync.ts`, `notion-check-props.ts` | Utilitários de linha de comando |

### 1.3 Limitações do modelo atual

1. **Uma chave para a empresa inteira** — não há identidade do usuário; tudo que a integração vê,
   todo mundo vê. Auditoria e permissão por pessoa são impossíveis.
2. **Precisa compartilhar página a página** com a Internal Integration dentro do Notion
   (atrito operacional, causa frequente de "página não encontrada").
3. **Chave em texto puro** no banco (`notionApiKey`, `aiApiKey`) — não existe utilitário de
   criptografia em `apps/api/src` hoje.
4. **Capacidade limitada ao que foi codificado à mão**: 7 operações. Busca semântica do Notion,
   SQL em data sources, comentários, calendário, Skills, agentes, etc. não existem.
5. **As IAs não têm ferramentas**: `orchestrator.service.ts` → `generateResponse()` chama
   `anthropic.messages.create` / `openai.chat.completions.create` **sem o parâmetro `tools`**.
   Não há loop agêntico (tool_use → executar → tool_result). O Notion entra só como texto
   pré-indexado no RAG.
6. Duas configurações paralelas (CompanySettings × AIDataSource) com chaves distintas.

---

## 2. O que o Notion MCP oferece (oficial)

Fonte: developers.notion.com (docs/mcp, get-started-with-mcp, mcp-supported-tools,
guides/mcp/build-mcp-client) e metadata OAuth em `https://mcp.notion.com/.well-known/oauth-authorization-server`.

### 2.1 Endpoints e transporte

| Item | Valor |
|------|-------|
| MCP (Streamable HTTP, recomendado) | `https://mcp.notion.com/mcp` |
| MCP (SSE, legado) | `https://mcp.notion.com/sse` |
| Authorization endpoint | `https://mcp.notion.com/authorize` |
| Token endpoint | `https://mcp.notion.com/token` |
| Dynamic Client Registration (RFC 7591) | `https://mcp.notion.com/register` |
| Revocation | `https://mcp.notion.com/token` |
| Grants | `authorization_code`, `refresh_token`, `jwt-bearer` (enterprise) |
| PKCE | `S256` obrigatório |
| Scopes | `default` (o único relevante) |
| `token_endpoint_auth_method` | `none` (cliente público com PKCE) ou `client_secret_*` |
| Sessão MCP | `/mcp` é **stateless**; `Mcp-Session-Id` é opcional |

### 2.2 Regras de token (importantes para a implementação)

- **Access token: ~8 h**. Renovar 5–10 min antes do `expires_in`.
- **Refresh token: expira em 180 dias desde a 1ª autorização (não renova) OU após 30 dias sem uso.**
  Depois disso o usuário precisa reconectar.
- **Rotação**: cada refresh devolve um refresh token novo; no máximo 2 válidos ao mesmo tempo.
  Persistir atomicamente antes da próxima chamada.
- **Serializar o refresh por conexão (lock)**: dois workers renovando o mesmo grant ao mesmo
  tempo podem **revogar a conexão inteira**.
- `invalid_grant` é terminal → apagar tokens e pedir reconexão, sem retry.
- A 1ª troca de código devolve `user_id` e `workspace_id` — guardar, pois o refresh não devolve.
- **Tokens MCP não funcionam na REST API** (`api.notion.com`) e vice-versa.
- `client_id` do DCR deve ser **guardado e reutilizado**; re-registrar orfana os grants existentes.
- Redirect URI precisa ser HTTPS em produção (HTTP só em localhost).

### 2.3 Autorização é **por usuário**, não por workspace

O token representa a pessoa que fez login: a IA vê e edita exatamente o que **aquele usuário**
pode ver no Notion. Para processos sem humano (jobs, robôs, soldados) existem duas saídas:

- **MCP token** (planos Business/Enterprise): workspace owner cria em "New MCP token" e usa como
  Bearer, sem tela de login — apropriado para automações.
- Ou designar a conexão OAuth de um usuário admin como "conexão de serviço" da empresa.

### 2.4 Ferramentas disponíveis (~75)

Grupos: busca (`notion-search`, `notion-fetch`, `notion-list-*`, `notion-get-users`, `notion-get-self`…),
consulta (`notion-query-data-sources` com SQL, `notion-query-multiple-data-sources`,
`notion-query-meeting-notes`), páginas/databases/views (`create/update/move/duplicate`),
arquivos/anexos, lixeira (`notion-delete-pages`, `notion-delete-databases` — marcadas
`destructiveHint` e exigem `user_confirmed: true`), comentários, Skills, Custom Agents
(`spawn-session`, `send-message-to-session`…) e Calendário (só em conexões autorizadas pelo usuário).

Em conexões "workspace-owned" (MCP token) o admin escolhe quais ferramentas ficam expostas.
Vários recursos (SQL multi-source, busca em fontes conectadas, filtros avançados) exigem
Business/Enterprise com Notion AI. Rate limit = o mesmo da API padrão.

---

## 3. Arquitetura alvo

```
┌──────────────┐  1. clica "Conectar"   ┌──────────────────────┐
│  Web (Next)  │ ─────────────────────▶ │ API /integrations/   │
│  Settings →  │  2. redirect authorize │  notion/connect      │──┐ PKCE + state (Redis, 10 min)
│  Integrações │ ◀───────────────────── │                      │  │
└──────┬───────┘                        └──────────────────────┘  │
       │ 3. login + consent no Notion                             │
       ▼                                                          │
┌─────────────────┐  4. ?code&state   ┌────────────────────────┐  │
│ mcp.notion.com  │ ────────────────▶ │ /integrations/notion/  │◀─┘
│ /authorize      │                   │  callback              │
└─────────────────┘                   │  troca code→tokens     │
                                      │  grava NotionMcp-      │
                                      │  Connection (cifrado)  │
                                      └───────────┬────────────┘
                                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│ NotionMcpClientService (apps/api)                                 │
│  • getClient(connectionId) → @modelcontextprotocol/sdk Client     │
│    + StreamableHTTPClientTransport(Authorization: Bearer)         │
│  • listTools() com cache (Redis, por workspace)                   │
│  • callTool(name, args) com refresh automático + lock             │
└───────┬──────────────────────┬───────────────────────┬───────────┘
        ▼                      ▼                       ▼
  Agentes de IA         Knowledge sync (RAG)     Verificação de cliente
  (tool-use loop,       notion-search/fetch/     notion-query-data-sources
   aprovação p/ write)  query-data-sources       (substitui findContact)
```

---

## 4. O que precisa ser desenvolvido

### 4.1 Backend — OAuth (novo módulo `apps/api/src/services/integrations/notion-mcp/`)

**Prisma (nova migration)**

```prisma
model NotionMcpClient {           // resultado do Dynamic Client Registration, 1 por redirect URI/ambiente
  id            String   @id @default(cuid())
  redirectUri   String   @unique
  clientId      String
  clientSecret  String?  // cifrado (normalmente null, auth method "none")
  registeredAt  DateTime @default(now())
}

model NotionMcpConnection {
  id                String   @id @default(cuid())
  companyId         String
  userId            String                 // dono do grant
  notionUserId      String
  workspaceId       String
  workspaceName     String?
  accessToken       String                 // cifrado AES-256-GCM
  refreshToken      String                 // cifrado
  accessExpiresAt   DateTime
  grantedAt         DateTime @default(now()) // p/ calcular limite de 180 dias
  lastRefreshAt     DateTime?                // p/ calcular limite de 30 dias sem uso
  lastUsedAt        DateTime?
  scope             String   @default("default")
  status            NotionMcpStatus @default(ACTIVE) // ACTIVE | EXPIRED | REVOKED | ERROR
  isServiceAccount  Boolean  @default(false) // conexão usada por jobs/robôs da empresa
  toolsCache        Json?                    // último tools/list
  @@unique([companyId, userId])
}
```

Estado temporário do fluxo (state, code_verifier, userId, companyId, returnTo) vai no **Redis com TTL
de 10 min**, não no banco.

**Rotas (`routes/integrations.notion.routes.ts`)**

| Rota | Função |
|------|--------|
| `GET /integrations/notion/connect` (auth) | Garante `NotionMcpClient` (DCR uma vez), gera PKCE + state, salva no Redis, devolve `authorizeUrl` |
| `GET /integrations/notion/callback` (público) | Valida state, troca `code` por tokens, grava `NotionMcpConnection` cifrada, redireciona para `${FRONTEND_URL}/settings?tab=integracoes&notion=ok` |
| `GET /integrations/notion/status` | Status da conexão do usuário logado + lista de conexões da empresa (admin) |
| `DELETE /integrations/notion` | Chama revocation endpoint e remove a conexão |
| `GET /integrations/notion/tools` | `tools/list` da conexão (para a UI e para configurar agentes) |
| `POST /integrations/notion/tools/:name/call` (admin/debug) | Teste manual de ferramenta |

**Serviços**

- `notion-oauth.service.ts`: discovery (`/.well-known/oauth-protected-resource` → authorization server
  metadata), DCR, build da URL (`response_type=code`, `scope=default`, `prompt=consent`, PKCE S256),
  troca de código, refresh com **lock Redis por conexão** (`SET NX` + TTL), tratamento de
  `invalid_grant` → `status = EXPIRED` + notificação ao usuário.
- `crypto.util.ts` (novo): AES-256-GCM com `ENCRYPTION_KEY` (32 bytes) — **não existe hoje**.
  Aproveitar para cifrar também `aiApiKey`, `notionApiKey`, `whisperApiKey` legadas.
- `notion-mcp-client.service.ts`: wrapper sobre `@modelcontextprotocol/sdk` (`Client` +
  `StreamableHTTPClientTransport`, header `Authorization: Bearer`, `User-Agent: ChatBlue/x.y`),
  pool de clientes por conexão, `listTools()` com cache (Redis, 1 h), `callTool()` com retry em 401
  (refresh e repetir uma vez).
- Job BullMQ `notion-mcp-token-refresh` (a cada 30 min): renova tokens que vencem em < 15 min
  para conexões marcadas `isServiceAccount` ou usadas nas últimas 24 h; marca `EXPIRED` quem
  passou de 180 dias / 30 dias sem uso e avisa o dono para reconectar.

**Dependências / env**

- `pnpm add @modelcontextprotocol/sdk` em `apps/api`.
- `.env`: `NOTION_MCP_URL=https://mcp.notion.com/mcp`, `NOTION_MCP_REDIRECT_URI=https://<api>/integrations/notion/callback`,
  `ENCRYPTION_KEY`, `FRONTEND_URL` (já existe).
- Callback precisa de HTTPS público (prod/staging). Em dev, `http://localhost:3001/...` é aceito.

### 4.2 Backend — IA com ferramentas (a parte que destrava "acesso a todas as ferramentas")

Hoje nenhum agente chama ferramentas. É preciso:

1. **Adapter MCP → LLM**: converter `tools/list` (JSON Schema) para `tools` do Anthropic e
   `tools/functions` do OpenAI. Nome, descrição e `inputSchema` vêm prontos do Notion.
2. **Loop agêntico** em `orchestrator.service.ts` (e no `blue.service.ts` para a assistente Blue):
   `messages.create({ tools })` → se `stop_reason === 'tool_use'` → `callTool()` → devolve
   `tool_result` → repete (limite de 6–8 iterações, timeout, log de cada chamada).
3. **Política de ferramentas por agente** em `AIAgentConfig`: `notionToolsMode: NONE | READ_ONLY | ALL`
   + allowlist opcional (`notionAllowedTools: string[]`). Padrão: `READ_ONLY`
   (search/fetch/query/list/get). Ferramentas de escrita só com aprovação.
4. **Aprovação humana para writes/destructive** ⚠️: reaproveitar o padrão de cartões de aprovação
   que já existe no Grupo-Blue (humanApprovalSummary, `army-dispatch.ts`): antes de
   `create/update/move/delete`, gerar cartão "Preciso de aprovação para: criar página X no Notion".
   `notion-delete-*` exige `user_confirmed: true` — só setar após o clique do humano.
5. **Qual conexão o agente usa**: no atendimento com humano (Blue, sugestões, soldado invocado por
   alguém) → a conexão **do usuário que está na tela/mencionou**. Em jobs e automações → a
   conexão `isServiceAccount` da empresa (ou MCP token, se o plano permitir).
6. Auditoria: tabela `NotionMcpToolCall` (connectionId, userId, ticketId?, tool, args resumidos,
   duração, sucesso) ou reaproveitar `Activity`.

### 4.3 Backend — migrar o que já usa Notion

| Hoje | Depois |
|------|--------|
| `data-source-sync.service.ts` → `syncNotion()` via REST + API Key | `notion-query-data-sources` (lista linhas) + `notion-fetch` (conteúdo em Markdown já pronto) via conexão de serviço. Mantém `AIDocument`/`checksum`. |
| `ingestion.service.ts` → `processNotionSource()` | `notion-fetch` (devolve página inteira em Markdown, com tabelas — hoje tabelas viram "[Tabela - conteúdo não extraído]") |
| `notion-sync.processor.ts` → `findContact()` | `notion-query-data-sources` com SQL (`WHERE telefone LIKE '%xxxxxxxxx'`) — elimina a detecção manual de tipo de propriedade |
| `createContact/updateContact/addNote` | `notion-create-pages`, `notion-update-page`, `notion-create-comment` |
| Aba Notion em Settings (API Key + Database ID) | Card "Conectar com Notion" + seletor de database (preenchido via `notion-search`) |
| `AIDataSource.config.apiKey` | Remover; usar `connectionId` |

Período de transição: manter `@notionhq/client` até a migração terminar; feature flag
`NOTION_MODE = api_key | mcp` por empresa.

### 4.4 Frontend (`apps/web`)

1. **Settings → nova aba "Integrações"** (ou evoluir a aba "Notion"):
   - Estado desconectado: botão **"Conectar com Notion"** → `GET /integrations/notion/connect` →
     `window.location.href = authorizeUrl` (ou popup + `postMessage`).
   - Estado conectado: workspace, usuário Notion, "conectado em", "válido até" (180 dias),
     "última renovação", botão **Desconectar**, botão **Reconectar** quando `EXPIRED`.
   - Aviso quando o refresh token estiver a < 15 dias do limite.
2. **Lista de ferramentas** (`GET /integrations/notion/tools`) com busca, para o admin ver o que o
   agente pode usar e marcar a allowlist por agente (tela `ai-agents`).
3. **Admin**: visão das conexões da empresa + marcar uma como "conexão de serviço".
4. Página de retorno do callback (`/settings?notion=ok|erro`) com toast.
5. ⚠️ Cartão de aprovação para ferramentas de escrita do Notion no thread (Equipe) — adaptar o
   componente já usado pelos soldados.

### 4.5 Operação / segurança

- Registrar o cliente (DCR) **uma vez por ambiente** e guardar o `client_id` (tabela
  `NotionMcpClient`); nunca re-registrar a cada deploy.
- Se o workspace do Grupo Blue for Enterprise, o admin precisa liberar o ChatBlue em
  Settings → Notion MCP → Manage workspace clients.
- `state` com HMAC ou aleatório de 32 bytes, TTL 10 min, uso único.
- Nunca logar tokens; mascarar nos retornos da API (como já é feito com `••••••••`).
- Rate limit do Notion: fila por conexão (p-limit 3) e backoff em 429.
- Revogar no Notion ao desconectar e ao desativar o usuário no ChatBlue (hook em `user.routes.ts`).

---

## 5. Fases e estimativa

| Fase | Entrega | Esforço |
|------|---------|---------|
| **1. Conexão** | Migration, crypto util, OAuth (DCR + PKCE + callback), refresh com lock, rotas connect/status/disconnect, UI "Conectar com Notion", `tools/list` exibido na tela | 4–5 dias |
| **2. Ferramentas na IA** | Adapter MCP→Anthropic/OpenAI, loop agêntico no orchestrator e na Blue, política READ_ONLY/ALL por agente, auditoria | 4–6 dias |
| **3. Aprovação de writes** | Cartões de aprovação para create/update/delete, `user_confirmed`, allowlist por agente ⚠️ depende do código do Grupo-Blue | 2–3 dias |
| **4. Migração do legado** | Knowledge sync, ingestão, verificação de cliente e CRUD de contato via MCP; feature flag; remoção da API Key | 3–4 dias |
| **5. Robôs/soldados** | Conexão de serviço ou MCP token; refresh job; alertas de expiração; (opcional) expor Notion aos soldados via `.mcp.json` das sessões Claude Code | 2–3 dias |

Total: **~3 a 4 semanas** de um dev, com a Fase 1 entregando exatamente o fluxo pedido
("clica → login no Notion → autoriza → ChatBlue enxerga todas as ferramentas").

---

## 6. Decisões a tomar

1. **Identidade das automações**: conexão OAuth de um admin (grátis, expira em 180 dias) ou
   MCP token (Business/Enterprise, sem expiração por inatividade)? Recomendação: MCP token se o
   plano permitir; senão, conexão de serviço com alerta de renovação.
2. **Escopo padrão dos agentes**: recomendo `READ_ONLY` por padrão e `ALL` só com aprovação humana.
3. **Manter a REST API** para algo? Só se houver recurso que o MCP não cubra (hoje não identificamos).
4. **Soldados (Claude Code)**: além de passar pelas ferramentas do ChatBlue, podem receber o Notion
   MCP direto na sessão (`claude mcp add --transport http notion https://mcp.notion.com/mcp`), mas
   aí o OAuth é da sessão, não do ChatBlue — o controle de aprovação fica fora do nosso sistema.

---

## 7. Referências

- Notion MCP: https://developers.notion.com/docs/mcp
- Get started: https://developers.notion.com/docs/get-started-with-mcp
- Supported tools: https://developers.notion.com/docs/mcp-supported-tools
- Build an MCP client for Notion: https://developers.notion.com/guides/mcp/build-mcp-client
- OAuth metadata: https://mcp.notion.com/.well-known/oauth-authorization-server
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
