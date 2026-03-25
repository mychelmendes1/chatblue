---
sidebar_position: 10
title: Canal de Email
description: Canal de email para atendimento ao cliente no ChatBlue
---

# Canal de Email

O ChatBlue permite atender clientes por email, funcionando como um canal independente ao lado do WhatsApp e Instagram. Esse canal e separado dos emails de alerta do sistema -- trata-se de uma caixa de entrada dedicada ao atendimento, onde cada email recebido vira um ticket com `channel=EMAIL`.

## Visao Geral

O canal de email funciona com dois protocolos:

- **IMAP** para receber emails (polling periodico na caixa de entrada)
- **SMTP** para enviar respostas ao cliente

O sistema suporta dois tipos de autenticacao:

| Tipo | Descricao | Uso |
|------|-----------|-----|
| **PLAIN** | Credenciais IMAP/SMTP manuais (usuario + senha) | Qualquer provedor de email (Outlook, servidores corporativos, etc.) |
| **OAUTH2** | Autenticacao via Google OAuth2 | Google Workspace e Gmail |

## Modelo de Dados (EmailConnection)

Cada conexao de email e representada pelo model `EmailConnection`:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | String (CUID) | Identificador unico |
| `name` | String | Nome amigavel da conexao (ex: "Suporte Gmail") |
| `email` | String | Endereco de email da conta |
| `authType` | String | Tipo de autenticacao: `PLAIN` ou `OAUTH2` |
| `oauthProvider` | String? | Provedor OAuth (ex: `google`) |
| `oauthRefreshToken` | String? | Refresh token do OAuth2 |
| `oauthAccessToken` | String? | Access token atual do OAuth2 |
| `oauthTokenExpiry` | DateTime? | Expiracao do access token |
| `imapHost` | String | Servidor IMAP (ex: `imap.gmail.com`) |
| `imapPort` | Int | Porta IMAP (padrao: 993) |
| `imapUser` | String | Usuario IMAP |
| `imapPassword` | String | Senha IMAP (criptografada com AES) |
| `imapTls` | Boolean | Usar TLS na conexao IMAP |
| `smtpHost` | String | Servidor SMTP (ex: `smtp.gmail.com`) |
| `smtpPort` | Int | Porta SMTP (padrao: 587) |
| `smtpUser` | String | Usuario SMTP |
| `smtpPassword` | String | Senha SMTP (criptografada com AES) |
| `smtpTls` | Boolean | Usar TLS na conexao SMTP |
| `fromName` | String? | Nome exibido no remetente ("De: Fulano") |
| `pollIntervalSec` | Int | Intervalo de polling em segundos (minimo: 15, padrao: 60) |
| `lastPollAt` | DateTime? | Ultimo polling realizado |
| `lastError` | String? | Mensagem do ultimo erro |
| `status` | String | Status da conexao: `CONNECTED`, `CONNECTING`, `DISCONNECTED`, `ERROR` |
| `isActive` | Boolean | Se o polling esta ativo |
| `companyId` | String | Empresa dona da conexao |

Senhas IMAP e SMTP sao criptografadas em repouso usando AES via `crypto.util.ts`.

## Configuracao Manual (PLAIN)

Para configurar uma conexao com credenciais manuais:

### Criar Conexao

```
POST /api/email-connections
```

**Body:**

```json
{
  "name": "Suporte - Outlook",
  "email": "suporte@empresa.com",
  "imapHost": "outlook.office365.com",
  "imapPort": 993,
  "imapUser": "suporte@empresa.com",
  "imapPassword": "senha-do-email",
  "imapTls": true,
  "smtpHost": "smtp.office365.com",
  "smtpPort": 587,
  "smtpUser": "suporte@empresa.com",
  "smtpPassword": "senha-do-email",
  "smtpTls": true,
  "fromName": "Suporte Empresa",
  "pollIntervalSec": 60
}
```

Requer autenticacao e permissao de administrador.

### Testar Conexao

```
POST /api/email-connections/:id/test
```

Testa IMAP e SMTP simultaneamente. Retorna:

```json
{
  "imap": true,
  "smtp": true,
  "errors": []
}
```

### Ativar/Desativar Polling

```
POST /api/email-connections/:id/connect     // Ativa polling
POST /api/email-connections/:id/disconnect  // Desativa polling
```

Ao conectar, o sistema realiza um polling inicial imediato e define o status como `CONNECTING`. Ao desconectar, define como `DISCONNECTED`.

## OAuth2 com Google (Gmail / Workspace)

Para contas Google, o sistema oferece um fluxo OAuth2 que evita a necessidade de senhas de app.

### Variaveis de Ambiente Necessarias

| Variavel | Descricao |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | Client ID do projeto Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Client Secret do projeto Google Cloud |
| `API_URL` | URL base da API (para o redirect URI do callback) |

O redirect URI registrado no Google deve ser: `{API_URL}/api/email-connections/oauth/google/callback`

### Escopos Solicitados

- `https://mail.google.com/` -- acesso completo ao email (IMAP/SMTP via OAuth)
- `https://www.googleapis.com/auth/userinfo.email` -- obter o endereco de email da conta

### Fluxo OAuth

```
1. Frontend solicita URL de autorizacao
   GET /api/email-connections/oauth/google/start?name=Gmail&fromName=Suporte
       |
       | Gera JWT com companyId, userId, name, fromName (expira em 10 min)
       | Monta URL do Google com state=JWT
       v
   Resposta: { "url": "https://accounts.google.com/o/oauth2/..." }

2. Usuario autoriza no Google
       |
       v
3. Google redireciona para o callback
   GET /api/email-connections/oauth/google/callback?code=XXX&state=JWT
       |
       | Verifica JWT do state
       | Troca code por tokens (exchangeCode)
       | Cria ou atualiza EmailConnection com authType=OAUTH2
       | Preenche automaticamente IMAP (imap.gmail.com:993) e SMTP (smtp.gmail.com:465)
       v
   Redirect para: {FRONTEND_URL}/connections?oauth=success&email=user@gmail.com
```

Se ja existir uma `EmailConnection` com o mesmo email para a empresa, o sistema atualiza os tokens em vez de criar uma nova conexao.

### Refresh de Tokens

O `GoogleOAuthService.getAccessToken()` gerencia automaticamente o ciclo de vida dos tokens:

1. Verifica se o access token atual ainda e valido (com buffer de 5 minutos)
2. Se expirado, usa o refresh token para obter um novo access token
3. Atualiza o banco de dados com os novos tokens
4. Retorna o access token valido

Tanto o `ImapService` quanto o `SmtpService` chamam esse metodo antes de se conectar.

## Polling IMAP (Recebimento de Emails)

O recebimento de emails funciona por polling periodico via job `email-poll`, que roda a cada 30 segundos e verifica todas as conexoes ativas.

### Fluxo de Polling

```
Job email-poll (a cada ~30s)
    |
    v
Para cada EmailConnection ativa:
    |
    | 1. Conecta ao servidor IMAP (PLAIN ou OAuth2)
    | 2. Abre INBOX e busca emails nao lidos (UNSEEN)
    | 3. Para cada email nao lido:
    |    a. Faz download e parse do email (mailparser)
    |    b. Ignora emails enviados pelo proprio endereco
    |    c. Verifica duplicata pelo Message-ID
    |    d. Resolve contato (cria se necessario, apenas com email, sem telefone)
    |    e. Resolve ticket (threading)
    |    f. Sanitiza HTML e cria mensagem no ticket
    |    g. Marca email como lido (\Seen) no servidor
    |    h. Emite evento socket para atualizar interface
    | 4. Atualiza lastPollAt
    v
```

### Threading de Emails (Resolucao de Ticket)

Quando um email chega, o sistema tenta encontrar o ticket correto usando quatro estrategias em ordem:

1. **Endereco Reply-To com ticket ID** -- Se o endereco de destino contem `+{ticketId}@` (formato de sub-addressing), usa esse ticket diretamente
2. **Headers In-Reply-To / References** -- Busca mensagens existentes cujo `metadata.emailMessageId` corresponda aos headers de referencia do email
3. **Protocolo no assunto** -- Extrai `[#PROTOCOLO]` do assunto do email e busca o ticket correspondente
4. **Ticket aberto do mesmo contato** -- Busca um ticket com `channel=EMAIL` aberto para o mesmo contato

Se nenhuma estrategia encontrar um ticket existente, cria um novo ticket com `channel=EMAIL`.

### Contatos de Email

Contatos criados a partir de emails possuem apenas o campo `email` preenchido (sem telefone). Isso permite que um mesmo contato tenha tickets por canais diferentes se depois for associado a um telefone.

## Envio de Respostas (SMTP)

Quando um atendente responde em um ticket de email, o `SmtpService` envia a resposta:

### Fluxo de Envio

```
Atendente digita resposta no chat do ticket
    |
    v
SmtpService.sendReply()
    |
    | 1. Busca EmailConnection e Ticket (com contato e historico)
    | 2. Gera HTML formatado com template (logo, protocolo, historico)
    | 3. Gera versao plain-text
    | 4. Configura Reply-To com sub-addressing: suporte+{ticketId}@empresa.com
    | 5. Define subject: "Re: [#PROTOCOLO] Assunto"
    | 6. Busca Message-ID do ultimo email do cliente para In-Reply-To
    | 7. Cria transporter (PLAIN ou OAuth2)
    | 8. Envia email via SMTP
    | 9. Grava mensagem no ticket com metadata.emailMessageId
    v
```

### Sub-Addressing para Threading

O sistema usa sub-addressing (formato `email+ticketId@dominio.com`) no campo Reply-To. Quando o cliente responde, o email chega com esse endereco no destino, permitindo que o IMAP identifique imediatamente o ticket correto.

### Template de Email

As respostas sao enviadas com um template HTML que inclui:

- Logo da empresa (se configurado)
- Numero do protocolo
- Assunto do ticket
- Mensagem do atendente
- Historico recente da conversa (ate 20 mensagens)

## API - Endpoints

### CRUD de Conexoes

| Metodo | Endpoint | Descricao | Permissao |
|--------|----------|-----------|-----------|
| `GET` | `/api/email-connections` | Listar conexoes | Autenticado |
| `GET` | `/api/email-connections/:id` | Detalhe da conexao | Autenticado |
| `POST` | `/api/email-connections` | Criar conexao (PLAIN) | Admin |
| `PUT` | `/api/email-connections/:id` | Atualizar conexao | Admin |
| `DELETE` | `/api/email-connections/:id` | Remover conexao | Admin |

### Operacoes

| Metodo | Endpoint | Descricao | Permissao |
|--------|----------|-----------|-----------|
| `POST` | `/api/email-connections/:id/test` | Testar IMAP + SMTP | Admin |
| `POST` | `/api/email-connections/:id/connect` | Ativar polling | Admin |
| `POST` | `/api/email-connections/:id/disconnect` | Desativar polling | Admin |

### OAuth Google

| Metodo | Endpoint | Descricao | Permissao |
|--------|----------|-----------|-----------|
| `GET` | `/api/email-connections/oauth/google/start` | Iniciar fluxo OAuth | Admin |
| `GET` | `/api/email-connections/oauth/google/callback` | Callback do Google | Publico (validado por JWT no state) |

## Diagrama Geral

```
                    +-------------------+
                    |   Google OAuth    |
                    | (Gmail/Workspace) |
                    +--------+----------+
                             |
                             | tokens
                             v
+------------------+    +-----------+    +------------------+
|  Servidor IMAP   |--->|  ChatBlue |<---|  Servidor SMTP   |
| (receber emails) |    |   API     |    | (enviar emails)  |
+------------------+    +-----+-----+    +------------------+
                              |
           +------------------+------------------+
           |                  |                  |
           v                  v                  v
    +-----------+      +-----------+      +-----------+
    |  Contato  |      |  Ticket   |      | Mensagem  |
    | (email)   |      | (EMAIL)   |      | (thread)  |
    +-----------+      +-----------+      +-----------+
```

## Boas Praticas

### Configuracao

1. **Use OAuth2 para Gmail** -- Mais seguro que senhas de app e nao requer configuracao de "apps menos seguros"
2. **Configure fromName** -- O nome no remetente ajuda o cliente a identificar a empresa
3. **Teste antes de ativar** -- Use o endpoint `/test` para validar IMAP e SMTP antes de ativar o polling
4. **Monitore status** -- Verifique `lastError` e `status` periodicamente para detectar problemas de conexao

### Atendimento

1. **Assuntos nos tickets** -- O assunto do primeiro email vira o `subject` do ticket, facilitando a identificacao
2. **Threading automatico** -- Respostas do cliente sao automaticamente vinculadas ao ticket correto via headers de email ou protocolo no assunto
3. **Contatos sem telefone** -- Contatos criados via email nao possuem telefone; podem ser atualizados manualmente depois

## Proximos Passos

- [Tickets](/funcionalidades/tickets) -- Gestao completa de tickets
- [Canal Instagram](/funcionalidades/instagram) -- Atendimento via Instagram DMs
- [Campanhas e Disparos](/funcionalidades/campanhas) -- Disparos em massa
