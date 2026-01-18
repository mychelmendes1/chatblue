---
sidebar_position: 1
title: Listar Conexoes
description: Endpoint para listar conexoes WhatsApp da empresa no ChatBlue
---

# Listar Conexoes

Retorna a lista de conexoes WhatsApp da empresa.

## Endpoint

```
GET /api/connections
```

## Descricao

Este endpoint retorna todas as conexoes WhatsApp cadastradas na empresa do usuario autenticado. Cada conexao representa um numero de WhatsApp vinculado ao sistema para envio e recebimento de mensagens.

## Autenticacao

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

## Permissoes

Todos os usuarios autenticados podem listar conexoes da sua empresa.

## Request

### Headers

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim |

### Query Parameters

| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `status` | string | - | Filtrar por status (CONNECTED, DISCONNECTED, PENDING) |
| `isDefault` | boolean | - | Filtrar conexao padrao |

### Exemplos de URL

```
# Listar todas as conexoes
GET /api/connections

# Listar apenas conexoes ativas
GET /api/connections?status=CONNECTED

# Obter conexao padrao
GET /api/connections?isDefault=true
```

## Response

### Sucesso (200 OK)

```json
[
  {
    "id": "clconnxxxxxxxxxxxxxxxxxxxxxx",
    "name": "WhatsApp Principal",
    "phone": "+5511999999999",
    "status": "CONNECTED",
    "isDefault": true,
    "lastConnected": "2024-01-15T10:30:00.000Z",
    "batteryLevel": 85,
    "isPlugged": true,
    "pushName": "Empresa ABC",
    "profilePicUrl": "https://exemplo.com/profile.jpg",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z",
    "_count": {
      "tickets": 150,
      "messages": 5000
    }
  },
  {
    "id": "clconnyyyyyyyyyyyyyyyyyyyyyy",
    "name": "WhatsApp Vendas",
    "phone": "+5511888888888",
    "status": "DISCONNECTED",
    "isDefault": false,
    "lastConnected": "2024-01-14T18:00:00.000Z",
    "batteryLevel": null,
    "isPlugged": null,
    "pushName": "Vendas ABC",
    "profilePicUrl": null,
    "createdAt": "2024-01-12T08:00:00.000Z",
    "updatedAt": "2024-01-14T18:00:00.000Z",
    "_count": {
      "tickets": 80,
      "messages": 2500
    }
  },
  {
    "id": "clconnzzzzzzzzzzzzzzzzzzzzzz",
    "name": "WhatsApp Novo",
    "phone": null,
    "status": "PENDING",
    "isDefault": false,
    "lastConnected": null,
    "batteryLevel": null,
    "isPlugged": null,
    "pushName": null,
    "profilePicUrl": null,
    "createdAt": "2024-01-15T14:00:00.000Z",
    "updatedAt": "2024-01-15T14:00:00.000Z",
    "_count": {
      "tickets": 0,
      "messages": 0
    }
  }
]
```

### Campos da Resposta

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | ID unico da conexao (CUID) |
| `name` | string | Nome identificador da conexao |
| `phone` | string/null | Numero do WhatsApp conectado |
| `status` | string | Status da conexao |
| `isDefault` | boolean | Se e a conexao padrao |
| `lastConnected` | string/null | Ultima conexao bem-sucedida |
| `batteryLevel` | number/null | Nivel da bateria do dispositivo |
| `isPlugged` | boolean/null | Se o dispositivo esta carregando |
| `pushName` | string/null | Nome configurado no WhatsApp |
| `profilePicUrl` | string/null | URL da foto de perfil |
| `createdAt` | string | Data de criacao |
| `updatedAt` | string | Data da ultima atualizacao |
| `_count.tickets` | number | Total de tickets por esta conexao |
| `_count.messages` | number | Total de mensagens |

### Status Disponiveis

| Status | Descricao |
|--------|-----------|
| `PENDING` | Aguardando primeira conexao (QR Code) |
| `CONNECTED` | Conectado e funcionando |
| `DISCONNECTED` | Desconectado |
| `CONNECTING` | Processo de conexao em andamento |

## Erros

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

## Exemplos de Codigo

### cURL

```bash
# Listar todas conexoes
curl -X GET https://api.chatblue.io/api/connections \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por status
curl -X GET "https://api.chatblue.io/api/connections?status=CONNECTED" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (Fetch)

```javascript
async function listConnections(filters = {}) {
  const accessToken = localStorage.getItem('accessToken');

  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.isDefault !== undefined) params.append('isDefault', filters.isDefault.toString());

  const queryString = params.toString();
  const url = `https://api.chatblue.io/api/connections${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Uso
try {
  // Listar todas conexoes
  const connections = await listConnections();
  console.log(`Total de conexoes: ${connections.length}`);

  // Conexoes ativas
  const connected = connections.filter(c => c.status === 'CONNECTED');
  console.log(`Conexoes ativas: ${connected.length}`);

  // Conexao padrao
  const defaultConn = connections.find(c => c.isDefault);
  console.log('Conexao padrao:', defaultConn?.name);

  // Verificar bateria baixa
  connections.forEach(conn => {
    if (conn.batteryLevel && conn.batteryLevel < 20 && !conn.isPlugged) {
      console.warn(`Atencao: ${conn.name} com bateria baixa (${conn.batteryLevel}%)`);
    }
  });
} catch (error) {
  console.error('Erro:', error.message);
}
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.chatblue.io/api',
});

async function getConnections(status = null) {
  const params = status ? { status } : {};

  const { data } = await api.get('/connections', {
    params,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  return data;
}

// Obter conexoes ativas
const activeConnections = await getConnections('CONNECTED');
```

### Python

```python
import requests

def list_connections(access_token, status=None, is_default=None):
    url = 'https://api.chatblue.io/api/connections'

    params = {}
    if status:
        params['status'] = status
    if is_default is not None:
        params['isDefault'] = str(is_default).lower()

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        error = response.json()
        raise Exception(error.get('error', 'Erro desconhecido'))

# Uso
connections = list_connections(token)
for conn in connections:
    status_emoji = '🟢' if conn['status'] == 'CONNECTED' else '🔴'
    print(f"{status_emoji} {conn['name']}: {conn['phone'] or 'Nao configurado'}")
```

### React Hook

```typescript
import { useState, useEffect, useCallback } from 'react';

type ConnectionStatus = 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';

interface Connection {
  id: string;
  name: string;
  phone: string | null;
  status: ConnectionStatus;
  isDefault: boolean;
  lastConnected: string | null;
  batteryLevel: number | null;
  isPlugged: boolean | null;
  pushName: string | null;
  profilePicUrl: string | null;
  _count: {
    tickets: number;
    messages: number;
  };
}

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/connections', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) throw new Error('Erro ao carregar conexoes');

      const data = await response.json();
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const connected = connections.filter(c => c.status === 'CONNECTED');
  const disconnected = connections.filter(c => c.status === 'DISCONNECTED');
  const pending = connections.filter(c => c.status === 'PENDING');
  const defaultConnection = connections.find(c => c.isDefault);

  return {
    connections,
    connected,
    disconnected,
    pending,
    defaultConnection,
    loading,
    error,
    refetch: fetchConnections,
  };
}

// Uso no componente
function ConnectionsList() {
  const { connections, connected, loading, error } = useConnections();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2>Conexoes ({connected.length}/{connections.length} online)</h2>
      <ul>
        {connections.map(conn => (
          <li key={conn.id} className={conn.status.toLowerCase()}>
            {conn.name} - {conn.status}
            {conn.phone && <span> ({conn.phone})</span>}
            {conn.batteryLevel && <span> 🔋 {conn.batteryLevel}%</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Notas Importantes

1. **Conexao Padrao**: A conexao marcada como `isDefault` e usada para novos tickets quando nenhuma conexao especifica e selecionada.

2. **Status em Tempo Real**: O status das conexoes e atualizado em tempo real via Socket.io. Considere usar WebSockets para monitoramento.

3. **Bateria do Dispositivo**: `batteryLevel` e `isPlugged` sao informacoes do dispositivo fisico conectado ao WhatsApp Web.

4. **Limites do Plano**: O numero maximo de conexoes depende do plano contratado.

5. **Phone Null**: Conexoes com `phone: null` ainda nao foram conectadas (status PENDING).

## Endpoints Relacionados

- [Criar Conexao](/docs/api/conexoes/criar) - Adicionar nova conexao
- [QR Code](/docs/api/conexoes/qr-code) - Obter QR Code para conexao
- [Conectar](/docs/api/conexoes/conectar) - Iniciar processo de conexao
- [Desconectar](/docs/api/conexoes/desconectar) - Encerrar conexao
