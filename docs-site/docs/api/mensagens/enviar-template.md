---
sidebar_position: 6
title: Enviar Template
description: Enviar mensagem usando template do WhatsApp Business
---

# Enviar Mensagem com Template

Envia uma mensagem utilizando um template pre-aprovado do WhatsApp Business.

## Endpoint

```
POST /api/messages/template
```

## Quando Usar Templates

Templates sao **obrigatorios** quando:

- A conexao e do tipo **Meta Cloud API** (oficial)
- A janela de 24 horas expirou (cliente nao enviou mensagem nas ultimas 24h)
- Voce quer iniciar uma conversa proativamente

:::warning Janela de 24 Horas
O WhatsApp Business API oficial (Meta Cloud) so permite mensagens livres dentro de 24 horas apos a ultima mensagem do cliente. Fora dessa janela, apenas templates aprovados podem ser enviados.
:::

## Autenticacao

Requer token JWT no header:

```
Authorization: Bearer {token}
```

## Permissoes

- `AGENT` ou superior

## Corpo da Requisicao

```json
{
  "ticketId": "uuid-do-ticket",
  "templateName": "nome_do_template",
  "languageCode": "pt_BR",
  "components": [
    {
      "type": "body",
      "parameters": [
        {
          "type": "text",
          "text": "Maria"
        },
        {
          "type": "text",
          "text": "12345"
        }
      ]
    }
  ]
}
```

### Parametros

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `ticketId` | string | Sim | ID do ticket para enviar a mensagem |
| `templateName` | string | Sim | Nome do template (como cadastrado no Meta) |
| `languageCode` | string | Sim | Codigo do idioma (ex: pt_BR, en_US) |
| `components` | array | Nao | Parametros para preencher variaveis do template |

### Estrutura de Components

```json
{
  "components": [
    {
      "type": "header",
      "parameters": [
        {
          "type": "image",
          "image": {
            "link": "https://exemplo.com/imagem.jpg"
          }
        }
      ]
    },
    {
      "type": "body",
      "parameters": [
        {
          "type": "text",
          "text": "valor_variavel_1"
        },
        {
          "type": "text",
          "text": "valor_variavel_2"
        }
      ]
    },
    {
      "type": "button",
      "sub_type": "url",
      "index": 0,
      "parameters": [
        {
          "type": "text",
          "text": "codigo123"
        }
      ]
    }
  ]
}
```

## Resposta de Sucesso

**Status:** `200 OK`

```json
{
  "id": "uuid-da-mensagem",
  "ticketId": "uuid-do-ticket",
  "type": "TEMPLATE",
  "content": "Template: boas_vindas",
  "status": "SENT",
  "wamid": "wamid.HBgLNTU...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Erros

| Codigo | Erro | Descricao |
|--------|------|-----------|
| 400 | `Template not found` | Template nao existe ou nao esta aprovado |
| 400 | `Invalid parameters` | Parametros do template invalidos |
| 400 | `Connection is not Meta Cloud` | Conexao nao suporta templates |
| 404 | `Ticket not found` | Ticket nao encontrado |
| 500 | `Failed to send template` | Erro ao enviar para o WhatsApp |

## Exemplos

### cURL

```bash
curl -X POST https://api.chatblue.com/api/messages/template \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "550e8400-e29b-41d4-a716-446655440000",
    "templateName": "boas_vindas",
    "languageCode": "pt_BR",
    "components": [
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "Maria"},
          {"type": "text", "text": "Grupo Blue"}
        ]
      }
    ]
  }'
```

### JavaScript

```javascript
const response = await fetch('/api/messages/template', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ticketId: '550e8400-e29b-41d4-a716-446655440000',
    templateName: 'confirmacao_pedido',
    languageCode: 'pt_BR',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Joao Silva' },
          { type: 'text', text: '#PED-2024-001' },
          { type: 'text', text: '15/01/2024' }
        ]
      }
    ]
  })
});

const message = await response.json();
```

## Templates Comuns

### Boas-vindas

```json
{
  "templateName": "boas_vindas",
  "languageCode": "pt_BR",
  "components": [
    {
      "type": "body",
      "parameters": [
        {"type": "text", "text": "{{nome_cliente}}"}
      ]
    }
  ]
}
```

### Confirmacao de Pedido

```json
{
  "templateName": "confirmacao_pedido",
  "languageCode": "pt_BR",
  "components": [
    {
      "type": "body",
      "parameters": [
        {"type": "text", "text": "{{nome_cliente}}"},
        {"type": "text", "text": "{{numero_pedido}}"},
        {"type": "text", "text": "{{data_entrega}}"}
      ]
    }
  ]
}
```

### Lembrete

```json
{
  "templateName": "lembrete_pagamento",
  "languageCode": "pt_BR",
  "components": [
    {
      "type": "body",
      "parameters": [
        {"type": "text", "text": "{{nome_cliente}}"},
        {"type": "text", "text": "{{valor}}"},
        {"type": "text", "text": "{{data_vencimento}}"}
      ]
    }
  ]
}
```

## Fluxo de Uso

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE TEMPLATES                           │
└─────────────────────────────────────────────────────────────────┘

     Cliente envia mensagem
              │
              ▼
    ┌─────────────────┐
    │ Janela de 24h   │
    │    ABERTA       │────────► Pode enviar mensagem livre
    └─────────────────┘
              │
              │ Apos 24h sem mensagem
              ▼
    ┌─────────────────┐
    │ Janela de 24h   │
    │    FECHADA      │────────► DEVE usar template
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Enviar Template │
    │ (este endpoint) │
    └─────────────────┘
              │
              ▼
    Cliente responde ───────────► Janela reabre por 24h
```

## Observacoes

- Templates devem ser previamente aprovados pela Meta
- Use o endpoint [Listar Templates](/api/conexoes/listar-templates) para ver templates disponiveis
- Verifique a [janela de mensagens](/api/contatos/verificar-janela) antes de decidir entre mensagem livre ou template
- Templates com midia (imagem/video) requerem URLs publicamente acessiveis
