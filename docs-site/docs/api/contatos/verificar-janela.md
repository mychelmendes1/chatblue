---
sidebar_position: 4
title: Verificar Janela de Mensagem
description: Verificar status da janela de 24 horas para envio de mensagens
---

# Verificar Janela de Mensagem

Verifica se um contato esta dentro da janela de 24 horas para envio de mensagens (requisito da Meta Cloud API).

## Conceito: Janela de 24 Horas

O WhatsApp Business API possui uma regra importante:

- **Dentro da janela (24h)**: Voce pode enviar mensagens livres (texto, midia, etc.)
- **Fora da janela**: Apenas templates aprovados podem ser enviados

A janela de 24 horas comeca quando o cliente envia uma mensagem e expira apos 24 horas sem interacao.

```
Cliente envia mensagem
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    JANELA ABERTA (24h)                       │
│  ✅ Mensagens livres    ✅ Templates    ✅ Midia            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼ (24h sem resposta do cliente)
┌─────────────────────────────────────────────────────────────┐
│                    JANELA FECHADA                            │
│  ❌ Mensagens livres    ✅ Templates apenas                 │
└─────────────────────────────────────────────────────────────┘
```

## Endpoint

```
GET /api/contacts/:id/messaging-window
```

## Autenticacao

Requer token JWT no header:

```
Authorization: Bearer {token}
```

## Permissoes

- `AGENT` ou superior

## Parametros de URL

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do contato |

## Query Parameters

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `connectionId` | string | Sim | ID da conexao WhatsApp |

## Resposta de Sucesso

**Status:** `200 OK`

### Janela Aberta

```json
{
  "isOpen": true,
  "expiresAt": "2024-01-15T16:30:00.000Z",
  "hoursRemaining": 18.5,
  "requiresTemplate": false,
  "lastMessageAt": "2024-01-14T16:30:00.000Z"
}
```

### Janela Fechada

```json
{
  "isOpen": false,
  "expiresAt": null,
  "hoursRemaining": 0,
  "requiresTemplate": true,
  "lastMessageAt": "2024-01-10T10:00:00.000Z"
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `isOpen` | boolean | Se a janela esta aberta |
| `expiresAt` | string/null | Data/hora de expiracao (ISO 8601) |
| `hoursRemaining` | number | Horas restantes na janela |
| `requiresTemplate` | boolean | Se requer template para enviar |
| `lastMessageAt` | string/null | Ultima mensagem do cliente |

## Erros

| Codigo | Erro | Descricao |
|--------|------|-----------|
| 400 | `Connection ID required` | connectionId nao informado |
| 400 | `Connection is not Meta Cloud` | Conexao nao e do tipo Meta Cloud |
| 404 | `Contact not found` | Contato nao encontrado |
| 404 | `Connection not found` | Conexao nao encontrada |

## Exemplos

### cURL

```bash
curl -X GET "https://api.chatblue.com/api/contacts/456/messaging-window?connectionId=123" \
  -H "Authorization: Bearer {token}"
```

### JavaScript

```javascript
const response = await fetch(
  `/api/contacts/${contactId}/messaging-window?connectionId=${connectionId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const { isOpen, requiresTemplate, hoursRemaining } = await response.json();

if (isOpen) {
  console.log(`Janela aberta por mais ${hoursRemaining.toFixed(1)} horas`);
  // Pode enviar mensagem livre
} else {
  console.log('Janela fechada - use template');
  // Precisa enviar template
}
```

### Uso Pratico: Decidir Tipo de Mensagem

```javascript
async function enviarMensagem(contactId, connectionId, texto) {
  // Verificar janela primeiro
  const windowResponse = await fetch(
    `/api/contacts/${contactId}/messaging-window?connectionId=${connectionId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  const { isOpen, requiresTemplate } = await windowResponse.json();

  if (isOpen) {
    // Enviar mensagem livre
    await fetch('/api/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contactId,
        body: texto,
        type: 'text',
      }),
    });
  } else {
    // Janela fechada - precisa usar template
    // Usar template de reengajamento
    await fetch('/api/messages/template', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contactId,
        connectionId,
        templateName: 'reengajamento',
        languageCode: 'pt_BR',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'nome do cliente' },
            ],
          },
        ],
      }),
    });
  }
}
```

## Quando a Janela Reabre

A janela reabre automaticamente quando:

1. O cliente envia qualquer mensagem
2. O cliente responde a um template
3. O cliente interage com botoes/listas

```
┌─────────────────────────────────────────────────────────────┐
│  CICLO DA JANELA DE MENSAGEM                                 │
│                                                              │
│  1. Janela fechada (requiresTemplate: true)                 │
│              │                                               │
│              ▼                                               │
│  2. Empresa envia TEMPLATE                                   │
│              │                                               │
│              ▼                                               │
│  3. Cliente RESPONDE                                         │
│              │                                               │
│              ▼                                               │
│  4. Janela ABRE (isOpen: true, hoursRemaining: 24)          │
│              │                                               │
│              ▼                                               │
│  5. Empresa pode enviar mensagens livres                    │
│              │                                               │
│              ▼ (24h sem resposta)                            │
│  6. Janela FECHA novamente                                   │
└─────────────────────────────────────────────────────────────┘
```

## Observacoes

- Este endpoint so e relevante para conexoes **Meta Cloud API**
- Conexoes **Baileys** (nao-oficial) nao possuem restricao de janela
- Verifique sempre antes de enviar mensagens para evitar erros
- Templates podem ser enviados independente do status da janela
- A janela se renova a cada interacao do cliente

## Veja Tambem

- [Enviar Template](/api/mensagens/enviar-template) - Enviar mensagem template
- [Listar Templates](/api/conexoes/listar-templates) - Listar templates disponiveis
- [Enviar Mensagem](/api/mensagens/enviar) - Enviar mensagem livre
