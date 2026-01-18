---
sidebar_position: 5
title: Usuarios
description: Gerenciamento de usuarios, papeis e permissoes no ChatBlue
---

# Usuarios

O sistema de usuarios do ChatBlue oferece controle granular de acesso, suporte a multiplas empresas e diferentes niveis de permissao para atender organizacoes de todos os tamanhos.

## Visao Geral

O gerenciamento de usuarios inclui:

- **Papeis e permissoes** hierarquicos
- **Acesso multi-empresa** para consultores e gestores
- **Vinculo a departamentos** para controle de visibilidade
- **Status online/offline** em tempo real
- **Metricas individuais** de performance
- **Usuario de IA** para atendimento automatizado

## Interface do Usuario

### Lista de Usuarios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Usuarios                                       [+ Novo Usuario] [Filtros]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Buscar por nome ou email...]                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────┬────────────────────────────────────────────────────────────────┐   │
│  │     │  Maria Santos                              ● Online             │   │
│  │ 👤 │  maria@empresa.com | Admin                                      │   │
│  │     │  Departamentos: Suporte, Comercial         Tickets: 8          │   │
│  ├─────┼────────────────────────────────────────────────────────────────┤   │
│  │     │  Pedro Costa                               ● Online             │   │
│  │ 👤 │  pedro@empresa.com | Agente                                     │   │
│  │     │  Departamentos: Suporte                    Tickets: 5          │   │
│  ├─────┼────────────────────────────────────────────────────────────────┤   │
│  │     │  Ana Lima                                  ○ Offline            │   │
│  │ 👤 │  ana@empresa.com | Supervisor                                   │   │
│  │     │  Departamentos: Comercial                  Tickets: 0          │   │
│  ├─────┼────────────────────────────────────────────────────────────────┤   │
│  │     │  ChatBlue IA                               ● Sempre Online      │   │
│  │ 🤖 │  ia@chatblue.ai | Agente (IA)                                   │   │
│  │     │  Departamentos: Todos                      Tickets: 120        │   │
│  └─────┴────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Mostrando 1-20 de 15 usuarios                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Criar/Editar Usuario

```
┌─────────────────────────────────────┐
│  Novo Usuario                       │
├─────────────────────────────────────┤
│                                     │
│  Informacoes Basicas                │
│  ──────────────────                 │
│                                     │
│  Nome:                              │
│  ┌─────────────────────────────┐    │
│  │ Maria Santos                │    │
│  └─────────────────────────────┘    │
│                                     │
│  Email:                             │
│  ┌─────────────────────────────┐    │
│  │ maria@empresa.com           │    │
│  └─────────────────────────────┘    │
│                                     │
│  Senha:                             │
│  ┌─────────────────────────────┐    │
│  │ ••••••••••                  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Papel:                             │
│  ┌─────────────────────────────┐    │
│  │ Admin                   ▼   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ──────────────────────────────     │
│                                     │
│  Departamentos                      │
│  ──────────────────                 │
│                                     │
│  [x] Suporte (Gerente)              │
│  [x] Comercial                      │
│  [ ] Financeiro                     │
│  [ ] TI                             │
│                                     │
│  ──────────────────────────────     │
│                                     │
│  [x] Ativo                          │
│  [ ] Usuario de IA                  │
│                                     │
│  [Cancelar]              [Salvar]   │
│                                     │
└─────────────────────────────────────┘
```

## Modelo de Dados

### Estrutura do Usuario

```prisma
model User {
  id             String    @id @default(uuid())
  email          String    @unique
  password       String                      // Hash bcrypt
  name           String
  avatar         String?                     // URL do avatar
  role           Role      @default(AGENT)   // Papel do usuario
  isActive       Boolean   @default(true)
  isAI           Boolean   @default(false)   // Se e usuario de IA
  isOnline       Boolean   @default(false)   // Status online
  lastSeenAt     DateTime?                   // Ultima vez online
  primaryCompanyId String?                   // Empresa principal
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relacionamentos
  primaryCompany  Company?         @relation(fields: [primaryCompanyId], references: [id])
  companies       UserCompany[]    // Acesso a multiplas empresas
  departments     UserDepartment[] // Departamentos vinculados
  tickets         Ticket[]         // Tickets atribuidos
  messages        Message[]        // Mensagens enviadas
  activities      Activity[]       // Atividades registradas
  aiConfig        AIUserConfig?    // Configuracao se for IA
}

enum Role {
  SUPER_ADMIN  // Administrador do sistema
  ADMIN        // Administrador da empresa
  SUPERVISOR   // Supervisor de equipe
  AGENT        // Agente de atendimento
}
```

## Papeis e Permissoes

### Hierarquia de Papeis

```
                    ┌─────────────────┐
                    │   SUPER_ADMIN   │
                    │   (Sistema)     │
                    └────────┬────────┘
                             │
                             │ Acesso total
                             ▼
                    ┌─────────────────┐
                    │     ADMIN       │
                    │   (Empresa)     │
                    └────────┬────────┘
                             │
                             │ Gerencia empresa
                             ▼
                    ┌─────────────────┐
                    │   SUPERVISOR    │
                    │   (Equipe)      │
                    └────────┬────────┘
                             │
                             │ Gerencia equipe
                             ▼
                    ┌─────────────────┐
                    │     AGENT       │
                    │  (Atendimento)  │
                    └─────────────────┘
```

### Matriz de Permissoes

| Recurso | AGENT | SUPERVISOR | ADMIN | SUPER_ADMIN |
|---------|-------|------------|-------|-------------|
| Ver tickets proprios | ✓ | ✓ | ✓ | ✓ |
| Ver tickets do departamento | ✓ | ✓ | ✓ | ✓ |
| Ver todos tickets | - | ✓ | ✓ | ✓ |
| Transferir tickets | ✓ | ✓ | ✓ | ✓ |
| Alterar prioridade | - | ✓ | ✓ | ✓ |
| Ver metricas proprias | ✓ | ✓ | ✓ | ✓ |
| Ver metricas da equipe | - | ✓ | ✓ | ✓ |
| Ver metricas da empresa | - | - | ✓ | ✓ |
| Gerenciar usuarios | - | - | ✓ | ✓ |
| Gerenciar departamentos | - | - | ✓ | ✓ |
| Configurar empresa | - | - | ✓ | ✓ |
| Configurar WhatsApp | - | - | ✓ | ✓ |
| Configurar IA | - | - | ✓ | ✓ |
| Acessar multiplas empresas | - | - | - | ✓ |
| Gerenciar planos | - | - | - | ✓ |

### Descricao dos Papeis

#### SUPER_ADMIN

```typescript
// Permissoes do Super Admin
{
  role: 'SUPER_ADMIN',
  permissions: {
    // Acesso a todas as empresas
    companies: ['*'],

    // Todas as acoes disponiveis
    actions: [
      'company:create',
      'company:delete',
      'company:manage_plan',
      'user:create_admin',
      'system:configure',
      'system:view_logs'
    ]
  }
}
```

#### ADMIN

```typescript
// Permissoes do Admin
{
  role: 'ADMIN',
  permissions: {
    // Acesso total a sua empresa
    company: 'own',

    actions: [
      'user:create',
      'user:edit',
      'user:delete',
      'department:manage',
      'settings:configure',
      'whatsapp:configure',
      'ai:configure',
      'reports:full'
    ]
  }
}
```

#### SUPERVISOR

```typescript
// Permissoes do Supervisor
{
  role: 'SUPERVISOR',
  permissions: {
    // Acesso aos departamentos vinculados
    departments: ['assigned'],

    actions: [
      'ticket:view_all',
      'ticket:reassign',
      'ticket:change_priority',
      'reports:team',
      'user:view'
    ]
  }
}
```

#### AGENT

```typescript
// Permissoes do Agente
{
  role: 'AGENT',
  permissions: {
    // Acesso apenas aos proprios tickets
    tickets: ['own', 'department'],

    actions: [
      'ticket:respond',
      'ticket:transfer',
      'ticket:resolve',
      'reports:own'
    ]
  }
}
```

## Acesso Multi-Empresa

### Visao Geral

Usuarios podem ter acesso a multiplas empresas, util para:

- **Consultores** que atendem varios clientes
- **Gestores** de grupos empresariais
- **Suporte tecnico** da plataforma

### Modelo de Acesso

```prisma
model UserCompany {
  id         String       @id @default(uuid())
  userId     String
  companyId  String
  role       CompanyRole  @default(USER)   // Papel nesta empresa
  status     AccessStatus @default(PENDING)
  approvedAt DateTime?
  approvedBy String?
  createdAt  DateTime     @default(now())

  user    User    @relation(fields: [userId], references: [id])
  company Company @relation(fields: [companyId], references: [id])

  @@unique([userId, companyId])
}

enum CompanyRole {
  ADMIN  // Administrador na empresa
  USER   // Usuario comum na empresa
}

enum AccessStatus {
  PENDING   // Aguardando aprovacao
  APPROVED  // Aprovado
  REJECTED  // Rejeitado
}
```

### Fluxo de Solicitacao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Usuario                  Sistema                    Admin Empresa         │
│                                                                             │
│   ┌─────────────┐                                                          │
│   │ Solicita    │                                                          │
│   │ Acesso      │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          │  POST /api/companies/{id}/request-access                        │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │  Registro   │          Notificacao            ┌─────────────┐          │
│   │  Pendente   │ ───────────────────────────────►│  Recebe     │          │
│   └─────────────┘                                 │  Alerta     │          │
│                                                   └──────┬──────┘          │
│                                                          │                  │
│                         ◄────────────────────────────────┤                  │
│                           Aprovar/Rejeitar               │                  │
│                                                          ▼                  │
│   ┌─────────────┐                                 ┌─────────────┐          │
│   │  Acesso     │◄────────────────────────────────│  Decisao    │          │
│   │  Liberado   │     Notificacao                 │             │          │
│   └─────────────┘                                 └─────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Troca de Empresa

```
┌─────────────────────────────────────┐
│  Selecionar Empresa                 │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ● Empresa Atual             │    │
│  │   Tech Solutions Ltda       │    │
│  │   Admin                     │    │
│  ├─────────────────────────────┤    │
│  │ ○ ABC Comercio              │    │
│  │   Usuario                   │    │
│  ├─────────────────────────────┤    │
│  │ ○ XYZ Servicos              │    │
│  │   Admin                     │    │
│  └─────────────────────────────┘    │
│                                     │
│  [+ Solicitar Acesso a Empresa]     │
│                                     │
└─────────────────────────────────────┘
```

## Status Online/Offline

### Gerenciamento de Presenca

```typescript
// Eventos de presenca via Socket.io
socket.on('connect', () => {
  // Usuario fica online
  updateUserStatus(userId, { isOnline: true });
});

socket.on('disconnect', () => {
  // Usuario fica offline
  updateUserStatus(userId, {
    isOnline: false,
    lastSeenAt: new Date()
  });
});
```

### Indicadores Visuais

| Status | Icone | Significado |
|--------|-------|-------------|
| Online | ● Verde | Disponivel para atendimento |
| Offline | ○ Cinza | Nao esta conectado |
| Ocupado | ● Amarelo | Conectado mas indisponivel |
| Ausente | ● Laranja | Conectado mas ausente |

### Impacto no Roteamento

```
Auto-assign considera apenas usuarios:
- isOnline: true
- isActive: true
- tickets < maxTicketsPerAgent
- Vinculado ao departamento do ticket
```

## Usuario de IA

### Configuracao

```
┌─────────────────────────────────────┐
│  Usuario de IA                      │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🤖 ChatBlue IA              │    │
│  │    ia@chatblue.ai           │    │
│  │    Sempre Online            │    │
│  └─────────────────────────────┘    │
│                                     │
│  Configuracoes:                     │
│  ──────────────                     │
│                                     │
│  Provider:                          │
│  (●) OpenAI  ( ) Anthropic          │
│                                     │
│  Modelo:                            │
│  ┌─────────────────────────────┐    │
│  │ gpt-4-turbo-preview     ▼  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Personalidade:                     │
│  ┌─────────────────────────────┐    │
│  │ Amigavel e profissional    │    │
│  │ Responde em portugues      │    │
│  │ Usa nome do cliente        │    │
│  └─────────────────────────────┘    │
│                                     │
│  [x] Usar emojis                    │
│  [x] Transferir quando necessario   │
│  [x] Guardrails ativados            │
│                                     │
│  [Testar IA]        [Salvar]        │
│                                     │
└─────────────────────────────────────┘
```

### Modelo do Usuario IA

```prisma
model AIUserConfig {
  id        String @id @default(uuid())
  userId    String @unique
  provider  String // openai, anthropic
  model     String // gpt-4, claude-3
  apiKey    String // Chave da API

  // Personalidade
  personality String?
  tone        String?  // friendly, formal
  style       String?  // concise, detailed
  useEmoji    Boolean @default(false)
  useClientName Boolean @default(true)

  // Comportamento
  guardrails     Boolean @default(true)
  autoTransfer   Boolean @default(true)
  maxMessages    Int @default(10)

  user User @relation(fields: [userId], references: [id])
}
```

## Perfil do Usuario

### Visualizacao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Meu Perfil                                                    [Editar]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐                                                           │
│   │             │   Maria Santos                                            │
│   │   Avatar    │   ──────────────────────────────────────────────          │
│   │             │                                                           │
│   │  [Alterar]  │   Email: maria@empresa.com                               │
│   └─────────────┘   Papel: Admin                                           │
│                     Desde: Janeiro 2024                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Departamentos                                                              │
│   ─────────────                                                             │
│   ● Suporte (Gerente)                                                       │
│   ● Comercial (Agente)                                                      │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Estatisticas (Ultimos 30 dias)                                            │
│   ─────────────────────────────                                             │
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │   Tickets    │  │   Tempo      │  │    SLA       │  │  Avaliacao   │   │
│   │   Resolvidos │  │   Medio      │  │  Cumprido    │  │    Media     │   │
│   │      45      │  │   12 min     │  │    94.5%     │  │    4.8/5     │   │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Seguranca                                                                  │
│   ─────────                                                                  │
│   [Alterar Senha]                                                           │
│   Ultima alteracao: 15/01/2024                                              │
│                                                                              │
│   [Configurar 2FA]                                                          │
│   Status: Nao configurado                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Casos de Uso

### 1. Onboarding de Novo Agente

**Cenario**: Empresa contrata novo atendente.

```
1. Admin cria usuario com papel AGENT
2. Define senha temporaria
3. Vincula aos departamentos apropriados
4. Usuario recebe email de boas-vindas
5. Usuario acessa e altera senha
6. Sistema comeca a atribuir tickets
```

### 2. Promocao a Supervisor

**Cenario**: Agente experiente vira supervisor.

```
1. Admin edita usuario
2. Altera papel de AGENT para SUPERVISOR
3. Marca como gerente no departamento
4. Usuario ganha novas permissoes:
   - Ver todos tickets do departamento
   - Acessar metricas da equipe
   - Reatribuir tickets
```

### 3. Consultor Multi-Empresa

**Cenario**: Consultor atende 3 clientes.

```
1. Consultor solicita acesso as empresas
2. Cada admin aprova o acesso
3. Consultor pode alternar entre empresas
4. Cada empresa tem configuracoes independentes
5. Dados completamente isolados
```

### 4. Configuracao de IA

**Cenario**: Empresa quer atendimento automatizado.

```
1. Admin cria usuario de IA
2. Configura provider (OpenAI/Anthropic)
3. Define personalidade e regras
4. Associa a todos os departamentos
5. Ativa para novos tickets
6. IA comeca a responder automaticamente
```

## Integracao com Outras Funcionalidades

### Tickets

- Usuarios sao atribuidos a tickets
- Metricas calculadas por usuario
- Transferencias registram usuarios

### Departamentos

- Usuarios vinculados a departamentos
- Gerentes tem visao ampliada
- Visibilidade baseada em vinculo

### Chat

- Mensagens identificam remetente
- Status online visivel
- Indicador de digitacao

### SLA

- Metricas individuais de SLA
- Rankings de performance
- Alertas personalizados

### Notificacoes

- Preferencias por usuario
- Alertas de atribuicao
- Resumos personalizados

## Boas Praticas

### Seguranca

1. **Senhas fortes** - Minimo 8 caracteres, numeros e simbolos
2. **Troca periodica** - Forcar troca a cada 90 dias
3. **2FA quando possivel** - Autenticacao em duas etapas
4. **Principio do menor privilegio** - Dar apenas permissoes necessarias
5. **Revise acessos** - Periodicamente verifique usuarios ativos

### Organizacao

1. **Nomes padronizados** - Nome completo no cadastro
2. **Emails corporativos** - Evite emails pessoais
3. **Avatares** - Facilita identificacao visual
4. **Departamentos corretos** - Vincule adequadamente
5. **Desative inativos** - Remova acessos de ex-funcionarios

### Performance

1. **Monitore metricas** - Acompanhe performance individual
2. **Balance carga** - Distribua tickets igualmente
3. **Defina metas** - SLA e avaliacoes por usuario
4. **Feedback regular** - Use dados para coaching
5. **Reconheca destaques** - Valorize bons resultados

## Proximos Passos

- [Departamentos](/funcionalidades/departamentos) - Estrutura organizacional
- [SLA e Metricas](/funcionalidades/sla-metricas) - Performance e acordos
- [Notificacoes](/funcionalidades/notificacoes) - Alertas e preferencias
