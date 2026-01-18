---
sidebar_position: 3
title: Contatos
description: Gerenciamento de contatos e sincronizacao com Notion
---

# Contatos

O modulo de Contatos permite gerenciar todos os clientes e leads que interagem com sua empresa atraves do ChatBlue, incluindo sincronizacao automatica com o Notion.

## Visao Geral

O sistema de contatos oferece:

- **Criacao automatica** ao receber mensagem
- **Campos customizados** para informacoes especificas
- **Sistema de tags** para categorizacao
- **Sincronizacao com Notion** para CRM
- **Historico completo** de interacoes
- **Merge de contatos** duplicados

## Interface do Usuario

### Lista de Contatos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Contatos                                       [+ Novo] [Importar] [Filtros]│
├─────────────────────────────────────────────────────────────────────────────┤
│  [Buscar por nome, telefone ou email...]                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────┬───────────────────────────────────────────────────────────────┐    │
│  │     │  Joao Silva                                                    │    │
│  │ 👤 │  +55 11 99999-9999 | joao@email.com                            │    │
│  │     │  [Cliente] [VIP]                        Ultima msg: ha 2 horas│    │
│  ├─────┼───────────────────────────────────────────────────────────────┤    │
│  │     │  Maria Santos                                                  │    │
│  │ 👤 │  +55 11 88888-8888 | maria@empresa.com                         │    │
│  │     │  [Lead] [Comercial]                     Ultima msg: ha 1 dia  │    │
│  ├─────┼───────────────────────────────────────────────────────────────┤    │
│  │     │  Pedro Costa                                                   │    │
│  │ 👤 │  +55 11 77777-7777                                             │    │
│  │     │  [Prospect]                             Ultima msg: ha 3 dias │    │
│  └─────┴───────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Mostrando 1-50 de 1.234 contatos                 [< Anterior] [Proximo >]  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detalhes do Contato

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Contato                                                     [Editar] [...]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐                                                           │
│   │             │   Joao Silva                                              │
│   │   Avatar    │   ──────────────────────────────────────────────          │
│   │             │                                                           │
│   └─────────────┘   Telefone: +55 11 99999-9999                            │
│                     Email: joao@email.com                                   │
│                     Criado em: 15/01/2024                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Tags                                                                       │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                     [+ Adicionar]    │
│   │ Cliente │ │   VIP   │ │ Premium │                                       │
│   └─────────┘ └─────────┘ └─────────┘                                       │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Notion                                                       [Sincronizar]│
│   ───────────────────────────────────────────────────                       │
│   Status: Cliente                                                           │
│   Cliente desde: Janeiro 2023                                               │
│   Plano: Enterprise                                                         │
│   Pagina: [Abrir no Notion]                                                 │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Campos Customizados                                          [+ Adicionar]│
│   ───────────────────────────────────────────────────                       │
│   Empresa: Tech Solutions Ltda                                              │
│   Cargo: Diretor de TI                                                      │
│   CNPJ: 12.345.678/0001-90                                                  │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Notas                                                        [+ Adicionar]│
│   ───────────────────────────────────────────────────                       │
│   Cliente desde 2023, sempre muito educado. Prefere                         │
│   contato por WhatsApp. Empresa com 50+ funcionarios.                       │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Historico de Tickets                                                       │
│   ───────────────────────────────────────────────────                       │
│   #2024-001234 | Comercial | Resolvido | 15/01/2024                        │
│   #2024-001100 | Suporte   | Fechado   | 10/01/2024                        │
│   #2023-005432 | Financeiro| Fechado   | 20/12/2023                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Modelo de Dados

### Campos do Contato

```prisma
model Contact {
  id             String    @id @default(uuid())
  companyId      String
  phone          String                    // Telefone (obrigatorio)
  name           String?                   // Nome
  email          String?                   // Email
  avatarUrl      String?                   // URL do avatar
  tags           String[]  @default([])    // Tags para categorizacao
  notes          String?                   // Notas sobre o contato
  customFields   Json?                     // Campos customizados
  lastMessageAt  DateTime?                 // Ultima mensagem
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Integracao Notion
  notionPageId      String?                // ID da pagina no Notion
  notionClientStatus String?               // Status do cliente
  notionClientSince DateTime?              // Cliente desde

  company Company   @relation(fields: [companyId], references: [id])
  tickets Ticket[]

  @@unique([companyId, phone])
}
```

## CRUD de Contatos

### Criar Contato

```typescript
// POST /api/contacts
{
  phone: "+5511999999999",
  name: "Joao Silva",
  email: "joao@email.com",
  tags: ["Cliente", "VIP"],
  notes: "Cliente preferencial",
  customFields: {
    empresa: "Tech Solutions",
    cargo: "Diretor de TI"
  }
}
```

### Atualizar Contato

```typescript
// PUT /api/contacts/:id
{
  name: "Joao Carlos Silva",
  email: "joao.carlos@email.com",
  tags: ["Cliente", "VIP", "Premium"]
}
```

### Listar Contatos

```typescript
// GET /api/contacts?page=1&limit=50&search=joao&tags=VIP
{
  data: [
    {
      id: "contact_123",
      phone: "+5511999999999",
      name: "Joao Silva",
      tags: ["Cliente", "VIP"],
      lastMessageAt: "2024-01-15T10:30:00Z"
    }
  ],
  pagination: {
    total: 1234,
    page: 1,
    limit: 50,
    pages: 25
  }
}
```

### Excluir Contato

```typescript
// DELETE /api/contacts/:id

// Soft delete - marca como inativo
// Tickets e mensagens sao mantidos para historico
```

## Sistema de Tags

### Funcionalidades

- **Criacao livre** - Tags sao criadas ao digitar
- **Auto-complete** - Sugere tags existentes
- **Cores** - Cada tag pode ter cor especifica
- **Filtros** - Filtrar contatos por tags
- **Relatorios** - Metricas por tag

### Tags Comuns

| Tag | Cor | Uso |
|-----|-----|-----|
| Cliente | Verde | Clientes ativos |
| Lead | Azul | Potenciais clientes |
| VIP | Dourado | Clientes preferenciais |
| Prospect | Cinza | Em negociacao |
| Inativo | Vermelho | Sem contato recente |
| Parceiro | Roxo | Parceiros comerciais |

### Gerenciamento de Tags

```
┌─────────────────────────────────────┐
│  Gerenciar Tags                     │
├─────────────────────────────────────┤
│                                     │
│  [+ Nova Tag]                       │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ ● Cliente     (156 contatos)  │ │
│  │ ● Lead        (89 contatos)   │ │
│  │ ● VIP         (23 contatos)   │ │
│  │ ● Prospect    (45 contatos)   │ │
│  │ ● Inativo     (12 contatos)   │ │
│  └────────────────────────────────┘ │
│                                     │
│  [Mesclar Tags]    [Excluir Vazias] │
│                                     │
└─────────────────────────────────────┘
```

## Campos Customizados

### Estrutura

Os campos customizados sao armazenados como JSON flexivel:

```typescript
customFields: {
  // Campos de texto
  empresa: "Tech Solutions Ltda",
  cargo: "Diretor de TI",

  // Campos numericos
  funcionarios: 50,

  // Campos de data
  aniversario: "1985-06-15",

  // Campos booleanos
  newsletter: true,

  // Campos de lista
  interesses: ["Software", "Cloud", "IA"]
}
```

### Configuracao de Campos

```
┌─────────────────────────────────────┐
│  Campos Customizados                │
├─────────────────────────────────────┤
│                                     │
│  [+ Novo Campo]                     │
│                                     │
│  Nome         Tipo      Obrigatorio │
│  ─────────────────────────────────  │
│  Empresa      Texto     [ ]         │
│  Cargo        Texto     [ ]         │
│  CNPJ         Texto     [ ]         │
│  Funcionarios Numero    [ ]         │
│  Aniversario  Data      [ ]         │
│  Newsletter   Checkbox  [ ]         │
│                                     │
│  [Salvar Configuracao]              │
│                                     │
└─────────────────────────────────────┘
```

## Sincronizacao com Notion

### Visao Geral

A integracao com o Notion permite:

- **Busca automatica** de dados de clientes
- **Sincronizacao bidirecional** de status
- **Enriquecimento** de informacoes do contato
- **Link direto** para pagina no Notion

### Fluxo de Sincronizacao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│    ChatBlue                                               Notion            │
│                                                                             │
│  ┌─────────────┐                                    ┌─────────────┐         │
│  │   Contato   │                                    │   Database  │         │
│  │   Criado    │                                    │   Clientes  │         │
│  └──────┬──────┘                                    └──────▲──────┘         │
│         │                                                  │                │
│         │  1. Novo contato                                 │                │
│         ▼                                                  │                │
│  ┌─────────────┐      2. Query por telefone/email   ┌─────┴─────┐          │
│  │   Notion    │─────────────────────────────────►  │   API     │          │
│  │   Service   │                                    │   Notion  │          │
│  └──────┬──────┘  ◄─────────────────────────────────└───────────┘          │
│         │              3. Retorna dados                                     │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                           │
│  │  Atualiza   │                                                           │
│  │  Contato    │                                                           │
│  │  - Status   │                                                           │
│  │  - Cliente  │                                                           │
│  │    desde    │                                                           │
│  │  - Page ID  │                                                           │
│  └─────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuracao do Notion

```
┌─────────────────────────────────────┐
│  Configuracao Notion                │
├─────────────────────────────────────┤
│                                     │
│  API Key:                           │
│  ┌─────────────────────────────┐    │
│  │ secret_xxxxxxxxxxxxx        │    │
│  └─────────────────────────────┘    │
│                                     │
│  Database ID:                       │
│  ┌─────────────────────────────┐    │
│  │ abc123def456...             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Mapeamento de Campos:              │
│  ┌─────────────────────────────┐    │
│  │ Telefone  →  Telefone       │    │
│  │ Email     →  Email          │    │
│  │ Status    →  notionStatus   │    │
│  │ Desde     →  notionSince    │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ ] Habilitar sincronizacao        │
│  [x] Sincronizar automaticamente    │
│                                     │
│  [Testar Conexao]    [Salvar]       │
│                                     │
└─────────────────────────────────────┘
```

### Dados Sincronizados

| Campo ChatBlue | Campo Notion | Descricao |
|----------------|--------------|-----------|
| `notionPageId` | Page ID | ID da pagina do cliente |
| `notionClientStatus` | Status | Status do cliente (Lead, Cliente, etc) |
| `notionClientSince` | Cliente Desde | Data que se tornou cliente |

### Sincronizacao Manual

```
┌─────────────────────────────────────┐
│  Sincronizar Contato                │
├─────────────────────────────────────┤
│                                     │
│  Joao Silva                         │
│  +55 11 99999-9999                  │
│                                     │
│  Status Notion: Cliente             │
│  Cliente desde: Janeiro 2023        │
│  Ultima sync: 15/01/2024 10:30      │
│                                     │
│  [Sincronizar Agora]                │
│                                     │
│  Historico de Sync:                 │
│  ● 15/01/2024 10:30 - Sucesso       │
│  ● 10/01/2024 14:15 - Sucesso       │
│  ● 05/01/2024 09:00 - Erro (API)    │
│                                     │
└─────────────────────────────────────┘
```

## Merge de Contatos

### Quando Usar

- Cliente usa multiplos numeros
- Contatos duplicados criados manualmente
- Migracao de dados

### Processo de Merge

```
┌─────────────────────────────────────────────────────────────────┐
│  Mesclar Contatos                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contato Principal          Contato a Mesclar                   │
│  ─────────────────          ──────────────────                  │
│  Joao Silva                 Joao S.                             │
│  +55 11 99999-9999          +55 11 88888-8888                   │
│  joao@email.com             js@email.com                        │
│  [Cliente] [VIP]            [Lead]                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Resultado da Mesclagem:                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Nome: Joao Silva                                          │  │
│  │ Telefones: +55 11 99999-9999, +55 11 88888-8888          │  │
│  │ Emails: joao@email.com, js@email.com                      │  │
│  │ Tags: [Cliente] [VIP] [Lead]                              │  │
│  │ Tickets: 5 (3 + 2)                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [!] Esta acao nao pode ser desfeita                            │
│                                                                 │
│  [Cancelar]                               [Confirmar Mesclagem] │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Importacao de Contatos

### Formatos Suportados

- CSV (separado por virgula)
- Excel (XLSX)
- JSON

### Template CSV

```csv
telefone,nome,email,tags,empresa,cargo
+5511999999999,Joao Silva,joao@email.com,"Cliente,VIP",Tech Solutions,Diretor
+5511888888888,Maria Santos,maria@email.com,Lead,ABC Ltda,Gerente
```

### Processo de Importacao

```
┌─────────────────────────────────────────────────────────────────┐
│  Importar Contatos                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Passo 1: Upload do Arquivo                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │     Arraste o arquivo aqui ou clique para selecionar     │  │
│  │                                                           │  │
│  │     Formatos: CSV, XLSX, JSON                            │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Passo 2: Mapeamento de Colunas                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Coluna Arquivo    →    Campo ChatBlue                    │  │
│  │ ─────────────────────────────────────────                │  │
│  │ telefone          →    [phone         ▼]                 │  │
│  │ nome              →    [name          ▼]                 │  │
│  │ email             →    [email         ▼]                 │  │
│  │ tags              →    [tags          ▼]                 │  │
│  │ empresa           →    [customFields  ▼]                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Passo 3: Opcoes                                                │
│  [x] Atualizar contatos existentes                              │
│  [ ] Ignorar erros e continuar                                  │
│  [ ] Notificar ao concluir                                      │
│                                                                 │
│  [Cancelar]                                    [Iniciar Import] │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Exportacao de Contatos

### Opcoes de Exportacao

```
┌─────────────────────────────────────┐
│  Exportar Contatos                  │
├─────────────────────────────────────┤
│                                     │
│  Formato:                           │
│  (●) CSV                            │
│  ( ) Excel (XLSX)                   │
│  ( ) JSON                           │
│                                     │
│  Filtros:                           │
│  Tags: [Todos           ▼]          │
│  Periodo: [Todos        ▼]          │
│                                     │
│  Campos:                            │
│  [x] Telefone                       │
│  [x] Nome                           │
│  [x] Email                          │
│  [x] Tags                           │
│  [ ] Campos Customizados            │
│  [ ] Dados do Notion                │
│                                     │
│  [Cancelar]          [Exportar]     │
│                                     │
└─────────────────────────────────────┘
```

## Casos de Uso

### 1. Identificacao de Cliente VIP

**Cenario**: Empresa quer identificar clientes VIP automaticamente.

1. Configura integracao Notion com base de clientes
2. Notion tem campo "Tipo" com valor "VIP"
3. Quando contato inicia conversa, sistema busca no Notion
4. Se encontrado como VIP, adiciona tag automaticamente
5. Ticket pode ter prioridade ajustada

### 2. Segmentacao por Tags

**Cenario**: Marketing quer enviar mensagem para clientes Premium.

1. Filtra contatos por tag "Premium"
2. Exporta lista de telefones
3. Cria campanha direcionada
4. Acompanha respostas por tag

### 3. Enriquecimento de Dados

**Cenario**: Operador quer mais informacoes sobre contato.

1. Abre detalhes do contato
2. Clica em "Sincronizar com Notion"
3. Sistema busca dados atualizados
4. Exibe informacoes como empresa, cargo, historico

### 4. Consolidacao de Contatos

**Cenario**: Cliente usa dois numeros diferentes.

1. Identifica contatos duplicados
2. Usa funcao de merge
3. Seleciona contato principal
4. Todos os tickets sao consolidados
5. Historico unificado

## Integracao com Outras Funcionalidades

### Tickets

- Contato vinculado a cada ticket
- Historico de tickets acessivel
- Tags influenciam prioridade

### Chat

- Informacoes do contato no cabecalho
- Notas visiveis durante atendimento
- Quick actions para editar

### SLA

- Clientes VIP podem ter SLA diferenciado
- Tags usadas para regras de SLA

### IA

- Contexto do contato enviado para IA
- IA usa nome e historico para personalizar

## Boas Praticas

### Para Agentes

1. **Mantenha dados atualizados** - Corrija informacoes erradas
2. **Use tags consistentes** - Siga padrao da empresa
3. **Adicione notas relevantes** - Ajuda colegas futuros
4. **Verifique duplicados** - Antes de criar novo contato

### Para Administradores

1. **Defina campos customizados** - Padronize informacoes
2. **Configure Notion** - Enriquece dados automaticamente
3. **Crie politica de tags** - Documente uso de tags
4. **Revise periodicamente** - Limpe contatos inativos
5. **Treine equipe** - Sobre uso correto

## Proximos Passos

- [Departamentos](/funcionalidades/departamentos) - Organizacao hierarquica
- [Tickets](/funcionalidades/tickets) - Gerenciamento de atendimento
- [FAQ](/funcionalidades/faq) - Perguntas frequentes
