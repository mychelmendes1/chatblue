---
sidebar_position: 4
title: Permissoes e Papeis
description: Guia para configurar permissoes e papeis de usuarios no ChatBlue
---

# Permissoes e Papeis

O sistema de permissoes do ChatBlue controla o que cada usuario pode ver e fazer na plataforma. Este guia explica como configurar papeis e permissoes.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 20-30 minutos

## Conceitos Basicos

| Conceito | Descricao |
|----------|-----------|
| Permissao | Acao especifica (ex: "tickets.create") |
| Papel (Role) | Conjunto de permissoes (ex: "Agente") |
| Usuario | Pessoa com um ou mais papeis |
| Escopo | Onde a permissao se aplica (empresa, departamento) |

## Hierarquia de Papeis

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                      Super Admin                             │
│                   (Acesso Total)                            │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      Admin                             │  │
│  │          (Gerenciar empresa e usuarios)               │  │
│  │                          │                             │  │
│  │                          ▼                             │  │
│  │  ┌───────────────────────────────────────────────┐    │  │
│  │  │               Supervisor                       │    │  │
│  │  │       (Monitorar e gerenciar equipe)          │    │  │
│  │  │                    │                           │    │  │
│  │  │                    ▼                           │    │  │
│  │  │  ┌─────────────────────────────────────┐      │    │  │
│  │  │  │              Agente                  │      │    │  │
│  │  │  │       (Atender tickets)             │      │    │  │
│  │  │  │                │                     │      │    │  │
│  │  │  │                ▼                     │      │    │  │
│  │  │  │  ┌─────────────────────────┐        │      │    │  │
│  │  │  │  │      Visualizador       │        │      │    │  │
│  │  │  │  │    (Somente leitura)    │        │      │    │  │
│  │  │  │  └─────────────────────────┘        │      │    │  │
│  │  │  └─────────────────────────────────────┘      │    │  │
│  │  └───────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Papeis Padrao

### Super Admin

Acesso total a plataforma, gerencia todas as empresas.

```typescript
{
  role: "super_admin",
  permissions: ["*"], // Todas as permissoes
  scope: "global"
}
```

### Admin

Administrador da empresa, gerencia usuarios e configuracoes.

```typescript
{
  role: "admin",
  permissions: [
    "company.*",           // Todas as permissoes da empresa
    "users.*",             // Gerenciar usuarios
    "departments.*",       // Gerenciar departamentos
    "settings.*",          // Configuracoes
    "reports.*",           // Todos os relatorios
    "connections.*",       // Conexoes WhatsApp
    "ai.*",                // Configuracoes de IA
    "sla.*",               // Configuracoes de SLA
    "tickets.*",           // Todos os tickets
    "contacts.*",          // Todos os contatos
    "templates.*"          // Templates
  ],
  scope: "company"
}
```

### Supervisor

Supervisiona equipes e monitora atendimentos.

```typescript
{
  role: "supervisor",
  permissions: [
    "tickets.view",
    "tickets.assign",
    "tickets.transfer",
    "tickets.close",
    "tickets.reopen",
    "messages.view",
    "messages.send",
    "contacts.view",
    "contacts.edit",
    "reports.view",
    "reports.export",
    "users.view",
    "departments.view",
    "dashboard.view",
    "dashboard.realtime"
  ],
  scope: "department"
}
```

### Agente

Realiza atendimentos ao cliente.

```typescript
{
  role: "agent",
  permissions: [
    "tickets.view_assigned",  // Ver tickets atribuidos
    "tickets.create",
    "tickets.reply",
    "tickets.close_own",      // Fechar proprios tickets
    "tickets.transfer",
    "messages.send",
    "messages.view",
    "contacts.view",
    "contacts.create",
    "templates.use",
    "dashboard.view_own"
  ],
  scope: "department"
}
```

### Visualizador

Apenas visualiza informacoes, sem poder de edicao.

```typescript
{
  role: "viewer",
  permissions: [
    "tickets.view",
    "messages.view",
    "contacts.view",
    "reports.view",
    "dashboard.view"
  ],
  scope: "department"
}
```

## Lista de Permissoes

### Tickets

| Permissao | Descricao |
|-----------|-----------|
| tickets.view | Ver todos os tickets |
| tickets.view_assigned | Ver apenas tickets atribuidos |
| tickets.view_department | Ver tickets do departamento |
| tickets.create | Criar novos tickets |
| tickets.reply | Responder tickets |
| tickets.assign | Atribuir tickets a agentes |
| tickets.transfer | Transferir tickets |
| tickets.close | Fechar tickets |
| tickets.close_own | Fechar apenas proprios tickets |
| tickets.reopen | Reabrir tickets fechados |
| tickets.delete | Excluir tickets |
| tickets.export | Exportar tickets |

### Mensagens

| Permissao | Descricao |
|-----------|-----------|
| messages.view | Ver mensagens |
| messages.send | Enviar mensagens |
| messages.delete | Excluir mensagens |
| messages.media | Enviar arquivos de midia |

### Contatos

| Permissao | Descricao |
|-----------|-----------|
| contacts.view | Ver contatos |
| contacts.create | Criar contatos |
| contacts.edit | Editar contatos |
| contacts.delete | Excluir contatos |
| contacts.export | Exportar contatos |
| contacts.import | Importar contatos |
| contacts.merge | Mesclar contatos duplicados |

### Usuarios

| Permissao | Descricao |
|-----------|-----------|
| users.view | Ver usuarios |
| users.create | Criar usuarios |
| users.edit | Editar usuarios |
| users.delete | Excluir usuarios |
| users.invite | Convidar usuarios |
| users.reset_password | Resetar senhas |

### Departamentos

| Permissao | Descricao |
|-----------|-----------|
| departments.view | Ver departamentos |
| departments.create | Criar departamentos |
| departments.edit | Editar departamentos |
| departments.delete | Excluir departamentos |
| departments.manage_members | Gerenciar membros |

### Configuracoes

| Permissao | Descricao |
|-----------|-----------|
| settings.view | Ver configuracoes |
| settings.edit | Editar configuracoes |
| connections.view | Ver conexoes WhatsApp |
| connections.manage | Gerenciar conexoes |
| ai.view | Ver config de IA |
| ai.manage | Gerenciar IA |
| sla.view | Ver config de SLA |
| sla.manage | Gerenciar SLA |
| templates.view | Ver templates |
| templates.manage | Gerenciar templates |

### Relatorios

| Permissao | Descricao |
|-----------|-----------|
| reports.view | Ver relatorios |
| reports.view_own | Ver apenas proprios dados |
| reports.export | Exportar relatorios |
| reports.schedule | Agendar relatorios |
| dashboard.view | Ver dashboard |
| dashboard.realtime | Ver dados em tempo real |

## Criar Papel Customizado

### Via Interface

1. Acesse **Configuracoes > Permissoes > Papeis**
2. Clique em **+ Novo Papel**
3. Configure as permissoes

![Placeholder: Criacao de papel customizado](/img/guias/permissoes-criar-papel.png)

### Via API

```typescript
// Criar papel customizado
POST /api/roles
{
  "name": "Supervisor de Vendas",
  "description": "Supervisor com acesso especifico ao departamento de vendas",
  "baseRole": "supervisor", // Herdar de um papel base
  "permissions": {
    // Permissoes adicionais
    "add": [
      "reports.export",
      "contacts.export"
    ],
    // Permissoes removidas
    "remove": [
      "tickets.transfer"
    ]
  },
  "scope": {
    "type": "department",
    "departments": ["dept_vendas"]
  }
}

// Resposta
{
  "id": "role_sup_vendas",
  "name": "Supervisor de Vendas",
  "permissions": [
    "tickets.view",
    "tickets.assign",
    "tickets.close",
    "reports.view",
    "reports.export",
    "contacts.view",
    "contacts.export"
    // ...
  ],
  "scope": {
    "type": "department",
    "departments": ["dept_vendas"]
  }
}
```

## Atribuir Permissoes a Usuario

### Papel Padrao

```typescript
// Atribuir papel padrao
PUT /api/users/{id}/role
{
  "role": "supervisor"
}
```

### Papel Customizado

```typescript
// Atribuir papel customizado
PUT /api/users/{id}/role
{
  "roleId": "role_sup_vendas"
}
```

### Permissoes Especificas

```typescript
// Adicionar permissoes especificas
PUT /api/users/{id}/permissions
{
  "additionalPermissions": [
    "reports.export",
    "contacts.export"
  ],
  "restrictedPermissions": [
    "tickets.delete"
  ]
}
```

## Escopo de Permissoes

### Global

Aplica-se a toda a plataforma (apenas Super Admin).

### Empresa

Aplica-se a toda a empresa do usuario.

```typescript
{
  scope: {
    type: "company",
    companyId: "company_123"
  }
}
```

### Departamento

Aplica-se apenas aos departamentos especificados.

```typescript
{
  scope: {
    type: "department",
    departments: ["dept_vendas", "dept_suporte"]
  }
}
```

### Proprio

Aplica-se apenas aos recursos do proprio usuario.

```typescript
{
  scope: {
    type: "own"
  }
}

// Exemplo: tickets.view_own
// Usuario ve apenas tickets atribuidos a ele
```

## Verificar Permissoes

### Na Interface

O sistema automaticamente:
- Oculta menus sem permissao
- Desabilita botoes sem permissao
- Bloqueia acesso a paginas restritas

### Via API

```typescript
// Verificar permissao especifica
GET /api/users/{id}/permissions/check?permission=tickets.delete

// Resposta
{
  "permission": "tickets.delete",
  "allowed": false,
  "reason": "Role 'agent' does not include this permission"
}

// Listar todas as permissoes do usuario
GET /api/users/{id}/permissions

// Resposta
{
  "userId": "user_456",
  "role": "agent",
  "effectivePermissions": [
    "tickets.view_assigned",
    "tickets.create",
    "tickets.reply",
    "messages.send",
    // ...
  ]
}
```

## Auditoria de Permissoes

### Log de Acesso

```typescript
// Obter log de acessos
GET /api/audit/permissions?userId={id}

// Resposta
{
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "userId": "user_456",
      "action": "tickets.view",
      "resourceId": "ticket_123",
      "allowed": true
    },
    {
      "timestamp": "2024-01-15T10:35:00Z",
      "userId": "user_456",
      "action": "tickets.delete",
      "resourceId": "ticket_123",
      "allowed": false,
      "reason": "Permission denied"
    }
  ]
}
```

### Relatorio de Permissoes

```typescript
// Gerar relatorio de permissoes por usuario
GET /api/reports/permissions?format=csv

// Conteudo
// usuario,email,papel,permissoes
// Maria Silva,maria@empresa.com,Admin,"users.*,settings.*,..."
// Joao Santos,joao@empresa.com,Agente,"tickets.view_assigned,..."
```

## Boas Praticas de Seguranca

### 1. Principio do Menor Privilegio

```typescript
// Ruim: dar muitas permissoes
{
  permissions: ["tickets.*", "contacts.*", "reports.*"]
}

// Bom: dar apenas o necessario
{
  permissions: ["tickets.view_assigned", "tickets.reply", "contacts.view"]
}
```

### 2. Revisao Periodica

- Revise permissoes trimestralmente
- Remova acessos de usuarios inativos
- Valide papeis customizados

### 3. Separacao de Responsabilidades

```typescript
// Diferentes responsabilidades = diferentes papeis
{
  financeiro: ["billing.*", "invoices.*"],
  atendimento: ["tickets.*", "contacts.*"],
  ti: ["settings.*", "connections.*"]
}
```

### 4. Documentacao

Mantenha registro de:
- Quais papeis existem
- O que cada papel pode fazer
- Quem aprovou cada papel customizado

## Solucao de Problemas

### Usuario nao consegue acessar recurso

**Verificacoes**:
1. Qual papel o usuario tem?
2. O papel inclui a permissao necessaria?
3. O escopo esta correto?

```typescript
// Debug de permissoes
GET /api/users/{id}/permissions/debug?resource=tickets&action=delete

// Resposta
{
  "user": "user_456",
  "role": "agent",
  "requestedPermission": "tickets.delete",
  "allowed": false,
  "rolePermissions": ["tickets.view_assigned", "tickets.reply", ...],
  "missingPermission": "tickets.delete"
}
```

### Permissao adicionada mas nao funciona

**Causas**:
- Cache de sessao
- Escopo incorreto
- Conflito com permissao restrita

**Solucao**: Usuario deve fazer logout e login novamente

### Papel customizado nao salva

**Causas**:
- Nome duplicado
- Permissoes invalidas
- Sem permissao para criar papeis

**Solucao**: Verificar logs de erro e permissoes do criador

## Exemplos de Papeis Customizados

### Agente Senior

```typescript
{
  name: "Agente Senior",
  baseRole: "agent",
  permissions: {
    add: [
      "tickets.view_department", // Ver todos do departamento
      "tickets.close", // Fechar qualquer ticket
      "contacts.edit" // Editar contatos
    ]
  }
}
```

### Coordenador de Qualidade

```typescript
{
  name: "Coordenador de Qualidade",
  permissions: [
    "tickets.view",
    "messages.view",
    "reports.view",
    "reports.export",
    "dashboard.view"
  ],
  // Apenas visualizacao, sem acao
  scope: {
    type: "company"
  }
}
```

### Gerente Regional

```typescript
{
  name: "Gerente Regional",
  baseRole: "supervisor",
  permissions: {
    add: [
      "users.view",
      "departments.view",
      "reports.export",
      "sla.view"
    ]
  },
  scope: {
    type: "department",
    departments: ["dept_sp", "dept_rj", "dept_mg"]
  }
}
```

## Proximos Passos

Apos configurar permissoes:

- [Configurar Usuarios](/guias/administracao/usuarios)
- [Configurar Departamentos](/guias/administracao/departamentos)
- [Configurar SLA](/guias/sla/configuracao)
