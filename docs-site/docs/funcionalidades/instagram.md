---
sidebar_position: 11
title: Canal Instagram
description: Canal de atendimento via Instagram Direct Messages no ChatBlue
---

# Canal Instagram

O ChatBlue permite atender clientes via mensagens diretas (DMs) do Instagram, centralizando as conversas na mesma interface utilizada para WhatsApp e Email.

## Visao Geral

O canal Instagram funciona como um tipo de conexao dentro do model `WhatsAppConnection`, com `type=INSTAGRAM`. Mensagens recebidas via Instagram DMs sao processadas da mesma forma que mensagens de WhatsApp: criam contatos, abrem tickets e permitem respostas diretamente pela interface do ChatBlue.

A integracao utiliza a API de Mensagens do Instagram (via Meta Graph API v18.0), recebendo eventos por webhooks e enviando respostas pela API.

## Conexao Instagram no Modelo de Dados

A conexao Instagram reutiliza o model `WhatsAppConnection` com campos especificos:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `type` | String | Valor: `INSTAGRAM` (diferencia de `META_CLOUD` e `BAILEYS`) |
| `instagramAccountId` | String | ID da conta Instagram Business/Professional (IGSID) |
| `instagramUsername` | String | Nome de usuario do Instagram (@usuario) |
| `accessToken` | String | Token de acesso da Meta Graph API |
| `webhookToken` | String | Token de verificacao para validacao dos webhooks |
| `isActive` | Boolean | Se a conexao esta ativa |
| `status` | String | Status da conexao: `CONNECTED`, `DISCONNECTED`, etc. |
| `companyId` | String | Empresa dona da conexao |

Os campos `phoneNumberId`, `wabaId` e outros especificos do WhatsApp nao sao utilizados para conexoes Instagram.

## Webhooks

O Instagram envia eventos para o ChatBlue via webhooks HTTP. Dois endpoints sao registrados por conexao:

### Verificacao (GET)

```
GET /api/webhooks/instagram/:connectionId
```

O Meta envia uma requisicao GET para verificar a propriedade do webhook. O sistema valida:

1. `hub.mode` deve ser `subscribe`
2. `hub.verify_token` deve corresponder ao `webhookToken` da conexao
3. A conexao deve existir e ter `type=INSTAGRAM`

Se valido, retorna o `hub.challenge` com status 200. Caso contrario, retorna 403 ou 404.

### Recebimento de Eventos (POST)

```
POST /api/webhooks/instagram/:connectionId
```

Recebe eventos de mensagens e interacoes do Instagram. O endpoint responde imediatamente com status 200 (para nao bloquear o Meta) e processa os eventos de forma assincrona.

**Estrutura do webhook:**

```json
{
  "object": "instagram",
  "entry": [
    {
      "messaging": [
        {
          "sender": { "id": "IGSID_DO_REMETENTE" },
          "recipient": { "id": "IGSID_DA_CONTA" },
          "timestamp": 1234567890,
          "message": {
            "mid": "MESSAGE_ID",
            "text": "Ola!"
          }
        }
      ]
    }
  ]
}
```

## Tipos de Mensagens Suportadas

### Mensagens Recebidas

O sistema processa os seguintes tipos de mensagens recebidas via webhook:

| Tipo | Descricao | Campo Salvo |
|------|-----------|-------------|
| **Texto** | Mensagem de texto simples | `content` = texto |
| **Imagem** | Foto enviada pelo cliente | `mediaUrl` = URL local (download automatico) |
| **Video** | Video enviado | `mediaUrl` = URL local |
| **Audio** | Mensagem de voz | `mediaUrl` = URL local |
| **Documento** | Arquivo enviado | `mediaUrl` = URL local |
| **Compartilhamento** | Post ou link compartilhado | `content` = URL do conteudo |
| **Story Mention** | Mencao da conta em um story | `content` = "[Story mention]" |
| **Reel** | Reel compartilhado | `mediaUrl` = URL local |
| **Sticker** | Sticker/figurinha | `content` = sticker ID |
| **Reaction** | Reacao a uma mensagem | Salvo no array `reactions` da mensagem |
| **Postback** | Resposta a botao interativo | `content` = titulo do botao |

Medias (imagens, videos, audios) sao baixadas automaticamente do Instagram e armazenadas localmente no servidor, com a URL convertida para o formato `/uploads/media/{filename}`.

### Mensagens Enviadas

O `InstagramService` permite enviar os seguintes tipos de mensagem via API:

| Metodo | Descricao |
|--------|-----------|
| `sendTextMessage` | Mensagem de texto |
| `sendImageMessage` | Imagem por URL |
| `sendVideoMessage` | Video por URL |
| `sendAudioMessage` | Audio por URL |
| `sendFileMessage` | Documento/arquivo por URL |
| `sendSticker` | Sticker (heart) |
| `sendHeartReaction` | Reacao de coracao |
| `sendReaction` | Reacao com emoji especifico |
| `removeReaction` | Remover reacao de mensagem |
| `sendIceBreaker` | Mensagem com quick replies (ate 13 opcoes) |
| `sendGenericTemplate` | Carousel de cards (ate 10 elementos, 3 botoes cada) |
| `sendProductTemplate` | Template de produto |

### Acoes de Interacao

| Metodo | Descricao |
|--------|-----------|
| `markAsSeen` | Marcar mensagens como lidas |
| `sendTypingIndicator` | Indicador de digitacao (typing on/off) |
| `getUserProfile` | Obter perfil do usuario (username, nome, foto) |
| `getAccountInfo` | Obter informacoes da conta conectada |
| `testConnection` | Testar se o token e valido |

## Contatos Instagram

Contatos que interagem via Instagram sao identificados pelo `instagramId` (IGSID -- Instagram Scoped ID). O IGSID e um identificador unico para cada usuario em relacao a sua conta do Instagram Business.

O campo `from` no processamento de mensagens contem o IGSID do remetente. O `MessageProcessor.processIncoming` e chamado com:

```typescript
{
  connectionId: connection.id,
  companyId: connection.companyId,
  from: senderId,          // IGSID do contato
  wamid: event.message.mid, // Message ID do Instagram
  type: "TEXT",
  content: "Ola!",
  timestamp: new Date(timestamp),
  metadata: {
    platform: "instagram",
    storyMention: { ... },   // Se for mencao em story
    storyReply: { ... },     // Se for resposta a story
  }
}
```

## Tickets Instagram

Tickets originados do Instagram possuem `channel=INSTAGRAM` e estao vinculados a uma `WhatsAppConnection` com `type=INSTAGRAM` via `connectionId`.

Na interface, tickets de Instagram sao exibidos junto com os de WhatsApp e Email, podendo ser filtrados pelo campo `channel`.

## Fluxo Completo

```
Cliente envia DM no Instagram
         |
         v
Meta envia webhook POST /api/webhooks/instagram/:connectionId
         |
         | Responde 200 imediatamente
         v
Valida conexao (type=INSTAGRAM, existe, ativa)
         |
         v
Ignora mensagens do proprio instagramAccountId (echo)
         |
         v
Extrai conteudo (texto, media, reacao, postback...)
         |
         +--[Reacao]--> handleInstagramReaction()
         |              Atualiza array reactions da mensagem
         |
         +--[Mensagem]--> MessageProcessor.processIncoming()
         |                |
         |                +-- Resolve contato (por IGSID)
         |                +-- Resolve ticket (channel=INSTAGRAM)
         |                +-- Cria mensagem no ticket
         |                +-- Emite evento socket
         |
         +--[Read receipt]--> Log apenas
         |
         +--[Postback]--> MessageProcessor.processIncoming()
         |                tipo INTERACTIVE
         |
         +--[Standby]--> Log apenas (outra app tem controle)
         v
Atendente ve a mensagem na interface do ChatBlue
         |
         v
Atendente responde -> InstagramService.sendTextMessage()
         |
         v
Meta entrega DM ao cliente no Instagram
```

## Reacoes

O sistema suporta reacoes em mensagens do Instagram:

### Recebimento

Quando o cliente reage a uma mensagem, o webhook envia um evento com `reaction.emoji` e `reaction.mid`. O sistema:

1. Busca a mensagem pelo `wamid` (mid)
2. Adiciona a reacao ao array `reactions` da mensagem (com `platform: 'instagram'`)
3. Emite evento socket `message:reaction` para atualizar a interface

### Envio

Atendentes podem enviar e remover reacoes usando:

- `sendReaction(recipientId, messageId, emoji)` -- Envia reacao
- `removeReaction(recipientId, messageId)` -- Remove reacao

## Boas Praticas

### Configuracao

1. **Token de acesso** -- Use um token de longa duracao da Meta Graph API para evitar expiracoes frequentes
2. **Webhook token** -- Defina um token seguro e unico para cada conexao
3. **Permissoes do app** -- O app do Facebook deve ter as permissoes `instagram_manage_messages` e `pages_messaging`

### Atendimento

1. **Tempo de resposta** -- O Instagram permite enviar mensagens ate 24 horas apos a ultima mensagem do cliente (regra de janela de mensagens)
2. **Midias** -- Imagens e videos enviados pelo cliente sao baixados automaticamente; verifique se o diretorio de uploads tem espaco suficiente
3. **Story mentions** -- Mencoes em stories sao registradas como mensagens de sistema; considere configurar respostas automaticas

## Proximos Passos

- [Tickets](/funcionalidades/tickets) -- Gestao completa de tickets
- [Canal de Email](/funcionalidades/email) -- Atendimento via email
- [Campanhas e Disparos](/funcionalidades/campanhas) -- Disparos em massa
