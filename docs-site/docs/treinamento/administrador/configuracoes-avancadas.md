---
sidebar_position: 4
title: Configuracoes Avancadas
description: Configure SLA, mensagens automaticas, notificacoes e outras opcoes avancadas
---

# Configuracoes Avancadas

Este guia aborda as configuracoes avancadas do ChatBlue, incluindo dados da empresa, SLA, mensagens automaticas, distribuicao de tickets e notificacoes.

## Configuracoes da Empresa

### Acessando as Configuracoes

1. Acesse **Configuracoes > Empresa**
2. Voce vera todas as opcoes de configuracao

### Dados Basicos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configuracoes da Empresa                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INFORMACOES BASICAS                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Nome da empresa:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Minha Empresa Ltda                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Nome fantasia (exibido para clientes):                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Minha Empresa                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Logo da empresa:                                                           │
│  ┌─────────────────────┐                                                   │
│  │                     │  [Alterar Logo]                                   │
│  │    [LOGO ATUAL]     │  Formatos: PNG, JPG                               │
│  │                     │  Tamanho maximo: 2MB                              │
│  └─────────────────────┘                                                   │
│                                                                              │
│  Fuso horario:                                                              │
│  [America/Sao_Paulo (GMT-3) ▼]                                             │
│                                                                              │
│                                                        [Salvar Alteracoes] │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Horario de Funcionamento

Configure quando sua empresa atende:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HORARIO DE FUNCIONAMENTO                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [x] Ativar horario comercial                                              │
│      (Fora deste horario, mensagens de ausencia serao enviadas)            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Dia           Ativo    Inicio    Fim                                │   │
│  │ ─────────────────────────────────────────────────────────────────   │   │
│  │ Segunda       [x]      [08:00]   [18:00]                            │   │
│  │ Terca         [x]      [08:00]   [18:00]                            │   │
│  │ Quarta        [x]      [08:00]   [18:00]                            │   │
│  │ Quinta        [x]      [08:00]   [18:00]                            │   │
│  │ Sexta         [x]      [08:00]   [17:00]                            │   │
│  │ Sabado        [x]      [09:00]   [13:00]                            │   │
│  │ Domingo       [ ]      [--:--]   [--:--]                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Feriados:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 01/01/2024 - Ano Novo                              [Remover]        │   │
│  │ 21/04/2024 - Tiradentes                            [Remover]        │   │
│  │ 01/05/2024 - Dia do Trabalho                       [Remover]        │   │
│  │ 25/12/2024 - Natal                                 [Remover]        │   │
│  │                                                                      │   │
│  │ [+ Adicionar Feriado]                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuracao de SLA

O SLA define os prazos de atendimento que sua equipe deve cumprir.

### Acessando Configuracoes de SLA

1. Acesse **Configuracoes > SLA**
2. Configure o SLA padrao e por prioridade

### SLA Padrao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configuracao de SLA                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SLA PADRAO DA EMPRESA                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Estes valores serao usados quando nao houver SLA especifico               │
│  do departamento.                                                           │
│                                                                              │
│  Tempo de primeira resposta:                                                │
│  ┌────────┐                                                                 │
│  │  15    │ minutos                                                        │
│  └────────┘                                                                 │
│  Tempo maximo para dar a primeira resposta ao cliente                      │
│                                                                              │
│  Tempo de resolucao:                                                        │
│  ┌────────┐                                                                 │
│  │   4    │ horas                                                          │
│  └────────┘                                                                 │
│  Tempo maximo para resolver o ticket completamente                         │
│                                                                              │
│  [x] Considerar apenas horario comercial                                   │
│      (Pausar contagem fora do horario de funcionamento)                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### SLA por Prioridade

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SLA POR PRIORIDADE                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [x] Usar SLA diferenciado por prioridade                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Prioridade     Primeira Resposta    Resolucao                      │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  🔴 Urgente     [ 5  ] min           [ 1  ] hora                    │   │
│  │                                                                      │   │
│  │  🟠 Alta        [ 15 ] min           [ 2  ] horas                   │   │
│  │                                                                      │   │
│  │  🟡 Media       [ 30 ] min           [ 4  ] horas                   │   │
│  │                                                                      │   │
│  │  🟢 Baixa       [ 60 ] min           [ 8  ] horas                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Prioridade padrao para novos tickets: [Media ▼]                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Alertas de SLA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ALERTAS DE SLA                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Configure quando os alertas devem ser enviados:                           │
│                                                                              │
│  [x] Alerta de aviso                                                       │
│      Quando: [ 50 ]% do tempo restante                                     │
│      Para: [x] Atendente                                                   │
│            [ ] Supervisor                                                   │
│                                                                              │
│  [x] Alerta urgente                                                        │
│      Quando: [ 20 ]% do tempo restante                                     │
│      Para: [x] Atendente                                                   │
│            [x] Supervisor                                                   │
│                                                                              │
│  [x] Alerta critico                                                        │
│      Quando: [ 5  ]% do tempo restante                                     │
│      Para: [x] Atendente                                                   │
│            [x] Supervisor                                                   │
│            [x] Admin                                                        │
│                                                                              │
│  [x] Notificar quando SLA for violado                                      │
│      Para: [x] Atendente                                                   │
│            [x] Supervisor                                                   │
│            [x] Admin                                                        │
│            [x] Enviar email                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mensagens Automaticas

Configure mensagens que serao enviadas automaticamente em diferentes situacoes.

### Tipos de Mensagens

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Mensagens Automaticas                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Mensagem          Status    Quando e Enviada                        │   │
│  │ ─────────────────────────────────────────────────────────────────   │   │
│  │ Boas-vindas       [Ativa]   Primeiro contato do cliente            │   │
│  │ Ausencia          [Ativa]   Fora do horario comercial              │   │
│  │ Fila de Espera    [Ativa]   Cliente aguardando atendente           │   │
│  │ Encerramento      [Ativa]   Ao finalizar ticket                    │   │
│  │ Avaliacao         [Ativa]   Apos encerramento                      │   │
│  │ Inatividade       [Inativa] Cliente sem resposta ha X tempo        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configurando Mensagem de Boas-vindas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Mensagem de Boas-vindas                                           [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [x] Ativar mensagem de boas-vindas                                        │
│                                                                              │
│  Mensagem:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Ola! 👋 Bem-vindo a {empresa}!                                      │   │
│  │                                                                      │   │
│  │ Sou um assistente virtual e estou aqui para ajudar.                │   │
│  │ Em que posso ajudar voce hoje?                                      │   │
│  │                                                                      │   │
│  │ Digite sua duvida ou escolha uma opcao:                            │   │
│  │ 1 - Vendas                                                          │   │
│  │ 2 - Suporte                                                         │   │
│  │ 3 - Financeiro                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Variaveis disponiveis:                                                     │
│  {empresa} - Nome da empresa                                               │
│  {cliente} - Nome do cliente (se conhecido)                                │
│  {protocolo} - Numero do ticket                                            │
│                                                                              │
│  Enviar apenas:                                                             │
│  (●) No primeiro contato do cliente                                        │
│  ( ) Em todo novo ticket                                                   │
│                                                                              │
│                                               [Cancelar]  [Salvar]         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configurando Mensagem de Ausencia

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Mensagem de Ausencia                                              [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [x] Ativar mensagem de ausencia                                           │
│                                                                              │
│  Mensagem:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Ola! Obrigado por entrar em contato com a {empresa}.               │   │
│  │                                                                      │   │
│  │ No momento estamos fora do horario de atendimento.                 │   │
│  │                                                                      │   │
│  │ Nosso horario de funcionamento:                                    │   │
│  │ Segunda a Sexta: 08h as 18h                                        │   │
│  │ Sabado: 09h as 13h                                                  │   │
│  │                                                                      │   │
│  │ Sua mensagem foi registrada e responderemos assim que possivel.    │   │
│  │                                                                      │   │
│  │ Protocolo: {protocolo}                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Quando enviar:                                                             │
│  [x] Fora do horario comercial                                             │
│  [x] Em feriados                                                           │
│                                                                              │
│                                               [Cancelar]  [Salvar]         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configurando Mensagem de Encerramento

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Mensagem de Encerramento                                          [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [x] Ativar mensagem de encerramento                                       │
│                                                                              │
│  Mensagem:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ {cliente}, seu atendimento foi finalizado!                          │   │
│  │                                                                      │   │
│  │ Protocolo: {protocolo}                                              │   │
│  │ Atendente: {atendente}                                              │   │
│  │                                                                      │   │
│  │ Obrigado por entrar em contato com a {empresa}.                    │   │
│  │ Precisando, e so chamar!                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [x] Enviar pesquisa de satisfacao junto                                   │
│                                                                              │
│                                               [Cancelar]  [Salvar]         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Distribuicao Automatica de Tickets

Configure como os tickets serao distribuidos entre os atendentes.

### Modos de Distribuicao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Distribuicao de Tickets                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [x] Ativar distribuicao automatica                                        │
│                                                                              │
│  Modo de distribuicao:                                                      │
│                                                                              │
│  (●) Round Robin (Circular)                                                │
│      Distribui igualmente entre os atendentes disponiveis                  │
│                                                                              │
│  ( ) Menos Ocupado                                                         │
│      Envia para o atendente com menos tickets no momento                   │
│                                                                              │
│  ( ) Manual                                                                 │
│      Tickets ficam na fila ate serem atribuidos manualmente                │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Regras adicionais:                                                         │
│                                                                              │
│  [x] Respeitar limite de tickets por atendente                             │
│      (Nao atribuir se atendente estiver no limite)                        │
│                                                                              │
│  [x] Atribuir apenas para atendentes online                                │
│                                                                              │
│  [x] Priorizar atendente que ja atendeu o mesmo cliente                   │
│      (Se o cliente ja foi atendido antes, tenta o mesmo atendente)        │
│                                                                              │
│  [ ] Considerar habilidades/tags do atendente                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Diagrama dos Modos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ROUND ROBIN (Circular)                                                     │
│  ─────────────────────                                                      │
│                                                                              │
│  Ticket 1 → Atendente A                                                     │
│  Ticket 2 → Atendente B                                                     │
│  Ticket 3 → Atendente C                                                     │
│  Ticket 4 → Atendente A (volta ao inicio)                                  │
│                                                                              │
│  Vantagem: Distribuicao equilibrada                                        │
│  Desvantagem: Nao considera carga atual                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  MENOS OCUPADO                                                              │
│  ─────────────                                                              │
│                                                                              │
│  Atendente A: 5 tickets                                                     │
│  Atendente B: 2 tickets ← Recebe o proximo                                 │
│  Atendente C: 4 tickets                                                     │
│                                                                              │
│  Vantagem: Equilibra carga de trabalho                                     │
│  Desvantagem: Pode sobrecarregar atendentes mais rapidos                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuracoes de Notificacoes

### Notificacoes do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configuracoes de Notificacoes                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  NOTIFICACOES NO SISTEMA (para todos os usuarios)                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [x] Novo ticket recebido                                                  │
│  [x] Nova mensagem no ticket                                               │
│  [x] Ticket transferido                                                    │
│  [x] Alertas de SLA                                                        │
│  [x] Avaliacao do cliente recebida                                         │
│                                                                              │
│  Som de notificacao:                                                        │
│  [Som 1 ▼]  [▶ Testar]                                                     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  NOTIFICACOES POR EMAIL (para admins e supervisores)                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [x] Resumo diario de metricas                                             │
│      Horario: [08:00 ▼]                                                    │
│                                                                              │
│  [x] Alerta de violacao de SLA                                             │
│                                                                              │
│  [ ] Novo usuario cadastrado                                               │
│                                                                              │
│  [x] Problemas de conexao WhatsApp                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuracoes de Seguranca

### Politicas de Senha

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Seguranca                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POLITICA DE SENHAS                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Tamanho minimo da senha: [ 8 ] caracteres                                 │
│                                                                              │
│  Requisitos:                                                                │
│  [x] Pelo menos uma letra maiuscula                                        │
│  [x] Pelo menos uma letra minuscula                                        │
│  [x] Pelo menos um numero                                                  │
│  [ ] Pelo menos um caractere especial                                      │
│                                                                              │
│  [x] Expirar senhas a cada [ 90 ] dias                                     │
│                                                                              │
│  [x] Nao permitir reutilizar as ultimas [ 5 ] senhas                       │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  SESSOES                                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Tempo de inatividade para logout automatico: [ 30 ] minutos               │
│                                                                              │
│  [x] Permitir multiplas sessoes simultaneas                                │
│                                                                              │
│  [ ] Bloquear apos [ 5 ] tentativas de login falhas                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Exportacao e Backup de Dados

### Exportando Configuracoes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Exportar Configuracoes                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Selecione o que deseja exportar:                                          │
│                                                                              │
│  [x] Configuracoes da empresa                                              │
│  [x] Configuracoes de SLA                                                  │
│  [x] Mensagens automaticas                                                 │
│  [x] Departamentos                                                          │
│  [ ] Usuarios (sem senhas)                                                 │
│  [ ] Contatos                                                               │
│                                                                              │
│  Formato: [JSON ▼]                                                         │
│                                                                              │
│                                         [Exportar]                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

:::tip Backup Regular
Faca backup das configuracoes regularmente, especialmente antes de fazer alteracoes significativas.
:::

## Boas Praticas

:::tip Teste Antes de Publicar
Sempre teste mensagens automaticas antes de ativar em producao. Envie para seu proprio numero.
:::

:::tip Documente as Configuracoes
Anote o motivo de cada configuracao. Isso ajuda quando precisar revisar ou explicar para outras pessoas.
:::

:::caution SLA Realista
Configure prazos de SLA que sua equipe consegue cumprir. Metas impossiveis desmotivam.
:::

## Proximos Passos

Continue configurando:

- **[Integracoes](/treinamento/administrador/integracoes)** - Conectar com Notion e outros sistemas
