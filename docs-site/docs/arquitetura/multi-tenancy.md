---
sidebar_position: 4
title: Multi-tenancy
description: Como funciona o isolamento de dados entre empresas
---

# Multi-tenancy

O ChatBlue implementa uma arquitetura multi-tenant que permite que multiplas empresas compartilhem a mesma infraestrutura mantendo isolamento completo de dados.

## Conceitos

### Tenant

Um tenant no ChatBlue e uma **empresa (Company)**. Cada empresa possui:

- Usuarios proprios
- Departamentos proprios
- Conexoes WhatsApp proprias
- Contatos e tickets isolados
- Configuracoes independentes

### Modelo de Dados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MODELO MULTI-TENANT                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │    COMPANY      │
                              │    (Tenant)     │
                              └────────┬────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
   ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
   │     Users     │          │  Departments  │          │  Connections  │
   │  (Usuarios)   │          │(Departamentos)│          │  (WhatsApp)   │
   └───────┬───────┘          └───────┬───────┘          └───────────────┘
           │                          │
           │                          │
           ▼                          ▼
   ┌───────────────┐          ┌───────────────┐
   │   Contacts    │          │    Tickets    │
   │  (Contatos)   │          │   (Tickets)   │
   └───────────────┘          └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │   Messages    │
                              │  (Mensagens)  │
                              └───────────────┘
```

## Isolamento de Dados

### No Banco de Dados

Todas as entidades principais possuem uma foreign key `companyId`:

```prisma
model Ticket {
  id        String   @id @default(uuid())
  companyId String   // Foreign key para Company
  company   Company  @relation(fields: [companyId], references: [id])
  // ... outros campos
}

model Contact {
  id        String   @id @default(uuid())
  companyId String   // Foreign key para Company
  company   Company  @relation(fields: [companyId], references: [id])
  // ... outros campos
}

model Message {
  id        String   @id @default(uuid())
  companyId String   // Foreign key para Company
  company   Company  @relation(fields: [companyId], references: [id])
  // ... outros campos
}
```

### No Backend

#### Middleware de Tenant

O middleware `tenant.middleware.ts` garante isolamento em todas as requisicoes:

```typescript
export const tenantMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Extrair companyId do token JWT
  const { companyId } = req.user;

  // Injetar no request para uso nos services
  req.tenantId = companyId;

  // Todas as queries devem usar este companyId
  next();
};
```

#### Services

Todos os services recebem e usam o `companyId`:

```typescript
class TicketService {
  async findAll(companyId: string, filters: TicketFilters) {
    return prisma.ticket.findMany({
      where: {
        companyId, // Sempre filtrar por empresa
        ...filters,
      },
    });
  }

  async create(companyId: string, data: CreateTicketDto) {
    return prisma.ticket.create({
      data: {
        ...data,
        companyId, // Sempre associar a empresa
      },
    });
  }
}
```

## Acesso Multi-empresa

Um usuario pode ter acesso a multiplas empresas. Isso e gerenciado pela tabela `UserCompany`:

```prisma
model UserCompany {
  id         String   @id @default(uuid())
  userId     String
  companyId  String
  role       CompanyRole @default(USER)
  status     AccessStatus @default(PENDING)
  approvedAt DateTime?
  approvedBy String?

  user    User    @relation(fields: [userId], references: [id])
  company Company @relation(fields: [companyId], references: [id])

  @@unique([userId, companyId])
}
```

### Fluxo de Acesso

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ACESSO MULTI-EMPRESA                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Usuario    │
└──────┬───────┘
       │ 1. Login com email/senha
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND                                      │
│                                                                   │
│  2. Verificar empresas do usuario                                │
│     SELECT * FROM UserCompany                                    │
│     WHERE userId = ? AND status = 'APPROVED'                     │
│                                                                   │
│  3. Se apenas uma empresa:                                       │
│     - Gerar token com companyId                                  │
│                                                                   │
│  4. Se multiplas empresas:                                       │
│     - Retornar lista de empresas                                 │
│     - Usuario seleciona qual acessar                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  5. Se multiplas empresas:                                       │
│     - Mostrar seletor de empresa                                 │
│     - Usuario escolhe                                            │
│                                                                   │
│  6. POST /api/user-access/switch-company                         │
│     { companyId }                                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND                                      │
│                                                                   │
│  7. Gerar novo token com companyId selecionado                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Troca de Empresa

```typescript
// Endpoint para trocar de empresa
router.post('/switch-company', async (req, res) => {
  const { userId } = req.user;
  const { companyId } = req.body;

  // Verificar se usuario tem acesso a empresa
  const access = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: { userId, companyId },
      status: 'APPROVED',
    },
  });

  if (!access) {
    throw new ForbiddenError('Acesso negado a esta empresa');
  }

  // Gerar novo token com a nova empresa
  const token = generateToken({ userId, companyId, role: access.role });

  res.json({ token });
});
```

## Solicitacao de Acesso

Usuarios podem solicitar acesso a novas empresas:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SOLICITACAO DE ACESSO                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                          ┌──────────────┐
│   Usuario    │                                          │    Admin     │
└──────┬───────┘                                          └──────┬───────┘
       │ 1. Solicita acesso a empresa                            │
       ▼                                                         │
┌─────────────────────────────────────────┐                     │
│ UserCompany criado com status PENDING   │                     │
└────────────────────┬────────────────────┘                     │
                     │                                           │
                     │ 2. Notificacao enviada                    │
                     ├──────────────────────────────────────────►│
                     │                                           │
                     │                         3. Admin aprova   │
                     │◄──────────────────────────────────────────┤
                     │                                           │
                     ▼                                           │
┌─────────────────────────────────────────┐                     │
│ UserCompany atualizado:                 │                     │
│   status: APPROVED                      │                     │
│   approvedAt: now()                     │                     │
│   approvedBy: adminId                   │                     │
└─────────────────────────────────────────┘                     │
       │                                                         │
       │ 4. Usuario pode acessar                                 │
       ▼                                                         │
┌──────────────┐                                          ┌──────────────┐
│   Usuario    │                                          │    Admin     │
└──────────────┘                                          └──────────────┘
```

## Planos de Empresa

Cada empresa pode ter um plano diferente:

```prisma
enum CompanyPlan {
  BASIC
  PRO
  ENTERPRISE
}

model Company {
  id        String      @id @default(uuid())
  name      String
  plan      CompanyPlan @default(BASIC)
  // ... outros campos
}
```

### Limites por Plano

| Recurso | BASIC | PRO | ENTERPRISE |
|---------|-------|-----|------------|
| Usuarios | 5 | 20 | Ilimitado |
| Conexoes WhatsApp | 1 | 3 | Ilimitado |
| Departamentos | 3 | 10 | Ilimitado |
| IA | Basico | Avancado | Custom |
| SLA | Nao | Sim | Sim |
| API | Nao | Sim | Sim |
| Suporte | Email | Prioritario | Dedicado |

## Seguranca

### Validacao em Todas as Camadas

1. **JWT Token**: Contem `companyId` validado
2. **Middleware**: Extrai e valida tenant
3. **Service**: Recebe e usa `companyId` em queries
4. **Prisma**: Foreign key garante integridade

### Prevencao de Vazamento

```typescript
// ERRADO - Pode vazar dados de outras empresas
const tickets = await prisma.ticket.findMany({
  where: { status: 'OPEN' },
});

// CORRETO - Sempre filtrar por empresa
const tickets = await prisma.ticket.findMany({
  where: {
    companyId: req.tenantId,
    status: 'OPEN'
  },
});
```

### Auditoria

Todas as acoes sao registradas com contexto de tenant:

```prisma
model Activity {
  id        String   @id @default(uuid())
  companyId String   // Tenant da acao
  userId    String?  // Usuario que executou
  type      String   // Tipo de acao
  metadata  Json?    // Dados adicionais
  createdAt DateTime @default(now())
}
```

## Boas Praticas

1. **Sempre usar `companyId`** em queries
2. **Validar acesso** antes de operacoes
3. **Nao confiar** em dados do cliente
4. **Testar isolamento** entre tenants
5. **Monitorar** tentativas de acesso indevido

## Proximos Passos

- [Seguranca](/arquitetura/seguranca)
- [Backend](/backend/visao-geral)
- [Gerenciamento de Empresas](/guias/administracao/empresas)
