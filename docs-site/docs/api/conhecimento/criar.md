---
sidebar_position: 2
title: Criar Artigo de Conhecimento
description: Endpoint para criar artigo na base de conhecimento no ChatBlue
---

# Criar Artigo de Conhecimento

Cria um novo artigo na base de conhecimento.

## Endpoint

```
POST /api/knowledge
```

## Descricao

Este endpoint cria um novo artigo na base de conhecimento. Os artigos sao utilizados pelo agente de IA para fornecer respostas precisas aos clientes.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode criar artigos
- **SUPER_ADMIN**: Pode criar artigos

## Request

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `title` | string | Sim | Titulo do artigo (max 200) |
| `content` | string | Sim | Conteudo do artigo |
| `category` | string | Nao | Categoria |
| `tags` | array | Nao | Tags para busca |
| `isActive` | boolean | Nao | Se esta ativo (padrao: true) |

### Exemplo de Request

```json
{
  "title": "Como alterar meus dados cadastrais",
  "content": "Para alterar seus dados cadastrais:\n\n1. Acesse sua conta\n2. Va em Configuracoes > Meus Dados\n3. Altere as informacoes desejadas\n4. Clique em Salvar\n\nAlguns dados como CPF nao podem ser alterados. Entre em contato conosco para esses casos.",
  "category": "Conta",
  "tags": ["cadastro", "dados", "perfil", "alteracao"],
  "isActive": true
}
```

## Response

### Sucesso (201 Created)

```json
{
  "id": "clknowledgexxxxxxxxxxxxxxxxx",
  "title": "Como alterar meus dados cadastrais",
  "content": "Para alterar seus dados cadastrais...",
  "category": "Conta",
  "tags": ["cadastro", "dados", "perfil", "alteracao"],
  "isActive": true,
  "usageCount": 0,
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
  "error": "Validation error: title is required",
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

## Exemplos de Codigo

### cURL

```bash
curl -X POST https://api.chatblue.io/api/knowledge \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Como resetar senha",
    "content": "Instrucoes para reset de senha...",
    "category": "Acesso",
    "tags": ["senha", "login"]
  }'
```

### JavaScript

```javascript
async function createKnowledgeArticle(article) {
  const response = await fetch('/api/knowledge', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(article),
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

const article = await createKnowledgeArticle({
  title: 'Formas de Pagamento',
  content: 'Aceitamos cartao de credito, boleto e PIX...',
  category: 'Pagamento',
  tags: ['pagamento', 'cartao', 'boleto', 'pix'],
});
```

### Python

```python
import requests

def create_knowledge_article(access_token, title, content, category=None, tags=None):
    url = 'https://api.chatblue.io/api/knowledge'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    payload = {'title': title, 'content': content}
    if category:
        payload['category'] = category
    if tags:
        payload['tags'] = tags

    response = requests.post(url, json=payload, headers=headers)
    return response.json()
```

## Boas Praticas

1. **Titulo Claro**: Use titulos que reflitam a pergunta do cliente.
2. **Conteudo Estruturado**: Use listas e passos numerados.
3. **Tags Relevantes**: Adicione sinonimos e termos relacionados.
4. **Atualizacao**: Mantenha os artigos atualizados.

## Endpoints Relacionados

- [Listar Artigos](/docs/api/conhecimento/listar)
- [Atualizar Artigo](/docs/api/conhecimento/atualizar)
- [Deletar Artigo](/docs/api/conhecimento/deletar)
