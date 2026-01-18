---
sidebar_position: 5
title: Integracoes
description: Configure integracoes com Notion e outros sistemas externos
---

# Integracoes

O ChatBlue pode se conectar com outros sistemas para expandir suas funcionalidades. Este guia ensina como configurar as integracoes disponiveis.

## Integracoes Disponiveis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Integracoes                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────┐  ┌───────────────────────┐                       │
│  │                       │  │                       │                       │
│  │     📓 NOTION         │  │     🔌 WEBHOOKS       │                       │
│  │                       │  │                       │                       │
│  │   Sincronize dados    │  │   Envie eventos para │                       │
│  │   de clientes         │  │   sistemas externos  │                       │
│  │                       │  │                       │                       │
│  │   Status: 🟢 Ativo    │  │   Status: ⚪ Config. │                       │
│  │                       │  │                       │                       │
│  │   [Configurar]        │  │   [Configurar]        │                       │
│  │                       │  │                       │                       │
│  └───────────────────────┘  └───────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integracao com Notion

O Notion pode ser usado como CRM para armazenar dados de clientes. A integracao permite sincronizar contatos entre o ChatBlue e uma base de dados do Notion.

### O Que a Integracao Faz

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Fluxo de Integracao com Notion                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│     CHATBLUE                                        NOTION                   │
│  ┌─────────────┐                                ┌─────────────┐             │
│  │             │                                │             │             │
│  │  Contatos   │  ────── Sincroniza ──────────► │  Database   │             │
│  │             │                                │  de Clientes│             │
│  │  • Nome     │                                │             │             │
│  │  • Telefone │  ◄────── Sincroniza ────────── │  • Nome     │             │
│  │  • Email    │                                │  • Telefone │             │
│  │  • Tags     │                                │  • Email    │             │
│  │             │                                │  • Status   │             │
│  └─────────────┘                                └─────────────┘             │
│                                                                              │
│  Beneficios:                                                                │
│  • Equipe de vendas ve historico de atendimento no Notion                  │
│  • Atendentes veem informacoes do CRM no ChatBlue                          │
│  • Dados sempre sincronizados entre os sistemas                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Passo a Passo: Configurando Notion

#### Passo 1: Criar uma Integracao no Notion

1. Acesse [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Clique em **+ Nova integracao**
3. Preencha as informacoes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Criar Integracao - Notion                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Nome da integracao:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ChatBlue - CRM                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Logo (opcional): [Escolher arquivo]                                       │
│                                                                              │
│  Workspace associado:                                                       │
│  [Minha Empresa ▼]                                                         │
│                                                                              │
│  Capacidades:                                                               │
│  [x] Ler conteudo                                                          │
│  [x] Atualizar conteudo                                                    │
│  [x] Inserir conteudo                                                      │
│  [ ] Ler comentarios                                                       │
│  [ ] Inserir comentarios                                                   │
│                                                                              │
│                                              [Enviar]                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

4. Clique em **Enviar**
5. Copie o **Token de Integracao** (Internal Integration Token)

:::caution Guarde o Token com Seguranca
O token da acesso aos seus dados do Notion. Nao compartilhe publicamente.
:::

#### Passo 2: Criar a Base de Dados no Notion

Crie uma base de dados com as seguintes colunas:

| Coluna | Tipo no Notion | Obrigatorio | Descricao |
|--------|----------------|-------------|-----------|
| Nome | Title | Sim | Nome do contato |
| Telefone | Phone | Sim | Numero do WhatsApp |
| Email | Email | Nao | Email do contato |
| Empresa | Text | Nao | Empresa do contato |
| Tags | Multi-select | Nao | Categorias/tags |
| Origem | Select | Nao | Como chegou (WhatsApp, Site, etc.) |
| Status | Select | Nao | Lead, Cliente, Inativo |
| Ultimo Contato | Date | Nao | Data do ultimo atendimento |
| Notas | Text | Nao | Observacoes |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Exemplo de Base de Dados no Notion                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📓 Clientes CRM                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Nome          Telefone         Email              Status    Origem         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Maria Silva   +55 11 99999...  maria@email.com    Cliente   WhatsApp      │
│  Joao Santos   +55 21 98888...  joao@empresa.com   Lead      Site          │
│  Ana Costa     +55 31 97777...  -                  Lead      WhatsApp      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 3: Compartilhar Base com a Integracao

1. Abra a base de dados no Notion
2. Clique em **...** (tres pontos) no canto superior direito
3. Clique em **Conexoes** > **Adicionar conexoes**
4. Selecione **ChatBlue - CRM** (a integracao que voce criou)
5. Clique em **Confirmar**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Conectar Base de Dados                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Esta pagina ainda nao esta conectada a nenhuma integracao.                │
│                                                                              │
│  Selecione uma integracao para conectar:                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [x] ChatBlue - CRM                                                  │   │
│  │ [ ] Outras integracoes...                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ⚠️ Ao conectar, a integracao tera acesso a esta pagina e subpaginas.     │
│                                                                              │
│                                           [Cancelar]  [Confirmar]          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 4: Obter o ID da Base de Dados

1. Abra a base de dados no navegador
2. A URL sera algo como: `https://notion.so/workspace/abc123def456...`
3. O ID e a parte apos a ultima barra e antes do `?` (se houver)
   - Exemplo: `abc123def456789`

Ou via Notion:
1. Clique em **...** na pagina da base
2. Selecione **Copiar link**
3. O ID esta na URL copiada

#### Passo 5: Configurar no ChatBlue

1. No ChatBlue, acesse **Configuracoes > Integracoes**
2. Clique em **[Configurar]** no card do Notion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configurar Integracao Notion                                      [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CREDENCIAIS                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Token de Integracao (Internal Integration Token):                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ secret_abc123def456...                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ID da Base de Dados:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ abc123def456789                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                     [Testar Conexao]                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

3. Preencha o Token e o ID
4. Clique em **[Testar Conexao]**
5. Se conectar com sucesso, continue para o mapeamento

#### Passo 6: Mapear Campos

Relacione os campos do ChatBlue com as colunas do Notion:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Mapeamento de Campos                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Conectado a: "Clientes CRM" ✓                                             │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  MAPEAMENTO DE CAMPOS                                                       │
│  Relacione os campos do ChatBlue com as colunas do Notion                  │
│                                                                              │
│  Campo ChatBlue          Coluna Notion                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Nome *                  [Nome (title) ▼]                                  │
│  Telefone *              [Telefone (phone) ▼]                              │
│  Email                   [Email (email) ▼]                                 │
│  Tags                    [Tags (multi_select) ▼]                           │
│  Notas                   [Notas (text) ▼]                                  │
│  Ultimo atendimento      [Ultimo Contato (date) ▼]                         │
│                                                                              │
│  * Campos obrigatorios                                                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  CONFIGURACOES DE SINCRONIZACAO                                             │
│                                                                              │
│  Direcao da sincronizacao:                                                  │
│  (●) Bidirecional (ChatBlue <-> Notion)                                    │
│  ( ) Apenas ChatBlue -> Notion                                             │
│  ( ) Apenas Notion -> ChatBlue                                             │
│                                                                              │
│  Frequencia de sincronizacao:                                               │
│  [A cada 5 minutos ▼]                                                      │
│                                                                              │
│  [x] Criar novo registro no Notion quando contato nao existir              │
│  [x] Atualizar registro existente quando houver mudancas                   │
│                                                                              │
│                                               [Cancelar]  [Salvar]         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 7: Ativar e Testar

1. Clique em **[Salvar]**
2. A integracao sera ativada
3. Faca um teste:
   - Crie um contato no ChatBlue
   - Verifique se apareceu no Notion
   - Ou vice-versa

### Verificando a Sincronizacao

Apos configurar, voce pode monitorar a sincronizacao:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Status da Integracao Notion                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Status: 🟢 Conectado e Sincronizando                                       │
│                                                                              │
│  Ultima sincronizacao: 18/01/2024 14:30:25                                 │
│  Proxima sincronizacao: 18/01/2024 14:35:25                                │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Estatisticas (ultimas 24h):                                               │
│                                                                              │
│  Contatos sincronizados: 156                                               │
│  Novos no Notion: 12                                                       │
│  Atualizados: 45                                                           │
│  Erros: 2                                                                   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [Sincronizar Agora]  [Ver Logs]  [Desativar]                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Resolucao de Problemas - Notion

| Problema | Causa | Solucao |
|----------|-------|---------|
| Conexao falhou | Token invalido | Verifique se copiou o token completo |
| Base nao encontrada | ID incorreto ou nao compartilhada | Verifique o ID e compartilhe com a integracao |
| Campo nao sincroniza | Tipo incompativel | Verifique se os tipos de campo sao compativeis |
| Sincronizacao lenta | Muitos registros | Aumente o intervalo de sincronizacao |

---

## Configurando Webhooks

Webhooks permitem enviar notificacoes para outros sistemas quando eventos ocorrem no ChatBlue.

### O Que Sao Webhooks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Como Webhooks Funcionam                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     CHATBLUE                                       SEU SISTEMA               │
│  ┌─────────────┐                                ┌─────────────┐             │
│  │             │                                │             │             │
│  │  Evento     │  ───── POST HTTP ────────────► │  Endpoint   │             │
│  │  ocorre     │       (JSON com dados)         │  /webhook   │             │
│  │             │                                │             │             │
│  │  Ex: Novo   │                                │  Recebe e   │             │
│  │  ticket     │                                │  processa   │             │
│  │             │                                │             │             │
│  └─────────────┘                                └─────────────┘             │
│                                                                              │
│  Eventos disponiveis:                                                       │
│  • ticket.created - Novo ticket criado                                     │
│  • ticket.updated - Ticket atualizado                                      │
│  • ticket.closed - Ticket fechado                                          │
│  • message.received - Mensagem recebida                                    │
│  • message.sent - Mensagem enviada                                         │
│  • contact.created - Novo contato                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configurando um Webhook

1. Acesse **Configuracoes > Integracoes**
2. Clique em **[Configurar]** no card de Webhooks
3. Clique em **[+ Novo Webhook]**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Novo Webhook                                                      [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Nome do webhook:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Notificacao para ERP                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  URL de destino:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ https://meu-sistema.com/api/webhooks/chatblue                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Token de autenticacao (opcional):                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ meu-token-secreto-123                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  (Sera enviado no header Authorization: Bearer <token>)                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Eventos a notificar:                                                       │
│                                                                              │
│  [x] ticket.created - Novo ticket                                          │
│  [ ] ticket.updated - Ticket atualizado                                    │
│  [x] ticket.closed - Ticket fechado                                        │
│  [ ] message.received - Mensagem recebida                                  │
│  [ ] message.sent - Mensagem enviada                                       │
│  [x] contact.created - Novo contato                                        │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [x] Ativo                                                                  │
│                                                                              │
│                              [Testar Webhook]  [Cancelar]  [Salvar]        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Exemplo de Payload Recebido

Quando um evento ocorre, seu sistema recebera um POST com este formato:

```json
{
  "event": "ticket.created",
  "timestamp": "2024-01-18T14:30:00Z",
  "data": {
    "ticket": {
      "id": "ticket_123456",
      "protocol": "2024-00123",
      "status": "pending",
      "priority": "medium",
      "createdAt": "2024-01-18T14:30:00Z"
    },
    "contact": {
      "id": "contact_789",
      "name": "Maria Silva",
      "phone": "+5511999998888"
    },
    "department": {
      "id": "dept_456",
      "name": "Suporte"
    }
  }
}
```

### Testando o Webhook

1. Configure o webhook
2. Clique em **[Testar Webhook]**
3. Um evento de teste sera enviado
4. Verifique se seu sistema recebeu

---

## Boas Praticas para Integracoes

:::tip Comece Simples
Ative uma integracao por vez e teste bem antes de adicionar outras.
:::

:::tip Monitore os Logs
Verifique regularmente os logs de sincronizacao para identificar problemas.
:::

:::tip Tenha um Plano B
Se uma integracao falhar, tenha um processo manual de backup.
:::

:::caution Seguranca dos Tokens
Nunca compartilhe tokens de integracao. Trate-os como senhas.
:::

## Resolucao de Problemas Gerais

### Integracao Parou de Funcionar

1. Verifique o status no painel de integracoes
2. Consulte os logs de erro
3. Teste a conexao novamente
4. Verifique se credenciais ainda sao validas

### Dados Nao Sincronizam

1. Verifique o mapeamento de campos
2. Confirme que os tipos de dados sao compativeis
3. Verifique se ha erros nos logs
4. Tente sincronizar manualmente

### Performance Lenta

1. Aumente o intervalo de sincronizacao
2. Reduza a quantidade de campos sincronizados
3. Verifique a conexao de internet

---

## Conclusao

Parabens! Voce completou o treinamento de administrador do ChatBlue. Agora voce esta preparado para:

- ✓ Navegar pelo painel de controle
- ✓ Configurar conexoes WhatsApp
- ✓ Gerenciar usuarios e departamentos
- ✓ Configurar SLA e mensagens automaticas
- ✓ Integrar com Notion e outros sistemas

:::info Precisa de Mais Ajuda?
Consulte a documentacao tecnica em [/guias](/guias/introducao) ou entre em contato com o suporte do ChatBlue.
:::

---

## Proximos Passos

Explore outras areas do treinamento:

- **[Treinamento de Supervisores](/treinamento/supervisor/visao-geral)** - Se voce tambem supervisiona equipe
- **[Configuracao de IA](/treinamento/ia/configuracao-basica)** - Se sua empresa usa Inteligencia Artificial
- **[Boas Praticas](/treinamento/boas-praticas/comunicacao)** - Dicas para um atendimento de excelencia
