---
sidebar_position: 2
title: Gestao de Usuarios
description: Guia para gerenciar usuarios e agentes no ChatBlue
---

# Gestao de Usuarios

Os usuarios sao as pessoas que acessam o ChatBlue para realizar atendimentos, gerenciar configuracoes ou supervisionar operacoes. Este guia explica como gerenciar usuarios.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 15-20 minutos

## Tipos de Usuarios

| Tipo | Descricao | Permissoes |
|------|-----------|------------|
| Super Admin | Administrador da plataforma | Acesso total, gerencia empresas |
| Admin | Administrador da empresa | Configuracoes, usuarios, relatorios |
| Supervisor | Supervisiona equipe | Monitoramento, transferencias, relatorios |
| Agente | Realiza atendimentos | Tickets, mensagens, contatos |
| Visualizador | Apenas visualiza | Somente leitura |

## Fluxo de Criacao

```
┌─────────────────────────────────────────────────────────────┐
│                    Criar Usuario                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Preencher Dados Basicos                         │
│         (Nome, Email, Telefone)                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Selecionar Papel (Role)                         │
│         (Admin, Supervisor, Agente, etc)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Vincular a Departamento(s)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Enviar Convite por Email                        │
│         (Usuario define senha no primeiro acesso)           │
└─────────────────────────────────────────────────────────────┘
```

## Criar Usuario

### Via Interface

1. Acesse **Configuracoes > Usuarios**
2. Clique em **+ Novo Usuario**
3. Preencha os campos:

| Campo | Descricao | Obrigatorio |
|-------|-----------|-------------|
| Nome | Nome completo | Sim |
| Email | Email (sera usado para login) | Sim |
| Telefone | Telefone de contato | Nao |
| Papel | Role do usuario | Sim |
| Departamentos | Departamentos de atuacao | Sim |

![Placeholder: Formulario de criacao de usuario](/img/guias/usuario-criar.png)

### Via API

```typescript
// Criar usuario
POST /api/users
{
  "name": "Maria Silva",
  "email": "maria@empresa.com",
  "phone": "+5511999998888",
  "role": "agent",
  "departmentIds": ["dept_vendas", "dept_suporte"],
  "settings": {
    "maxConcurrentTickets": 5,
    "notificationsEnabled": true
  }
}

// Resposta
{
  "id": "user_456",
  "name": "Maria Silva",
  "email": "maria@empresa.com",
  "role": "agent",
  "status": "pending", // Aguardando ativacao
  "inviteUrl": "https://chatblue.com/invite/abc123",
  "inviteExpiresAt": "2024-01-22T10:00:00Z"
}
```

### Convite por Email

Apos criar, um email e enviado ao usuario:

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Bem-vindo ao ChatBlue!                                     │
│                                                              │
│  Voce foi convidado para fazer parte da equipe de           │
│  [Minha Empresa] no ChatBlue.                               │
│                                                              │
│  Clique no botao abaixo para criar sua senha e              │
│  acessar a plataforma:                                      │
│                                                              │
│             [Ativar Minha Conta]                            │
│                                                              │
│  Este link expira em 7 dias.                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Gerenciar Usuario

### Editar Informacoes

```typescript
// Atualizar usuario
PUT /api/users/{id}
{
  "name": "Maria Silva Santos",
  "phone": "+5511999997777",
  "role": "supervisor",
  "departmentIds": ["dept_vendas"]
}
```

### Alterar Status

```typescript
// Ativar usuario
POST /api/users/{id}/activate

// Desativar usuario (mantem dados)
POST /api/users/{id}/deactivate

// Suspender temporariamente
POST /api/users/{id}/suspend
{
  "reason": "Ferias",
  "until": "2024-02-01"
}
```

### Resetar Senha

```typescript
// Enviar email de reset
POST /api/users/{id}/reset-password

// Forcar nova senha (admin)
POST /api/users/{id}/set-password
{
  "newPassword": "NovaSenha123!",
  "requireChange": true // Obrigar troca no proximo login
}
```

### Excluir Usuario

```typescript
// Excluir usuario
DELETE /api/users/{id}
{
  "transferTicketsTo": "user_789", // Transferir tickets abertos
  "reason": "Desligamento"
}
```

## Configuracoes do Usuario

### Preferencias Gerais

```typescript
{
  user: {
    id: "user_456",
    settings: {
      // Limites de trabalho
      maxConcurrentTickets: 5, // Maximo de tickets simultaneos
      autoAssign: true, // Receber tickets automaticamente

      // Notificacoes
      notifications: {
        newTicket: true,
        newMessage: true,
        ticketTransfer: true,
        slaWarning: true,
        email: {
          enabled: true,
          dailyDigest: true
        },
        push: {
          enabled: true
        },
        sound: {
          enabled: true,
          volume: 0.7
        }
      },

      // Interface
      interface: {
        theme: "light", // light, dark, system
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
        dateFormat: "DD/MM/YYYY"
      }
    }
  }
}
```

### Status de Disponibilidade

```typescript
{
  availability: {
    status: "online", // online, away, busy, offline

    // Status customizados
    customStatuses: [
      { id: "lunch", label: "Almoco", icon: "🍽️" },
      { id: "meeting", label: "Reuniao", icon: "📅" },
      { id: "training", label: "Treinamento", icon: "📚" }
    ],

    // Regras automaticas
    autoStatus: {
      // Ficar away apos X minutos de inatividade
      awayAfterInactivity: 15,

      // Ficar offline fora do horario
      offlineOutsideBusinessHours: true,

      // Status durante almoco
      lunchStatus: {
        enabled: true,
        start: "12:00",
        end: "13:00",
        status: "away"
      }
    }
  }
}
```

## Departamentos e Filas

### Vincular a Departamentos

```typescript
{
  user: {
    id: "user_456",
    departments: [
      {
        id: "dept_vendas",
        name: "Vendas",
        role: "member", // member, leader
        priority: 1 // Ordem de preferencia
      },
      {
        id: "dept_suporte",
        name: "Suporte",
        role: "member",
        priority: 2
      }
    ]
  }
}
```

### Configurar Fila de Atendimento

```typescript
{
  queue: {
    // Modo de distribuicao
    mode: "round_robin", // round_robin, least_busy, manual

    // Peso do agente (para distribuicao ponderada)
    weight: 1.0,

    // Habilidades especificas
    skills: ["tecnico", "vendas", "ingles"],

    // Prioridade de recebimento
    priority: "normal" // low, normal, high
  }
}
```

## Monitoramento de Usuarios

### Dashboard de Agentes

```
┌─────────────────────────────────────────────────────────────┐
│              Status dos Agentes em Tempo Real                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Agente         │ Status  │ Tickets │ Tempo │ Ultima Acao   │
│  ─────────────────────────────────────────────────────────  │
│  🟢 Maria Silva │ Online  │  4/5    │ 2h    │ Respondeu #123│
│  🟢 Joao Santos │ Online  │  3/5    │ 3h    │ Fechou #456   │
│  🟡 Ana Costa   │ Almoco  │  2/5    │ 1h    │ Transferiu #789│
│  🔴 Pedro Lima  │ Offline │  0/5    │ -     │ Saiu 18:00    │
│                                                              │
│  Resumo: 3 online | 1 away | 1 offline                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Metricas do Usuario

```typescript
// Obter metricas do usuario
GET /api/users/{id}/metrics?period=2024-01

// Resposta
{
  "user": {
    "id": "user_456",
    "name": "Maria Silva"
  },
  "period": "2024-01",
  "metrics": {
    "tickets": {
      "total": 156,
      "resolved": 148,
      "transferred": 5,
      "abandoned": 3
    },
    "messages": {
      "sent": 1250,
      "received": 980
    },
    "sla": {
      "compliance": 94,
      "avgFirstResponse": 420, // segundos
      "avgResolution": 7200
    },
    "satisfaction": {
      "rating": 4.7,
      "totalRatings": 85
    },
    "time": {
      "totalOnline": "168h 30m",
      "avgSessionDuration": "7h 15m",
      "avgTicketDuration": "45m"
    }
  }
}
```

## Permissoes do Usuario

### Heranca de Papel

```
┌─────────────────────────────────────────────────────────────┐
│                    Super Admin                               │
│                    (Todas as permissoes)                    │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      Admin                             │  │
│  │  (Gerenciar empresa, usuarios, configuracoes)         │  │
│  │                          │                             │  │
│  │                          ▼                             │  │
│  │  ┌───────────────────────────────────────────────┐    │  │
│  │  │               Supervisor                       │    │  │
│  │  │  (Monitorar, transferir, relatorios)          │    │  │
│  │  │                    │                           │    │  │
│  │  │                    ▼                           │    │  │
│  │  │  ┌─────────────────────────────────────┐      │    │  │
│  │  │  │              Agente                  │      │    │  │
│  │  │  │  (Atender tickets, enviar mensagens)│      │    │  │
│  │  │  └─────────────────────────────────────┘      │    │  │
│  │  └───────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Permissoes Customizadas

```typescript
{
  user: {
    id: "user_456",
    role: "agent",

    // Permissoes adicionais (alem do role)
    additionalPermissions: [
      "reports.view", // Pode ver relatorios (normalmente so supervisor)
      "contacts.export" // Pode exportar contatos
    ],

    // Permissoes removidas (mesmo que o role tenha)
    restrictedPermissions: [
      "tickets.transfer" // Nao pode transferir tickets
    ]
  }
}
```

Veja mais em [Permissoes](/guias/administracao/permissoes).

## Importacao em Massa

### Via CSV

```typescript
// Upload de arquivo CSV
POST /api/users/import
Content-Type: multipart/form-data

{
  "file": users.csv,
  "options": {
    "sendInvites": true,
    "defaultRole": "agent",
    "defaultDepartment": "dept_atendimento"
  }
}

// Formato do CSV
// nome,email,telefone,role,departamentos
// Maria Silva,maria@email.com,+5511999998888,agent,vendas
// Joao Santos,joao@email.com,+5511999997777,agent,"vendas,suporte"
```

### Via API em Lote

```typescript
// Criar multiplos usuarios
POST /api/users/batch
{
  "users": [
    {
      "name": "Maria Silva",
      "email": "maria@email.com",
      "role": "agent",
      "departmentIds": ["dept_vendas"]
    },
    {
      "name": "Joao Santos",
      "email": "joao@email.com",
      "role": "agent",
      "departmentIds": ["dept_suporte"]
    }
  ],
  "options": {
    "sendInvites": true,
    "skipDuplicates": true
  }
}
```

## Solucao de Problemas

### Usuario nao recebeu convite

**Verificacoes**:
1. Email esta correto?
2. Verificar pasta de spam
3. Email corporativo pode bloquear

**Solucao**: Reenviar convite ou usar link direto

```typescript
// Reenviar convite
POST /api/users/{id}/resend-invite
```

### Usuario nao consegue logar

**Causas**:
- Senha incorreta
- Usuario inativo
- Empresa suspensa

**Solucao**: Verificar status e resetar senha se necessario

### Usuario nao ve tickets

**Causas**:
- Nao esta no departamento correto
- Permissoes insuficientes
- Filtros ativos

**Solucao**: Verificar departamentos e permissoes

## Boas Praticas

### 1. Seguranca

- Use senhas fortes
- Ative autenticacao 2FA quando disponivel
- Revise usuarios inativos periodicamente

### 2. Organizacao

- Nomeie usuarios consistentemente
- Mantenha departamentos atualizados
- Documente papeis customizados

### 3. Monitoramento

- Acompanhe metricas de desempenho
- Identifique agentes sobrecarregados
- Equilibre distribuicao de tickets

## Proximos Passos

Apos configurar usuarios:

- [Configurar Departamentos](/guias/administracao/departamentos)
- [Configurar Permissoes](/guias/administracao/permissoes)
- [Configurar SLA](/guias/sla/configuracao)
