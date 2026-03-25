---
sidebar_position: 1
title: Blue Assistant API
description: Endpoints da API do Blue, assistente contextual integrado ao ChatBlue
---

# Blue Assistant API

API do Blue, assistente de IA contextual que fornece dicas e suporte baseado na pagina e contexto atual do usuario dentro do ChatBlue.

## Autenticacao

Todos os endpoints requerem autenticacao via JWT e tenant.

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Pre-requisitos

Para utilizar a API do Blue, a empresa precisa ter:

- `blueEnabled` ativo nas configuracoes da empresa
- `aiEnabled` ativo com `aiApiKey` e `aiProvider` configurados

Caso contrario, os endpoints retornam `403 Forbidden`.

---

## Endpoints

### Obter dica contextual

```
POST /api/blue/context-tip
```

Retorna uma dica contextual baseada na pagina e contexto atual do usuario. O Blue analisa onde o usuario esta e oferece sugestoes proativas.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `context` | object | Nao | Objeto de contexto da pagina atual |
| `context.route` | string | Sim* | Rota atual do usuario |
| `context.routeParams` | object | Nao | Parametros da rota |
| `context.searchParams` | object | Nao | Parametros de busca da URL |
| `context.ticketId` | string | Nao | ID do ticket sendo visualizado |
| `context.contactId` | string | Nao | ID do contato sendo visualizado |
| `context.departmentId` | string | Nao | ID do departamento atual |
| `context.metadata` | object | Nao | Metadados adicionais |

*Obrigatorio quando `context` e fornecido.

**Response (200)**

```json
{
  "tip": "Voce pode usar o atalho @ia seguido da sua pergunta para obter sugestoes de resposta automaticas para este cliente."
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados de requisicao invalidos |
| 403 | Blue desabilitado ou IA nao configurada |

**Exemplo cURL**

```bash
curl -X POST "https://api.chatblue.io/api/blue/context-tip" \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "route": "/tickets/123",
      "ticketId": "clticketxxxxxxxxxxxxx"
    }
  }'
```

---

### Chat com Blue

```
POST /api/blue/chat
```

Envia uma mensagem para o Blue e recebe uma resposta contextual. Suporta historico de conversa para manter contexto entre mensagens.

**Request Body**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `message` | string | Sim | Mensagem do usuario (min 1 caractere) |
| `context` | object | Nao | Objeto de contexto (mesma estrutura do context-tip) |
| `history` | array | Nao | Historico de mensagens anteriores |
| `history[].role` | string | Sim* | Role da mensagem: `user` ou `assistant` |
| `history[].content` | string | Sim* | Conteudo da mensagem |

*Obrigatorio quando `history` e fornecido.

**Response (200)**

```json
{
  "response": "Para transferir um ticket, clique no botao de transferencia no canto superior direito da conversa e selecione o departamento ou atendente desejado."
}
```

**Erros**

| Codigo | Descricao |
|--------|-----------|
| 400 | Mensagem obrigatoria ou dados invalidos |
| 403 | Blue desabilitado ou IA nao configurada |

**Exemplo cURL**

```bash
curl -X POST "https://api.chatblue.io/api/blue/chat" \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Como transferir um ticket para outro departamento?",
    "context": {
      "route": "/tickets"
    },
    "history": [
      {
        "role": "user",
        "content": "Oi Blue, preciso de ajuda"
      },
      {
        "role": "assistant",
        "content": "Ola! Como posso ajudar?"
      }
    ]
  }'
```

---

## Erros Comuns

| Codigo | Descricao |
|--------|-----------|
| 400 | Dados de requisicao invalidos (ZodError) |
| 401 | Token de autenticacao invalido ou expirado |
| 403 | Blue desabilitado ou IA nao configurada para a empresa |
| 500 | Erro interno do servidor |

## Notas Importantes

1. **Interacoes salvas**: Todas as interacoes com o Blue (tips e chats) sao salvas para fins de analytics. Falhas no salvamento nao afetam a resposta ao usuario.

2. **Contexto**: Fornecer o contexto correto (rota, ticketId, etc.) melhora significativamente a qualidade das respostas e dicas.

3. **Historico**: O historico de mensagens permite conversas multi-turno com o Blue, mantendo o contexto da conversa.

4. **Provedores**: O Blue utiliza o provedor de IA configurado nas settings da empresa (OpenAI ou Anthropic).
