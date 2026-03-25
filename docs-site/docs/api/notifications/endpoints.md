---
sidebar_position: 1
title: Endpoints de Notificacoes
description: Endpoints para gerenciar notificacoes do usuario no ChatBlue
---

# Endpoints de Notificacoes

Endpoints para listar, contar e marcar notificacoes como lidas.

## Endpoints

```
GET   /api/notifications
GET   /api/notifications/unread-count
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
```

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem gerenciar suas proprias notificacoes. Cada usuario ve apenas suas notificacoes.

---

## Listar Notificacoes

### Endpoint

```
GET /api/notifications
```

### Descricao

Retorna as notificacoes do usuario autenticado, ordenadas da mais recente para a mais antiga. Suporta filtragem por status de leitura e limite de resultados.

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `read` | string | - | Filtrar por status de leitura (`true` ou `false`) |
| `limit` | string | `50` | Numero maximo de notificacoes retornadas |

### Exemplos de URL

```
# Listar todas (ate 50)
GET /api/notifications

# Apenas nao lidas
GET /api/notifications?read=false

# Apenas lidas, limite de 20
GET /api/notifications?read=true&limit=20

# Ultimas 100 notificacoes
GET /api/notifications?limit=100
```

### Response - Sucesso (200 OK)

```json
[
  {
    "id": "clnotifxxxxxxxxxxxxxxxxxxxxxx",
    "type": "TICKET_ASSIGNED",
    "title": "Novo ticket atribuido",
    "body": "Ticket #1234 foi atribuido a voce",
    "read": false,
    "readAt": null,
    "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "companyId": "clcompxxxxxxxxxxxxxxxxxxxxxx",
    "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
    "createdAt": "2024-01-15T14:30:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z",
    "ticket": {
      "id": "clticketxxxxxxxxxxxxxxxxxx",
      "protocol": "1234",
      "contact": {
        "id": "clcontactxxxxxxxxxxxxxxxxxx",
        "name": "Joao Silva",
        "avatar": "https://exemplo.com/avatar.jpg"
      }
    }
  },
  {
    "id": "clnotifyyyyyyyyyyyyyyyyyyyyyy",
    "type": "SLA_BREACH",
    "title": "SLA violado",
    "body": "Ticket #1230 ultrapassou o tempo de resposta",
    "read": true,
    "readAt": "2024-01-15T14:00:00.000Z",
    "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
    "companyId": "clcompxxxxxxxxxxxxxxxxxxxxxx",
    "ticketId": "clticketyyyyyyyyyyyyyyyyy",
    "createdAt": "2024-01-15T13:45:00.000Z",
    "updatedAt": "2024-01-15T14:00:00.000Z",
    "ticket": {
      "id": "clticketyyyyyyyyyyyyyyyyy",
      "protocol": "1230",
      "contact": {
        "id": "clcontactyyyyyyyyyyyyyyyyyy",
        "name": "Maria Santos",
        "avatar": null
      }
    }
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da notificacao |
| `type` | string | Tipo da notificacao |
| `title` | string | Titulo da notificacao |
| `body` | string | Conteudo/descricao da notificacao |
| `read` | boolean | Se a notificacao foi lida |
| `readAt` | string/null | Data/hora em que foi marcada como lida |
| `userId` | string | ID do usuario destinatario |
| `companyId` | string | ID da empresa |
| `ticketId` | string/null | ID do ticket associado |
| `createdAt` | string | Data de criacao |
| `ticket` | object/null | Dados do ticket associado |
| `ticket.id` | string | ID do ticket |
| `ticket.protocol` | string | Numero de protocolo |
| `ticket.contact` | object | Contato do ticket |
| `ticket.contact.name` | string | Nome do contato |
| `ticket.contact.avatar` | string/null | URL do avatar |

---

## Contar Nao Lidas

### Endpoint

```
GET /api/notifications/unread-count
```

### Descricao

Retorna a contagem de notificacoes nao lidas do usuario. Util para exibir badges e contadores na interface.

### Response - Sucesso (200 OK)

```json
{
  "count": 5
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `count` | number | Numero de notificacoes nao lidas |

### Exemplo de Request

```bash
curl -X GET https://api.chatblue.io/api/notifications/unread-count \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Marcar como Lida

### Endpoint

```
PATCH /api/notifications/:id/read
```

### Descricao

Marca uma notificacao especifica como lida. Define `read: true` e registra o `readAt` com a data/hora atual.

### Path Parameters

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `id` | string | ID da notificacao |

### Response - Sucesso (200 OK)

```json
{
  "id": "clnotifxxxxxxxxxxxxxxxxxxxxxx",
  "type": "TICKET_ASSIGNED",
  "title": "Novo ticket atribuido",
  "body": "Ticket #1234 foi atribuido a voce",
  "read": true,
  "readAt": "2024-01-15T15:00:00.000Z",
  "userId": "cluserxxxxxxxxxxxxxxxxxxxxxx",
  "companyId": "clcompxxxxxxxxxxxxxxxxxxxxxx",
  "ticketId": "clticketxxxxxxxxxxxxxxxxxx",
  "createdAt": "2024-01-15T14:30:00.000Z",
  "updatedAt": "2024-01-15T15:00:00.000Z"
}
```

### Exemplo de Request

```bash
curl -X PATCH https://api.chatblue.io/api/notifications/clnotifxxx/read \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Marcar Todas como Lidas

### Endpoint

```
PATCH /api/notifications/read-all
```

### Descricao

Marca todas as notificacoes nao lidas do usuario como lidas de uma vez. Util para o botao "Marcar todas como lidas" na interface.

### Response - Sucesso (200 OK)

```json
{
  "success": true
}
```

### Exemplo de Request

```bash
curl -X PATCH https://api.chatblue.io/api/notifications/read-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Erros

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found (Marcar como lida)

```json
{
  "error": "Notification not found"
}
```

Ocorre quando o ID nao existe ou a notificacao pertence a outro usuario.

## Exemplos de Codigo

### cURL

```bash
# Listar notificacoes nao lidas
curl -X GET "https://api.chatblue.io/api/notifications?read=false" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Contar nao lidas
curl -X GET https://api.chatblue.io/api/notifications/unread-count \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Marcar notificacao como lida
curl -X PATCH https://api.chatblue.io/api/notifications/clnotifxxx/read \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Marcar todas como lidas
curl -X PATCH https://api.chatblue.io/api/notifications/read-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
const API_URL = 'https://api.chatblue.io/api/notifications';
const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
});

async function getNotifications(options = {}) {
  const params = new URLSearchParams();
  if (options.read !== undefined) params.append('read', String(options.read));
  if (options.limit) params.append('limit', String(options.limit));

  const queryString = params.toString();
  const url = `${API_URL}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

async function getUnreadCount() {
  const response = await fetch(`${API_URL}/unread-count`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error((await response.json()).error);
  const data = await response.json();
  return data.count;
}

async function markAsRead(notificationId) {
  const response = await fetch(`${API_URL}/${notificationId}/read`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

async function markAllAsRead() {
  const response = await fetch(`${API_URL}/read-all`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error((await response.json()).error);
  return response.json();
}

// Uso
const unread = await getUnreadCount();
console.log(`Voce tem ${unread} notificacoes nao lidas`);

const notifications = await getNotifications({ read: false, limit: 10 });
notifications.forEach(n => {
  console.log(`${n.title}: ${n.body}`);
});
```

### Python

```python
import requests

class NotificationClient:
    def __init__(self, access_token, base_url='https://api.chatblue.io/api'):
        self.base_url = f'{base_url}/notifications'
        self.headers = {
            'Authorization': f'Bearer {access_token}'
        }

    def list(self, read=None, limit=50):
        params = {'limit': str(limit)}
        if read is not None:
            params['read'] = str(read).lower()

        response = requests.get(self.base_url, params=params, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def unread_count(self):
        response = requests.get(f'{self.base_url}/unread-count', headers=self.headers)
        response.raise_for_status()
        return response.json()['count']

    def mark_read(self, notification_id):
        response = requests.patch(
            f'{self.base_url}/{notification_id}/read',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def mark_all_read(self):
        response = requests.patch(f'{self.base_url}/read-all', headers=self.headers)
        response.raise_for_status()
        return response.json()

client = NotificationClient(token)

count = client.unread_count()
print(f'Nao lidas: {count}')

if count > 0:
    notifications = client.list(read=False)
    for n in notifications:
        print(f"[{n['type']}] {n['title']}")

    client.mark_all_read()
    print('Todas marcadas como lidas!')
```

## Notas Importantes

1. **Isolamento por usuario**: Cada usuario ve apenas suas proprias notificacoes. Nao e possivel acessar notificacoes de outros usuarios.

2. **Ticket associado**: A maioria das notificacoes esta associada a um ticket. O campo `ticket` inclui dados basicos do ticket e contato para exibicao na interface.

3. **Limite padrao**: O endpoint de listagem retorna no maximo 50 notificacoes por padrao. Ajuste o parametro `limit` conforme necessidade.

4. **Read-all eficiente**: O endpoint `/read-all` usa `updateMany` para marcar todas de uma vez, sendo mais eficiente que marcar individualmente.

5. **Polling vs WebSocket**: Para atualizacoes em tempo real do contador de nao lidas, considere usar WebSockets em vez de polling.

## Endpoints Relacionados

- [Push Notifications](/docs/api/push/endpoints) - Configurar push notifications no navegador
- [WebSocket Eventos](/docs/api/websocket/eventos) - Receber notificacoes em tempo real
