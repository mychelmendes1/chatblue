---
sidebar_position: 4
title: Departamentos
description: Hierarquia e gerenciamento de departamentos no ChatBlue
---

# Departamentos

O sistema de departamentos permite organizar sua equipe de atendimento em areas especializadas, com hierarquia flexivel e configuracoes independentes.

## Visao Geral

Os departamentos no ChatBlue oferecem:

- **Hierarquia multinivel** (pais e filhos)
- **Atribuicao automatica** de tickets
- **SLA independente** por departamento
- **Usuarios vinculados** a departamentos
- **Base de conhecimento** especifica
- **Transferencias inteligentes**

## Interface do Usuario

### Lista de Departamentos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Departamentos                                              [+ Novo Depto]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ▼ Atendimento                                                    Ordem: 1  │
│    │  Cor: #6366f1  |  Usuarios: 12  |  Tickets: 45                        │
│    │                                                                        │
│    ├─── Comercial                                                 Ordem: 1  │
│    │      Cor: #22c55e  |  Usuarios: 4  |  Tickets: 20                     │
│    │                                                                        │
│    ├─── Suporte                                                   Ordem: 2  │
│    │      Cor: #f59e0b  |  Usuarios: 5  |  Tickets: 18                     │
│    │                                                                        │
│    └─── Financeiro                                                Ordem: 3  │
│           Cor: #ef4444  |  Usuarios: 3  |  Tickets: 7                      │
│                                                                              │
│  ▼ Administrativo                                                 Ordem: 2  │
│    │  Cor: #8b5cf6  |  Usuarios: 3  |  Tickets: 5                          │
│    │                                                                        │
│    ├─── RH                                                        Ordem: 1  │
│    │      Cor: #ec4899  |  Usuarios: 2  |  Tickets: 3                      │
│    │                                                                        │
│    └─── TI                                                        Ordem: 2  │
│           Cor: #06b6d4  |  Usuarios: 1  |  Tickets: 2                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Criar/Editar Departamento

```
┌─────────────────────────────────────┐
│  Novo Departamento                  │
├─────────────────────────────────────┤
│                                     │
│  Nome:                              │
│  ┌─────────────────────────────┐    │
│  │ Suporte Tecnico             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Departamento Pai:                  │
│  ┌─────────────────────────────┐    │
│  │ Atendimento            ▼   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Cor:                               │
│  ┌─────────────────────────────┐    │
│  │ [●] #f59e0b (Laranja)       │    │
│  └─────────────────────────────┘    │
│                                     │
│  Ordem de Exibicao:                 │
│  ┌─────────────────────────────┐    │
│  │ 2                           │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ ] Departamento padrao            │
│  [x] Ativo                          │
│                                     │
│  [Cancelar]              [Salvar]   │
│                                     │
└─────────────────────────────────────┘
```

## Modelo de Dados

### Estrutura do Departamento

```prisma
model Department {
  id        String   @id @default(uuid())
  companyId String
  parentId  String?                      // Departamento pai (hierarquia)
  name      String                       // Nome do departamento
  color     String   @default("#6366f1") // Cor para identificacao visual
  order     Int      @default(0)         // Ordem de exibicao
  isActive  Boolean  @default(true)      // Se esta ativo
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relacionamentos
  company        Company          @relation(fields: [companyId], references: [id])
  parent         Department?      @relation("DepartmentHierarchy", fields: [parentId], references: [id])
  children       Department[]     @relation("DepartmentHierarchy")
  users          UserDepartment[] // Usuarios vinculados
  tickets        Ticket[]         // Tickets do departamento
  slaConfig      SLAConfig?       // Configuracao de SLA
  knowledgeBases KnowledgeBase[]  // Base de conhecimento
  faqs           FAQ[]            // FAQs especificas
}
```

### Vinculo Usuario-Departamento

```prisma
model UserDepartment {
  id           String   @id @default(uuid())
  userId       String
  departmentId String
  isManager    Boolean  @default(false) // Se e gerente do departamento
  createdAt    DateTime @default(now())

  user       User       @relation(fields: [userId], references: [id])
  department Department @relation(fields: [departmentId], references: [id])

  @@unique([userId, departmentId])
}
```

## Hierarquia de Departamentos

### Estrutura em Arvore

```
                      ┌─────────────────┐
                      │    Empresa      │
                      │   (Company)     │
                      └────────┬────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────┴──────┐     ┌──────┴──────┐     ┌──────┴──────┐
   │ Atendimento │     │Administrativo│     │  Marketing  │
   │   (Nivel 1) │     │   (Nivel 1)  │     │  (Nivel 1)  │
   └──────┬──────┘     └──────┬──────┘     └─────────────┘
          │                   │
   ┌──────┼──────┐     ┌──────┼──────┐
   │      │      │     │      │      │
┌──┴──┐ ┌─┴──┐ ┌─┴──┐ ┌┴──┐ ┌─┴─┐    │
│Comerc│ │Sup.│ │Fin.│ │RH │ │TI │    │
│Nivel2│ │N.2 │ │N.2 │ │N.2│ │N.2│    │
└─────┘ └────┘ └────┘ └───┘ └───┘    │
                                      │
                               ┌──────┴──────┐
                               │ Suporte N3  │
                               │  (Nivel 3)  │
                               └─────────────┘
```

### Navegacao Hierarquica

- **Breadcrumb**: Atendimento > Suporte > Suporte N3
- **Expandir/Colapsar**: Visualizacao em arvore
- **Drag & Drop**: Reorganizar hierarquia
- **Limite**: Ate 5 niveis de profundidade

## Usuarios e Departamentos

### Vinculacao de Usuarios

```
┌─────────────────────────────────────────────────────────────────┐
│  Departamento: Suporte                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuarios Vinculados                              [+ Adicionar] │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  👤 Maria Santos         ● Online    [Gerente]    [x]   │   │
│  │     5 tickets ativos     SLA: 95%                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  👤 Pedro Costa          ● Online    [Agente]     [x]   │   │
│  │     3 tickets ativos     SLA: 92%                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  👤 Ana Lima             ○ Offline   [Agente]     [x]   │   │
│  │     0 tickets ativos     SLA: 98%                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Papeis no Departamento

| Papel | Descricao | Permissoes |
|-------|-----------|------------|
| **Gerente** | Responsavel pelo departamento | Ver todos tickets, metricas, configurar |
| **Agente** | Atendente do departamento | Ver tickets atribuidos, responder |

### Multi-departamento

Um usuario pode pertencer a multiplos departamentos:

```
┌─────────────────────────────────────┐
│  Usuario: Maria Santos              │
├─────────────────────────────────────┤
│                                     │
│  Departamentos:                     │
│  ┌─────────────────────────────┐    │
│  │ ● Suporte     [Gerente]     │    │
│  │ ● Comercial   [Agente]      │    │
│  │ ● Triagem     [Agente]      │    │
│  └─────────────────────────────┘    │
│                                     │
│  Tickets visiveis: Todos dos       │
│  departamentos vinculados           │
│                                     │
└─────────────────────────────────────┘
```

## Fluxo de Atendimento

### Roteamento Inicial

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Nova Mensagem                                                             │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────┐    Sim    ┌─────────────┐                                │
│   │  Tem dept.  │──────────►│   Usar      │                                │
│   │   padrao?   │           │   padrao    │                                │
│   └──────┬──────┘           └──────┬──────┘                                │
│          │ Nao                     │                                        │
│          ▼                         │                                        │
│   ┌─────────────┐                  │                                        │
│   │  Triagem    │◄─────────────────┘                                        │
│   │   Geral     │                                                           │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐    Sim    ┌─────────────┐                                │
│   │  Auto-      │──────────►│  Atribuir   │                                │
│   │  assign?    │           │  Agente     │                                │
│   └──────┬──────┘           └─────────────┘                                │
│          │ Nao                                                              │
│          ▼                                                                  │
│   ┌─────────────┐                                                          │
│   │  Aguardar   │                                                          │
│   │  Atribuicao │                                                          │
│   └─────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Transferencia entre Departamentos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Departamento A                             Departamento B                 │
│   (Comercial)                                (Suporte)                      │
│                                                                             │
│   ┌─────────────┐      Transferir       ┌─────────────┐                    │
│   │   Ticket    │─────────────────────►│   Ticket    │                    │
│   │   #1234     │                       │   #1234     │                    │
│   └─────────────┘                       └─────────────┘                    │
│                                                                             │
│   Atividades:                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ • Ticket transferido de Comercial para Suporte                      │  │
│   │ • Motivo: Cliente precisa de suporte tecnico                        │  │
│   │ • Por: Maria Santos                                                 │  │
│   │ • Em: 15/01/2024 10:30                                              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   SLA: Reiniciado conforme configuracao do Suporte                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## SLA por Departamento

Cada departamento pode ter configuracao de SLA independente:

```
┌─────────────────────────────────────────────────────────────────┐
│  SLA - Departamento: Suporte                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tempo de Primeira Resposta:                                    │
│  ┌───────────────────────────────────────────────┐              │
│  │ 15 minutos                                    │              │
│  └───────────────────────────────────────────────┘              │
│                                                                 │
│  Tempo de Resolucao:                                            │
│  ┌───────────────────────────────────────────────┐              │
│  │ 4 horas                                       │              │
│  └───────────────────────────────────────────────┘              │
│                                                                 │
│  Horario Comercial:                                             │
│  ┌───────────────────────────────────────────────┐              │
│  │ Segunda a Sexta: 08:00 - 18:00                │              │
│  │ Sabado: 08:00 - 12:00                         │              │
│  │ Domingo: Fechado                              │              │
│  └───────────────────────────────────────────────┘              │
│                                                                 │
│  [Herdar do Pai]            [Salvar Configuracao]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Heranca de SLA

```
Empresa (SLA Padrao: 30min)
    │
    ├── Atendimento (Herda: 30min)
    │       │
    │       ├── Comercial (Customizado: 15min)
    │       │
    │       └── Suporte (Customizado: 10min)
    │               │
    │               └── Suporte N3 (Herda: 10min)
    │
    └── Administrativo (Customizado: 60min)
```

## Dashboard do Departamento

### Visao Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard - Suporte                                         [Exportar]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Pendentes  │  │ Em Progresso │  │  Resolvidos  │  │  SLA Geral   │    │
│  │      12      │  │      8       │  │     45       │  │    94.5%     │    │
│  │   ▲ +3 hoje  │  │   ▼ -2 hoje  │  │   ▲ +10 hoje │  │   ● Normal   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────┬─────────────────────────────────┐   │
│  │  Tickets por Agente               │  Tempo Medio de Resposta        │   │
│  │  ───────────────────               │  ─────────────────────           │   │
│  │  Maria ████████████ 8             │         ┌─────────────────┐     │   │
│  │  Pedro █████████ 6                │    15m  │     ┌───┐       │     │   │
│  │  Ana   ██████ 4                   │    10m  │ ┌───┤   ├───┐   │     │   │
│  │  Carlos████ 2                     │     5m  │─┤   │   │   ├───│     │   │
│  │                                   │     0m  └─┴───┴───┴───┴───┘     │   │
│  │                                   │         Seg Ter Qua Qui Sex     │   │
│  └────────────────────────────────────┴─────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Tickets Criticos (SLA < 30min)                                      │   │
│  │  ─────────────────────────────────                                   │   │
│  │  #2024-001234 | Joao Silva    | 5 min restantes  | [Ver]            │   │
│  │  #2024-001230 | Maria Santos  | 12 min restantes | [Ver]            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Configuracoes do Departamento

### Configuracoes Disponiveis

| Configuracao | Tipo | Descricao |
|--------------|------|-----------|
| `name` | String | Nome do departamento |
| `color` | String | Cor para identificacao (#HEX) |
| `order` | Number | Ordem de exibicao |
| `parentId` | String | Departamento pai |
| `isActive` | Boolean | Se esta ativo |
| `slaConfig` | Object | Configuracao de SLA |
| `autoAssign` | Boolean | Distribuicao automatica |
| `maxTicketsPerAgent` | Number | Limite por agente |

### Departamento Padrao

```typescript
// Configuracao do departamento padrao
{
  companySettings: {
    defaultDepartmentId: "dept_triagem_123"
  }
}

// Novos tickets sem departamento vao para o padrao
```

## Casos de Uso

### 1. Triagem Inicial

**Cenario**: Todos os tickets passam por triagem.

```
1. Ticket chega no departamento "Triagem"
2. Agente de triagem avalia
3. Transfere para departamento correto:
   - Duvidas sobre produto → Comercial
   - Problemas tecnicos → Suporte
   - Questoes de pagamento → Financeiro
4. Departamento destino assume
```

### 2. Escalacao por Nivel

**Cenario**: Problema complexo requer especialista.

```
1. Ticket criado no "Suporte N1"
2. Agente N1 tenta resolver
3. Problema complexo → Transfere para "Suporte N2"
4. Se necessario → Escalona para "Suporte N3"
5. Historico completo mantido
```

### 3. Atendimento Multidisciplinar

**Cenario**: Cliente precisa de varios departamentos.

```
1. Cliente inicia conversa → Comercial
2. Fecha venda → Transfere para Financeiro
3. Apos pagamento → Transfere para Suporte
4. Onboarding → Transfere para Sucesso do Cliente
5. Ticket percorre toda jornada
```

### 4. Plantao e Horarios

**Cenario**: Departamentos com horarios diferentes.

```
Comercial: 08:00 - 18:00 (dias uteis)
Suporte: 08:00 - 22:00 (todos os dias)
Emergencia: 24/7

- Ticket fora do horario → Vai para Emergencia
- Sistema verifica horario antes de rotear
- SLA considera horario comercial
```

## Integracao com Outras Funcionalidades

### Tickets

- Cada ticket pertence a um departamento
- Transferencias registradas no historico
- Metricas consolidadas por departamento

### Usuarios

- Usuarios vinculados a departamentos
- Permissoes baseadas em departamento
- Visibilidade de tickets por vinculo

### SLA

- Configuracao independente por departamento
- Heranca de configuracao do pai
- Metricas separadas por departamento

### Base de Conhecimento

- Artigos podem ser especificos de departamento
- IA usa conhecimento do departamento
- FAQs por departamento

### Notificacoes

- Alertas por departamento
- Gerentes recebem resumos
- Escalacao automatica

## Boas Praticas

### Estrutura

1. **Mantenha simples** - Evite hierarquia muito profunda
2. **Nomes claros** - Use nomes descritivos
3. **Cores distintas** - Facilita identificacao visual
4. **Ordem logica** - Organize por importancia/frequencia

### Usuarios

1. **Evite silos** - Permita atuacao em multiplos departamentos
2. **Defina gerentes** - Cada departamento precisa de responsavel
3. **Balance carga** - Distribua usuarios adequadamente
4. **Revise periodicamente** - Ajuste vinculos conforme necessidade

### Fluxos

1. **Documente processos** - Quando transferir para onde
2. **Use triagem** - Classifique antes de distribuir
3. **Minimize transferencias** - Resolve na primeira vez quando possivel
4. **Registre motivos** - Ajuda a identificar padroes

## Proximos Passos

- [Usuarios](/funcionalidades/usuarios) - Gerenciamento de usuarios
- [SLA e Metricas](/funcionalidades/sla-metricas) - Configuracao de SLA
- [Base de Conhecimento](/funcionalidades/base-conhecimento) - Artigos por departamento
