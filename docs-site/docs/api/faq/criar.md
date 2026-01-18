---
sidebar_position: 2
title: Criar FAQ
description: Endpoint para criar pergunta frequente no ChatBlue
---

# Criar FAQ

Cria uma nova pergunta frequente.

## Endpoint

```
POST /api/faq
```

## Descricao

Este endpoint cria uma nova pergunta frequente (FAQ). As FAQs sao exibidas no widget de chat para ajudar clientes a encontrar respostas sem precisar iniciar uma conversa.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode criar FAQs
- **SUPER_ADMIN**: Pode criar FAQs

## Request

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `question` | string | Sim | Pergunta (max 500) |
| `answer` | string | Sim | Resposta (max 5000) |
| `category` | string | Nao | Categoria |
| `order` | number | Nao | Ordem de exibicao |
| `isActive` | boolean | Nao | Se esta ativa (padrao: true) |

### Exemplo de Request

```json
{
  "question": "Como solicitar reembolso?",
  "answer": "Para solicitar reembolso:\n\n1. Acesse 'Meus Pedidos'\n2. Selecione o pedido desejado\n3. Clique em 'Solicitar Reembolso'\n4. Preencha o motivo\n5. Aguarde a analise em ate 5 dias uteis\n\nO valor sera estornado na mesma forma de pagamento utilizada.",
  "category": "Pedidos",
  "order": 5,
  "isActive": true
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clfaqxxxxxxxxxxxxxxxxxxxxxxx",
  "question": "Como solicitar reembolso?",
  "answer": "Para solicitar reembolso:\n\n1. Acesse 'Meus Pedidos'...",
  "category": "Pedidos",
  "order": 5,
  "isActive": true,
  "clickCount": 0,
  "helpfulCount": 0,
  "notHelpfulCount": 0,
  "createdAt": "2024-01-15T14:30:00.000Z",
  "createdBy": {
    "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Admin"
  }
}
```

## Erros

### 400 Bad Request

```json
{
  "error": "Validation error: question is required",
  "code": "VALIDATION_ERROR"
}
```

### 403 Forbidden

```json
{
  "error": "Access denied. Admin required.",
  "code": "FORBIDDEN"
}
```

### 409 Conflict

```json
{
  "error": "A FAQ with similar question already exists",
  "code": "DUPLICATE_FAQ"
}
```

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/faq \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Como cancelar minha assinatura?",
    "answer": "Para cancelar sua assinatura, acesse Configuracoes > Assinatura > Cancelar.",
    "category": "Assinatura",
    "order": 10
  }'
```

### JavaScript

```javascript
async function createFAQ(faqData) {
  const response = await fetch('/api/faq', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(faqData),
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Criar FAQ simples
const faq = await createFAQ({
  question: 'Voces fazem entrega no mesmo dia?',
  answer: 'Sim! Para pedidos feitos ate 12h, entregamos no mesmo dia na regiao metropolitana.',
  category: 'Entrega',
});

// Criar FAQ com formatacao
const faqDetailed = await createFAQ({
  question: 'Como funciona o programa de pontos?',
  answer: `Nosso programa de pontos funciona assim:

- A cada R$ 1 gasto, voce ganha 1 ponto
- 100 pontos = R$ 5 de desconto
- Pontos expiram em 12 meses
- Resgate na finalizacao da compra

Categorias especiais:
- Ouro: 2x pontos
- Platina: 3x pontos`,
  category: 'Fidelidade',
  order: 1,
});

console.log('FAQ criada:', faq.id);
```

### Python

```python
import requests

def create_faq(access_token, question, answer, category=None, order=None):
    url = 'https://api.chatblue.io/api/faq'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    payload = {
        'question': question,
        'answer': answer
    }
    if category:
        payload['category'] = category
    if order is not None:
        payload['order'] = order

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 201:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
faq = create_faq(
    token,
    question='Qual o prazo de entrega?',
    answer='O prazo de entrega varia de 3 a 7 dias uteis...',
    category='Entrega',
    order=2
)
print(f"FAQ criada: {faq['id']}")
```

## Importar FAQs em Lote

```javascript
async function importFAQs(faqs) {
  const results = [];

  for (const faq of faqs) {
    try {
      const created = await createFAQ(faq);
      results.push({ success: true, id: created.id, question: faq.question });
    } catch (error) {
      results.push({ success: false, question: faq.question, error: error.message });
    }
  }

  return results;
}

// Importar de array
const faqsToImport = [
  { question: 'Pergunta 1?', answer: 'Resposta 1', category: 'Geral' },
  { question: 'Pergunta 2?', answer: 'Resposta 2', category: 'Geral' },
  { question: 'Pergunta 3?', answer: 'Resposta 3', category: 'Suporte' },
];

const results = await importFAQs(faqsToImport);
console.log(`Importadas: ${results.filter(r => r.success).length}/${faqsToImport.length}`);
```

## Boas Praticas

1. **Pergunta Clara**: Formule a pergunta como o cliente perguntaria.
2. **Resposta Completa**: Inclua todas as informacoes necessarias.
3. **Formatacao**: Use listas e paragrafos para facilitar a leitura.
4. **Categorias**: Organize FAQs em categorias logicas.
5. **Ordem**: Coloque as perguntas mais frequentes primeiro.

## Notas Importantes

1. **Limite**: Maximo de 100 FAQs por empresa.
2. **Duplicatas**: O sistema verifica perguntas similares.
3. **Widget**: FAQs ativas aparecem automaticamente no widget.

## Endpoints Relacionados

- [Listar FAQs](/docs/api/faq/listar)
- [Atualizar FAQ](/docs/api/faq/atualizar)
- [Deletar FAQ](/docs/api/faq/deletar)
