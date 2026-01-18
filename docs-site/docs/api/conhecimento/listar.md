---
sidebar_position: 1
title: Listar Base de Conhecimento
description: Endpoint para listar artigos da base de conhecimento no ChatBlue
---

# Listar Base de Conhecimento

Retorna os artigos da base de conhecimento da empresa.

## Endpoint

```
GET /api/knowledge
```

## Descricao

Este endpoint retorna os artigos da base de conhecimento utilizados pelo agente de IA para responder perguntas dos clientes. Os artigos podem ser organizados por categorias e tags.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem listar artigos.

## Request

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `search` | string | - | Busca por titulo ou conteudo |
| `category` | string | - | Filtrar por categoria |
| `isActive` | boolean | true | Filtrar por status |
| `page` | number | 1 | Pagina |
| `limit` | number | 20 | Itens por pagina |

## Response

### Sucesso (200 OK)

```json
{
  "articles": [
    {
      "id": "clknowledgexxxxxxxxxxxxxxxxx",
      "title": "Como resetar minha senha",
      "content": "Para resetar sua senha, siga os passos:\n1. Acesse a pagina de login\n2. Clique em 'Esqueci minha senha'\n3. Digite seu email cadastrado\n4. Voce recebera um link para redefinir",
      "category": "Acesso",
      "tags": ["senha", "login", "acesso"],
      "isActive": true,
      "usageCount": 145,
      "lastUsedAt": "2024-01-15T14:30:00.000Z",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-10T15:00:00.000Z",
      "createdBy": {
        "id": "cluserxxxxxxxxxxxxxxxxxxxxxx",
        "name": "Admin"
      }
    }
  ],
  "categories": ["Acesso", "Pagamento", "Produto", "Suporte"],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

## Exemplos de Codigo

### cURL

```bash
curl -X GET "https://api.chatblue.io/api/knowledge?search=senha" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript

```javascript
async function listKnowledge(options = {}) {
  const params = new URLSearchParams();
  if (options.search) params.append('search', options.search);
  if (options.category) params.append('category', options.category);

  const response = await fetch(`/api/knowledge?${params}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
  });

  return response.json();
}

const { articles, categories } = await listKnowledge({ category: 'Acesso' });
```

## Endpoints Relacionados

- [Criar Artigo](/docs/api/conhecimento/criar)
- [Atualizar Artigo](/docs/api/conhecimento/atualizar)
- [Deletar Artigo](/docs/api/conhecimento/deletar)
