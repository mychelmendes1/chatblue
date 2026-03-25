---
sidebar_position: 1
title: Listar Conexoes Email
description: Endpoint para listar conexoes de email da empresa no ChatBlue
---

# Listar Conexoes Email

Retorna a lista de conexoes de email da empresa.

## Endpoint

```
GET /api/email-connections
```

## Descricao

Este endpoint retorna todas as conexoes de email cadastradas na empresa do usuario autenticado. Cada conexao representa uma conta de email (IMAP/SMTP ou OAuth2) vinculada ao sistema para envio e recebimento de mensagens por email.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem listar conexoes de email da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

Nenhum parametro de query disponivel. Retorna todas as conexoes da empresa.

### Exemplos de URL

```
GET /api/email-connections
```

## Response

### Sucesso (200 OK)

```json
[
  {
    "id": "clemailxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Email Suporte",
    "email": "suporte@empresa.com",
    "authType": "PLAIN",
    "oauthProvider": null,
    "status": "CONNECTED",
    "imapHost": "imap.empresa.com",
    "imapPort": 993,
    "imapUser": "suporte@empresa.com",
    "imapTls": true,
    "smtpHost": "smtp.empresa.com",
    "smtpPort": 587,
    "smtpUser": "suporte@empresa.com",
    "smtpTls": true,
    "fromName": "Suporte Empresa",
    "pollIntervalSec": 60,
    "lastPollAt": "2024-01-15T14:30:00.000Z",
    "lastError": null,
    "isActive": true,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  },
  {
    "id": "clemailyyyyyyyyyyyyyyyyyyyyyy",
    "name": "Gmail Vendas",
    "email": "vendas@empresa.com",
    "authType": "OAUTH2",
    "oauthProvider": "google",
    "status": "CONNECTED",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapUser": "vendas@empresa.com",
    "imapTls": true,
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 465,
    "smtpUser": "vendas@empresa.com",
    "smtpTls": true,
    "fromName": "Vendas Empresa",
    "pollIntervalSec": 60,
    "lastPollAt": "2024-01-15T14:28:00.000Z",
    "lastError": null,
    "isActive": true,
    "createdAt": "2024-01-12T08:00:00.000Z",
    "updatedAt": "2024-01-15T14:28:00.000Z"
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da conexao (CUID) |
| `name` | string | Nome identificador da conexao |
| `email` | string | Endereco de email da conexao |
| `authType` | string | Tipo de autenticacao (PLAIN ou OAUTH2) |
| `oauthProvider` | string/null | Provedor OAuth (google) ou null para PLAIN |
| `status` | string | Status atual da conexao |
| `imapHost` | string | Host do servidor IMAP |
| `imapPort` | number | Porta do servidor IMAP |
| `imapUser` | string | Usuario IMAP |
| `imapTls` | boolean | Se usa TLS na conexao IMAP |
| `smtpHost` | string | Host do servidor SMTP |
| `smtpPort` | number | Porta do servidor SMTP |
| `smtpUser` | string | Usuario SMTP |
| `smtpTls` | boolean | Se usa TLS na conexao SMTP |
| `fromName` | string/null | Nome exibido como remetente |
| `pollIntervalSec` | number | Intervalo de polling em segundos |
| `lastPollAt` | string/null | Data/hora do ultimo polling |
| `lastError` | string/null | Ultimo erro registrado |
| `isActive` | boolean | Se a conexao esta ativa (polling habilitado) |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Data da ultima atualizacao |

### Status Disponiveis

| Status | Descricao |
|--------|-----------|
| `CONNECTED` | Conectado e funcionando |
| `DISCONNECTED` | Desconectado (polling inativo) |
| `CONNECTING` | Processo de conexao em andamento |
| `ERROR` | Erro na conexao |

## Erros

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

## Exemplos de Codigo

### cURL

```bash
curl -X GET https://api.chatblue.io/api/email-connections \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function listEmailConnections() {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('https://api.chatblue.io/api/email-connections', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

const connections = await listEmailConnections();
console.log(`Total de conexoes email: ${connections.length}`);

const active = connections.filter(c => c.isActive);
console.log(`Conexoes ativas: ${active.length}`);
```

### Python

```python
import requests

def list_email_connections(access_token):
    url = 'https://api.chatblue.io/api/email-connections'

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

connections = list_email_connections(token)
for conn in connections:
    status = 'Ativo' if conn['isActive'] else 'Inativo'
    print(f"{conn['name']} ({conn['email']}) - {conn['status']} - {status}")
```

## Notas Importantes

1. **Senhas nao retornadas**: Os campos `imapPassword` e `smtpPassword` nunca sao retornados na listagem por seguranca.

2. **Tokens OAuth nao retornados**: Campos `oauthRefreshToken` e `oauthAccessToken` tambem sao omitidos.

3. **Polling**: O campo `lastPollAt` indica quando o sistema verificou a caixa de entrada pela ultima vez. O intervalo e controlado por `pollIntervalSec`.

4. **Filtro por empresa**: A listagem retorna apenas conexoes da empresa do usuario autenticado (multi-tenant).

## Endpoints Relacionados

- [Criar Conexao Email](/docs/api/email-connections/criar) - Adicionar nova conexao PLAIN
- [OAuth Google](/docs/api/email-connections/oauth) - Conectar via Google OAuth2
- [Gerenciar Conexao](/docs/api/email-connections/gerenciar) - Editar, testar, conectar e desconectar
