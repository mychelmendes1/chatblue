---
sidebar_position: 3
title: Atualizar Artigo de Conhecimento
description: Endpoint para atualizar artigo da base de conhecimento no ChatBlue
---

# Atualizar Artigo de Conhecimento

Atualiza um artigo existente na base de conhecimento.

## Endpoint

```
PUT /api/knowledge/:id
```

## Descricao

Este endpoint permite atualizar o titulo, conteudo, categoria, tags e status de um artigo da base de conhecimento.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode atualizar artigos
- **SUPER_ADMIN**: Pode atualizar artigos

## Request

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do artigo (CUID) |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `title` | string | Nao | Novo titulo |
| `content` | string | Nao | Novo conteudo |
| `category` | string | Nao | Nova categoria |
| `tags` | array | Nao | Novas tags |
| `isActive` | boolean | Nao | Status de ativacao |

### Exemplo de Request

```json
{
  "title": "Como resetar minha senha - Atualizado",
  "content": "Novo conteudo com instrucoes atualizadas...",
  "tags": ["senha", "login", "acesso", "esqueci"]
}
```

## Response

### Sucesso (200 OK)

```json
{
  "id": "clknowledgexxxxxxxxxxxxxxxxx",
  "title": "Como resetar minha senha - Atualizado",
  "content": "Novo conteudo com instrucoes atualizadas...",
  "category": "Acesso",
  "tags": ["senha", "login", "acesso", "esqueci"],
  "isActive": true,
  "usageCount": 145,
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
  "error": "Knowledge article not found",
  "code": "NOT_FOUND"
}
```

## Exemplos de Codigo

### cURL

```bash
curl -X PUT https://api.chatblue.io/api/knowledge/clknowledgexxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Conteudo atualizado...",
    "tags": ["nova-tag"]
  }'
```

### JavaScript

```javascript
async function updateKnowledgeArticle(articleId, updates) {
  const response = await fetch(`/api/knowledge/${articleId}`, {
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

// Atualizar conteudo
await updateKnowledgeArticle('clknowledgexxx', {
  content: 'Novo conteudo...',
});

// Desativar artigo
await updateKnowledgeArticle('clknowledgexxx', {
  isActive: false,
});
```

### Python

```python
import requests

def update_knowledge_article(access_token, article_id, **updates):
    url = f'https://api.chatblue.io/api/knowledge/{article_id}'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    response = requests.put(url, json=updates, headers=headers)
    return response.json()

# Uso
article = update_knowledge_article(token, 'clknowledgexxx',
    title='Novo Titulo',
    tags=['tag1', 'tag2']
)
```

## Notas Importantes

1. **Atualizacao Parcial**: Apenas campos enviados sao atualizados.
2. **Historico**: Alteracoes sao registradas para auditoria.
3. **IA Sync**: O agente de IA e atualizado automaticamente.

## Endpoints Relacionados

- [Listar Artigos](/docs/api/conhecimento/listar)
- [Criar Artigo](/docs/api/conhecimento/criar)
- [Deletar Artigo](/docs/api/conhecimento/deletar)
