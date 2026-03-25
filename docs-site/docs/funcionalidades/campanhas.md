---
sidebar_position: 12
title: Campanhas e Disparos
description: Disparos em massa e importacao de contatos para campanhas no ChatBlue
---

# Campanhas e Disparos

O ChatBlue permite receber notificacoes de disparos em massa realizados por plataformas de mensageria externas, criando tickets automaticamente para cada contato da campanha. O sistema nao envia as mensagens diretamente -- ele registra os disparos para que os atendentes vejam as conversas quando os clientes responderem.

## Visao Geral

O fluxo de campanhas funciona como integracao entre uma plataforma de mensageria externa (que efetivamente dispara as mensagens via WhatsApp) e o ChatBlue (que gerencia o atendimento):

```
Plataforma de Mensageria          ChatBlue
+---------------------+          +---------------------+
| 1. Cria campanha    |          |                     |
| 2. Dispara mensagens|---POST-->| 3. Recebe webhook   |
|    via WhatsApp     |          | 4. Cria contatos    |
+---------------------+          | 5. Cria tickets     |
                                 | 6. Grava mensagem   |
        Cliente responde         |    (historico)       |
        via WhatsApp    -------->| 7. Atendente ve a   |
                                 |    conversa completa |
                                 +---------------------+
```

A mensagem gravada no ticket e apenas para referencia do atendente -- o envio real da mensagem ao cliente e feito pela plataforma externa.

## Modelo de Dados (CampaignDispatch)

O model `CampaignDispatch` garante idempotencia no processamento de webhooks:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | String (CUID) | Identificador unico |
| `companyId` | String | Empresa que recebeu o disparo |
| `campaignId` | Int | ID da campanha na plataforma externa |
| `dispatchedAt` | DateTime | Data/hora do disparo |
| `createdAt` | DateTime | Quando o registro foi criado no ChatBlue |

### Chave Unica de Idempotencia

O model possui uma chave unica composta por `companyId + campaignId + dispatchedAt`. Isso garante que o mesmo disparo nao seja processado duas vezes, mesmo que o webhook seja enviado novamente.

### Campos no Ticket

Tickets criados por campanhas possuem campos adicionais:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `campaignId` | Int | ID da campanha que originou o ticket |
| `campaignDispatchedAt` | DateTime | Data/hora do disparo da campanha |

Na interface, o filtro `massDispatchOnly` permite visualizar apenas tickets originados por campanhas.

## Webhook de Campanha Disparada

### Endpoint

```
POST /api/webhooks/campaign-dispatched
```

### Autenticacao

Quando a variavel de ambiente `CHAT_WEBHOOK_SECRET` esta definida, o webhook exige autenticacao via Bearer token no header `Authorization`:

```
Authorization: Bearer {CHAT_WEBHOOK_SECRET}
```

Se a variavel nao estiver definida, o endpoint aceita requisicoes sem autenticacao.

### Payload

```json
{
  "event": "campaign.dispatched",
  "dispatchedAt": "2024-01-15T14:30:00.000Z",
  "campaignId": 42,
  "campaignName": "Promocao Janeiro",
  "company": "Nome da Empresa",
  "message": "Ola! Temos uma oferta especial para voce...",
  "contacts": [
    { "phone": "5511999998888", "name": "Joao Silva" },
    { "phone": "5511888887777", "name": null }
  ]
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `event` | String | Sim | Deve ser `campaign.dispatched` |
| `dispatchedAt` | String (ISO 8601) | Sim | Data/hora do disparo |
| `campaignId` | Int (positivo) | Sim | ID unico da campanha |
| `campaignName` | String | Sim | Nome da campanha (minimo 1 caractere) |
| `company` | String | Sim | Nome da empresa (busca case-insensitive com `contains`) |
| `message` | String | Sim | Mensagem disparada (gravada no historico do ticket) |
| `contacts` | Array | Sim | Lista de contatos com telefone |
| `contacts[].phone` | String | Sim | Telefone do contato |
| `contacts[].name` | String? | Nao | Nome do contato |

### Fluxo de Processamento

```
Webhook recebido
       |
       v
1. Valida payload (Zod schema)
       |
       v
2. Busca empresa pelo nome (case-insensitive, ativa)
       |  Se nao encontrada -> 400 "Empresa nao encontrada"
       v
3. Busca conexao WhatsApp ativa e conectada
       |  Prefere conexao padrao (isDefault) ou mais recente
       |  Se nenhuma ativa -> 400 "Nenhuma conexao WhatsApp ativa"
       v
4. Busca departamento "Comercial" (case-insensitive)
       |  Se nao encontrado -> 400 "Departamento Comercial nao encontrado"
       v
5. Verifica idempotencia (CampaignDispatch)
       |  Se ja processado -> 200 { ok: true, alreadyProcessed: true }
       v
6. Cria registro CampaignDispatch
       |
       v
7. Processa contatos (processCampaignContacts)
       |
       v
8. Retorna { ok: true, ticketsCreated: N, ticketsUpdated: N }
```

### Processamento de Contatos

Para cada contato na lista:

1. **Normaliza telefone** -- Remove caracteres nao-numericos; se tem 10 digitos, assume Brasil (prefixo 55)
2. **Deduplica** -- Remove telefones repetidos na mesma requisicao
3. **Busca contato existente** -- Por telefone direto, variacao com/sem prefixo 55, ou `canonicalPhone`
4. **Cria contato se necessario** -- Com nome (se fornecido)
5. **Verifica ticket aberto** -- Busca ticket com status PENDING, IN_PROGRESS ou WAITING para o mesmo contato e conexao
6. **Se ticket aberto existe** -- Atualiza `campaignId` e `campaignDispatchedAt`
7. **Se nao existe** -- Cria novo ticket com:
   - Status: `PENDING`
   - Prioridade: `MEDIUM`
   - Departamento: Comercial
   - SLA calculado automaticamente
   - `campaignId` e `campaignDispatchedAt` preenchidos
8. **Grava mensagem** -- Cria mensagem no ticket com `isFromMe: true` e `status: DELIVERED` (apenas para referencia do atendente)

O processamento e feito em lotes de 200 contatos.

## Importacao de Contatos (Autenticada)

### Endpoint

```
POST /api/webhooks/import
```

Requer autenticacao (usuario logado). Diferente do webhook de campanha, esse endpoint e chamado pela interface do ChatBlue.

### Payload

```json
{
  "contacts": [
    { "phone": "11999998888", "name": "Joao", "message": "Mensagem personalizada" },
    { "phone": "11888887777" }
  ],
  "message": "Mensagem padrao do disparo",
  "campaignId": 42,
  "campaignName": "Importacao Manual",
  "dispatchedAt": "2024-01-15T14:30:00.000Z"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `contacts` | Array | Sim | Lista de contatos (max 5000) |
| `contacts[].phone` | String | Sim | Telefone (min 10 digitos) |
| `contacts[].name` | String? | Nao | Nome do contato |
| `contacts[].message` | String? | Nao | Mensagem personalizada (sobrepoe a mensagem padrao) |
| `message` | String? | Nao | Mensagem padrao para todos os contatos |
| `campaignId` | Number? | Nao | ID da campanha (se omitido, gera automaticamente com timestamp) |
| `dispatchedAt` | String? | Nao | Data do disparo (se omitido, usa data atual) |

### Diferencas do Webhook de Campanha

| Aspecto | Webhook (`campaign-dispatched`) | Import (`import`) |
|---------|------|--------|
| Autenticacao | Bearer token (opcional) | Usuario logado (obrigatorio) |
| Empresa | Identificada pelo campo `company` | Identificada pelo usuario logado |
| Mensagem personalizada | Nao (mesma mensagem para todos) | Sim (por contato) |
| Ticket existente | Atualiza `campaignId`, nao adiciona mensagem | Atualiza `campaignId` e adiciona mensagem |
| Limite de contatos | Sem limite explicito | 5000 contatos |
| Tamanho do arquivo | N/A | 1 MB (para upload CSV) |

## Respostas de Erro

| Codigo | Cenario | Mensagem |
|--------|---------|----------|
| 400 | Payload invalido (Zod) | `Payload invalido` + detalhes |
| 400 | Empresa nao encontrada | `Empresa nao encontrada: "Nome"` |
| 400 | Sem conexao WhatsApp | `Nenhuma conexao WhatsApp ativa encontrada` |
| 400 | Sem departamento Comercial | `Departamento Comercial nao encontrado` |
| 401 | Token invalido (se `CHAT_WEBHOOK_SECRET` definido) | `Invalid or missing webhook secret` |

## Configuracao

### Variaveis de Ambiente

| Variavel | Descricao |
|----------|-----------|
| `CHAT_WEBHOOK_SECRET` | Token de autenticacao para o webhook de campanha (opcional) |

### Pre-requisitos

Para que o processamento de campanhas funcione corretamente:

1. **Empresa ativa** -- A empresa deve estar cadastrada e com `isActive: true`
2. **Conexao WhatsApp ativa** -- Pelo menos uma conexao WhatsApp ativa e (preferencialmente) conectada
3. **Departamento Comercial** -- Um departamento com "comercial" no nome deve existir e estar ativo

## Boas Praticas

### Integracao

1. **Use CHAT_WEBHOOK_SECRET** -- Configure autenticacao para proteger o endpoint contra chamadas nao autorizadas
2. **Idempotencia** -- O sistema ja trata duplicatas; mesmo assim, evite reenvios desnecessarios
3. **Normalizacao de telefones** -- Envie telefones com codigo de pais (ex: 5511999998888) para evitar ambiguidade
4. **Nomes dos contatos** -- Envie nomes quando disponiveis para facilitar a identificacao pelos atendentes

### Operacional

1. **Departamento Comercial** -- Certifique-se de que o departamento existe antes de configurar a integracao
2. **Monitore tickets** -- Apos um disparo, tickets sao criados com status PENDING; garanta que ha atendentes disponiveis
3. **Filtro de campanha** -- Use o filtro `massDispatchOnly` na listagem de tickets para acompanhar resultados de campanhas

## Proximos Passos

- [Tickets](/funcionalidades/tickets) -- Gestao completa de tickets e filtros de campanha
- [Contatos](/funcionalidades/contatos) -- Gestao de contatos importados
- [Canal de Email](/funcionalidades/email) -- Atendimento via email
- [Canal Instagram](/funcionalidades/instagram) -- Atendimento via Instagram DMs
