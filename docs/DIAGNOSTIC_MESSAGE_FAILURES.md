# Diagnóstico de Falhas no Envio de Mensagens

## Análise do Contato: 5513997633269

Baseado no código do sistema, aqui estão os principais pontos onde o envio de mensagens pode falhar:

## Possíveis Causas de Falha

### 1. **Conexão WhatsApp Desconectada ou Inativa**
- **Localização no código**: `apps/api/src/routes/message.routes.ts:17-91` (função `getActiveConnectionForTicket`)
- **Sintoma**: Mensagens ficam com status `PENDING` ou `FAILED`
- **Verificação**: 
  - Status da conexão não é `CONNECTED`
  - `isActive` está como `false`
  - Conexão foi deletada ou não existe

### 2. **Erro na API Meta Cloud (se usar META_CLOUD)**
- **Localização no código**: `apps/api/src/services/whatsapp/meta-cloud.service.ts:55-101`
- **Sintoma**: Erro retornado pela API do Facebook/Meta
- **Possíveis erros**:
  - Token de acesso inválido ou expirado
  - Número de telefone não autorizado
  - Limite de taxa excedido
  - Número de telefone inválido

### 3. **Erro no Baileys (se usar BAILEYS)**
- **Localização no código**: `apps/api/src/services/whatsapp/baileys.service.ts:682-727`
- **Sintoma**: Falha ao enviar via socket do Baileys
- **Possíveis erros**:
  - Socket não conectado
  - Sessão expirada ou inválida
  - Timeout na reconexão
  - Erro ao formatar número de telefone

### 4. **Formatação de Número de Telefone**
- **Localização no código**: `apps/api/src/services/whatsapp/whatsapp.service.ts:302-331`
- **Sintoma**: Número formatado incorretamente
- **Verificação**: O número deve ser formatado corretamente (com código do país)

### 5. **Mensagem com Status FAILED no Banco**
- **Localização no código**: Campo `failed_reason` na tabela `messages`
- **Sintoma**: Mensagem criada mas não enviada, com `status = 'FAILED'`
- **Verificação**: Consultar campo `failed_reason` na mensagem

## Como Verificar

### Opção 1: Usar o Script de Diagnóstico

Execute o script criado para verificar o contato:

```bash
cd apps/api
npx tsx src/scripts/check-contact-messages.ts 5513997633269
```

Este script irá:
- Encontrar o contato pelo número
- Listar todos os tickets relacionados
- Mostrar mensagens com status `FAILED` e suas razões
- Mostrar mensagens com status `PENDING`
- Verificar status das conexões WhatsApp

### Opção 2: Consulta SQL Direta

Se tiver acesso ao banco de dados:

```sql
-- Encontrar o contato
SELECT id, name, phone, company_id, last_message_at, is_active 
FROM contacts 
WHERE phone LIKE '%5513997633269%' OR phone LIKE '%13997633269%';

-- Ver mensagens falhadas
SELECT m.id, m.content, m.status, m.failed_reason, m.created_at, 
       t.protocol, c.name as connection_name, c.type, c.status as connection_status
FROM messages m
JOIN tickets t ON m.ticket_id = t.id
JOIN contacts c ON t.contact_id = c.id
JOIN whatsapp_connections wc ON m.connection_id = wc.id
WHERE c.phone LIKE '%5513997633269%'
  AND (m.status = 'FAILED' OR m.status = 'PENDING')
  AND m.is_from_me = true
ORDER BY m.created_at DESC
LIMIT 20;

-- Verificar conexões ativas
SELECT id, name, type, status, is_active, last_connected
FROM whatsapp_connections
WHERE company_id = (SELECT company_id FROM contacts WHERE phone LIKE '%5513997633269%' LIMIT 1);
```

### Opção 3: Verificar Logs da Aplicação

Os logs são escritos usando `pino` e podem ser visualizados:

- **Desenvolvimento**: Logs aparecem no console com formatação colorida
- **Produção**: Logs podem estar em arquivo ou sistema de logging

Procure por:
- `"Sending message to contact phone: 5513997633269"`
- `"No active connection found"`
- `"Meta Cloud send message failed"`
- `"Failed to send media message via Baileys"`
- `"WhatsApp não conectado"`

## Soluções Comuns

### Problema: Conexão Desconectada
**Solução**: 
1. Verificar se a conexão WhatsApp está ativa no painel
2. Reconectar escaneando o QR Code novamente
3. Verificar se a conexão não foi deletada

### Problema: Token Meta Cloud Expirado
**Solução**:
1. Renovar o token de acesso na Meta Business
2. Atualizar as credenciais na conexão

### Problema: Número de Telefone Inválido
**Solução**:
1. Verificar se o número está no formato correto (com código do país)
2. Verificar se o número está autorizado na conta Meta (se usar META_CLOUD)

### Problema: Sessão Baileys Expirada
**Solução**:
1. Reconectar o WhatsApp escaneando o QR Code
2. Verificar se a sessão não foi deletada

## Próximos Passos

1. Execute o script de diagnóstico quando o banco estiver acessível
2. Verifique os logs da aplicação para erros específicos
3. Verifique o status das conexões WhatsApp no painel administrativo
4. Se necessário, reconecte o WhatsApp ou renove as credenciais




