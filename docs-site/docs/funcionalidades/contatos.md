---
sidebar_position: 3
title: Contatos
description: Gerenciamento de contatos, tags e integracao com Notion
---

# Contatos

O modulo de Contatos gerencia todas as pessoas que interagem com a empresa pelo ChatBlue. Contatos sao criados automaticamente ao receber mensagens e podem ser enriquecidos com dados do Notion.

## Visao Geral

O sistema de contatos oferece:

- **Criacao automatica** ao receber mensagem de um numero novo
- **Campos customizados** para informacoes especificas do negocio
- **Sistema de tags** para categorizacao livre
- **Sincronizacao com Notion** para dados de CRM
- **Historico completo** de tickets vinculados
- **Busca avancada** por nome, telefone ou email
- **Janela de mensageria** -- verificacao da regra de 24h do WhatsApp
- **Importacao em lote** de contatos via API

## Modelo de Dados

### Campos do Contato

```prisma
model Contact {
  id              String    @id @default(cuid())
  companyId       String
  phone           String?                   // Telefone (opcional)
  canonicalPhone  String?                   // Telefone normalizado (sem nono digito duplicado)
  name            String?
  email           String?
  avatarUrl       String?
  tags            String[]  @default([])
  notes           String?
  customFields    Json?
  isActive        Boolean   @default(true)
  lastMessageAt   DateTime?

  // Identificadores de canal
  instagramId     String?                   // ID do perfil Instagram
  lidId           String?                   // WhatsApp Linked ID

  // Dados de cliente (sincronizados do Notion)
  isClient        Boolean   @default(false)
  isExClient      Boolean   @default(false)
  clientSince     DateTime?

  // Integracao Notion
  notionPageId    String?                   // ID da pagina no Notion

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  company  Company   @relation(fields: [companyId], references: [id])
  tickets  Ticket[]

  @@unique([phone, companyId])
  @@index([companyId, canonicalPhone])
}
```

**Observacoes sobre o schema:**

- IDs usam `cuid()`, nao `uuid()`.
- `phone` e opcional (`String?`) porque contatos podem vir de canais como Instagram, onde o identificador e o `instagramId`.
- `canonicalPhone` armazena o telefone normalizado, util para evitar duplicatas causadas por variacao de formato (ex: com e sem nono digito).
- Os campos antigos `notionClientStatus` e `notionClientSince` foram substituidos por `isClient`, `isExClient` e `clientSince`.
- O campo `notionPageId` continua existindo para manter o link com a pagina do Notion.
- A constraint unique e `@@unique([phone, companyId])` -- a ordem importa.

## Endpoints da API

Todas as rotas exigem autenticacao (`authenticate`) e contexto de tenant (`ensureTenant`). A base e `/api/contacts`.

### GET /contacts -- Listar contatos

Retorna lista paginada de contatos ativos da empresa.

**Query parameters:**

| Parametro  | Tipo    | Descricao                                    |
|------------|---------|----------------------------------------------|
| `search`   | string  | Busca por nome, telefone ou email            |
| `isClient` | string  | Filtrar por status de cliente (`true`/`false`)|
| `tag`      | string  | Filtrar por tag especifica                   |
| `page`     | string  | Pagina (default: `1`)                        |
| `limit`    | string  | Itens por pagina (default: `20`)             |

**Resposta:**

```json
{
  "contacts": [
    {
      "id": "clxyz...",
      "phone": "5511999999999",
      "name": "Joao Silva",
      "tags": ["Cliente", "VIP"],
      "isClient": true,
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "_count": { "tickets": 3 }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1234,
    "pages": 62
  }
}
```

### GET /contacts/search -- Busca avancada (autocomplete)

Retorna contatos para autocomplete. Exige pelo menos 2 caracteres no parametro `q`.

**Query parameters:**

| Parametro | Tipo   | Descricao                          |
|-----------|--------|------------------------------------|
| `q`       | string | Termo de busca (minimo 2 chars)    |
| `limit`   | string | Maximo de resultados (default: `10`)|

**Resposta:**

```json
[
  {
    "id": "clxyz...",
    "phone": "5511999999999",
    "name": "Joao Silva",
    "email": "joao@email.com",
    "avatar": "https://...",
    "isClient": true
  }
]
```

Retorna array vazio se `q` tiver menos de 2 caracteres.

### GET /contacts/:id -- Detalhes do contato

Retorna o contato com os ultimos 10 tickets vinculados, incluindo dados do agente atribuido e departamento.

**Resposta:** Objeto do contato com `tickets` (array) e `_count.tickets` (total).

### GET /contacts/phone/:phone -- Buscar por telefone

Busca um contato pelo numero de telefone exato.

**Parametros de rota:**

| Parametro | Tipo   | Descricao           |
|-----------|--------|---------------------|
| `phone`   | string | Numero do telefone  |

Retorna `404` se nao encontrado.

### POST /contacts -- Criar contato

Cria um novo contato. Verifica duplicatas por `phone` e `canonicalPhone` antes de criar.

**Body:**

```json
{
  "phone": "+5511999999999",
  "name": "Joao Silva",
  "email": "joao@email.com",
  "tags": ["Cliente", "VIP"],
  "notes": "Cliente preferencial"
}
```

| Campo   | Tipo     | Obrigatorio | Descricao                  |
|---------|----------|-------------|----------------------------|
| `phone` | string   | Sim         | Telefone (minimo 10 chars) |
| `name`  | string   | Nao         | Nome do contato            |
| `email` | string   | Nao         | Email valido               |
| `tags`  | string[] | Nao         | Lista de tags              |
| `notes` | string   | Nao         | Notas sobre o contato      |

O telefone e normalizado (caracteres nao-numericos removidos) e o `canonicalPhone` e gerado automaticamente. Retorna `400` se ja existir contato com o mesmo telefone.

### PUT /contacts/:id -- Atualizar contato

Atualiza dados de um contato existente. Registra atividade de auditoria.

**Body:**

```json
{
  "name": "Joao Carlos Silva",
  "email": "joao.carlos@email.com",
  "tags": ["Cliente", "VIP", "Premium"],
  "notes": "Atualizado em janeiro",
  "customFields": { "empresa": "Tech Solutions" }
}
```

| Campo          | Tipo   | Descricao                             |
|----------------|--------|---------------------------------------|
| `name`         | string | Nome (minimo 1 char)                  |
| `email`        | string | Email valido, string vazia ou `null`  |
| `tags`         | string[]| Lista completa de tags               |
| `notes`        | string | Notas (aceita `null` para limpar)     |
| `customFields` | object | Campos customizados livres            |

Todos os campos sao opcionais. Email aceita string vazia ou `null` para limpar o valor.

### POST /contacts/:id/tags -- Adicionar tag

Adiciona uma tag ao contato sem duplicar (usa `Set`).

**Body:**

```json
{
  "tag": "VIP"
}
```

### DELETE /contacts/:id/tags/:tag -- Remover tag

Remove uma tag especifica do contato.

**Parametros de rota:**

| Parametro | Tipo   | Descricao      |
|-----------|--------|----------------|
| `tag`     | string | Nome da tag    |

### POST /contacts/:id/sync-notion -- Sincronizar com Notion

Busca dados do contato no Notion (por telefone e email) e atualiza os campos `notionPageId`, `isClient`, `isExClient` e `clientSince`.

Requer que a empresa tenha `notionApiKey` e `notionDatabaseId` configurados nas settings. Retorna `404` se a integracao nao estiver configurada.

**Resposta quando encontrado no Notion:** Objeto do contato atualizado.

**Resposta quando nao encontrado:**

```json
{
  "...campos do contato",
  "notionStatus": "not_found"
}
```

### GET /contacts/:id/messaging-window -- Janela de mensageria

Verifica se a janela de 24 horas do WhatsApp (Meta Cloud API) esta aberta para o contato. A janela abre quando o contato envia uma mensagem e dura 24 horas.

**Resposta:**

```json
{
  "contactId": "clxyz...",
  "phone": "5511999999999",
  "isOpen": true,
  "expiresAt": "2024-01-16T10:30:00.000Z",
  "hoursRemaining": 18,
  "lastMessageAt": "2024-01-15T10:30:00.000Z",
  "requiresTemplate": false
}
```

| Campo              | Tipo    | Descricao                                         |
|--------------------|---------|----------------------------------------------------|
| `isOpen`           | boolean | Se a janela esta aberta                            |
| `expiresAt`        | string  | Quando a janela expira (ou `null`)                 |
| `hoursRemaining`   | number  | Horas restantes (ou `null`)                        |
| `lastMessageAt`    | string  | Ultima mensagem recebida do contato (ou `null`)    |
| `requiresTemplate` | boolean | Se e necessario usar template para enviar mensagem |

Quando `requiresTemplate` e `true`, mensagens livres nao podem ser enviadas -- apenas templates aprovados pela Meta.

### POST /contacts/fix-phones -- Corrigir telefones (admin)

Rota administrativa para normalizar telefones que contem `@` (resquicio de formato antigo). Remove sufixo `@...` e caracteres nao-numericos.

**Requer:** `requireAdmin`

**Resposta:**

```json
{
  "message": "Fixed 15 contacts, 2 errors",
  "fixed": 15,
  "errors": 2,
  "total": 17
}
```

### POST /contacts/import -- Importar contatos em lote (admin)

Importa uma lista de contatos em lote. Verifica duplicatas por `phone` e `canonicalPhone`.

**Requer:** `requireAdmin`

**Body:**

```json
{
  "contacts": [
    { "phone": "+5511999999999", "name": "Joao Silva", "email": "joao@email.com" },
    { "phone": "+5511888888888", "name": "Maria Santos" }
  ],
  "skipDuplicates": true
}
```

| Campo            | Tipo    | Descricao                                          |
|------------------|---------|-----------------------------------------------------|
| `contacts`       | array   | Lista de contatos (phone obrigatorio, min 10 chars) |
| `skipDuplicates` | boolean | Se `true`, ignora duplicatas; se `false`, atualiza  |

**Resposta:**

```json
{
  "message": "Import completed: 10 imported, 3 skipped, 1 errors",
  "imported": 10,
  "skipped": 3,
  "errors": [
    { "phone": "123", "error": "Invalid phone number" }
  ]
}
```

## Sistema de Tags

### Funcionalidades

- **Criacao livre** -- tags sao strings sem cadastro previo
- **Sem duplicatas** -- ao adicionar, o sistema usa `Set` para evitar repeticao
- **Filtros** -- listar contatos filtrando por tag via query parameter
- **Endpoints dedicados** -- adicionar e remover tags individualmente

### Tags Comuns

| Tag       | Uso                       |
|-----------|---------------------------|
| Cliente   | Clientes ativos           |
| Lead      | Potenciais clientes       |
| VIP       | Clientes preferenciais    |
| Prospect  | Em negociacao             |
| Inativo   | Sem contato recente       |
| Parceiro  | Parceiros comerciais      |

## Campos Customizados

Os campos customizados sao armazenados como JSON flexivel no campo `customFields`:

```json
{
  "empresa": "Tech Solutions Ltda",
  "cargo": "Diretor de TI",
  "funcionarios": 50,
  "aniversario": "1985-06-15",
  "newsletter": true,
  "interesses": ["Software", "Cloud", "IA"]
}
```

Nao ha schema fixo para custom fields -- qualquer estrutura JSON e aceita.

## Sincronizacao com Notion

### Visao Geral

A integracao com o Notion permite:

- **Busca automatica** de dados de clientes por telefone/email
- **Enriquecimento** do contato com status de cliente
- **Link direto** para pagina no Notion via `notionPageId`

### Dados Sincronizados

| Campo ChatBlue  | Origem Notion  | Descricao                          |
|-----------------|----------------|------------------------------------|
| `notionPageId`  | Page ID        | ID da pagina do cliente no Notion  |
| `isClient`      | Status         | Se e cliente ativo                 |
| `isExClient`    | Status         | Se e ex-cliente                    |
| `clientSince`   | Cliente Desde  | Data que se tornou cliente         |

### Fluxo de Sincronizacao

```
1. Usuario clica "Sincronizar com Notion" (POST /contacts/:id/sync-notion)
2. Sistema busca companySettings para obter notionApiKey e notionDatabaseId
3. NotionService.findContact() busca por telefone e email no database do Notion
4. Se encontrado: atualiza isClient, isExClient, clientSince e notionPageId
5. Se nao encontrado: retorna contato com notionStatus: "not_found"
```

### Configuracao Necessaria

A empresa precisa ter configurado em `companySettings`:

- `notionApiKey` -- chave de API do Notion (Integration Token)
- `notionDatabaseId` -- ID do database de clientes no Notion

Sem essas configuracoes, o endpoint retorna erro `404` com mensagem "Notion integration not configured".

## Integracao com Outras Funcionalidades

### Tickets

- Cada ticket e vinculado a um contato
- Detalhes do contato incluem os ultimos 10 tickets
- Tags do contato podem influenciar regras de atendimento

### Janela de Mensageria (WhatsApp)

- A regra de 24h da Meta Cloud API exige que o contato tenha enviado mensagem nas ultimas 24 horas para receber mensagens livres
- Fora da janela, apenas templates aprovados podem ser enviados
- O endpoint `messaging-window` permite verificar o status antes de enviar

### SLA

- Contatos marcados como `isClient` podem ter regras de SLA diferenciadas
- Tags podem ser usadas para segmentar regras de SLA

### IA

- Contexto do contato (nome, historico, tags) e enviado para o agente de IA
- IA usa esses dados para personalizar respostas

## Boas Praticas

### Para Agentes

1. **Mantenha dados atualizados** -- corrija nome e email quando o cliente informar
2. **Use tags consistentes** -- siga o padrao definido pela empresa
3. **Adicione notas relevantes** -- contexto que ajuda colegas no proximo atendimento
4. **Verifique a janela de mensageria** -- antes de enviar mensagem fora de um ticket ativo

### Para Administradores

1. **Configure a integracao Notion** -- enriquece dados automaticamente
2. **Defina padrao de tags** -- documente quais tags devem ser usadas
3. **Use importacao em lote** -- para migracoes e campanhas
4. **Execute fix-phones se necessario** -- normaliza telefones com formato antigo
5. **Monitore contatos inativos** -- revise periodicamente

## Proximos Passos

- [Departamentos](/funcionalidades/departamentos) -- organizacao hierarquica
- [Tickets](/funcionalidades/tickets) -- gerenciamento de atendimento
- [FAQ](/funcionalidades/faq) -- perguntas frequentes
