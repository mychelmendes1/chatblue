---
sidebar_position: 4
title: Gerenciar Conexao
description: Endpoints para atualizar, testar, conectar, desconectar e deletar conexoes de email no ChatBlue
---

# Gerenciar Conexao Email

Endpoints para gerenciar conexoes de email existentes: atualizar, testar, ativar polling, desativar polling e deletar.

## Endpoints

```
PUT    /api/email-connections/:id
POST   /api/email-connections/:id/test
POST   /api/email-connections/:id/connect
POST   /api/email-connections/:id/disconnect
DELETE /api/email-connections/:id
```

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Acesso total
- **SUPER_ADMIN**: Acesso total

:::warning Acesso Restrito
Todos os endpoints desta pagina requerem role `ADMIN` ou `SUPER_ADMIN`.
:::

---

## Atualizar Conexao

### Endpoint

```
PUT /api/email-connections/:id
```

### Descricao

Atualiza os dados de uma conexao de email. Todos os campos sao opcionais (partial update). Senhas sao criptografadas automaticamente ao atualizar.

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da conexao de email |

### Body Parameters

Todos os campos sao opcionais:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `name` | string | Nome identificador da conexao |
| `email` | string | Endereco de email |
| `imapHost` | string | Host do servidor IMAP |
| `imapPort` | number | Porta do servidor IMAP |
| `imapUser` | string | Usuario IMAP |
| `imapPassword` | string | Senha IMAP (sera criptografada) |
| `imapTls` | boolean | Usar TLS na conexao IMAP |
| `smtpHost` | string | Host do servidor SMTP |
| `smtpPort` | number | Porta do servidor SMTP |
| `smtpUser` | string | Usuario SMTP |
| `smtpPassword` | string | Senha SMTP (sera criptografada) |
| `smtpTls` | boolean | Usar TLS na conexao SMTP |
| `fromName` | string | Nome exibido como remetente |
| `pollIntervalSec` | number | Intervalo de polling em segundos (minimo: 15) |

### Exemplo de Request

```bash
curl -X PUT https://api.chatblue.io/api/email-connections/clemailxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "fromName": "Novo Nome Remetente",
    "pollIntervalSec": 30
  }'
```

### Response - Sucesso (200 OK)

```json
{
  "id": "clemailxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Email Suporte",
  "email": "suporte@empresa.com",
  "authType": "PLAIN",
  "status": "CONNECTED",
  "fromName": "Novo Nome Remetente",
  "pollIntervalSec": 30,
  "updatedAt": "2024-01-15T15:00:00.000Z"
}
```

---

## Testar Conexao

### Endpoint

```
POST /api/email-connections/:id/test
```

### Descricao

Testa a conectividade IMAP e SMTP da conexao. Verifica se as credenciais estao corretas e os servidores acessiveis. Nenhum body e necessario.

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da conexao de email |

### Exemplo de Request

```bash
curl -X POST https://api.chatblue.io/api/email-connections/clemailxxx/test \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response - Sucesso (200 OK)

Ambos IMAP e SMTP funcionando:

```json
{
  "imap": true,
  "smtp": true,
  "errors": []
}
```

IMAP ok, SMTP com problema:

```json
{
  "imap": true,
  "smtp": false,
  "errors": ["SMTP: Falha na autenticacao"]
}
```

Ambos com falha:

```json
{
  "imap": false,
  "smtp": false,
  "errors": ["IMAP: Falha ao conectar", "SMTP: Timeout ao conectar"]
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `imap` | boolean | Se a conexao IMAP foi bem-sucedida |
| `smtp` | boolean | Se a conexao SMTP foi bem-sucedida |
| `errors` | array | Lista de erros encontrados durante o teste |

---

## Ativar Polling (Connect)

### Endpoint

```
POST /api/email-connections/:id/connect
```

### Descricao

Ativa o polling da conexao de email. O sistema comecara a verificar a caixa de entrada periodicamente conforme o `pollIntervalSec` configurado. Ao ativar, um poll inicial e executado imediatamente.

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da conexao de email |

### Exemplo de Request

```bash
curl -X POST https://api.chatblue.io/api/email-connections/clemailxxx/connect \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response - Sucesso (200 OK)

```json
{
  "id": "clemailxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Email Suporte",
  "email": "suporte@empresa.com",
  "status": "CONNECTED",
  "isActive": true,
  "lastPollAt": "2024-01-15T15:00:00.000Z",
  "lastError": null,
  "updatedAt": "2024-01-15T15:00:00.000Z"
}
```

### Comportamento

1. Define `isActive: true` e `status: CONNECTING`
2. Executa um poll inicial imediatamente
3. Se o poll inicial falhar, o erro e registrado em `lastError` mas a conexao permanece ativa
4. Retorna o estado atualizado da conexao

---

## Desativar Polling (Disconnect)

### Endpoint

```
POST /api/email-connections/:id/disconnect
```

### Descricao

Desativa o polling da conexao de email. O sistema para de verificar a caixa de entrada. Emails ja recebidos nao sao afetados.

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da conexao de email |

### Exemplo de Request

```bash
curl -X POST https://api.chatblue.io/api/email-connections/clemailxxx/disconnect \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response - Sucesso (200 OK)

```json
{
  "id": "clemailxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Email Suporte",
  "email": "suporte@empresa.com",
  "status": "DISCONNECTED",
  "isActive": false,
  "updatedAt": "2024-01-15T15:05:00.000Z"
}
```

---

## Deletar Conexao

### Endpoint

```
DELETE /api/email-connections/:id
```

### Descricao

Remove permanentemente uma conexao de email. Esta acao e irreversivel.

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da conexao de email |

### Exemplo de Request

```bash
curl -X DELETE https://api.chatblue.io/api/email-connections/clemailxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response - Sucesso (200 OK)

```json
{
  "success": true
}
```

---

## Erros Comuns

### 404 Not Found

```json
{
  "error": "Email connection not found",
  "code": "NOT_FOUND"
}
```

Ocorre quando o ID nao existe ou a conexao pertence a outra empresa.

### 400 Bad Request - Validacao

```json
{
  "error": "Validation error: pollIntervalSec: Number must be greater than or equal to 15",
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

### JavaScript - Fluxo Completo de Gerenciamento

```javascript
const API_URL = 'https://api.chatblue.io/api/email-connections';
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json',
};

// Atualizar conexao
async function updateEmailConnection(id, data) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Testar conexao
async function testEmailConnection(id) {
  const response = await fetch(`${API_URL}/${id}/test`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Ativar polling
async function connectEmailConnection(id) {
  const response = await fetch(`${API_URL}/${id}/connect`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Desativar polling
async function disconnectEmailConnection(id) {
  const response = await fetch(`${API_URL}/${id}/disconnect`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Deletar conexao
async function deleteEmailConnection(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Fluxo: testar e ativar
const connectionId = 'clemailxxxxxxxxxxxxxxxxxxxxxx';

const testResult = await testEmailConnection(connectionId);
if (testResult.imap && testResult.smtp) {
  console.log('Teste OK, ativando polling...');
  await connectEmailConnection(connectionId);
  console.log('Conexao ativada!');
} else {
  console.error('Erros no teste:', testResult.errors);
}
```

### Python

```python
import requests

class EmailConnectionManager:
    def __init__(self, access_token, base_url='https://api.chatblue.io/api'):
        self.base_url = f'{base_url}/email-connections'
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

    def update(self, conn_id, data):
        response = requests.put(f'{self.base_url}/{conn_id}', json=data, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def test(self, conn_id):
        response = requests.post(f'{self.base_url}/{conn_id}/test', headers=self.headers)
        response.raise_for_status()
        return response.json()

    def connect(self, conn_id):
        response = requests.post(f'{self.base_url}/{conn_id}/connect', headers=self.headers)
        response.raise_for_status()
        return response.json()

    def disconnect(self, conn_id):
        response = requests.post(f'{self.base_url}/{conn_id}/disconnect', headers=self.headers)
        response.raise_for_status()
        return response.json()

    def delete(self, conn_id):
        response = requests.delete(f'{self.base_url}/{conn_id}', headers=self.headers)
        response.raise_for_status()
        return response.json()

manager = EmailConnectionManager(token)

result = manager.test('clemailxxx')
if result['imap'] and result['smtp']:
    manager.connect('clemailxxx')
    print('Conexao ativada!')
else:
    print(f"Erros: {result['errors']}")
```

## Notas Importantes

1. **Partial Update**: O PUT aceita atualizacao parcial. Envie apenas os campos que deseja alterar.

2. **Criptografia de senhas**: Ao atualizar `imapPassword` ou `smtpPassword`, a nova senha e criptografada antes de salvar.

3. **Teste antes de ativar**: Sempre execute `/test` antes de `/connect` para garantir que as credenciais estao corretas.

4. **Poll inicial**: Ao ativar via `/connect`, um poll e executado imediatamente. Se falhar, a conexao ainda fica ativa e tentara novamente no proximo ciclo.

5. **Delecao permanente**: A delecao e irreversivel. Tickets e mensagens associados a conexao nao sao deletados.

6. **Isolamento multi-tenant**: Todas as operacoes verificam se a conexao pertence a empresa do usuario autenticado.

## Endpoints Relacionados

- [Listar Conexoes Email](/docs/api/email-connections/listar) - Ver todas as conexoes
- [Criar Conexao Email](/docs/api/email-connections/criar) - Criar nova conexao PLAIN
- [OAuth Google](/docs/api/email-connections/oauth) - Conectar via Google OAuth2
