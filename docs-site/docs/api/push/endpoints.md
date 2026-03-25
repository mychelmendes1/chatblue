---
sidebar_position: 1
title: Push Notifications API
description: Endpoints para gerenciar push notifications no navegador via Web Push no ChatBlue
---

# Push Notifications API

Endpoints para gerenciar push notifications no navegador utilizando o protocolo Web Push (VAPID).

## Endpoints

```
GET  /api/push/vapid-key
POST /api/push/subscribe
POST /api/push/unsubscribe
POST /api/push/test
```

## Descricao

A Push Notifications API permite que o ChatBlue envie notificacoes diretamente para o navegador do usuario, mesmo quando a aba nao esta em foco. Utiliza o protocolo Web Push com chaves VAPID para autenticacao segura.

O fluxo basico e:
1. Obter a chave publica VAPID do servidor
2. Registrar um Service Worker no navegador
3. Criar uma subscription com a chave VAPID
4. Enviar a subscription para o servidor via `/subscribe`

---

## Obter Chave VAPID

### Endpoint

```
GET /api/push/vapid-key
```

### Autenticacao

Nenhuma autenticacao necessaria. A chave publica VAPID e informacao publica.

### Descricao

Retorna a chave publica VAPID necessaria para criar subscriptions de push no navegador. Esta chave e usada na chamada `PushManager.subscribe()` do Service Worker.

### Response - Sucesso (200 OK)

```json
{
  "publicKey": "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkEs7U8RePCyKTUJyAR2YsJv..."
}
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `publicKey` | string | Chave publica VAPID em formato base64url |

### Response - Erro (503 Service Unavailable)

```json
{
  "error": "Push notifications not configured"
}
```

Retornado quando as chaves VAPID nao estao configuradas no servidor.

### Exemplo de Request

```bash
curl -X GET https://api.chatblue.io/api/push/vapid-key
```

---

## Registrar Subscription

### Endpoint

```
POST /api/push/subscribe
```

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Descricao

Registra uma subscription de push notification para o usuario autenticado. O servidor armazena os dados da subscription para enviar notificacoes futuras.

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |
| `Content-Type` | `application/json` | Sim |

### Body Parameters

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `subscription` | object | Sim | Objeto PushSubscription do navegador |
| `subscription.endpoint` | string | Sim | URL do endpoint push do navegador |
| `subscription.keys` | object | Sim | Chaves de criptografia |
| `subscription.keys.p256dh` | string | Sim | Chave publica do cliente |
| `subscription.keys.auth` | string | Sim | Secret de autenticacao |

### Exemplo de Request

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/xxxxx",
    "expirationTime": null,
    "keys": {
      "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWRw",
      "auth": "tBHItJI5svbpC7htLc3xmw"
    }
  }
}
```

### Response - Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Subscribed to push notifications"
}
```

### Response - Erro (400 Bad Request)

```json
{
  "error": "Invalid subscription object"
}
```

---

## Cancelar Subscription

### Endpoint

```
POST /api/push/unsubscribe
```

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Descricao

Remove a subscription de push notification do usuario. O servidor deixara de enviar push notifications para este usuario/dispositivo.

### Response - Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Unsubscribed from push notifications"
}
```

### Exemplo de Request

```bash
curl -X POST https://api.chatblue.io/api/push/unsubscribe \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Enviar Notificacao de Teste

### Endpoint

```
POST /api/push/test
```

### Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Descricao

Envia uma notificacao push de teste para o usuario autenticado. Util para verificar se a configuracao de push esta funcionando corretamente.

### Response - Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Test notification sent"
}
```

### Response - Erro (400 Bad Request)

```json
{
  "error": "Failed to send notification. Check your subscription."
}
```

Retornado quando o usuario nao possui uma subscription registrada ou a subscription expirou.

### Exemplo de Request

```bash
curl -X POST https://api.chatblue.io/api/push/test \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Erros Comuns

### 400 Bad Request - Subscription Invalida

```json
{
  "error": "Invalid subscription object"
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to subscribe"
}
```

```json
{
  "error": "Failed to unsubscribe"
}
```

### 503 Service Unavailable

```json
{
  "error": "Push notifications not configured"
}
```

## Exemplos de Codigo

### JavaScript - Fluxo Completo de Push

```javascript
const API_URL = 'https://api.chatblue.io/api/push';
const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json',
});

// 1. Registrar Service Worker
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications nao suportadas neste navegador');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  return registration;
}

// 2. Obter chave VAPID do servidor
async function getVapidKey() {
  const response = await fetch(`${API_URL}/vapid-key`);
  if (!response.ok) throw new Error('Push nao configurado no servidor');
  const { publicKey } = await response.json();
  return publicKey;
}

// 3. Criar subscription e registrar no servidor
async function subscribeToPush() {
  const registration = await registerServiceWorker();
  const vapidKey = await getVapidKey();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const response = await fetch(`${API_URL}/subscribe`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ subscription }),
  });

  if (!response.ok) throw new Error('Falha ao registrar subscription');
  return await response.json();
}

// 4. Cancelar subscription
async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }

  const response = await fetch(`${API_URL}/unsubscribe`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) throw new Error('Falha ao cancelar subscription');
  return await response.json();
}

// 5. Testar push
async function testPush() {
  const response = await fetch(`${API_URL}/test`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) throw new Error('Falha ao enviar teste');
  return await response.json();
}

// Helper: converter base64url para Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Uso
try {
  await subscribeToPush();
  console.log('Push notifications ativadas!');

  await testPush();
  console.log('Notificacao de teste enviada!');
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript - Service Worker (sw.js)

```javascript
self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data;

  if (data && data.ticketId) {
    event.waitUntil(
      clients.openWindow(`/tickets/${data.ticketId}`)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
```

### cURL

```bash
# Obter chave VAPID
curl -X GET https://api.chatblue.io/api/push/vapid-key

# Registrar subscription
curl -X POST https://api.chatblue.io/api/push/subscribe \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/xxxxx",
      "keys": {
        "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry...",
        "auth": "tBHItJI5svbpC7htLc3xmw"
      }
    }
  }'

# Cancelar subscription
curl -X POST https://api.chatblue.io/api/push/unsubscribe \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Enviar teste
curl -X POST https://api.chatblue.io/api/push/test \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Python

```python
import requests

class PushNotificationClient:
    def __init__(self, access_token, base_url='https://api.chatblue.io/api'):
        self.base_url = f'{base_url}/push'
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

    def get_vapid_key(self):
        response = requests.get(f'{self.base_url}/vapid-key')
        if response.status_code == 503:
            raise Exception('Push nao configurado no servidor')
        response.raise_for_status()
        return response.json()['publicKey']

    def subscribe(self, subscription):
        response = requests.post(
            f'{self.base_url}/subscribe',
            json={'subscription': subscription},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def unsubscribe(self):
        response = requests.post(
            f'{self.base_url}/unsubscribe',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def test(self):
        response = requests.post(
            f'{self.base_url}/test',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

client = PushNotificationClient(token)

vapid_key = client.get_vapid_key()
print(f'Chave VAPID: {vapid_key[:20]}...')

result = client.test()
print(f'Teste: {result["message"]}')
```

## Fluxo de Ativacao

```
1. GET /vapid-key - Obter chave publica VAPID
        |
2. navigator.serviceWorker.register('/sw.js')
        |
3. pushManager.subscribe({ applicationServerKey: vapidKey })
        |
4. POST /subscribe - Enviar subscription para o servidor
        |
5. Notificacoes push ativadas!
        |
6. POST /test - Verificar se esta funcionando (opcional)
```

## Notas Importantes

1. **HTTPS obrigatorio**: Push notifications so funcionam em contextos seguros (HTTPS ou localhost).

2. **Service Worker**: E necessario ter um Service Worker registrado para receber push notifications.

3. **Permissao do navegador**: O usuario precisa conceder permissao para notificacoes no navegador. Solicite a permissao antes de chamar `pushManager.subscribe()`.

4. **Chave VAPID publica**: O endpoint `/vapid-key` nao requer autenticacao, pois a chave publica e informacao nao sensivel.

5. **Subscription unica**: Cada usuario tem uma subscription por vez. Ao chamar `/subscribe` novamente, a subscription anterior e substituida.

6. **Expiracao**: Subscriptions podem expirar. Se o push falhar, o usuario precisara registrar uma nova subscription.

7. **Compatibilidade**: Web Push e suportado nos navegadores modernos (Chrome, Firefox, Edge, Safari 16+).

## Endpoints Relacionados

- [Notificacoes](/docs/api/notifications/endpoints) - Gerenciar notificacoes in-app
- [WebSocket Eventos](/docs/api/websocket/eventos) - Notificacoes em tempo real via WebSocket
