# Filtros de Tickets - Nova Lógica

Este documento descreve a nova lógica de filtros de tickets implementada.

## 📋 Filtros Disponíveis

### 1. **TODOS**
- **Descrição**: Mostra todas as conversas de todos os departamentos para todo mundo
- **Comportamento**: 
  - Remove todas as restrições de visibilidade por departamento
  - Mostra todos os tickets da empresa
  - Disponível para todos os usuários (não apenas admins)

### 2. **FILA**
- **Descrição**: Mostra todas as conversas do departamento da pessoa que não estão sendo atendidas
- **Comportamento**:
  - Filtra por status: `PENDING`
  - Filtra por `assignedToId: null` (não atribuídos)
  - Mostra apenas tickets dos departamentos que o usuário faz parte
  - Se o usuário não tem departamentos, mostra todos os tickets não atribuídos da empresa

### 3. **MEUS**
- **Descrição**: Mostra todas as conversas atribuídas àquela pessoa
- **Comportamento**:
  - Filtra por `assignedToId: userId`
  - Mostra apenas tickets atribuídos diretamente ao usuário

### 4. **@Menções**
- **Descrição**: Mostra todas as conversas onde a pessoa foi mencionada
- **Comportamento**:
  - Filtra tickets que têm mensagens onde o usuário foi mencionado
  - Usa o campo `mentionedUserIds` das mensagens

### 5. **Admin e Super Admin**
- **Descrição**: Podem ver tudo
- **Comportamento**:
  - Sempre veem todos os tickets da empresa
  - Não têm restrições de visibilidade
  - Aplicam apenas os filtros específicos (status, search, etc.)

## 🔧 Implementação Técnica

### Detecção do Filtro

O sistema detecta qual filtro está ativo baseado nos parâmetros da query:

```typescript
const isMentionsFilter = hasMentions === 'true';
const isMyTicketsFilter = assignedToId === req.user!.userId;
const isQueueFilter = status === 'PENDING' && !assignedToId && !isMentionsFilter;
const isAllFilter = !status && !assignedToId && !isMentionsFilter;
```

### Lógica de Visibilidade

#### Para Admins (SUPER_ADMIN, ADMIN)
- Sempre veem todos os tickets
- Aplicam apenas filtros específicos (search, status, etc.)

#### Para Não-Admins

**TODOS (isAllFilter)**:
```typescript
// Sem restrições de visibilidade - mostra todos os tickets da empresa
where = { companyId, ...baseFilters }
```

**FILA (isQueueFilter)**:
```typescript
// Status PENDING + não atribuído + departamento do usuário
where = {
  companyId,
  status: 'PENDING',
  assignedToId: null,
  departmentId: { in: userDepartments }
}
```

**MEUS (isMyTicketsFilter)**:
```typescript
// Apenas tickets atribuídos ao usuário
where = {
  companyId,
  assignedToId: userId,
  ...baseFilters
}
```

**@Menções (isMentionsFilter)**:
```typescript
// Tickets onde o usuário foi mencionado
where = {
  companyId,
  messages: {
    some: {
      mentionedUserIds: { has: userId }
    }
  },
  ...baseFilters
}
```

## 📊 Exemplos de Uso

### Exemplo 1: Usuário vê TODOS os tickets
```
GET /tickets
→ Retorna: Todos os tickets da empresa (sem filtro de departamento)
```

### Exemplo 2: Usuário vê FILA do seu departamento
```
GET /tickets?status=PENDING
→ Retorna: Tickets PENDING não atribuídos do departamento do usuário
```

### Exemplo 3: Usuário vê MEUS tickets
```
GET /tickets?assignedToId=userId
→ Retorna: Apenas tickets atribuídos ao usuário
```

### Exemplo 4: Usuário vê @Menções
```
GET /tickets?hasMentions=true
→ Retorna: Tickets onde o usuário foi mencionado
```

## 🔄 Mudanças em Relação à Versão Anterior

### Antes
- Usuários não-admin só viam tickets de seus departamentos ou atribuídos a eles
- Não havia filtro "TODOS" disponível para não-admins
- Filtro "FILA" não existia

### Agora
- **TODOS**: Disponível para todos, mostra todos os tickets da empresa
- **FILA**: Novo filtro que mostra tickets não atribuídos do departamento
- **MEUS**: Mantido como estava
- **@Menções**: Mantido como estava
- Admins continuam vendo tudo

## ⚠️ Notas Importantes

1. O filtro **TODOS** remove restrições de visibilidade, permitindo que qualquer usuário veja todos os tickets da empresa
2. O filtro **FILA** considera apenas tickets do departamento do usuário que não estão atribuídos
3. Se um usuário não tem departamentos, o filtro **FILA** mostra todos os tickets não atribuídos da empresa
4. Admins sempre veem tudo, independente do filtro selecionado






