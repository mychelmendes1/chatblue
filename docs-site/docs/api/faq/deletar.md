---
sidebar_position: 4
title: Deletar FAQ
description: Endpoint para deletar pergunta frequente no ChatBlue
---

# Deletar FAQ

Deleta uma pergunta frequente.

## Endpoint

```
DELETE /api/faq/:id
```

## Descricao

Este endpoint remove permanentemente uma FAQ. A FAQ nao sera mais exibida no widget de chat.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

- **ADMIN**: Pode deletar FAQs
- **SUPER_ADMIN**: Pode deletar FAQs

## Request

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da FAQ (CUID) |

## Response

### Sucesso (200 OK)

```json
{
  "message": "FAQ deleted successfully",
  "faqId": "clfaqxxxxxxxxxxxxxxxxxxxxxxx",
  "deletedAt": "2024-01-15T16:30:00.000Z"
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
curl -X DELETE https://api.chatblue.io/api/faq/clfaqxxxxxxxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript

```javascript
async function deleteFAQ(faqId) {
  const response = await fetch(`/api/faq/${faqId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Com confirmacao
async function handleDeleteFAQ(faqId, question) {
  const confirmed = confirm(`Deseja deletar a FAQ "${question}"?`);
  if (!confirmed) return;

  try {
    await deleteFAQ(faqId);
    alert('FAQ deletada com sucesso');
    // Recarregar lista
    await loadFAQs();
  } catch (error) {
    alert('Erro: ' + error.message);
  }
}

// Deletar multiplas FAQs
async function deleteMultipleFAQs(faqIds) {
  const results = await Promise.allSettled(
    faqIds.map(id => deleteFAQ(id))
  );

  const success = results.filter(r => r.status === 'fulfilled').length;
  console.log(`${success}/${faqIds.length} FAQs deletadas`);

  return results;
}
```

### Python

```python
import requests

def delete_faq(access_token, faq_id):
    url = f'https://api.chatblue.io/api/faq/{faq_id}'
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.delete(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    raise Exception(response.json().get('error', 'Erro'))

# Uso
result = delete_faq(token, 'clfaqxxx')
print(f"FAQ deletada: {result['faqId']}")
```

## Alternativa: Desativar

Em vez de deletar permanentemente, considere desativar a FAQ para manter o historico:

```javascript
// Desativar em vez de deletar
await updateFAQ(faqId, { isActive: false });

// A FAQ fica oculta no widget mas os dados sao preservados
```

## Limpeza de FAQs Inativas

```javascript
async function cleanupInactiveFAQs(daysInactive = 90) {
  const { faqs } = await listFAQs({ isActive: false });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  const toDelete = faqs.filter(faq =>
    new Date(faq.updatedAt) < cutoffDate
  );

  if (toDelete.length === 0) {
    console.log('Nenhuma FAQ para limpar');
    return;
  }

  const confirmed = confirm(
    `Deletar ${toDelete.length} FAQs inativas ha mais de ${daysInactive} dias?`
  );

  if (confirmed) {
    await deleteMultipleFAQs(toDelete.map(f => f.id));
  }
}
```

## Notas Importantes

1. **Acao Irreversivel**: A delecao e permanente. Considere desativar primeiro.
2. **Metricas**: As estatisticas de cliques e avaliacoes sao perdidas.
3. **Widget**: A FAQ e removida imediatamente do widget.

## Endpoints Relacionados

- [Listar FAQs](/docs/api/faq/listar)
- [Criar FAQ](/docs/api/faq/criar)
- [Atualizar FAQ](/docs/api/faq/atualizar)
