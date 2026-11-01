# Instagram no ChatBlue — guia de configuração e operação

Este guia cobre o que precisa ser feito **fora do código** para o canal Instagram funcionar:
app na Meta, variáveis de ambiente, webhook, revisão do app e o que o cliente precisa ligar na
conta dele. O desenho técnico está em `INSTAGRAM_CHANNEL_PLAN.md`.

---

## 1. App na Meta for Developers

1. Acesse https://developers.facebook.com/apps → **Criar app** → tipo **Business**.
2. Em **Adicionar produtos**, adicione **Instagram** e escolha **"API setup with Instagram business login"**.
3. Em **Instagram → Business login settings**:
   - **Redirect URIs**: `https://<API_URL>/api/integrations/instagram/callback`
     (tem de ser exatamente igual ao `INSTAGRAM_REDIRECT_URI`; a Meta às vezes acrescenta `/` no fim, confira).
   - Anote o **Instagram App ID** e o **Instagram App Secret** (não são os mesmos do app do Facebook).
4. Em **Instagram → Webhooks**:
   - **Callback URL**: `https://<API_URL>/webhooks/instagram` (uma só para todas as contas).
   - **Verify token**: o valor de `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`.
   - Assine os campos: `messages`, `messaging_postbacks`, `messaging_seen`, `message_reactions`,
     `messaging_referral`, `comments`, `live_comments`.
5. Em **Configurações do app → Básico**: preencha política de privacidade, ícone, categoria e
   **Verificação do negócio** (obrigatória para Advanced Access).

## 2. Permissões e App Review

| Permissão / recurso | Para quê | Nível |
|---|---|---|
| `instagram_business_basic` | identificar a conta, listar posts | Advanced Access |
| `instagram_business_manage_messages` | receber/enviar Direct, private replies | Advanced Access |
| `instagram_business_manage_comments` | webhook de comentários, responder comentário | Advanced Access |
| **Human Agent** | tag `HUMAN_AGENT` (resposta humana até 7 dias) | recurso adicional, App Review |

- Com **Standard Access** tudo funciona **só para contas com papel no app** (ótimo para
  desenvolver/testar com a conta do Grupo Blue). Para contas de clientes é obrigatório
  **Advanced Access**, que exige App Review com vídeo mostrando o fluxo (conectar → receber
  DM → responder; comentar → receber DM).
- Prazo típico da Meta: 1 a 4 semanas. Peça assim que o fluxo estiver funcionando em staging.

## 3. Variáveis de ambiente (`apps/api`)

| Variável | Descrição |
|---|---|
| `META_APP_ID` | Instagram App ID |
| `META_APP_SECRET` | Instagram App Secret (usado também para validar a assinatura do webhook) |
| `INSTAGRAM_REDIRECT_URI` | `https://<API_URL>/api/integrations/instagram/callback` |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | string aleatória usada na verificação do webhook |
| `INSTAGRAM_GRAPH_VERSION` | versão da Graph API (padrão `v21.0`) |
| `INSTAGRAM_HUMAN_AGENT_ENABLED` | `true` só depois que a Meta aprovar o recurso Human Agent |
| `ENCRYPTION_KEY` | 32 bytes (hex ou base64) para cifrar tokens no banco. Gere com `openssl rand -hex 32` |
| `FRONTEND_URL` | usado no redirect pós-OAuth |
| `API_URL` | base pública da API |

## 4. O que o cliente precisa fazer na conta do Instagram

1. A conta precisa ser **profissional** (Business ou Creator). Instagram → Configurações →
   Tipo de conta e ferramentas → Mudar para conta profissional.
2. **Permitir acesso a mensagens**: Instagram → Configurações → Mensagens e respostas a stories →
   Controles de mensagens → **Ferramentas conectadas** → ligar "Permitir acesso a mensagens".
   Sem isso o webhook de mensagens não chega.
3. No ChatBlue: **Conexões → Nova conexão → Instagram → "Conectar com Instagram"**, fazer login
   e autorizar. A conexão aparece como `@usuario`, com a validade do token.

## 5. Regras que o sistema aplica (e por quê)

- **Janela de 24 h**: só dá para mandar Direct até 24 h depois da última mensagem da pessoa
  (7 dias se ela veio de anúncio Click-to-Direct). Fora disso o envio é bloqueado com aviso.
- **Agente humano (7 dias)**: se `INSTAGRAM_HUMAN_AGENT_ENABLED=true`, um atendente humano
  consegue responder até 7 dias com a tag `HUMAN_AGENT`. IA e automações nunca usam a tag.
- **Comentário → DM**: uma única mensagem privada por comentário, até 7 dias depois do
  comentário. Essa mensagem **não abre** a janela de 24 h; a conversa só continua quando a pessoa
  responde no Direct. Por isso a automação cria o ticket só nesse momento.
- **Token**: dura 60 dias e é renovado automaticamente a cada 12 h quando faltar menos de 15 dias.
  Se a renovação falhar, a conexão fica `ERROR` e o admin recebe aviso para reconectar.
- **Webhook**: uma URL para todas as contas, assinatura `X-Hub-Signature-256` validada com o
  App Secret, eventos deduplicados (a Meta reenvia) e processados em fila (BullMQ `instagram-webhook`).

## 6. Teste rápido (staging)

1. Configure as variáveis, suba a API e confirme `GET /api/integrations/instagram/config` → `configured: true`.
2. Na Meta, salve o Callback URL (ela chama `GET /webhooks/instagram` com o verify token).
3. Conecte a conta de teste pelo botão.
4. Mande um Direct para a conta → deve virar ticket. Responda pelo ChatBlue.
5. Crie uma automação para um post com a palavra "quero" → comente "quero" com outra conta →
   deve chegar a resposta pública e a DM com o link. Responda a DM → o ticket abre e o evento
   fica `USER_REPLIED` em **Instagram → Eventos**.

## 7. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Webhook de mensagem não chega | "Permitir acesso a mensagens" desligado; campos não assinados; conta não é profissional |
| `401` no webhook | `META_APP_SECRET` diferente do app que envia |
| `(#10) outside of allowed window` | janela fechada; aguardar a pessoa responder ou usar agente humano |
| Private reply falha | comentário com mais de 7 dias, já respondido, ou permissão `manage_comments`/`manage_messages` sem Advanced Access |
| Conexão em `ERROR` | token expirou (60 dias sem renovar) ou a pessoa revogou; reconectar |
