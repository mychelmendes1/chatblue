---
sidebar_position: 1
title: Configuracao Notion
description: Guia para configurar a integracao com Notion no ChatBlue
---

# Configuracao Notion

O ChatBlue integra-se com o Notion para sincronizar dados de contatos e enriquecer o atendimento com informacoes do cliente. Este guia explica como configurar essa integracao.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 20-30 minutos

## O Que a Integracao Oferece?

| Funcionalidade | Descricao |
|----------------|-----------|
| Sincronizacao de Contatos | Importar/exportar contatos do Notion |
| Dados no Atendimento | Ver dados do cliente durante o chat |
| Contexto para IA | IA usa dados do Notion para personalizar respostas |
| Atualizacao Automatica | Atualizar Notion apos atendimento |

## Pre-requisitos

- [ ] Conta no [Notion](https://notion.so/)
- [ ] Workspace do Notion com permissao de administrador
- [ ] Database de contatos/clientes no Notion
- [ ] Acesso de administrador ao ChatBlue

## Arquitetura da Integracao

```
┌─────────────────────────────────────────────────────────────┐
│                        ChatBlue                              │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                   │
│    ┌─────────────────────┴─────────────────────┐            │
│    │            Notion Service                  │            │
│    │  - Buscar contatos                         │            │
│    │  - Atualizar registros                     │            │
│    │  - Sincronizar dados                       │            │
│    └─────────────────────┬─────────────────────┘            │
│                          │                                   │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼ API REST
┌─────────────────────────────────────────────────────────────┐
│                        Notion API                            │
│                                                              │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│    │  Database   │    │  Database   │    │  Database   │   │
│    │  Clientes   │    │  Empresas   │    │  Tickets    │   │
│    └─────────────┘    └─────────────┘    └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Passo a Passo

### Fase 1: Configurar no Notion

#### Passo 1.1: Criar Integracao no Notion

1. Acesse [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Clique em **+ Nova integracao**
3. Preencha os dados:

| Campo | Valor |
|-------|-------|
| Nome | ChatBlue Integration |
| Logo | (opcional) |
| Workspace | Seu workspace |

4. Clique em **Enviar**
5. Copie o **Internal Integration Token** (comeca com `secret_`)

![Placeholder: Tela de criacao de integracao Notion](/img/guias/notion-integracao.png)

:::danger Atencao
Guarde o token em local seguro. Ele da acesso aos seus dados do Notion.
:::

#### Passo 1.2: Configurar Capacidades

Na pagina da integracao, configure:

| Capacidade | Status | Descricao |
|------------|--------|-----------|
| Read content | Ativo | Ler dados das databases |
| Update content | Ativo | Atualizar registros |
| Insert content | Ativo | Criar novos registros |
| Read user info | Opcional | Ver dados dos usuarios |

#### Passo 1.3: Conectar Database

1. Abra a database de contatos no Notion
2. Clique no menu **...** (tres pontos) no canto superior direito
3. Selecione **Conexoes**
4. Encontre **ChatBlue Integration** e clique para conectar

![Placeholder: Conectar integracao a database](/img/guias/notion-conectar.png)

:::warning Aviso
Voce precisa conectar a integracao a cada database que deseja usar.
:::

#### Passo 1.4: Obter ID da Database

1. Abra a database no Notion
2. Copie a URL do navegador
3. O ID e a parte entre o nome e o ponto de interrogacao:

```
https://notion.so/workspace/Database-Clientes-abc123def456?v=...
                                        └──────────────┘
                                          Database ID
```

### Fase 2: Configurar no ChatBlue

#### Passo 2.1: Acessar Configuracoes

1. Acesse **Configuracoes > Integracoes**
2. Clique em **Notion**
3. Ative a integracao

#### Passo 2.2: Inserir Credenciais

| Campo | Valor |
|-------|-------|
| API Key | secret_... (token da integracao) |
| Database ID | ID da database de contatos |

```typescript
{
  notion: {
    enabled: true,
    apiKey: "secret_...",
    databases: {
      contacts: "abc123def456", // Database de contatos
      companies: "def456abc789", // Database de empresas (opcional)
      tickets: "ghi789jkl012" // Database de tickets (opcional)
    }
  }
}
```

#### Passo 2.3: Testar Conexao

1. Clique em **Testar Conexao**
2. O sistema verificara:
   - Validade do token
   - Acesso a database
   - Permissoes de leitura/escrita

```typescript
// Teste via API
POST /api/notion/test
{
  "apiKey": "secret_...",
  "databaseId": "abc123def456"
}

// Resposta de sucesso
{
  "success": true,
  "database": {
    "id": "abc123def456",
    "title": "Clientes",
    "properties": ["Nome", "Telefone", "Email", "Empresa"]
  }
}
```

![Placeholder: Teste de conexao Notion](/img/guias/notion-teste.png)

### Fase 3: Mapear Campos

Apos conectar, mapeie os campos do Notion para o ChatBlue:

| Campo ChatBlue | Campo Notion | Tipo |
|----------------|--------------|------|
| Nome | Nome | Title |
| Telefone | Telefone | Phone |
| Email | Email | Email |
| Empresa | Empresa | Relation |
| Observacoes | Notas | Rich Text |

Veja o guia completo em [Mapeamento de Campos](/guias/notion/mapeamento-campos).

## Configuracoes Avancadas

### Sincronizacao Automatica

```typescript
{
  notion: {
    sync: {
      // Sincronizar automaticamente
      autoSync: true,

      // Intervalo de sincronizacao (minutos)
      interval: 30,

      // Direcao da sincronizacao
      direction: "bidirectional", // notion_to_chatblue, chatblue_to_notion, bidirectional

      // Sincronizar ao receber mensagem
      syncOnMessage: true,

      // Criar contato no Notion se nao existir
      createIfNotExists: true
    }
  }
}
```

### Filtros de Sincronizacao

```typescript
{
  notion: {
    sync: {
      filters: {
        // Sincronizar apenas contatos ativos
        notion: {
          property: "Status",
          equals: "Ativo"
        },

        // Nao sincronizar contatos sem telefone
        chatblue: {
          hasPhone: true
        }
      }
    }
  }
}
```

### Webhooks do Notion

Receba notificacoes quando dados mudarem no Notion:

```typescript
{
  notion: {
    webhooks: {
      enabled: true,
      events: [
        "page_created",
        "page_updated",
        "page_deleted"
      ],
      url: "https://seu-dominio.com/api/webhooks/notion"
    }
  }
}
```

## Uso Durante Atendimento

### Visualizar Dados do Cliente

Quando um contato envia mensagem:

1. ChatBlue busca o telefone no Notion
2. Se encontrar, exibe os dados no painel lateral
3. Atendente/IA tem acesso as informacoes

```
┌─────────────────────────────────────────────────────────────┐
│                      Chat                                    │
├─────────────────────────────────┬───────────────────────────┤
│                                 │      Dados do Cliente      │
│  [Conversa do WhatsApp]         │  ┌─────────────────────┐  │
│                                 │  │ Nome: Joao Silva    │  │
│                                 │  │ Empresa: Acme Inc   │  │
│                                 │  │ Plano: PRO          │  │
│                                 │  │ Desde: 01/2023      │  │
│                                 │  │ Tickets: 5          │  │
│                                 │  └─────────────────────┘  │
│                                 │                           │
│                                 │  [Ver no Notion]          │
└─────────────────────────────────┴───────────────────────────┘
```

### Contexto para IA

A IA pode usar dados do Notion para personalizar respostas:

```typescript
// Prompt da IA com contexto do Notion
{
  systemPrompt: `
...

Dados do cliente atual (do Notion):
- Nome: {notion.nome}
- Empresa: {notion.empresa}
- Plano: {notion.plano}
- Cliente desde: {notion.data_inicio}
- Ultimo ticket: {notion.ultimo_ticket}
- Observacoes: {notion.observacoes}

Use essas informacoes para personalizar o atendimento.
`
}
```

### Atualizar Notion Apos Atendimento

Configure atualizacoes automaticas:

```typescript
{
  notion: {
    autoUpdate: {
      onTicketClose: {
        enabled: true,
        updates: {
          "Ultimo Contato": "{data_atual}",
          "Total Tickets": "{incrementar}",
          "Ultimo Assunto": "{ticket.assunto}"
        }
      },
      onNewContact: {
        enabled: true,
        createPage: true,
        properties: {
          "Nome": "{contato.nome}",
          "Telefone": "{contato.telefone}",
          "Origem": "WhatsApp"
        }
      }
    }
  }
}
```

## Solucao de Problemas

### Erro: "Invalid API key"

**Causa**: Token da integracao incorreto ou expirado

**Solucao**:
1. Verifique se o token esta correto
2. Gere um novo token se necessario
3. Atualize no ChatBlue

### Erro: "Database not found"

**Causa**: Database ID incorreto ou integracao nao conectada

**Solucao**:
1. Verifique o ID da database
2. Confirme que a integracao esta conectada a database
3. Verifique permissoes da integracao

### Erro: "Insufficient permissions"

**Causa**: Integracao sem permissao para a acao

**Solucao**:
1. Acesse as configuracoes da integracao no Notion
2. Ative as capacidades necessarias
3. Reconecte a database

### Dados nao sincronizando

**Verificacoes**:
1. Sincronizacao esta ativa?
2. Filtros estao muito restritivos?
3. Campo de telefone esta correto?

```typescript
// Verificar logs de sincronizacao
GET /api/notion/sync/logs

// Forcar sincronizacao manual
POST /api/notion/sync/force
```

### Contato nao encontrado

**Causas**:
- Telefone em formato diferente
- Contato nao existe no Notion
- Filtro esta excluindo

**Solucao**: Verifique o formato do telefone

```typescript
// Formatos de telefone aceitos
{
  phoneFormats: [
    "+5511999998888",
    "5511999998888",
    "11999998888",
    "(11) 99999-8888"
  ],

  // Normalizar para comparacao
  normalizePhone: true
}
```

## Boas Praticas

### 1. Estruture sua Database

Tenha campos padronizados no Notion:
- Nome (Title)
- Telefone (Phone)
- Email (Email)
- Empresa (Relation ou Select)
- Status (Select)

### 2. Use Relacoes

Conecte databases relacionadas:
- Contatos <-> Empresas
- Contatos <-> Tickets
- Empresas <-> Planos

### 3. Mantenha Dados Atualizados

- Configure sincronizacao bidirecional
- Revise dados periodicamente
- Remova duplicatas

### 4. Seguranca

- Use tokens com permissoes minimas necessarias
- Nao compartilhe tokens
- Revogue tokens nao utilizados

## Proximos Passos

Apos configurar a integracao:

- [Configurar Sincronizacao](/guias/notion/sincronizacao)
- [Mapear Campos](/guias/notion/mapeamento-campos)
- [Configurar IA com Contexto](/guias/inteligencia-artificial/personalidade)
