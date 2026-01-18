---
sidebar_position: 1
title: Listar FAQ
description: Endpoint para listar perguntas frequentes no ChatBlue
---

# Listar FAQ

Retorna as perguntas frequentes configuradas.

## Endpoint

```
GET /api/faq
```

## Descricao

Este endpoint retorna as perguntas frequentes (FAQ) configuradas para a empresa. As FAQs sao exibidas no widget de chat para ajudar os clientes a encontrar respostas rapidamente.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem listar FAQs.

## Request

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `search` | string | - | Busca por pergunta ou resposta |
| `category` | string | - | Filtrar por categoria |
| `isActive` | boolean | true | Filtrar por status |
| `page` | number | 1 | Pagina |
| `limit` | number | 20 | Itens por pagina |

## Response

### Sucesso (200 OK)

```json
{
  "faqs": [
    {
      "id": "clfaqxxxxxxxxxxxxxxxxxxxxxxx",
      "question": "Qual o horario de atendimento?",
      "answer": "Nosso atendimento funciona de segunda a sexta, das 8h as 18h. Aos sabados, das 9h as 13h.",
      "category": "Atendimento",
      "order": 1,
      "isActive": true,
      "clickCount": 245,
      "helpfulCount": 180,
      "notHelpfulCount": 12,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-10T15:00:00.000Z"
    },
    {
      "id": "clfaqyyyyyyyyyyyyyyyyyyyyyyy",
      "question": "Como rastrear meu pedido?",
      "answer": "Voce pode rastrear seu pedido acessando 'Meus Pedidos' em sua conta ou usando o codigo de rastreio enviado por email.",
      "category": "Pedidos",
      "order": 2,
      "isActive": true,
      "clickCount": 189,
      "helpfulCount": 165,
      "notHelpfulCount": 8,
      "createdAt": "2024-01-02T10:00:00.000Z",
      "updatedAt": "2024-01-08T12:00:00.000Z"
    },
    {
      "id": "clfaqzzzzzzzzzzzzzzzzzzzzzzz",
      "question": "Quais formas de pagamento aceitas?",
      "answer": "Aceitamos cartao de credito (Visa, Mastercard, Elo), cartao de debito, boleto bancario e PIX.",
      "category": "Pagamento",
      "order": 3,
      "isActive": true,
      "clickCount": 312,
      "helpfulCount": 290,
      "notHelpfulCount": 5,
      "createdAt": "2024-01-03T10:00:00.000Z",
      "updatedAt": "2024-01-05T09:00:00.000Z"
    }
  ],
  "categories": ["Atendimento", "Pedidos", "Pagamento", "Entrega", "Trocas"],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | Identificador unico (CUID) |
| `question` | string | Pergunta |
| `answer` | string | Resposta |
| `category` | string | Categoria da FAQ |
| `order` | number | Ordem de exibicao |
| `isActive` | boolean | Se esta ativa |
| `clickCount` | number | Vezes que foi clicada |
| `helpfulCount` | number | Avaliacoes positivas |
| `notHelpfulCount` | number | Avaliacoes negativas |

## Exemplos de Codigo

### cURL

```bash
# Listar todas FAQs ativas
curl -X GET "https://api.chatblue.io/api/faq" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por categoria
curl -X GET "https://api.chatblue.io/api/faq?category=Pagamento" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Buscar FAQs
curl -X GET "https://api.chatblue.io/api/faq?search=rastrear" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript

```javascript
async function listFAQs(options = {}) {
  const params = new URLSearchParams();
  if (options.search) params.append('search', options.search);
  if (options.category) params.append('category', options.category);
  if (options.isActive !== undefined) params.append('isActive', options.isActive);
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);

  const response = await fetch(`/api/faq?${params}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Listar todas
const { faqs, categories } = await listFAQs();

// Por categoria
const paymentFAQs = await listFAQs({ category: 'Pagamento' });

// Buscar
const results = await listFAQs({ search: 'rastrear' });
```

### Python

```python
import requests

def list_faqs(access_token, **kwargs):
    url = 'https://api.chatblue.io/api/faq'
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.get(url, params=kwargs, headers=headers)

    if response.status_code == 200:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
data = list_faqs(token)

print(f"Total de FAQs: {data['pagination']['total']}")
print(f"Categorias: {', '.join(data['categories'])}")

for faq in data['faqs']:
    print(f"\nP: {faq['question']}")
    print(f"R: {faq['answer'][:50]}...")
    print(f"   Cliques: {faq['clickCount']} | Util: {faq['helpfulCount']}")
```

## FAQs Publicas (Widget)

Para exibir FAQs no widget sem autenticacao:

```
GET /api/public/faq?companySlug=minha-empresa
```

```json
{
  "faqs": [
    {
      "id": "clfaqxxx",
      "question": "Qual o horario de atendimento?",
      "answer": "Nosso atendimento funciona de segunda a sexta...",
      "category": "Atendimento"
    }
  ],
  "categories": ["Atendimento", "Pedidos", "Pagamento"]
}
```

## Notas Importantes

1. **Ordenacao**: FAQs sao retornadas pelo campo `order` em ordem crescente.
2. **Metricas**: `clickCount` e `helpfulCount` ajudam a identificar FAQs mais uteis.
3. **Widget**: Apenas FAQs ativas sao exibidas no widget de chat.

## Endpoints Relacionados

- [Criar FAQ](/docs/api/faq/criar)
- [Atualizar FAQ](/docs/api/faq/atualizar)
- [Deletar FAQ](/docs/api/faq/deletar)
