# Como conectar o Instagram (Instagram DM) no ChatBlue

O ChatBlue usa a **API do Instagram (Meta Graph API)** para receber e enviar mensagens diretas (DM). Você precisa de uma **conta profissional do Instagram** vinculada a uma **página do Facebook** e de um **app** no painel da Meta (Facebook) para Developers.

---

## 1. Onde conseguir os dados

Tudo é configurado no **Meta for Developers** (antigo Facebook Developers):

- **Site:** [https://developers.facebook.com](https://developers.facebook.com)

---

## 2. Pré-requisitos

1. **Conta no Facebook** e **página do Facebook** (pode ser da empresa ou pessoal).
2. **Conta do Instagram** convertida em **conta profissional** (Creator ou Business).
3. **Instagram vinculado à página do Facebook**:  
   Instagram → Configurações → Conta → Contas vinculadas → Contas do Facebook → escolher a página.

---

## 3. Criar o app e obter as credenciais

### 3.1 Criar um app

1. Acesse [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. Clique em **Criar app**.
3. Escolha **Outro** (ou **Business** se quiser integrações empresariais).
4. Preencha nome do app, email de contato e clique em **Criar app**.

### 3.2 Adicionar o produto “Instagram”

1. No painel do app, em **Adicionar produtos**, encontre **Instagram**.
2. Clique em **Configurar** no card do Instagram (Instagram Graph API / Instagram Messaging).

### 3.3 Obter o Instagram Account ID (ID da conta)

1. No menu do app: **Instagram** → **Configurações básicas** (ou **Basic Display** / **Instagram Graph API**).
2. Em **Instagram Testers** ou **Contas do Instagram**, adicione sua conta de teste (se o app ainda estiver em modo de desenvolvimento).
3. Para pegar o **Instagram Account ID**:
   - Use o **Explorador do Graph API**: [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer).
   - Selecione seu app no topo.
   - Em **Meta App**, adicione o token (pode começar com “User Token” e permissões `instagram_basic`, `instagram_manage_messages`).
   - No campo de consulta, use algo como:  
     `me/accounts` (para listar páginas) e depois, com o **Page Access Token** da página vinculada ao Instagram:  
     `{page-id}?fields=instagram_business_account`  
     O valor em `instagram_business_account.id` é o **Instagram Account ID** que você usa no ChatBlue.

   **Alternativa (mais direta):**

   - No painel do app: **Instagram** → **Configurações básicas**.
   - Se a conta já estiver conectada, às vezes o ID aparece na tela ou em **Contas do Instagram**.
   - Ou em **Ferramentas** → **Explorador do Graph API**: consultar `me/accounts` com um token de usuário que tenha a página; em cada página, o campo `instagram_business_account.id` é o **Instagram Account ID**.

Esse ID é numérico (ex.: `17841400008460000`). É o que você coloca em **“Instagram Account ID”** no ChatBlue.

### 3.4 Gerar o Access Token (token de acesso)

1. No **Explorador do Graph API** ([developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)):
   - Selecione seu app.
   - Em **Permissões**, marque:
     - `instagram_basic`
     - `instagram_manage_messages`
   - Clique em **Gerar token de acesso** e siga o fluxo (login no Facebook e permissões da página/Instagram).
2. Para uso em produção, o ideal é um **Page Access Token** de longa duração:
   - Obtenha um **User Token** com as permissões acima.
   - Depois troque por **Page Access Token**: no Explorer, em “Nó”, use sua página (ex.: `me/accounts`) e pegue o token da página que tem o Instagram vinculado.
   - Esse token da página (Page Access Token) é o que você cola em **“Access Token”** no ChatBlue.

Guarde esse token em local seguro; ele é o que você usa no campo **“Access Token”** ao criar a conexão Instagram no ChatBlue.

### 3.5 Definir o Webhook Verify Token

O **Webhook Verify Token** é uma **senha que você inventa**. Não vem do Facebook.

- Exemplo: `minha_chave_secreta_instagram_123`
- Use algo longo e aleatório.
- Você vai usar **o mesmo valor** em dois lugares:
  1. No ChatBlue, ao criar a conexão Instagram (campo **“Webhook Verify Token”**).
  2. No painel da Meta, ao configurar a URL do webhook (campo **“Token de verificação”**).

---

## 4. Configurar o webhook no painel da Meta

Depois de criar a conexão no ChatBlue, você recebe um **ID da conexão**. A URL de callback do Instagram será:

```text
https://SUA_URL_DA_API/webhooks/instagram/ID_DA_CONEXAO
```

Exemplos:

- Produção: `https://sua-api.com/webhooks/instagram/ID_DA_CONEXAO`
- **Localhost:** a Meta não acessa `http://localhost:...`. Use um túnel (ex.: ngrok) — veja a seção **9** abaixo.

No painel da Meta:

1. **Instagram** → **Configurações** (ou **Webhooks**).
2. Em **Instagram Messaging** (ou equivalente), clique em **Configurar** ou **Subscribe** no webhook.
3. Preencha:
   - **URL de callback:** a URL acima.
   - **Token de verificação:** o mesmo valor que você colocou no ChatBlue em **“Webhook Verify Token”**.
4. Salve. A Meta vai fazer uma requisição GET na sua URL; o ChatBlue responde com o `hub.challenge` e a conexão fica verificada.
5. Inscreva-se nos eventos que quiser (ex.: **messages**, **messaging_postbacks** etc., conforme disponível para Instagram).

---

## 5. No ChatBlue (Conexões)

1. Acesse **Conexões** no menu.
2. Clique em **Nova conexão**.
3. Aba **Instagram**.
4. Preencha:
   - **Nome da conexão:** ex.: “Instagram Loja”.
   - **Instagram Account ID:** o ID numérico da conta profissional (ex.: `17841400008460000`).
   - **Access Token:** o token da API (Page Access Token com `instagram_basic` e `instagram_manage_messages`).
   - **Webhook Verify Token:** a mesma string que você vai colocar no painel da Meta no campo “Token de verificação”.
5. Salve.

Depois, configure o webhook no painel da Meta com a URL `SUA_API/webhooks/instagram/{ID_DA_CONEXAO}` e o mesmo **Webhook Verify Token**.

---

## 6. Resumo – Onde cada dado fica

| Dado | Onde conseguir |
|------|----------------|
| **Instagram Account ID** | Meta for Developers → seu app → Instagram → Graph API Explorer ou Configurações; valor de `instagram_business_account.id` da página vinculada ao Instagram. |
| **Access Token** | Graph API Explorer com permissões `instagram_basic` e `instagram_manage_messages`; use o **Page Access Token** da página vinculada ao Instagram (token de longa duração em produção). |
| **Webhook Verify Token** | Você inventa; use o mesmo valor no ChatBlue e no painel da Meta ao configurar o webhook. |
| **URL do webhook** | `https://SUA_API/webhooks/instagram/ID_DA_CONEXAO` (o ID da conexão aparece no ChatBlue após criar a conexão Instagram). |

---

## 7. Permissões necessárias no token

- `instagram_basic` – informações básicas da conta.
- `instagram_manage_messages` – envio e recebimento de mensagens (Instagram DM).

Sem essas duas, o ChatBlue não consegue testar a conexão nem trocar mensagens.

---

## 8. Conta em modo de desenvolvimento

Enquanto o app estiver em **modo de desenvolvimento**, só contas adicionadas como **testadores** (em **Roles** → **Testadores** ou em **Instagram Testers**) podem trocar mensagens. Para qualquer pessoa usar, é preciso enviar o app para revisão da Meta e ativar **Instagram Messaging** em produção.

---

## 9. Desenvolvimento local (localhost) e ngrok

Se você está rodando o ChatBlue no **localhost**, a **criação da conexão** e o **envio de mensagens** (do ChatBlue para o Instagram) funcionam, porque são o seu servidor que chama a API da Meta. Já a **verificação do webhook** e o **recebimento de mensagens** (Instagram → ChatBlue) **não funcionam** com `http://localhost:3001`, porque os servidores da Meta precisam acessar a sua URL e não alcançam sua máquina.

**Solução: usar um túnel (ngrok ou similar)**

1. Instale o [ngrok](https://ngrok.com) e exponha a porta da API:
   ```bash
   ngrok http 3001
   ```
2. O ngrok mostra uma URL pública, por exemplo: `https://abc123.ngrok-free.app`.
3. No painel da Meta, em **URL de callback**, use:
   ```text
   https://abc123.ngrok-free.app/webhooks/instagram/ID_DA_CONEXAO
   ```
4. (Opcional) Para que links de mídia (imagens, áudios) abram corretamente no frontend, defina na API a variável **API_URL** com a URL do ngrok, por exemplo no `.env` do backend:
   ```env
   API_URL=https://abc123.ngrok-free.app
   ```
   Assim as URLs de upload geradas pelo webhook apontam para o ngrok e o navegador consegue acessá-las.

**Resumo localhost**

| Ação | Com localhost puro | Com ngrok |
|------|--------------------|-----------|
| Criar conexão Instagram | ✅ | ✅ |
| Enviar mensagem (ChatBlue → Instagram) | ✅ | ✅ |
| Verificação do webhook na Meta | ❌ | ✅ |
| Receber mensagens (Instagram → ChatBlue) | ❌ | ✅ |
