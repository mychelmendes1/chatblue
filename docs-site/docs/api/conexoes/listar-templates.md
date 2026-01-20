---
sidebar_position: 7
title: Listar Templates
description: Listar templates aprovados do WhatsApp Business
---

# Listar Templates

Retorna a lista de templates aprovados para uma conexao Meta Cloud API.

## Endpoint

```
GET /api/connections/:id/templates
```

## Autenticacao

Requer token JWT no header:

```
Authorization: Bearer {token}
```

## Permissoes

- `ADMIN` ou superior

## Parametros de URL

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da conexao WhatsApp |

## Resposta de Sucesso

**Status:** `200 OK`

```json
{
  "templates": [
    {
      "name": "boas_vindas",
      "language": "pt_BR",
      "category": "MARKETING",
      "status": "APPROVED",
      "components": [
        {
          "type": "HEADER",
          "format": "TEXT",
          "text": "Bem-vindo!"
        },
        {
          "type": "BODY",
          "text": "Ola {{1}}! Seja bem-vindo a {{2}}. Estamos felizes em te-lo conosco!"
        },
        {
          "type": "FOOTER",
          "text": "Responda para falar com um atendente"
        }
      ]
    },
    {
      "name": "confirmacao_pedido",
      "language": "pt_BR",
      "category": "UTILITY",
      "status": "APPROVED",
      "components": [
        {
          "type": "BODY",
          "text": "Ola {{1}}, seu pedido {{2}} foi confirmado! Previsao de entrega: {{3}}."
        },
        {
          "type": "BUTTONS",
          "buttons": [
            {
              "type": "URL",
              "text": "Rastrear Pedido",
              "url": "https://exemplo.com/rastreio/{{1}}"
            }
          ]
        }
      ]
    }
  ]
}
```

### Campos do Template

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `name` | string | Nome unico do template |
| `language` | string | Codigo do idioma |
| `category` | string | Categoria (MARKETING, UTILITY, AUTHENTICATION) |
| `status` | string | Status de aprovacao |
| `components` | array | Componentes do template |

### Categorias

| Categoria | Descricao |
|-----------|-----------|
| `MARKETING` | Promocoes e marketing |
| `UTILITY` | Notificacoes utilitarias |
| `AUTHENTICATION` | Codigos de verificacao |

### Status do Template

| Status | Descricao |
|--------|-----------|
| `APPROVED` | Aprovado e pronto para uso |
| `PENDING` | Aguardando aprovacao |
| `REJECTED` | Rejeitado pela Meta |

### Tipos de Componentes

| Tipo | Descricao |
|------|-----------|
| `HEADER` | Cabecalho (texto, imagem, video ou documento) |
| `BODY` | Corpo principal da mensagem |
| `FOOTER` | Rodape |
| `BUTTONS` | Botoes de acao |

## Erros

| Codigo | Erro | Descricao |
|--------|------|-----------|
| 400 | `Connection is not Meta Cloud` | Conexao nao e do tipo Meta Cloud |
| 404 | `Connection not found` | Conexao nao encontrada |
| 500 | `Failed to fetch templates` | Erro ao buscar templates na Meta |

## Exemplos

### cURL

```bash
curl -X GET https://api.chatblue.com/api/connections/123/templates \
  -H "Authorization: Bearer {token}"
```

### JavaScript

```javascript
const response = await fetch(`/api/connections/${connectionId}/templates`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const { templates } = await response.json();

// Filtrar apenas aprovados
const approved = templates.filter(t => t.status === 'APPROVED');

// Encontrar template especifico
const boasVindas = templates.find(t => t.name === 'boas_vindas');
```

## Usando Templates

Apos listar os templates disponiveis, use o endpoint [Enviar Template](/api/mensagens/enviar-template) para enviar uma mensagem.

### Identificando Variaveis

As variaveis nos templates sao representadas por `{{1}}`, `{{2}}`, etc:

```
"Ola {{1}}! Seu pedido {{2}} esta a caminho."
     ↑              ↑
  variavel 1    variavel 2
```

Ao enviar, preencha na ordem:
```json
{
  "components": [{
    "type": "body",
    "parameters": [
      {"type": "text", "text": "Maria"},     // {{1}}
      {"type": "text", "text": "#PED-001"}   // {{2}}
    ]
  }]
}
```

## Observacoes

- Apenas conexoes **Meta Cloud API** possuem templates
- Conexoes **Baileys** nao suportam templates oficiais
- Templates devem ser criados e aprovados no [Meta Business Suite](https://business.facebook.com)
- O processo de aprovacao pode levar de minutos a dias
- Templates rejeitados precisam ser corrigidos e reenviados
