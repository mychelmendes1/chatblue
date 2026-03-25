---
sidebar_position: 3
title: OAuth Google
description: Endpoints para autenticacao OAuth2 com Google para conexoes de email no ChatBlue
---

# OAuth Google

Fluxo de autenticacao OAuth2 com Google para conexoes de email Gmail.

## Endpoints

```
GET /api/email-connections/oauth/google/start
GET /api/email-connections/oauth/google/callback
```

## Descricao

Estes endpoints implementam o fluxo OAuth2 com o Google para conectar contas Gmail ao ChatBlue. O fluxo elimina a necessidade de configurar credenciais IMAP/SMTP manualmente, utilizando tokens OAuth2 para autenticacao segura.

O processo acontece em duas etapas:
1. **Start**: Gera a URL de consentimento do Google e retorna ao cliente
2. **Callback**: Recebe o codigo de autorizacao do Google e cria/atualiza a conexao

---

## Etapa 1: Iniciar Fluxo OAuth

### Endpoint

```
GET /api/email-connections/oauth/google/start
```

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Permissoes

- **ADMIN**: Pode iniciar fluxo OAuth
- **SUPER_ADMIN**: Pode iniciar fluxo OAuth

:::warning Acesso Restrito
Apenas usuarios com role `ADMIN` ou `SUPER_ADMIN` podem iniciar o fluxo OAuth.
:::

### Query Parameters

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `name` | string | Sim | Nome identificador para a conexao |
| `fromName` | string | Nao | Nome exibido como remetente nos emails |

### Exemplo de URL

```
GET /api/email-connections/oauth/google/start?name=Gmail%20Suporte&fromName=Suporte%20Empresa
```

### Response - Sucesso (200 OK)

```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=...&state=..."
}
```

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `url` | string | URL de consentimento do Google para redirecionar o usuario |

### Funcionamento

O endpoint gera um JWT assinado contendo `companyId`, `userId`, `name` e `fromName` como parametro `state` da URL OAuth. Este JWT expira em 10 minutos.

O cliente deve redirecionar o usuario para a URL retornada, onde ele autorizara o acesso a conta Gmail.

---

## Etapa 2: Callback do Google

### Endpoint

```
GET /api/email-connections/oauth/google/callback
```

### Autenticacao

Nenhuma autenticacao via header. A validacao e feita pelo parametro `state` (JWT assinado na etapa 1).

### Query Parameters

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `code` | string | Sim | Codigo de autorizacao retornado pelo Google |
| `state` | string | Sim | JWT com dados do usuario (gerado na etapa 1) |

:::info Chamado pelo Google
Este endpoint nao e chamado diretamente pelo cliente. O Google redireciona o usuario para esta URL apos o consentimento.
:::

### Comportamento

1. Valida o JWT do parametro `state`
2. Troca o `code` por tokens de acesso e refresh via Google OAuth
3. Obtem o email da conta Google
4. **Se ja existe** uma conexao com o mesmo email na empresa: atualiza os tokens
5. **Se nao existe**: cria uma nova conexao com configuracoes automaticas do Gmail
6. Redireciona o usuario para o frontend

### Redirect - Sucesso

```
{FRONTEND_URL}/connections?oauth=success&email=usuario@gmail.com
```

### Redirect - Erro

```
{FRONTEND_URL}/connections?oauth=error&message=Descricao+do+erro
```

### Configuracoes Automaticas do Gmail

Ao conectar via OAuth, as seguintes configuracoes sao aplicadas automaticamente:

| Configuracao | Valor |
|-------------|-------|
| `authType` | OAUTH2 |
| `oauthProvider` | google |
| `imapHost` | imap.gmail.com |
| `imapPort` | 993 |
| `imapTls` | true |
| `smtpHost` | smtp.gmail.com |
| `smtpPort` | 465 |
| `smtpTls` | true |
| `status` | CONNECTED |
| `isActive` | true |

## Erros

### Start - 400 Bad Request

```json
{
  "error": "Validation error: name: String must contain at least 1 character(s)",
  "code": "VALIDATION_ERROR"
}
```

### Start - 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

### Start - 403 Forbidden

```json
{
  "error": "Access denied. Admin required.",
  "code": "FORBIDDEN"
}
```

### Callback - 400 Bad Request

Retornado como texto HTML quando os parametros sao invalidos:

```
Parametros invalidos
```

```
State invalido ou expirado. Tente novamente.
```

## Exemplos de Codigo

### cURL - Iniciar Fluxo

```bash
curl -X GET "https://api.chatblue.io/api/email-connections/oauth/google/start?name=Gmail%20Suporte&fromName=Suporte" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript - Fluxo Completo

```javascript
async function startGoogleOAuth(name, fromName) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams({ name });
  if (fromName) params.append('fromName', fromName);

  const response = await fetch(
    `https://api.chatblue.io/api/email-connections/oauth/google/start?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const { url } = await response.json();

  // Redirecionar para o Google
  window.location.href = url;
}

// Na pagina de connections, tratar o retorno do callback
function handleOAuthReturn() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('oauth') === 'success') {
    const email = params.get('email');
    console.log(`Conexao OAuth criada com sucesso para: ${email}`);
  } else if (params.get('oauth') === 'error') {
    const message = params.get('message');
    console.error(`Erro no OAuth: ${message}`);
  }
}
```

### Python

```python
import requests
import webbrowser

def start_google_oauth(access_token, name, from_name=None):
    url = 'https://api.chatblue.io/api/email-connections/oauth/google/start'

    params = {'name': name}
    if from_name:
        params['fromName'] = from_name

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        oauth_url = response.json()['url']
        webbrowser.open(oauth_url)
        return oauth_url
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

oauth_url = start_google_oauth(token, 'Gmail Suporte', 'Suporte Empresa')
print(f"Abra no navegador: {oauth_url}")
```

## Fluxo Completo

```
1. Cliente chama GET /oauth/google/start?name=Gmail
        |
2. API gera JWT com dados do usuario e retorna URL do Google
        |
3. Cliente redireciona usuario para URL do Google
        |
4. Usuario autoriza acesso no Google
        |
5. Google redireciona para GET /oauth/google/callback?code=...&state=...
        |
6. API valida JWT, troca code por tokens, cria/atualiza conexao
        |
7. API redireciona usuario para {FRONTEND_URL}/connections?oauth=success
```

## Notas Importantes

1. **State JWT**: O parametro `state` e um JWT assinado que expira em 10 minutos. Se o usuario demorar mais que isso para autorizar, precisara reiniciar o fluxo.

2. **Upsert**: Se ja existir uma conexao com o mesmo email para a empresa, os tokens sao atualizados em vez de criar uma nova conexao.

3. **Ativacao automatica**: Conexoes criadas via OAuth ficam automaticamente ativas (`isActive: true`) e com status `CONNECTED`.

4. **Refresh Token**: O Google fornece um refresh token que permite renovar o acesso automaticamente sem intervencao do usuario.

5. **Configuracao automatica**: Hosts e portas IMAP/SMTP do Gmail sao configurados automaticamente.

## Endpoints Relacionados

- [Listar Conexoes Email](/docs/api/email-connections/listar) - Ver todas as conexoes
- [Criar Conexao Email](/docs/api/email-connections/criar) - Criar conexao PLAIN manualmente
- [Gerenciar Conexao](/docs/api/email-connections/gerenciar) - Testar, ativar e desativar
