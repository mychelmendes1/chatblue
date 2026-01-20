# Lógica de Visibilidade de Tickets

Este documento explica como funciona a visibilidade de tickets no sistema ChatBlue.

## 📋 Resumo da Lógica

A visibilidade de tickets é determinada pelo **papel (role)** do usuário e sua **associação com departamentos**.

### 👑 SUPER_ADMIN e ADMIN

**Vêem TODOS os tickets da empresa**, sem nenhum filtro de visibilidade.

```typescript
if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
  // Vê todos os tickets da empresa
  // Sem filtro de visibilidade
}
```

### 👤 Outros Usuários (AGENT, SUPERVISOR, etc.)

**Só veem tickets que atendem a uma das condições:**

1. ✅ **Ticket atribuído diretamente a eles**
   ```typescript
   { assignedToId: userId }
   ```

2. ✅ **Ticket em um departamento que eles fazem parte**
   ```typescript
   { departmentId: { in: [departamentos_do_usuario] } }
   ```

3. ✅ **Ticket em departamento filho de um departamento pai que eles fazem parte**
   - Se o usuário está no departamento "Triagem", ele também vê tickets de "Comercial" e "Suporte" (filhos de Triagem)

4. ✅ **Ticket não atribuído (se o usuário NÃO tem departamentos)**
   ```typescript
   // Se usuário não tem departamentos, pode ver tickets não atribuídos
   if (visibleDeptIds.size === 0) {
     { assignedToId: null }
   }
   ```

## 🔍 Código de Referência

A lógica está implementada em `apps/api/src/routes/ticket.routes.ts`:

```89:119:apps/api/src/routes/ticket.routes.ts
    // Non-admins can only see tickets from their departments or assigned to them
    const where: any = { ...baseWhere };
    
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user!.role)) {
      const visibilityConditions: any[] = [
        { assignedToId: req.user!.userId },
      ];

      // Add department visibility if user has departments
      if (visibleDeptIds.size > 0) {
        visibilityConditions.push({ departmentId: { in: Array.from(visibleDeptIds) } });
      } else {
        // If user has no departments, they can see unassigned tickets from their company
        // This allows agents without departments to see and pick up tickets
        visibilityConditions.push({ assignedToId: null });
      }

      // If there's a search, combine with visibility conditions using AND
      if (searchConditions.length > 0) {
        where.AND = [
          {
            OR: visibilityConditions,
          },
          {
            OR: searchConditions,
          },
        ];
      } else {
        // No search - just visibility conditions
        where.OR = visibilityConditions;
      }
    }
```

## 🎯 Exemplo Prático: Cliente 554896195555

### Cenário 1: Ticket atribuído à IA

- **Ticket**: Protocolo XYZ
- **Atribuído a**: Maria (IA)
- **Departamento**: Triagem
- **Tayara**: Faz parte do departamento "Comercial"

**Resultado**: 
- ✅ **Super Admin vê**: Sim (vê todos)
- ❌ **Tayara não vê**: O ticket está em "Triagem" e atribuído à IA, não está em "Comercial" nem atribuído a ela

### Cenário 2: Ticket em departamento diferente

- **Ticket**: Protocolo XYZ
- **Atribuído a**: Ninguém (null)
- **Departamento**: Suporte
- **Tayara**: Faz parte do departamento "Comercial"

**Resultado**:
- ✅ **Super Admin vê**: Sim (vê todos)
- ❌ **Tayara não vê**: O ticket está em "Suporte", não em "Comercial"

### Cenário 3: Ticket atribuído à Tayara

- **Ticket**: Protocolo XYZ
- **Atribuído a**: Tayara
- **Departamento**: Qualquer um

**Resultado**:
- ✅ **Super Admin vê**: Sim
- ✅ **Tayara vê**: Sim (atribuído diretamente a ela)

### Cenário 4: Ticket no mesmo departamento

- **Ticket**: Protocolo XYZ
- **Atribuído a**: Ninguém ou outro usuário
- **Departamento**: Comercial
- **Tayara**: Faz parte do departamento "Comercial"

**Resultado**:
- ✅ **Super Admin vê**: Sim
- ✅ **Tayara vê**: Sim (ticket está no departamento dela)

## 🔧 Como Verificar Visibilidade

Execute o script de verificação:

```bash
cd apps/api
pnpm check:visibility
```

O script irá:
1. Buscar o contato pelo telefone
2. Listar todos os tickets do contato
3. Buscar a usuária Tayara e seus departamentos
4. Verificar se cada ticket é visível para Tayara
5. Explicar o motivo de cada visibilidade/não-visibilidade

## 💡 Soluções para Tornar Ticket Visível

### Opção 1: Atribuir o ticket à Tayara

```sql
UPDATE tickets 
SET assigned_to_id = 'id_da_tayara'
WHERE id = 'id_do_ticket';
```

### Opção 2: Mover o ticket para o departamento da Tayara

```sql
UPDATE tickets 
SET department_id = 'id_do_departamento_da_tayara'
WHERE id = 'id_do_ticket';
```

### Opção 3: Adicionar Tayara ao departamento do ticket

```sql
INSERT INTO user_departments (user_id, department_id)
VALUES ('id_da_tayara', 'id_do_departamento_do_ticket');
```

### Opção 4: Tornar Tayara ADMIN

```sql
UPDATE users 
SET role = 'ADMIN'
WHERE id = 'id_da_tayara';
```

⚠️ **Atenção**: Tornar ADMIN dará acesso a TODOS os tickets da empresa.

## 📊 Hierarquia de Departamentos

O sistema também considera a hierarquia de departamentos:

```
Triagem (pai)
├── Comercial (filho)
├── Suporte (filho)
└── Financeiro (filho)
```

Se Tayara está em "Triagem", ela também vê tickets de "Comercial", "Suporte" e "Financeiro".

## 🚨 Casos Especiais

### Usuário sem Departamentos

Se um usuário **não tem departamentos atribuídos**, ele pode ver:
- Tickets atribuídos diretamente a ele
- Tickets **não atribuídos** (assignedToId = null)

Isso permite que agentes sem departamento "peguem" tickets disponíveis.

### Busca (Search)

Quando há uma busca por telefone/nome/protocolo:
- A busca é combinada com as condições de visibilidade usando `AND`
- O ticket precisa atender **ambas** as condições: visibilidade **E** busca

## 📝 Logs

O sistema registra logs detalhados quando um usuário acessa tickets:

```
GET /tickets
  userId: xxx
  companyId: xxx
  role: AGENT
  query: { ... }
```

Verifique os logs para entender quais filtros foram aplicados.




