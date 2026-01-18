---
sidebar_position: 4
title: Deletar Artigo de Conhecimento
description: Endpoint para deletar artigo da base de conhecimento no ChatBlue
---

# Deletar Artigo de Conhecimento

Deleta um artigo da base de conhecimento.

## Endpoint

```
DELETE /api/knowledge/:id
```

## Descricao

Este endpoint remove permanentemente um artigo da base de conhecimento. O artigo nao sera mais utilizado pelo agente de IA para responder perguntas.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode deletar artigos
- **SUPER_ADMIN**: Pode deletar artigos

## Request

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID do artigo (CUID) |

## Response

### Sucesso (200 OK)

```json
{
  "message": "Knowledge article deleted successfully",
  "articleId": "clknowledgexxxxxxxxxxxxxxxxx",
  "deletedAt": "2024-01-15T16:30:00.000Z"
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
curl -X DELETE https://api.chatblue.io/api/knowledge/clknowledgexxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript

```javascript
async function deleteKnowledgeArticle(articleId) {
  const response = await fetch(`/api/knowledge/${articleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Com confirmacao
async function handleDelete(articleId, articleTitle) {
  const confirmed = confirm(`Deseja deletar o artigo "${articleTitle}"?`);
  if (!confirmed) return;

  try {
    await deleteKnowledgeArticle(articleId);
    alert('Artigo deletado com sucesso');
  } catch (error) {
    alert('Erro: ' + error.message);
  }
}
```

### Python

```python
import requests

def delete_knowledge_article(access_token, article_id):
    url = f'https://api.chatblue.io/api/knowledge/{article_id}'
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.delete(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
result = delete_knowledge_article(token, 'clknowledgexxx')
print(f"Artigo deletado: {result['articleId']}")
```

## Alternativa: Desativar

Em vez de deletar, considere desativar o artigo para manter o historico:

```javascript
// Desativar em vez de deletar
await updateKnowledgeArticle(articleId, { isActive: false });
```

## Notas Importantes

1. **Acao Irreversivel**: A delecao e permanente. Considere desativar primeiro.
2. **Estatisticas**: As estatisticas de uso sao perdidas com a delecao.
3. **IA Sync**: O agente de IA e atualizado automaticamente.

## Endpoints Relacionados

- [Listar Artigos](/docs/api/conhecimento/listar)
- [Criar Artigo](/docs/api/conhecimento/criar)
- [Atualizar Artigo](/docs/api/conhecimento/atualizar)
