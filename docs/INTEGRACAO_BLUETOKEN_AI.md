# Integração ChatBlue ↔ BlueToken AI

## Visão Geral

O **ChatBlue** é nosso sistema de atendimento via WhatsApp. Ele gerencia conexões WhatsApp, tickets (conversas), contatos e envio/recebimento de mensagens.

O **BlueToken AI** é o sistema de IA externa que fará o atendimento automatizado de clientes em departamentos específicos.

### Como funciona

```
Cliente (WhatsApp) → ChatBlue → BlueToken AI (webhook)
                                       ↓
                                  Processa com IA
                                       ↓
                              Retorna resposta HTTP
                                       ↓
                    ChatBlue envia resposta ao cliente via WhatsApp
```

**Fluxo resumido:**

1. Cliente envia mensagem no WhatsApp
2. ChatBlue recebe a mensagem e identifica que o ticket está atribuído a uma IA externa
3. ChatBlue envia um **POST** para o webhook do BlueToken AI com os dados da mensagem
4. BlueToken AI processa, gera resposta com IA, e **retorna a resposta no corpo HTTP** (síncrono)
5. ChatBlue recebe a resposta e **envia de volta ao cliente pelo WhatsApp** automaticamente
6. Se a IA decidir escalar, ChatBlue transfere o ticket para um humano automaticamente

> **IMPORTANTE:** O BlueToken AI **NÃO deve enviar mensagens pelo WhatsApp diretamente** (não usar `whatsapp-send` / Mensageria). O ChatBlue cuida de todo o envio de mensagens.

---

## 1. Webhook de Entrada (ChatBlue → BlueToken AI)

### Endpoint

O ChatBlue fará um **POST** para a URL configurada no cadastro da IA externa.

Exemplo: `https://<project-id>.supabase.co/functions/v1/bluechat-inbound`

### Autenticação

O ChatBlue enviará autenticação via **Bearer Token** no header:

```
Authorization: Bearer <WHATSAPP_INBOUND_SECRET>
Content-Type: application/json
```

O token será o mesmo `WHATSAPP_INBOUND_SECRET` que o `bluechat-inbound` já valida.

### Payload Enviado (BlueChatPayload)

```json
{
  "conversation_id": "cm1abc123def456",
  "message_id": "cm1msg789xyz",
  "timestamp": "2026-01-30T14:30:00.000Z",
  "channel": "WHATSAPP",
  "contact": {
    "phone": "5511999998888",
    "name": "João Silva",
    "email": "joao@email.com"
  },
  "message": {
    "type": "text",
    "text": "Olá, gostaria de saber sobre investimentos",
    "media_url": null
  },
  "context": {
    "empresa": "TOKENIZA",
    "agent_id": "sdr_tokeniza",
    "source": "BLUECHAT",
    "tags": [],
    "history_summary": "Cliente: Olá, gostaria de saber sobre investimentos"
  }
}
```

#### Campos do Payload

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `conversation_id` | string | ID do ticket no ChatBlue (usar como referência da conversa) |
| `message_id` | string | ID da mensagem no ChatBlue |
| `timestamp` | string (ISO 8601) | Data/hora da mensagem |
| `channel` | string | Sempre `"WHATSAPP"` |
| `contact.phone` | string | Telefone do cliente (formato: 5511999998888) |
| `contact.name` | string \| undefined | Nome do cliente (pode ser undefined) |
| `contact.email` | string \| undefined | Email do cliente (pode ser undefined) |
| `message.type` | string | Tipo: `"text"`, `"audio"`, `"image"`, `"document"`, `"video"` |
| `message.text` | string | Conteúdo da mensagem (para áudio, será a transcrição) |
| `message.media_url` | string \| undefined | URL da mídia (imagem, áudio, etc.) |
| `context.empresa` | string | `"TOKENIZA"` ou `"BLUE"` - empresa no contexto do BlueToken |
| `context.agent_id` | string | Identificador do agente IA |
| **`context.source`** | **string** | **`"BLUECHAT"` — flag crucial (ver seção abaixo)** |
| `context.tags` | string[] | Tags adicionais (pode conter `"ticket_assigned"` para novos tickets) |
| `context.history_summary` | string \| undefined | Resumo das últimas 10 mensagens da conversa |

---

## 2. Resposta Esperada (BlueToken AI → ChatBlue)

O BlueToken AI deve retornar a resposta **no corpo da resposta HTTP** (status 200).

### Formato da Resposta (BlueChatResponse)

#### Exemplo 1: Resposta Normal (IA responde ao cliente)

```json
{
  "success": true,
  "conversation_id": "cm1abc123def456",
  "message_id": "msg_ia_001",
  "lead_id": "lead_123",
  "action": "RESPOND",
  "response": {
    "text": "Olá João! 👋 Que bom que você se interessou! Temos várias opções de investimento. Posso te explicar sobre nossos fundos tokenizados?",
    "suggested_next": "Perguntar sobre perfil de investidor"
  },
  "intent": {
    "detected": "interesse_investimento",
    "confidence": 0.92,
    "lead_ready": false
  },
  "escalation": {
    "needed": false
  }
}
```

**O que acontece:** ChatBlue pega o `response.text` e envia automaticamente para o cliente via WhatsApp.

#### Exemplo 2: Escalação para Humano

```json
{
  "success": true,
  "conversation_id": "cm1abc123def456",
  "action": "ESCALATE",
  "response": {
    "text": "Entendo que você precisa de uma atenção mais personalizada. Vou transferir você para um de nossos especialistas que poderá te ajudar melhor! 😊"
  },
  "intent": {
    "detected": "solicitar_humano",
    "confidence": 0.95,
    "lead_ready": true
  },
  "escalation": {
    "needed": true,
    "reason": "Cliente solicitou falar com humano após qualificação BANT completa",
    "priority": "HIGH"
  }
}
```

**O que acontece:**
1. ChatBlue envia o `response.text` ao cliente (mensagem de despedida da IA)
2. ChatBlue transfere o ticket para o departamento de escalação configurado
3. Um atendente humano assume a conversa

#### Exemplo 3: Apenas Qualificação (sem resposta)

```json
{
  "success": true,
  "conversation_id": "cm1abc123def456",
  "action": "QUALIFY_ONLY",
  "intent": {
    "detected": "saudacao",
    "confidence": 0.88,
    "lead_ready": false
  },
  "escalation": {
    "needed": false
  }
}
```

**O que acontece:** Nada é enviado ao cliente. Útil se o BlueToken AI quiser apenas processar dados internamente sem responder.

#### Exemplo 4: Resolver/Encerrar Atendimento

```json
{
  "success": true,
  "conversation_id": "cm1abc123def456",
  "action": "RESOLVE",
  "response": {
    "text": "Foi um prazer te atender, Mychel! Se precisar de algo mais, é só chamar. Até mais! 😊"
  },
  "resolution": {
    "summary": "Cliente Mychel Mendes realizou investimento na Tokeniza. Atendimento concluído com sucesso.",
    "reason": "Cliente confirmou que concluiu o investimento e se despediu."
  }
}
```

**O que acontece:**
1. ChatBlue envia o `response.text` ao cliente (mensagem de despedida)
2. ChatBlue resolve o ticket automaticamente com status `RESOLVED`
3. Uma mensagem de sistema com o resumo é criada no ticket
4. O ticket aparece como "Resolvido" no painel

**Quando usar:** Quando o cliente se despede, agradece, confirma que foi atendido, ou a conversa chega a uma conclusão natural. A IA deve detectar sinais de encerramento como: "obrigado", "valeu", "boa tarde", "até mais", "era só isso", etc.

### Campos da Resposta

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `success` | boolean | Sim | Se o processamento foi bem-sucedido |
| `conversation_id` | string | Sim | Mesmo ID recebido no payload |
| `message_id` | string | Não | ID da mensagem criada no BlueToken |
| `lead_id` | string \| null | Não | ID do lead no BlueToken |
| `action` | string | Sim | `"RESPOND"`, `"ESCALATE"`, `"QUALIFY_ONLY"` ou `"RESOLVE"` |
| `response.text` | string | Quando action=RESPOND/ESCALATE/RESOLVE | Texto para enviar ao cliente |
| `response.suggested_next` | string | Não | Sugestão interna de próximo passo |
| `intent.detected` | string | Não | Intent detectada |
| `intent.confidence` | number (0-1) | Não | Confiança na detecção |
| `intent.lead_ready` | boolean | Não | Se o lead está qualificado |
| `escalation.needed` | boolean | Quando action=ESCALATE | Se precisa escalar |
| `escalation.reason` | string | Não | Motivo da escalação |
| `escalation.priority` | string | Não | `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"URGENT"` |
| `resolution.summary` | string | Não (recomendado com RESOLVE) | Resumo do atendimento |
| `resolution.reason` | string | Não (recomendado com RESOLVE) | Motivo do encerramento |
| `error` | string | Quando success=false | Mensagem de erro |

---

## 3. Mudança Necessária no BlueToken AI

### O que mudar no `bluechat-inbound`

Quando o payload contém `context.source === "BLUECHAT"`, o fluxo precisa ser diferente:

```typescript
// Em bluechat-inbound/index.ts

// Detectar se veio do ChatBlue
const isFromBluechat = payload.context?.source === 'BLUECHAT';

// ... processar normalmente (criar lead, salvar mensagem, chamar sdr-ia-interpret) ...

// Retornar a resposta para o ChatBlue no corpo HTTP
if (isFromBluechat) {
  return new Response(JSON.stringify({
    success: true,
    conversation_id: payload.conversation_id,
    message_id: messageId,
    lead_id: leadId,
    action: aiResult.action || 'RESPOND',
    response: {
      text: aiResult.responseText,
      suggested_next: aiResult.suggestedNext,
    },
    intent: {
      detected: aiResult.intent,
      confidence: aiResult.confidence,
      lead_ready: aiResult.leadReady,
    },
    escalation: {
      needed: aiResult.shouldEscalate || false,
      reason: aiResult.escalationReason,
      priority: aiResult.priority,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### O que mudar no `sdr-ia-interpret`

A mudança mais importante: **quando a mensagem veio do ChatBlue, NÃO chamar `whatsapp-send`**.

```typescript
// Em sdr-ia-interpret/index.ts

// Receber flag do bluechat-inbound
const isFromBluechat = requestBody.source === 'BLUECHAT'; // passar essa flag

// ... gerar resposta com IA normalmente ...

// Enviar mensagem APENAS se NÃO veio do ChatBlue
if (!isFromBluechat) {
  // Enviar via Mensageria (fluxo original para mensagens que não vieram do ChatBlue)
  await callWhatsappSend(leadId, telefone, responseText, empresa);
}

// Retornar o resultado para o bluechat-inbound
return new Response(JSON.stringify({
  action: 'RESPOND',
  responseText: aiResponse,
  suggestedNext: suggestedNext,
  intent: detectedIntent,
  confidence: intentConfidence,
  leadReady: isLeadReady,
  shouldEscalate: needsHuman,
  escalationReason: escalationReason,
  priority: priority,
}), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});
```

### Por que essa mudança?

```
SEM a mudança (PROBLEMA - mensagem duplicada):
  Cliente → ChatBlue → BlueToken AI → sdr-ia-interpret → whatsapp-send (Mensageria)
                    ↓                                           ↓
              ChatBlue envia                           Mensageria envia
              resposta via                             resposta via
              WhatsApp ❌                              WhatsApp ❌
              (DUPLICADO!)                             (OUTRO NÚMERO!)

COM a mudança (CORRETO):
  Cliente → ChatBlue → BlueToken AI → sdr-ia-interpret (gera resposta, NÃO envia)
                    ↓                        ↓
              ChatBlue recebe ← ← ← ← resposta HTTP
              resposta e envia
              via WhatsApp ✅
              (pelo mesmo número!)
```

---

## 4. API do ChatBlue para o BlueToken AI (Opcional)

Além do webhook, o BlueToken AI também pode **chamar a API do ChatBlue** diretamente para ações como enviar mensagens, transferir tickets, etc.

### Base URL

```
https://chat.grupoblue.com.br/api/external-ai
```

### Autenticação

Todas as requisições devem incluir o header:

```
X-API-Key: <API_KEY_GERADA_NO_CADASTRO>
```

A API Key é gerada automaticamente ao cadastrar a IA externa no ChatBlue e pode ser visualizada/copiada na tela de configuração.

### Endpoints Disponíveis

#### POST /messages — Enviar mensagem

```bash
curl -X POST https://chat.grupoblue.com.br/api/external-ai/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "ticketId": "cm1abc123def456",
    "content": "Olá! Como posso ajudar?",
    "type": "TEXT"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "message": {
    "id": "cm1msg123",
    "type": "TEXT",
    "content": "Olá! Como posso ajudar?",
    "status": "SENT",
    "createdAt": "2026-01-30T14:35:00.000Z"
  }
}
```

#### POST /tickets/:id/transfer — Transferir ticket

```bash
curl -X POST https://chat.grupoblue.com.br/api/external-ai/tickets/cm1abc123def456/transfer \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "toDepartmentId": "cm1dept_vendas",
    "reason": "Lead qualificado, pronto para consultor"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "ticket": {
    "id": "cm1abc123def456",
    "status": "PENDING",
    "departmentId": "cm1dept_vendas",
    "departmentName": "Vendas",
    "assignedToId": null,
    "assignedToName": null
  }
}
```

#### POST /tickets/:id/resolve — Resolver ticket

```bash
curl -X POST https://chat.grupoblue.com.br/api/external-ai/tickets/cm1abc123def456/resolve \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "reason": "Cliente qualificado e informações enviadas"
  }'
```

#### POST /tickets/:id/close — Fechar ticket

```bash
curl -X POST https://chat.grupoblue.com.br/api/external-ai/tickets/cm1abc123def456/close \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "reason": "Conversa encerrada pelo cliente"
  }'
```

#### GET /tickets/:id — Detalhes do ticket

```bash
curl -X GET https://chat.grupoblue.com.br/api/external-ai/tickets/cm1abc123def456 \
  -H "X-API-Key: SUA_API_KEY"
```

**Resposta:**
```json
{
  "ticket": {
    "id": "cm1abc123def456",
    "protocol": "202601301430-001",
    "status": "IN_PROGRESS",
    "isAIHandled": true,
    "createdAt": "2026-01-30T14:30:00.000Z",
    "contact": {
      "id": "cm1contact123",
      "name": "João Silva",
      "phone": "5511999998888",
      "email": "joao@email.com"
    },
    "department": {
      "id": "cm1dept_ia",
      "name": "Atendimento IA"
    },
    "assignedTo": {
      "id": "cm1ai_user",
      "name": "SDR Tokeniza",
      "isAI": true
    },
    "messageCount": 5
  }
}
```

#### GET /tickets/:id/messages — Histórico de mensagens

```bash
curl -X GET "https://chat.grupoblue.com.br/api/external-ai/tickets/cm1abc123def456/messages?limit=50&offset=0" \
  -H "X-API-Key: SUA_API_KEY"
```

**Resposta:**
```json
{
  "messages": [
    {
      "id": "cm1msg001",
      "type": "TEXT",
      "content": "Olá, gostaria de saber sobre investimentos",
      "isFromMe": false,
      "isAIGenerated": false,
      "status": "DELIVERED",
      "createdAt": "2026-01-30T14:30:00.000Z",
      "role": "customer",
      "sender": null
    },
    {
      "id": "cm1msg002",
      "type": "TEXT",
      "content": "Olá João! Temos várias opções de investimento...",
      "isFromMe": true,
      "isAIGenerated": true,
      "status": "SENT",
      "createdAt": "2026-01-30T14:30:05.000Z",
      "role": "assistant",
      "sender": {
        "id": "cm1ai_user",
        "name": "SDR Tokeniza",
        "isAI": true
      }
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## 5. Configuração no ChatBlue

A configuração é feita na tela **Atendentes IA** do painel administrativo.

### Campos a preencher

| Campo | Valor | Descrição |
|-------|-------|-----------|
| Nome | `SDR Tokeniza` | Nome do agente IA |
| Email | `sdr@tokeniza.com` | Email identificador |
| Tipo de IA | **IA Externa** | Selecionar "IA Externa" |
| URL do Webhook | `https://<project>.supabase.co/functions/v1/bluechat-inbound` | URL do Edge Function |
| Formato do Payload | **BlueChatPayload** | Compatível com bluetoken-ai |
| Tipo de Autenticação | **Bearer Token** | Usa Authorization: Bearer |
| Bearer Token | `<WHATSAPP_INBOUND_SECRET>` | Token de autenticação do bluechat-inbound |
| Empresa | **Tokeniza** | Contexto da empresa |
| Auto-Resposta | ✅ Ativado | Envia resposta ao cliente automaticamente |
| Auto-Escalação | ✅ Ativado | Transfere quando IA pede escalação |
| Departamento para Escalação | `Vendas` (ou outro) | Para onde transferir na escalação |
| Setores | Selecionar o departamento desejado | Em qual setor a IA vai atuar |

---

## 6. Diagrama do Fluxo Completo

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Cliente    │     │    ChatBlue     │     │  BlueToken AI    │
│  (WhatsApp)  │     │   (Backend)     │     │  (Supabase)      │
└──────┬───────┘     └───────┬─────────┘     └────────┬─────────┘
       │                     │                        │
       │  1. Envia mensagem  │                        │
       │ ──────────────────> │                        │
       │                     │                        │
       │                     │  2. POST /bluechat-    │
       │                     │     inbound            │
       │                     │  (BlueChatPayload +    │
       │                     │   source=BLUECHAT)     │
       │                     │ ─────────────────────> │
       │                     │                        │
       │                     │                        │ 3. Processa
       │                     │                        │    com IA
       │                     │                        │    (sdr-ia-
       │                     │                        │     interpret)
       │                     │                        │
       │                     │                        │ 4. NÃO chama
       │                     │                        │    whatsapp-send
       │                     │                        │    (source=BLUECHAT)
       │                     │                        │
       │                     │  5. Retorna resposta   │
       │                     │     HTTP 200           │
       │                     │  (BlueChatResponse)    │
       │                     │ <───────────────────── │
       │                     │                        │
       │  6. Envia resposta  │                        │
       │     da IA via       │                        │
       │     WhatsApp        │                        │
       │ <────────────────── │                        │
       │                     │                        │
       │  (mesmo número!)    │                        │
       │                     │                        │

  [Se escalation.needed = true]
       │                     │                        │
       │  7. Msg despedida   │                        │
       │ <────────────────── │                        │
       │                     │                        │
       │                     │  8. Ticket transferido │
       │                     │     para humano        │
       │                     │  (departamento         │
       │                     │   configurado)         │
       │                     │                        │
```

---

## 7. Resumo das Mudanças Necessárias

### Do lado do BlueToken AI:

| Arquivo | Mudança |
|---------|---------|
| `bluechat-inbound/index.ts` | Passar `source: 'BLUECHAT'` para o `sdr-ia-interpret` |
| `bluechat-inbound/index.ts` | Quando `source === 'BLUECHAT'`, retornar `BlueChatResponse` no body HTTP |
| `sdr-ia-interpret/index.ts` | Receber flag `source` |
| `sdr-ia-interpret/index.ts` | Quando `source === 'BLUECHAT'`, **NÃO chamar `whatsapp-send`** |
| `sdr-ia-interpret/index.ts` | Retornar o resultado da IA como JSON para o `bluechat-inbound` |

### Do lado do ChatBlue (já implementado):

- ✅ Webhook envia `BlueChatPayload` com `context.source = 'BLUECHAT'`
- ✅ Autenticação via Bearer Token
- ✅ Processamento síncrono da resposta
- ✅ Auto-envio de resposta ao cliente via WhatsApp
- ✅ Auto-escalação quando IA pede
- ✅ API disponível para ações diretas (opcional)

---

## 8. Perguntas Frequentes

**P: E se o BlueToken AI demorar mais de 30 segundos para responder?**
R: O ChatBlue tem um timeout de 30s. Se ultrapassar, a mensagem não será respondida automaticamente. O BlueToken AI pode usar a API (`POST /api/external-ai/messages`) para enviar a resposta depois.

**P: E se o webhook falhar?**
R: O ChatBlue tenta 4 vezes (1s, 3s, 9s de intervalo). Se todas falharem, a mensagem fica sem resposta. O ticket permanece atribuído à IA.

**P: Posso usar a API em vez do webhook síncrono?**
R: Sim! Se preferirem o modelo assíncrono, podem configurar o formato do payload como "ChatBlue (genérico)" no painel. Nesse caso, o ChatBlue envia o webhook fire-and-forget e o BlueToken AI usa a API para enviar mensagens de volta.

**P: A IA externa pode enviar imagens, documentos ou áudios?**
R: Sim, pela API. Basta usar o endpoint `POST /api/external-ai/messages` com `type: "IMAGE"` e `mediaUrl`:
```json
{
  "ticketId": "cm1abc123def456",
  "type": "IMAGE",
  "mediaUrl": "https://exemplo.com/imagem.jpg",
  "caption": "Veja nossa proposta"
}
```

**P: Como testar a integração?**
R: 
1. Configure a IA externa no ChatBlue com a URL do webhook
2. Envie uma mensagem pelo WhatsApp para o número conectado
3. Verifique nos logs do Supabase se o `bluechat-inbound` recebeu o payload
4. Verifique se a resposta está sendo enviada de volta ao cliente

---

## Contato

Qualquer dúvida sobre a integração, entre em contato:
- **ChatBlue (lado técnico):** mychel@blueconsult.com.br
