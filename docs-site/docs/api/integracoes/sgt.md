---
sidebar_position: 1
title: Integracao SGT
description: Endpoint para receber leads do sistema SGT no ChatBlue
---

# Integracao SGT

Endpoint para receber leads provenientes do sistema SGT (Sistema de Gestao de Tickets externo), criando contato, ticket e acionando a IA automaticamente.

## Receber Lead do SGT

```
POST /api/integrations/sgt/inbound
```

Recebe um lead do SGT, cria (ou atualiza) o contato, abre um ticket no departamento Comercial com IA externa atribuida e envia o contexto do lead para a IA processar.

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `X-API-Key` | `{slug-da-empresa}` | Sim* |
| `Authorization` | `Bearer {slug-da-empresa}` | Sim* |

*Envie um dos dois headers. O valor e o `slug` da empresa cadastrada no ChatBlue.

### Request Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `phone` | string | Sim | Telefone do lead (minimo 10 caracteres) |
| `message` | string | Sim | Mensagem ou contexto do lead |
| `name` | string | Nao | Nome do lead |
| `email` | string | Nao | E-mail do lead |
| `tags` | string[] | Nao | Tags para classificacao |

```json
{
  "phone": "5511999887766",
  "message": "Cliente interessado no plano empresarial, solicitou contato via site.",
  "name": "Maria Oliveira",
  "email": "maria@empresa.com",
  "tags": ["site", "plano-empresarial"]
}
```

### Response - Sucesso (201 Created)

```json
{
  "success": true,
  "ticketId": "clticket001",
  "protocol": "ATD-20240115-0042",
  "contactId": "clcontact001",
  "aiResponse": {
    "action": "RESPOND",
    "text": "Ola Maria! Vi que voce tem interesse no plano empresarial. Posso te ajudar com mais detalhes?"
  }
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `success` | boolean | Se o lead foi processado com sucesso |
| `ticketId` | string | ID do ticket criado |
| `protocol` | string | Protocolo do atendimento |
| `contactId` | string | ID do contato criado ou atualizado |
| `aiResponse` | object/undefined | Resposta da IA (quando disponivel) |
| `aiResponse.action` | string | Acao da IA: `RESPOND`, `TRANSFER`, etc. |
| `aiResponse.text` | string | Texto da resposta da IA |

### Erros

| Status | Descricao |
|--------|-----------|
| 400 | Dados invalidos (telefone curto, mensagem vazia) |
| 400 | Nenhuma conexao WhatsApp ativa encontrada |
| 400 | Departamento Comercial nao encontrado |
| 400 | Departamento Comercial sem atendente de IA externa configurado |
| 401 | API Key ausente ou invalida |

### Exemplos de Erro

```json
{
  "error": "Dados invalidos",
  "details": [
    {
      "code": "too_small",
      "minimum": 10,
      "path": ["phone"],
      "message": "Telefone e obrigatorio (min. 10 caracteres)"
    }
  ]
}
```

```json
{
  "error": "API Key invalida ou empresa inativa"
}
```

```json
{
  "error": "Departamento Comercial nao possui atendente de IA externa configurado. Vincule um usuario IA externa ao departamento."
}
```

---

## Fluxo de Processamento

1. **Autenticacao**: Valida a API Key (slug da empresa) via header `X-API-Key` ou `Authorization: Bearer`.
2. **Contato**: Busca contato pelo telefone. Se nao existir, cria um novo. Se existir, atualiza nome/email se fornecidos.
3. **Conexao**: Localiza a conexao WhatsApp ativa da empresa (prioriza conexao padrao).
4. **Departamento**: Busca o departamento "Comercial" ativo da empresa.
5. **IA Externa**: Identifica o atendente de IA externa vinculado ao departamento.
6. **Ticket**: Cria um novo ticket com status `PENDING`, prioridade `MEDIUM`, atribuido a IA.
7. **Mensagem**: Registra o contexto do lead como primeira mensagem do ticket (como se fosse do cliente).
8. **Webhook IA**: Envia o payload para a IA externa processar e gerar resposta.
9. **Resposta WhatsApp**: Se a IA retornar uma resposta, envia via WhatsApp ao lead.
10. **Socket**: Notifica o painel em tempo real sobre o novo ticket.

---

## Exemplos de Codigo

### cURL

```bash
curl -X POST "https://api.chatblue.io/api/integrations/sgt/inbound" \
  -H "X-API-Key: minha-empresa-slug" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999887766",
    "message": "Lead do site - interesse no plano Pro",
    "name": "Carlos Santos",
    "email": "carlos@email.com",
    "tags": ["site", "plano-pro"]
  }'
```

### JavaScript (Fetch)

```javascript
async function sendLeadToSGT(apiKey, lead) {
  const response = await fetch('https://api.chatblue.io/api/integrations/sgt/inbound', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lead),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao enviar lead');
  }

  return response.json();
}

// Uso
const result = await sendLeadToSGT('minha-empresa-slug', {
  phone: '5511999887766',
  message: 'Interessado no plano empresarial',
  name: 'Carlos Santos',
});

console.log(`Ticket criado: ${result.protocol}`);
if (result.aiResponse) {
  console.log(`IA respondeu: ${result.aiResponse.text}`);
}
```

### Python

```python
import requests

def send_lead(api_key, phone, message, name=None, email=None, tags=None):
    url = 'https://api.chatblue.io/api/integrations/sgt/inbound'

    payload = {
        'phone': phone,
        'message': message,
    }
    if name:
        payload['name'] = name
    if email:
        payload['email'] = email
    if tags:
        payload['tags'] = tags

    headers = {
        'X-API-Key': api_key,
        'Content-Type': 'application/json',
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 201:
        return response.json()
    else:
        raise Exception(response.json().get('error', 'Erro'))

# Uso
result = send_lead(
    api_key='minha-empresa-slug',
    phone='5511999887766',
    message='Lead interessado no plano empresarial',
    name='Maria Oliveira',
)
print(f"Ticket: {result['protocol']}")
```

## Notas Importantes

1. **Telefone**: O telefone e normalizado internamente (removendo caracteres nao-numericos). Deve ter no minimo 10 digitos.

2. **Departamento Comercial**: O endpoint depende de um departamento com nome contendo "comercial" (case insensitive) com um atendente de IA externa vinculado.

3. **Conexao WhatsApp**: A empresa precisa ter pelo menos uma conexao WhatsApp ativa para que o lead seja processado.

4. **Resposta da IA**: O campo `aiResponse` so estara presente se a IA externa retornar uma resposta. A resposta tambem e enviada via WhatsApp ao lead automaticamente.

5. **SLA**: O ticket criado ja recebe um deadline de SLA calculado com base nas configuracoes do departamento.

## Endpoints Relacionados

- [Tickets](/docs/api/tickets/listar) - Listar e gerenciar tickets
- [Contatos](/docs/api/contatos/listar) - Listar e gerenciar contatos
- [Webhooks](/docs/api/conexoes/webhooks) - Configuracao de webhooks
