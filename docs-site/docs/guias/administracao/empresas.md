---
sidebar_position: 1
title: Gestao de Empresas
description: Guia para gerenciar empresas (tenants) no ChatBlue
---

# Gestao de Empresas

O ChatBlue e uma plataforma multi-tenant, permitindo que multiplas empresas utilizem o sistema de forma isolada. Este guia explica como gerenciar empresas.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 20-30 minutos

## O Que e Multi-tenancy?

Multi-tenancy permite que varias empresas (tenants) usem a mesma instalacao do ChatBlue, cada uma com:

| Isolamento | Descricao |
|------------|-----------|
| Dados | Cada empresa ve apenas seus dados |
| Usuarios | Usuarios sao vinculados a empresas |
| Configuracoes | Configuracoes independentes |
| Conexoes | Cada empresa tem suas conexoes WhatsApp |
| Relatorios | Metricas separadas por empresa |

## Arquitetura Multi-tenant

```
┌─────────────────────────────────────────────────────────────┐
│                        ChatBlue                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Empresa A  │  │  Empresa B  │  │  Empresa C  │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ Usuarios    │  │ Usuarios    │  │ Usuarios    │         │
│  │ Tickets     │  │ Tickets     │  │ Tickets     │         │
│  │ Contatos    │  │ Contatos    │  │ Contatos    │         │
│  │ Configs     │  │ Configs     │  │ Configs     │         │
│  │ WhatsApp    │  │ WhatsApp    │  │ WhatsApp    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                   Banco de Dados Compartilhado               │
│                   (Isolamento por company_id)                │
└─────────────────────────────────────────────────────────────┘
```

## Planos Disponiveis

| Plano | Usuarios | Conexoes | Mensagens/mes | Recursos |
|-------|----------|----------|---------------|----------|
| BASIC | 3 | 1 | 1.000 | Basicos |
| PRO | 10 | 3 | 10.000 | + IA, SLA |
| ENTERPRISE | Ilimitado | Ilimitado | Ilimitado | Todos |

## Criar Empresa

### Via Interface (Super Admin)

1. Acesse **Administracao > Empresas**
2. Clique em **+ Nova Empresa**
3. Preencha os dados:

| Campo | Descricao | Obrigatorio |
|-------|-----------|-------------|
| Nome | Nome da empresa | Sim |
| Slug | Identificador unico (URL) | Sim |
| Plano | BASIC, PRO, ENTERPRISE | Sim |
| Email | Email principal | Sim |
| CNPJ | Documento da empresa | Nao |
| Telefone | Telefone de contato | Nao |

![Placeholder: Formulario de criacao de empresa](/img/guias/empresa-criar.png)

### Via API

```typescript
// Criar empresa
POST /api/admin/companies
{
  "name": "Minha Empresa",
  "slug": "minha-empresa",
  "plan": "PRO",
  "email": "contato@minhaempresa.com",
  "document": "12.345.678/0001-90",
  "phone": "+5511999998888",
  "address": {
    "street": "Rua Exemplo",
    "number": "123",
    "city": "Sao Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  },
  "settings": {
    "timezone": "America/Sao_Paulo",
    "language": "pt-BR"
  }
}

// Resposta
{
  "id": "company_123",
  "name": "Minha Empresa",
  "slug": "minha-empresa",
  "plan": "PRO",
  "status": "active",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

## Configurar Empresa

### Informacoes Basicas

```typescript
{
  company: {
    id: "company_123",
    name: "Minha Empresa",
    slug: "minha-empresa",
    plan: "PRO",

    // Informacoes de contato
    email: "contato@empresa.com",
    phone: "+5511999998888",
    website: "https://empresa.com",

    // Documentos
    document: "12.345.678/0001-90",
    stateRegistration: "123.456.789.000",

    // Endereco
    address: {
      street: "Rua Exemplo",
      number: "123",
      complement: "Sala 45",
      neighborhood: "Centro",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01234-567",
      country: "BR"
    }
  }
}
```

### Configuracoes Gerais

```typescript
{
  settings: {
    // Regional
    timezone: "America/Sao_Paulo",
    language: "pt-BR",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",

    // Horario comercial
    businessHours: {
      enabled: true,
      schedule: {
        monday: { start: "09:00", end: "18:00" },
        tuesday: { start: "09:00", end: "18:00" },
        wednesday: { start: "09:00", end: "18:00" },
        thursday: { start: "09:00", end: "18:00" },
        friday: { start: "09:00", end: "17:00" },
        saturday: null,
        sunday: null
      }
    },

    // Personalizacao
    branding: {
      logo: "https://empresa.com/logo.png",
      primaryColor: "#1E40AF",
      secondaryColor: "#3B82F6"
    }
  }
}
```

### Limites do Plano

```typescript
{
  limits: {
    // Plano BASIC
    basic: {
      users: 3,
      connections: 1,
      messagesPerMonth: 1000,
      departments: 3,
      templates: 10,
      ai: false,
      sla: false,
      notion: false,
      api: false
    },

    // Plano PRO
    pro: {
      users: 10,
      connections: 3,
      messagesPerMonth: 10000,
      departments: 10,
      templates: 50,
      ai: true,
      sla: true,
      notion: true,
      api: true
    },

    // Plano ENTERPRISE
    enterprise: {
      users: -1, // Ilimitado
      connections: -1,
      messagesPerMonth: -1,
      departments: -1,
      templates: -1,
      ai: true,
      sla: true,
      notion: true,
      api: true,
      whiteLabel: true,
      dedicatedSupport: true
    }
  }
}
```

## Gerenciar Empresa Existente

### Editar Informacoes

```typescript
// Atualizar empresa
PUT /api/admin/companies/{id}
{
  "name": "Empresa Atualizada",
  "email": "novo@email.com",
  "settings": {
    "timezone": "America/Fortaleza"
  }
}
```

### Alterar Plano

```typescript
// Upgrade de plano
POST /api/admin/companies/{id}/upgrade
{
  "newPlan": "ENTERPRISE",
  "billingCycle": "monthly",
  "effectiveDate": "2024-02-01"
}

// Downgrade de plano
POST /api/admin/companies/{id}/downgrade
{
  "newPlan": "BASIC",
  "effectiveDate": "2024-02-01",
  "reason": "Reducao de equipe"
}
```

### Suspender Empresa

```typescript
// Suspender (mantem dados, bloqueia acesso)
POST /api/admin/companies/{id}/suspend
{
  "reason": "Inadimplencia",
  "notifyUsers": true
}

// Reativar
POST /api/admin/companies/{id}/reactivate
```

### Excluir Empresa

```typescript
// Excluir permanentemente (CUIDADO!)
DELETE /api/admin/companies/{id}
{
  "confirm": true,
  "reason": "Solicitacao do cliente",
  "exportData": true // Exportar dados antes de excluir
}
```

:::danger Atencao
A exclusao de empresa e irreversivel. Todos os dados serao permanentemente removidos.
:::

## Usuarios Multi-empresa

Um usuario pode ter acesso a multiplas empresas:

```typescript
{
  user: {
    id: "user_123",
    email: "joao@email.com",
    name: "Joao Silva",

    // Empresas vinculadas
    companies: [
      {
        companyId: "company_a",
        companyName: "Empresa A",
        role: "admin",
        permissions: ["*"]
      },
      {
        companyId: "company_b",
        companyName: "Empresa B",
        role: "agent",
        permissions: ["tickets.view", "tickets.reply"]
      }
    ],

    // Empresa atual (contexto)
    currentCompany: "company_a"
  }
}
```

### Trocar de Empresa

Na interface, o usuario pode trocar de empresa pelo seletor no cabecalho:

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  ChatBlue       [Empresa A ▼]         [Joao ▼]     │
│                          ├─ Empresa A ✓                     │
│                          ├─ Empresa B                       │
│                          └─ Empresa C                       │
└─────────────────────────────────────────────────────────────┘
```

## Dashboard de Empresa

### Visao Geral

```
┌─────────────────────────────────────────────────────────────┐
│              Dashboard - Minha Empresa                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Plano: PRO                    Status: Ativo                │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │   Usuarios     │  │   Conexoes     │  │   Mensagens    ││
│  │    7 / 10      │  │    2 / 3       │  │  8.5K / 10K    ││
│  │   ████████░░   │  │   ██████░░░░   │  │   ████████░░   ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│                                                              │
│  Tickets Hoje: 45    │  SLA Compliance: 92%                 │
│  Tickets Abertos: 12 │  Tempo Medio Resposta: 8 min         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Metricas de Uso

```typescript
// Obter metricas de uso
GET /api/companies/{id}/usage

// Resposta
{
  "period": "2024-01",
  "plan": "PRO",
  "usage": {
    "users": {
      "current": 7,
      "limit": 10,
      "percentage": 70
    },
    "connections": {
      "current": 2,
      "limit": 3,
      "percentage": 67
    },
    "messages": {
      "current": 8500,
      "limit": 10000,
      "percentage": 85
    },
    "storage": {
      "current": "2.5 GB",
      "limit": "10 GB",
      "percentage": 25
    }
  },
  "alerts": [
    {
      "type": "warning",
      "message": "Voce ja usou 85% das mensagens do mes"
    }
  ]
}
```

## Cobranca e Faturamento

### Configurar Cobranca

```typescript
{
  billing: {
    // Ciclo de cobranca
    cycle: "monthly", // monthly, yearly

    // Dados de pagamento
    paymentMethod: {
      type: "credit_card",
      last4: "4242",
      brand: "visa",
      expiresAt: "12/2025"
    },

    // Endereco de cobranca
    billingAddress: {
      name: "Minha Empresa LTDA",
      document: "12.345.678/0001-90",
      email: "financeiro@empresa.com"
    },

    // Configuracoes
    settings: {
      autoRenew: true,
      invoiceEmail: "financeiro@empresa.com",
      invoiceDueDay: 10
    }
  }
}
```

### Historico de Faturas

```typescript
// Listar faturas
GET /api/companies/{id}/invoices

// Resposta
{
  "invoices": [
    {
      "id": "inv_123",
      "period": "Janeiro 2024",
      "plan": "PRO",
      "amount": 199.00,
      "status": "paid",
      "paidAt": "2024-01-05",
      "invoiceUrl": "https://..."
    },
    {
      "id": "inv_122",
      "period": "Dezembro 2023",
      "plan": "PRO",
      "amount": 199.00,
      "status": "paid",
      "paidAt": "2023-12-05"
    }
  ]
}
```

## Auditoria

### Log de Atividades

```typescript
// Obter log de auditoria
GET /api/companies/{id}/audit-log

// Resposta
{
  "logs": [
    {
      "id": "log_123",
      "timestamp": "2024-01-15T10:30:00Z",
      "action": "user.created",
      "actor": "admin@empresa.com",
      "details": {
        "userId": "user_456",
        "userName": "Maria Silva"
      }
    },
    {
      "id": "log_124",
      "timestamp": "2024-01-15T11:00:00Z",
      "action": "settings.updated",
      "actor": "admin@empresa.com",
      "details": {
        "field": "businessHours",
        "oldValue": {...},
        "newValue": {...}
      }
    }
  ]
}
```

## Solucao de Problemas

### Limite de usuarios atingido

**Causa**: Plano nao permite mais usuarios

**Solucoes**:
1. Fazer upgrade do plano
2. Desativar usuarios inativos
3. Remover usuarios duplicados

### Empresa suspensa

**Causas**:
- Inadimplencia
- Violacao de termos
- Solicitacao administrativa

**Solucao**: Contatar suporte para regularizar

### Dados nao aparecendo

**Causa**: Usuario no contexto errado de empresa

**Solucao**: Verificar empresa selecionada no cabecalho

## Boas Praticas

### 1. Organizacao

- Use slugs descritivos
- Mantenha informacoes atualizadas
- Configure horario comercial corretamente

### 2. Seguranca

- Revise usuarios periodicamente
- Mantenha logs de auditoria
- Configure permissoes adequadas

### 3. Planejamento

- Monitore uso vs limites
- Planeje upgrades com antecedencia
- Mantenha pagamentos em dia

## Proximos Passos

Apos configurar a empresa:

- [Configurar Usuarios](/guias/administracao/usuarios)
- [Configurar Departamentos](/guias/administracao/departamentos)
- [Configurar Permissoes](/guias/administracao/permissoes)
