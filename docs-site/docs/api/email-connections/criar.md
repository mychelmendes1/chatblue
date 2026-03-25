---
sidebar_position: 2
title: Criar Conexao Email
description: Endpoint para criar uma nova conexao de email no ChatBlue
---

# Criar Conexao Email

Cria uma nova conexao de email com autenticacao PLAIN (IMAP/SMTP).

## Endpoint

```
POST /api/email-connections
```

## Descricao

Este endpoint cria uma nova conexao de email na empresa utilizando credenciais IMAP e SMTP tradicionais (autenticacao PLAIN). Para conexoes via Google OAuth2, utilize o endpoint [OAuth Google](/docs/api/email-connections/oauth).

Apos a criacao, a conexao fica com status `DISCONNECTED` ate que seja ativada manualmente via endpoint de connect.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode criar conexoes
- **SUPER_ADMIN**: Pode criar conexoes

:::warning Acesso Restrito
Apenas usuarios com role `ADMIN` ou `SUPER_ADMIN` podem criar conexoes de email.
:::

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Padrao | Descricao |
|-------|------|-------------|--------|-----------|
| `name` | string | Sim | - | Nome identificador da conexao |
| `email` | string | Sim | - | Endereco de email (deve ser valido) |
| `imapHost` | string | Sim | - | Host do servidor IMAP |
| `imapPort` | number | Nao | 993 | Porta do servidor IMAP |
| `imapUser` | string | Sim | - | Usuario para autenticacao IMAP |
| `imapPassword` | string | Sim | - | Senha para autenticacao IMAP |
| `imapTls` | boolean | Nao | true | Usar TLS na conexao IMAP |
| `smtpHost` | string | Sim | - | Host do servidor SMTP |
| `smtpPort` | number | Nao | 587 | Porta do servidor SMTP |
| `smtpUser` | string | Sim | - | Usuario para autenticacao SMTP |
| `smtpPassword` | string | Sim | - | Senha para autenticacao SMTP |
| `smtpTls` | boolean | Nao | true | Usar TLS na conexao SMTP |
| `fromName` | string | Nao | - | Nome exibido como remetente |
| `pollIntervalSec` | number | Nao | 60 | Intervalo de polling em segundos (minimo: 15) |

### Exemplo de Request

```json
{
  "name": "Email Suporte",
  "email": "suporte@empresa.com",
  "imapHost": "imap.empresa.com",
  "imapPort": 993,
  "imapUser": "suporte@empresa.com",
  "imapPassword": "senha-segura-123",
  "imapTls": true,
  "smtpHost": "smtp.empresa.com",
  "smtpPort": 587,
  "smtpUser": "suporte@empresa.com",
  "smtpPassword": "senha-segura-123",
  "smtpTls": true,
  "fromName": "Suporte Empresa ABC",
  "pollIntervalSec": 30
}
```

Exemplo minimo (usando valores padrao):

```json
{
  "name": "Email Principal",
  "email": "contato@empresa.com",
  "imapHost": "imap.empresa.com",
  "imapUser": "contato@empresa.com",
  "imapPassword": "senha123",
  "smtpHost": "smtp.empresa.com",
  "smtpUser": "contato@empresa.com",
  "smtpPassword": "senha123"
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clemailxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Email Suporte",
  "email": "suporte@empresa.com",
  "authType": "PLAIN",
  "oauthProvider": null,
  "status": "DISCONNECTED",
  "imapHost": "imap.empresa.com",
  "imapPort": 993,
  "imapUser": "suporte@empresa.com",
  "imapTls": true,
  "smtpHost": "smtp.empresa.com",
  "smtpPort": 587,
  "smtpUser": "suporte@empresa.com",
  "smtpTls": true,
  "fromName": "Suporte Empresa ABC",
  "pollIntervalSec": 30,
  "lastPollAt": null,
  "lastError": null,
  "isActive": false,
  "companyId": "clcompxxxxxxxxxxxxxxxxxxxxxx",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da conexao (CUID) |
| `name` | string | Nome da conexao |
| `email` | string | Endereco de email |
| `authType` | string | Tipo de autenticacao (PLAIN para este endpoint) |
| `status` | string | Status inicial (DISCONNECTED) |
| `imapHost` | string | Host IMAP configurado |
| `imapPort` | number | Porta IMAP |
| `imapUser` | string | Usuario IMAP |
| `imapTls` | boolean | TLS habilitado para IMAP |
| `smtpHost` | string | Host SMTP configurado |
| `smtpPort` | number | Porta SMTP |
| `smtpUser` | string | Usuario SMTP |
| `smtpTls` | boolean | TLS habilitado para SMTP |
| `fromName` | string/null | Nome do remetente |
| `pollIntervalSec` | number | Intervalo de polling |
| `isActive` | boolean | Status de ativacao (false inicialmente) |
| `companyId` | string | ID da empresa |
| `createdAt` | string | Data de criacao |

## Erros

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: email: Invalid email",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden

```json
{
  "error": "Access denied. Admin required.",
  "code": "FORBIDDEN"
}
```

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/email-connections \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Suporte",
    "email": "suporte@empresa.com",
    "imapHost": "imap.empresa.com",
    "imapPort": 993,
    "imapUser": "suporte@empresa.com",
    "imapPassword": "senha-segura-123",
    "smtpHost": "smtp.empresa.com",
    "smtpPort": 587,
    "smtpUser": "suporte@empresa.com",
    "smtpPassword": "senha-segura-123",
    "fromName": "Suporte Empresa"
  }'
```

### JavaScript (Fetch)

```javascript
async function createEmailConnection(connectionData) {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch('https://api.chatblue.io/api/email-connections', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(connectionData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

try {
  const connection = await createEmailConnection({
    name: 'Email Suporte',
    email: 'suporte@empresa.com',
    imapHost: 'imap.empresa.com',
    imapUser: 'suporte@empresa.com',
    imapPassword: 'senha-segura-123',
    smtpHost: 'smtp.empresa.com',
    smtpUser: 'suporte@empresa.com',
    smtpPassword: 'senha-segura-123',
    fromName: 'Suporte',
  });

  console.log('Conexao criada:', connection.id);

  // Proximo passo: testar e ativar a conexao
} catch (error) {
  console.error('Erro ao criar conexao:', error.message);
}
```

### Python

```python
import requests

def create_email_connection(access_token, data):
    url = 'https://api.chatblue.io/api/email-connections'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.post(url, json=data, headers=headers)

    if response.status_code == 201:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

connection = create_email_connection(token, {
    'name': 'Email Suporte',
    'email': 'suporte@empresa.com',
    'imapHost': 'imap.empresa.com',
    'imapUser': 'suporte@empresa.com',
    'imapPassword': 'senha-segura-123',
    'smtpHost': 'smtp.empresa.com',
    'smtpUser': 'suporte@empresa.com',
    'smtpPassword': 'senha-segura-123',
})
print(f"Conexao criada: {connection['id']}")
```

## Seguranca

As senhas (`imapPassword` e `smtpPassword`) sao criptografadas antes de serem armazenadas no banco de dados. Elas nunca sao retornadas em endpoints de leitura (GET).

## Fluxo Apos Criacao

```
1. Criar Conexao (POST /api/email-connections)
        |
2. Testar Conexao (POST /api/email-connections/:id/test)
        |
3. Ativar Polling (POST /api/email-connections/:id/connect)
        |
4. Conexao ativa recebendo emails
```

## Notas Importantes

1. **Senhas criptografadas**: As senhas IMAP e SMTP sao criptografadas automaticamente ao salvar.

2. **Polling minimo**: O intervalo de polling (`pollIntervalSec`) tem um valor minimo de 15 segundos.

3. **Conexao inativa**: A conexao e criada como inativa. Use o endpoint `/connect` para ativar o polling.

4. **Teste antes de ativar**: Recomenda-se testar a conexao com `/test` antes de ativar o polling.

## Endpoints Relacionados

- [Listar Conexoes Email](/docs/api/email-connections/listar) - Ver todas as conexoes
- [OAuth Google](/docs/api/email-connections/oauth) - Conectar via Google OAuth2
- [Gerenciar Conexao](/docs/api/email-connections/gerenciar) - Testar, ativar e desativar
