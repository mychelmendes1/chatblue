---
sidebar_position: 3
title: Atualizar FAQ
description: Endpoint para atualizar pergunta frequente no ChatBlue
---

# Atualizar FAQ

Atualiza uma pergunta frequente existente.

## Endpoint

```
PUT /api/faq/:id
```

## Descricao

Este endpoint permite atualizar a pergunta, resposta, categoria, ordem e status de uma FAQ existente.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode atualizar FAQs
- **SUPER_ADMIN**: Pode atualizar FAQs

## Request

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da FAQ (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `question` | string | Nao | Nova pergunta |
| `answer` | string | Nao | Nova resposta |
| `category` | string | Nao | Nova categoria |
| `order` | number | Nao | Nova ordem |
| `isActive` | boolean | Nao | Novo status |

### Exemplo de Request

```json
{
  "answer": "Resposta atualizada com novas informacoes...",
  "category": "Nova Categoria"
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clfaqxxxxxxxxxxxxxxxxxxxxxxx",
  "question": "Como solicitar reembolso?",
  "answer": "Resposta atualizada com novas informacoes...",
  "category": "Nova Categoria",
  "order": 5,
  "isActive": true,
  "clickCount": 45,
  "helpfulCount": 38,
  "notHelpfulCount": 3,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-15T16:00:00.000Z",
  "updatedBy": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Admin"
  }
}
```

## Erros

### 404 Not Found

```json
{
  "error": "FAQ not found",
  "code": "NOT_FOUND"
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
curl -X PUT https://api.chatblue.io/api/faq/clfaqxxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "Nova resposta atualizada",
    "order": 1
  }'
```

### JavaScript

```javascript
async function updateFAQ(faqId, updates) {
  const response = await fetch(`/api/faq/${faqId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Atualizar resposta
await updateFAQ('clfaqxxx', {
  answer: 'Nova resposta com informacoes atualizadas...',
});

// Desativar FAQ
await updateFAQ('clfaqxxx', {
  isActive: false,
});

// Reordenar
await updateFAQ('clfaqxxx', {
  order: 1,
});

// Mudar categoria
await updateFAQ('clfaqxxx', {
  category: 'Suporte Tecnico',
});
```

### Python

```python
import requests

def update_faq(access_token, faq_id, **updates):
    url = f'https://api.chatblue.io/api/faq/{faq_id}'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.put(url, json=updates, headers=headers)

    if response.status_code == 200:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
faq = update_faq(token, 'clfaqxxx',
    answer='Nova resposta',
    category='Suporte'
)
print(f"FAQ atualizada em: {faq['updatedAt']}")
```

## Reordenar FAQs

```javascript
async function reorderFAQs(faqOrders) {
  // faqOrders = [{ id: 'clfaq1', order: 1 }, { id: 'clfaq2', order: 2 }, ...]

  const promises = faqOrders.map(({ id, order }) =>
    updateFAQ(id, { order })
  );

  await Promise.all(promises);
  console.log('FAQs reordenadas com sucesso');
}

// Exemplo: mover FAQ para o topo
async function moveFAQToTop(faqId) {
  // Buscar todas FAQs
  const { faqs } = await listFAQs();

  // Encontrar FAQ atual
  const currentFaq = faqs.find(f => f.id === faqId);
  if (!currentFaq) throw new Error('FAQ nao encontrada');

  // Reordenar: a FAQ selecionada vai para order 1, outras incrementam
  const updates = faqs.map(faq => ({
    id: faq.id,
    order: faq.id === faqId ? 1 : (faq.order >= 1 ? faq.order + 1 : faq.order)
  }));

  await reorderFAQs(updates);
}
```

## Ativar/Desativar em Lote

```javascript
async function toggleFAQsStatus(faqIds, isActive) {
  const results = await Promise.allSettled(
    faqIds.map(id => updateFAQ(id, { isActive }))
  );

  const success = results.filter(r => r.status === 'fulfilled').length;
  console.log(`${success}/${faqIds.length} FAQs atualizadas`);

  return results;
}

// Desativar varias FAQs
await toggleFAQsStatus(['clfaq1', 'clfaq2', 'clfaq3'], false);
```

## Notas Importantes

1. **Atualizacao Parcial**: Apenas campos enviados sao atualizados.
2. **Metricas**: `clickCount`, `helpfulCount` e `notHelpfulCount` nao sao editaveis.
3. **Historico**: Alteracoes sao registradas com usuario e data.
4. **Widget**: Mudancas refletem imediatamente no widget.

## Endpoints Relacionados

- [Listar FAQs](/docs/api/faq/listar)
- [Criar FAQ](/docs/api/faq/criar)
- [Deletar FAQ](/docs/api/faq/deletar)
