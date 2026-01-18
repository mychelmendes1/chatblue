---
sidebar_position: 3
title: Usuarios e Departamentos
description: Guia completo para criar e gerenciar usuarios e departamentos
---

# Usuarios e Departamentos

Este guia ensina como configurar a estrutura organizacional do seu atendimento, criando departamentos e usuarios com as permissoes corretas.

## Entendendo a Estrutura

O ChatBlue organiza o atendimento em uma hierarquia:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Estrutura Organizacional                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              EMPRESA                                         │
│                                 │                                            │
│            ┌────────────────────┼────────────────────┐                      │
│            │                    │                    │                      │
│     ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐              │
│     │ DEPARTAMENTO│      │ DEPARTAMENTO│      │ DEPARTAMENTO│              │
│     │   Vendas    │      │   Suporte   │      │  Financeiro │              │
│     └──────┬──────┘      └──────┬──────┘      └──────┬──────┘              │
│            │                    │                    │                      │
│     ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐              │
│     │  USUARIOS   │      │  USUARIOS   │      │  USUARIOS   │              │
│     │             │      │             │      │             │              │
│     │ • Maria (S) │      │ • Joao (S)  │      │ • Ana (S)   │              │
│     │ • Pedro (A) │      │ • Carlos(A) │      │ • Paulo (A) │              │
│     │ • Julia (A) │      │ • Lucas (A) │      │             │              │
│     └─────────────┘      └─────────────┘      └─────────────┘              │
│                                                                              │
│     Legenda: (S) = Supervisor, (A) = Agente/Atendente                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Parte 1: Gerenciando Departamentos

### O Que Sao Departamentos

Departamentos sao setores da sua empresa que atendem diferentes tipos de demanda. Cada departamento pode ter:
- Seus proprios atendentes
- Configuracoes de SLA especificas
- Conexao WhatsApp dedicada

### Criando um Departamento

#### Passo 1: Acessar a Tela de Departamentos

1. Acesse **Configuracoes > Departamentos**
2. Clique em **[+ Novo Departamento]**

#### Passo 2: Preencher Informacoes Basicas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Novo Departamento                                                 [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INFORMACOES BASICAS                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Nome do departamento: *                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Suporte Tecnico                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Descricao (opcional):                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Departamento responsavel por atender duvidas tecnicas e problemas  │   │
│  │ com produtos.                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Cor de identificacao:                                                      │
│  [🔴] [🟠] [🟡] [🟢] [🔵] [🟣] [⚫]                                        │
│                       ▲                                                     │
│                    Selecionado                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  CONFIGURACOES                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Departamento ativo: [x] Sim                                               │
│                                                                              │
│  Aceita transferencias de outros departamentos: [x] Sim                    │
│                                                                              │
│  Departamento padrao para novos tickets: [ ] Sim                           │
│  (Se marcado, tickets sem departamento irao para ca)                       │
│                                                                              │
│                                              [Cancelar]  [Criar]           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Campos Obrigatorios

| Campo | Descricao | Dica |
|-------|-----------|------|
| **Nome** | Nome do departamento | Use nomes claros (Vendas, Suporte, SAC) |
| **Descricao** | O que o departamento faz | Ajuda na triagem de tickets |
| **Cor** | Cor para identificacao visual | Facilita a visualizacao |

#### Passo 3: Configurar SLA do Departamento (Opcional)

Se este departamento precisar de prazos diferentes do padrao:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SLA do Departamento                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [ ] Usar SLA padrao da empresa                                            │
│  [x] Definir SLA especifico para este departamento                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Tempo de primeira resposta:                                                │
│  ┌────────┐                                                                 │
│  │  15    │ minutos                                                        │
│  └────────┘                                                                 │
│                                                                              │
│  Tempo de resolucao:                                                        │
│  ┌────────┐                                                                 │
│  │   2    │ horas                                                          │
│  └────────┘                                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hierarquia de Departamentos

Voce pode criar subdepartamentos:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Exemplo de Hierarquia                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📁 Suporte                                                                 │
│     ├── 📁 Suporte Nivel 1 (Triagem)                                       │
│     ├── 📁 Suporte Nivel 2 (Tecnico)                                       │
│     └── 📁 Suporte Nivel 3 (Especialistas)                                 │
│                                                                              │
│  📁 Vendas                                                                  │
│     ├── 📁 Vendas Novos Clientes                                           │
│     └── 📁 Vendas Renovacao                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

Para criar subdepartamento:
1. Na criacao do departamento
2. Selecione o "Departamento pai"

### Editando um Departamento

1. Acesse **Configuracoes > Departamentos**
2. Encontre o departamento na lista
3. Clique em **[✏ Editar]**
4. Faca as alteracoes
5. Clique em **[Salvar]**

### Excluindo um Departamento

:::caution Cuidado ao Excluir
Antes de excluir, transfira todos os tickets e usuarios para outro departamento.
:::

1. Acesse **Configuracoes > Departamentos**
2. Clique em **[🗑 Excluir]**
3. Confirme a transferencia dos dados

---

## Parte 2: Gerenciando Usuarios

### Tipos de Usuarios (Papeis)

O ChatBlue tem quatro niveis de acesso:

| Papel | Descricao | O Que Pode Fazer |
|-------|-----------|------------------|
| **Admin** | Administrador | Tudo: configuracoes, usuarios, relatorios |
| **Supervisor** | Gerente de equipe | Monitorar, redistribuir, relatorios |
| **Agent** | Atendente | Atender tickets, enviar mensagens |
| **Viewer** | Visualizador | Apenas ver (nao pode responder) |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Permissoes por Papel                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Funcionalidade           Admin   Supervisor   Agent   Viewer              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Atender tickets            ✓         ✓          ✓        ✗                │
│  Ver tickets da equipe      ✓         ✓          ✗        ✓                │
│  Transferir tickets         ✓         ✓          ✓*       ✗                │
│  Monitorar agentes          ✓         ✓          ✗        ✗                │
│  Ver relatorios             ✓         ✓          ✗        ✓                │
│  Gerar relatorios           ✓         ✓          ✗        ✗                │
│  Criar usuarios             ✓         ✗          ✗        ✗                │
│  Configurar sistema         ✓         ✗          ✗        ✗                │
│  Configurar WhatsApp        ✓         ✗          ✗        ✗                │
│  Configurar IA              ✓         ✗          ✗        ✗                │
│                                                                              │
│  * Agent so pode transferir para departamento, nao para pessoa especifica  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Criando um Usuario

#### Passo 1: Acessar a Tela de Usuarios

1. Acesse **Configuracoes > Usuarios**
2. Clique em **[+ Novo Usuario]**

#### Passo 2: Preencher Dados Basicos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Novo Usuario                                                      [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DADOS PESSOAIS                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Nome completo: *                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Maria da Silva Santos                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Email: * (sera usado para login)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ maria.santos@empresa.com                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Telefone (opcional):                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ +55 11 99999-8888                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 3: Definir Papel e Departamentos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ACESSO E PERMISSOES                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Papel (role): *                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ( ) Admin - Acesso total ao sistema                                 │   │
│  │ (●) Supervisor - Gerencia equipe e ve relatorios                    │   │
│  │ ( ) Agente - Realiza atendimentos                                   │   │
│  │ ( ) Visualizador - Apenas visualiza                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Departamentos: * (selecione pelo menos um)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [x] Suporte Tecnico                                                 │   │
│  │ [x] Vendas                                                          │   │
│  │ [ ] Financeiro                                                      │   │
│  │ [ ] SAC                                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Departamento principal:                                                    │
│  [Suporte Tecnico ▼]                                                       │
│  (Sera o departamento padrao ao fazer login)                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 4: Configuracoes Adicionais

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONFIGURACOES DO ATENDENTE                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Limite de tickets simultaneos:                                             │
│  ┌────────┐                                                                 │
│  │   5    │ tickets                                                        │
│  └────────┘                                                                 │
│  (0 = sem limite)                                                          │
│                                                                              │
│  Receber tickets automaticamente:                                           │
│  [x] Sim - Tickets serao atribuidos automaticamente quando disponivel      │
│                                                                              │
│  Pode atender fora do horario comercial:                                   │
│  [ ] Sim                                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 5: Definir Senha ou Enviar Convite

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ACESSO AO SISTEMA                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Como o usuario ira acessar:                                               │
│                                                                              │
│  (●) Enviar convite por email                                              │
│      O usuario recebera um email para criar sua propria senha              │
│                                                                              │
│  ( ) Definir senha agora                                                   │
│      Voce cria a senha e informa ao usuario                                │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [x] Enviar email de boas-vindas com instrucoes                            │
│                                                                              │
│                                              [Cancelar]  [Criar Usuario]   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 6: Confirmar Criacao

1. Revise as informacoes
2. Clique em **[Criar Usuario]**
3. O usuario recebera um email (se selecionado)

### Email de Convite

O usuario recebera este email:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Assunto: Bem-vindo ao ChatBlue - [Sua Empresa]                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ola Maria!                                                                 │
│                                                                              │
│  Voce foi convidado(a) para fazer parte da equipe de atendimento           │
│  da [Sua Empresa] no ChatBlue.                                             │
│                                                                              │
│  Seu papel: Supervisor                                                      │
│  Departamentos: Suporte Tecnico, Vendas                                    │
│                                                                              │
│  Para acessar o sistema, clique no botao abaixo e crie sua senha:         │
│                                                                              │
│                    [Criar Minha Senha]                                      │
│                                                                              │
│  Este link e valido por 7 dias.                                            │
│                                                                              │
│  Se voce nao solicitou este acesso, ignore este email.                     │
│                                                                              │
│  Atenciosamente,                                                            │
│  Equipe ChatBlue                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Editando um Usuario

1. Acesse **Configuracoes > Usuarios**
2. Encontre o usuario na lista
3. Clique em **[✏ Editar]**
4. Modifique os campos desejados
5. Clique em **[Salvar]**

### Resetando Senha de Usuario

Se um usuario esqueceu a senha:

1. Acesse **Configuracoes > Usuarios**
2. Encontre o usuario
3. Clique em **[...]** > **[Resetar Senha]**
4. Escolha:
   - Enviar email de reset
   - Definir nova senha manualmente

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Resetar Senha - Maria da Silva Santos                             [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Escolha como resetar a senha:                                             │
│                                                                              │
│  (●) Enviar email para o usuario criar nova senha                          │
│      (maria.santos@empresa.com)                                            │
│                                                                              │
│  ( ) Definir nova senha manualmente                                        │
│      Nova senha: [________________]                                        │
│      [x] Exigir troca no proximo login                                     │
│                                                                              │
│                                    [Cancelar]  [Resetar Senha]             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Desativando um Usuario

Quando um funcionario sai ou precisa ser desativado temporariamente:

1. Acesse **Configuracoes > Usuarios**
2. Encontre o usuario
3. Clique em **[...]** > **[Desativar]**
4. Escolha o que fazer com os tickets:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Desativar Usuario                                                 [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Voce esta prestes a desativar o usuario:                                  │
│  Maria da Silva Santos (maria.santos@empresa.com)                          │
│                                                                              │
│  ⚠️ O usuario nao podera mais fazer login                                 │
│                                                                              │
│  Este usuario possui 3 tickets em aberto. O que fazer?                     │
│                                                                              │
│  (●) Transferir para outro usuario:                                        │
│      [Joao Costa (Supervisor) ▼]                                           │
│                                                                              │
│  ( ) Transferir para a fila do departamento                                │
│                                                                              │
│  ( ) Manter atribuidos (nao recomendado)                                   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Motivo da desativacao (opcional):                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Ferias de 30 dias                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                      [Cancelar]  [Desativar Usuario]       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Importando Usuarios em Massa

Se voce precisa criar muitos usuarios:

1. Acesse **Configuracoes > Usuarios**
2. Clique em **[Importar]**
3. Baixe o modelo de planilha
4. Preencha os dados
5. Faca upload do arquivo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Importar Usuarios                                                 [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Passo 1: Baixe o modelo                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Baixar modelo CSV]  [Baixar modelo Excel]                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Passo 2: Preencha o arquivo com os dados dos usuarios                     │
│                                                                              │
│  Colunas obrigatorias:                                                      │
│  • nome - Nome completo                                                    │
│  • email - Email (sera o login)                                            │
│  • papel - admin, supervisor, agent ou viewer                              │
│  • departamentos - Nomes separados por virgula                             │
│                                                                              │
│  Colunas opcionais:                                                         │
│  • telefone - Telefone de contato                                          │
│  • limite_tickets - Limite de tickets simultaneos                          │
│                                                                              │
│  Passo 3: Faca upload do arquivo                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [Arrastar arquivo aqui ou clicar para selecionar]                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Opcoes:                                                                    │
│  [x] Enviar convite por email para todos                                   │
│  [ ] Pular usuarios que ja existem                                         │
│                                                                              │
│                                              [Cancelar]  [Importar]        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Boas Praticas

### Para Departamentos

:::tip Mantenha Simples
Nao crie departamentos demais. Comece com o essencial e expanda conforme a necessidade.
:::

:::tip Nomes Claros
Use nomes que os clientes e atendentes entendam facilmente.
:::

### Para Usuarios

:::tip Principio do Menor Privilegio
De apenas as permissoes necessarias. Um atendente nao precisa ser admin.
:::

:::tip Documente os Acessos
Mantenha uma lista de quem tem acesso a que. Isso facilita auditorias.
:::

:::caution Senhas Fortes
Ao criar senhas manualmente, use senhas fortes (minimo 8 caracteres, com letras, numeros e simbolos).
:::

## Resolucao de Problemas

| Problema | Causa | Solucao |
|----------|-------|---------|
| Usuario nao recebe email | Email na caixa de spam | Verificar spam ou reenviar convite |
| Usuario nao ve tickets | Departamento errado | Verificar departamentos atribuidos |
| Usuario nao consegue transferir | Permissao insuficiente | Verificar papel do usuario |
| Link expirado | Mais de 7 dias | Reenviar convite |

## Proximos Passos

Agora que voce configurou usuarios e departamentos, vamos:

- **[Configuracoes Avancadas](/treinamento/administrador/configuracoes-avancadas)** - SLA, mensagens, notificacoes
- **[Integracoes](/treinamento/administrador/integracoes)** - Conectar com Notion e outros sistemas
