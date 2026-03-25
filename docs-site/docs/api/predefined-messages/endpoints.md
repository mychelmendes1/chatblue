---
sidebar_position: 1
title: Mensagens Pre-definidas API
description: Endpoints para gerenciamento de mensagens pre-definidas (atalhos) no ChatBlue
---

# Mensagens Pre-definidas API

API para gerenciamento de mensagens pre-definidas (atalhos) que podem ser utilizadas durante o atendimento via chat. Os atendentes digitam `/{atalho}` para inserir rapidamente mensagens padronizadas.

## Autenticacao

Todos os endpoints requerem autenticacao via JWT e tenant.

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

| Operacao | Permissao |
|----------|-----------|
| Listar | Qualquer usuario autenticado |
| Criar | Apenas ADMIN |
| Atualizar | Apenas ADMIN |
| Deletar | Apenas ADMIN |

---

## Endpoints

### Listar mensagens pre-definidas

```
GET /api/predefined-messages
```

Retorna todas as mensagens pre-definidas da empresa, ordenadas por atalho em ordem alfabetica. Utilizado pelo autocomplete no chat.

**Response (200)**

```json
[
  {
    "id": "clpm01xxxxxxxxxxxxx",
    "companyId": "clcompxxxxxxxxxxxxx",
    "shortcut": "boas-vindas",
    "name": "Mensagem de boas-vindas",
    "content": "Ola! Seja bem-vindo ao nosso atendimento. Como posso ajudar?",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  {
    "id": "clpm02xxxxxxxxxxxxx",
    "companyId": "clcompxxxxxxxxxxxxx",
    "shortcut": "encerramento",
    "name": "Encerramento padrao",
    "content": "Obrigado pelo contato! Caso precise de mais alguma coisa, estamos a disposicao.",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

---

### Criar mensagem pre-definida

```
POST /api/predefined-messages
```

Cria uma nova mensagem pre-definida. Requer permissao de administrador.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `shortcut` | string | Sim | Atalho unico (1-50 caracteres, apenas letras, numeros, `_` e `-`) |
| `name` | string | Nao | Nome descritivo (max 100 caracteres) |
| `content` | string | Sim | Conteudo da mensagem |

**Response (201)**

```json
{
  "id": "clpm03xxxxxxxxxxxxx",
  "companyId": "clcompxxxxxxxxxxxxx",
  "shortcut": "aguarde",
  "name": "Solicitar aguardo",
  "content": "Por favor, aguarde um momento enquanto verifico as informacoes.",
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos ou atalho ja existe |
| 403 | Permissao insuficiente (requer ADMIN) |

**Exemplo cURL**

```bash
curl -X POST "https://api.chatblue.io/api/predefined-messages" \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "shortcut": "aguarde",
    "name": "Solicitar aguardo",
    "content": "Por favor, aguarde um momento enquanto verifico as informacoes."
  }'
```

---

### Atualizar mensagem pre-definida

```
PUT /api/predefined-messages/:id
```

Atualiza uma mensagem pre-definida existente. Requer permissao de administrador.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da mensagem pre-definida |

**Request Body**

Todos os campos sao opcionais (atualizacao parcial).

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `shortcut` | string | Nao | Novo atalho |
| `name` | string | Nao | Novo nome |
| `content` | string | Nao | Novo conteudo |

**Response (200)**

Retorna o objeto atualizado.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados invalidos ou novo atalho ja existe |
| 403 | Permissao insuficiente (requer ADMIN) |
| 404 | Mensagem pre-definida nao encontrada |

---

### Deletar mensagem pre-definida

```
DELETE /api/predefined-messages/:id
```

Remove uma mensagem pre-definida. Requer permissao de administrador.

**Path Parameters**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da mensagem pre-definida |

**Response (204 No Content)**

Sem corpo de resposta.

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 403 | Permissao insuficiente (requer ADMIN) |
| 404 | Mensagem pre-definida nao encontrada |

---

## Erros Comuns

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados de requisicao invalidos ou atalho duplicado |
| 401 | Token de autenticacao invalido ou expirado |
| 403 | Permissao insuficiente |
| 404 | Recurso nao encontrado |

## Validacao de Atalhos

- Minimo 1 caractere, maximo 50
- Apenas letras (a-z, A-Z), numeros (0-9), underline (`_`) e hifen (`-`)
- Atalhos sao normalizados para minusculo e sem espacos
- Atalhos devem ser unicos por empresa

## Notas Importantes

1. **Uso no chat**: Atendentes digitam `/{atalho}` no campo de mensagem para acionar o autocomplete.

2. **Unicidade**: Dois atalhos com o mesmo nome nao podem coexistir na mesma empresa.

3. **Permissoes**: Apenas administradores podem criar, editar e remover mensagens. Todos os usuarios autenticados podem listar para uso no autocomplete.
