---
sidebar_position: 1
title: Painel de Controle
description: Conheca o painel administrativo do ChatBlue e suas funcoes
---

# Painel de Controle do Administrador

Bem-vindo ao manual do administrador! Como administrador, voce tem acesso a todas as configuracoes do ChatBlue e e responsavel por manter o sistema funcionando corretamente para sua equipe.

## O Papel do Administrador

O administrador e o profissional responsavel por **configurar, gerenciar e manter** o sistema ChatBlue. Voce tem acesso completo a todas as funcionalidades.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Responsabilidades do Administrador                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │   CONFIGURACAO              USUARIOS              MONITORAMENTO     │    │
│  │   ─────────────             ────────              ──────────────    │    │
│  │                                                                     │    │
│  │   • WhatsApp                • Criar/Editar        • Status sistema │    │
│  │   • IA                      • Permissoes          • Conexoes        │    │
│  │   • SLA                     • Departamentos       • Logs            │    │
│  │   • Mensagens               • Senhas              • Erros           │    │
│  │   • Integracoes                                                     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Acessando o Painel Administrativo

1. Faca login no ChatBlue com sua conta de administrador
2. Clique em **Configuracoes** (icone de engrenagem) no menu lateral
3. Voce vera o painel de controle administrativo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ChatBlue                                    [Admin - Joao Silva]  [Sair]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐  ┌──────────────────────────────────────────────────┐   │
│  │                │  │                                                  │   │
│  │  Dashboard     │  │         PAINEL DE CONTROLE                       │   │
│  │                │  │                                                  │   │
│  │  Tickets       │  │   Bem-vindo, Joao!                              │   │
│  │                │  │   Aqui voce pode configurar todo o sistema.     │   │
│  │  Contatos      │  │                                                  │   │
│  │                │  │   ─────────────────────────────────────────────  │   │
│  │  ══════════════│  │                                                  │   │
│  │  ⚙ CONFIGURACOES│  │   STATUS DO SISTEMA                            │   │
│  │  ══════════════│  │                                                  │   │
│  │                │  │   ┌───────────┐ ┌───────────┐ ┌───────────┐    │   │
│  │  WhatsApp      │  │   │ WhatsApp  │ │ Banco     │ │ Redis     │    │   │
│  │                │  │   │ 🟢 Online │ │ 🟢 OK     │ │ 🟢 OK     │    │   │
│  │  Usuarios      │  │   └───────────┘ └───────────┘ └───────────┘    │   │
│  │                │  │                                                  │   │
│  │  Departamentos │  │   ─────────────────────────────────────────────  │   │
│  │                │  │                                                  │   │
│  │  IA            │  │   ACOES RAPIDAS                                 │   │
│  │                │  │                                                  │   │
│  │  Empresa       │  │   [+ Novo Usuario]  [+ Nova Conexao]            │   │
│  │                │  │                                                  │   │
│  │  Integracoes   │  │   [Verificar Logs]  [Exportar Dados]            │   │
│  │                │  │                                                  │   │
│  └────────────────┘  └──────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Visao Geral do Menu

O menu lateral de configuracoes esta organizado da seguinte forma:

| Secao | Funcao Principal |
|-------|------------------|
| **WhatsApp** | Configurar conexoes com WhatsApp |
| **Usuarios** | Criar e gerenciar usuarios do sistema |
| **Departamentos** | Criar e organizar departamentos |
| **IA** | Configurar Inteligencia Artificial |
| **Empresa** | Configuracoes gerais da empresa |
| **Integracoes** | Conectar com outros sistemas (Notion, etc.) |
| **SLA** | Configurar acordos de nivel de servico |
| **Logs** | Visualizar registros do sistema |

## Status do Sistema

A tela inicial mostra o status dos principais componentes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Status do Sistema                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │   Componente          Status         Ultima Verificacao             │   │
│  │   ─────────────────────────────────────────────────────────────     │   │
│  │                                                                      │   │
│  │   WhatsApp (Baileys)  🟢 Conectado   Agora                          │   │
│  │   WhatsApp (Meta)     🟢 Conectado   Agora                          │   │
│  │   Banco de Dados      🟢 Online      Agora                          │   │
│  │   Redis (Cache)       🟢 Online      Agora                          │   │
│  │   Servico de IA       🟢 Ativo       Agora                          │   │
│  │   Notion              🟡 Sincronizando...                           │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Legenda: 🟢 OK  🟡 Atencao  🔴 Problema                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Significado dos Status

| Icone | Status | Acao Necessaria |
|-------|--------|-----------------|
| 🟢 | Online/Conectado | Nenhuma - tudo funcionando |
| 🟡 | Processando/Atencao | Aguardar ou verificar |
| 🔴 | Offline/Erro | Verificar imediatamente |

:::caution Status Vermelho
Se algum componente estiver vermelho, clique nele para ver detalhes do problema e como resolve-lo.
:::

## Acoes Rapidas

O painel oferece atalhos para as tarefas mais comuns:

### Adicionar Novo Usuario
1. Clique em **[+ Novo Usuario]**
2. Preencha os dados (veja secao de Usuarios)
3. Defina as permissoes
4. Salve

### Adicionar Nova Conexao WhatsApp
1. Clique em **[+ Nova Conexao]**
2. Escolha o tipo (Baileys ou Meta)
3. Siga as instrucoes (veja secao WhatsApp)

### Verificar Logs
1. Clique em **[Verificar Logs]**
2. Filtre por data, tipo ou usuario
3. Analise as ocorrencias

### Exportar Dados
1. Clique em **[Exportar Dados]**
2. Escolha o tipo de dados (tickets, contatos, etc.)
3. Selecione o periodo
4. Baixe o arquivo

## Navegando pelas Configuracoes

### Organizacao das Telas

Todas as telas de configuracao seguem um padrao similar:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configuracoes > Usuarios                              [Ajuda ?]           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [+ Novo Usuario]  [Importar]  [Exportar]          [Buscar...        🔍]   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Filtros: [Todos ▼]  [Ativos ▼]  [Todos os departamentos ▼]               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Nome          Email                  Papel       Status    Acoes   │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  Maria Silva   maria@empresa.com      Supervisor  🟢 Ativo  [✏][🗑] │   │
│  │  Joao Costa    joao@empresa.com       Agente      🟢 Ativo  [✏][🗑] │   │
│  │  Ana Lima      ana@empresa.com        Agente      🟡 Inativo[✏][🗑] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Mostrando 1-3 de 3 usuarios                    [< Anterior] [Proximo >]   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Elementos Comuns

| Elemento | Funcao |
|----------|--------|
| **Botao [+ Novo]** | Adicionar novo item |
| **Botao [Importar]** | Importar dados de arquivo |
| **Botao [Exportar]** | Exportar dados para arquivo |
| **Campo de Busca** | Filtrar itens por texto |
| **Filtros** | Refinar a lista por criterios |
| **[✏] Editar** | Modificar item existente |
| **[🗑] Excluir** | Remover item |

## Fluxo de Trabalho Inicial

Se voce esta configurando o ChatBlue pela primeira vez, siga esta ordem:

### Checklist de Configuracao Inicial

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Checklist de Configuracao Inicial                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CONFIGURACOES DA EMPRESA                                                │
│     [ ] Nome e dados da empresa                                            │
│     [ ] Logo (opcional)                                                    │
│     [ ] Horario de funcionamento                                           │
│                                                                              │
│  2. CONEXAO WHATSAPP                                                        │
│     [ ] Escolher tipo de conexao (Baileys ou Meta)                         │
│     [ ] Conectar o numero                                                  │
│     [ ] Testar envio de mensagem                                           │
│                                                                              │
│  3. DEPARTAMENTOS                                                           │
│     [ ] Criar departamentos principais                                     │
│     [ ] Definir hierarquia (se houver)                                     │
│                                                                              │
│  4. USUARIOS                                                                │
│     [ ] Criar usuarios supervisores                                        │
│     [ ] Criar usuarios atendentes                                          │
│     [ ] Atribuir a departamentos                                           │
│                                                                              │
│  5. CONFIGURACAO DE SLA                                                     │
│     [ ] Definir tempo de primeira resposta                                 │
│     [ ] Definir tempo de resolucao                                         │
│     [ ] Configurar horario comercial                                       │
│                                                                              │
│  6. MENSAGENS AUTOMATICAS (OPCIONAL)                                        │
│     [ ] Mensagem de boas-vindas                                            │
│     [ ] Mensagem de ausencia                                               │
│     [ ] Mensagem de encerramento                                           │
│                                                                              │
│  7. INTELIGENCIA ARTIFICIAL (OPCIONAL)                                      │
│     [ ] Escolher provedor (OpenAI ou Anthropic)                            │
│     [ ] Configurar chave de API                                            │
│     [ ] Definir personalidade                                              │
│                                                                              │
│  8. INTEGRACOES (OPCIONAL)                                                  │
│     [ ] Configurar Notion (se usar)                                        │
│     [ ] Testar sincronizacao                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Melhores Praticas

:::tip Faca Backup das Configuracoes
Antes de fazer alteracoes significativas, exporte as configuracoes atuais. Assim, voce pode restaurar se algo der errado.
:::

:::tip Teste em Horario de Baixa Demanda
Alteracoes importantes devem ser feitas quando ha menos atendimentos ativos, para minimizar impacto.
:::

:::tip Documente suas Configuracoes
Mantenha um registro das configuracoes escolhidas e seus motivos. Isso ajuda na manutencao futura.
:::

:::caution Cuidado com Exclusoes
Ao excluir usuarios, departamentos ou conexoes, os dados relacionados podem ser afetados. Sempre verifique antes de excluir.
:::

## Resolucao de Problemas Comuns

### WhatsApp desconectou
1. Acesse **Configuracoes > WhatsApp**
2. Clique na conexao afetada
3. Verifique o status e siga as instrucoes para reconectar

### Usuario nao consegue logar
1. Acesse **Configuracoes > Usuarios**
2. Encontre o usuario
3. Verifique se o status esta "Ativo"
4. Resete a senha se necessario

### Sistema lento
1. Verifique o **Status do Sistema** no painel
2. Se algum componente estiver amarelo/vermelho, investigue
3. Contate o suporte tecnico se o problema persistir

## Onde Encontrar Ajuda

- **[?] Ajuda**: Clique no icone de ajuda em qualquer tela para ver instrucoes especificas
- **Documentacao**: Este manual e o site de documentacao
- **Suporte**: contato com a equipe de suporte ChatBlue

## Proximos Passos

Agora que voce conhece o painel de controle, vamos configurar cada area:

1. **[Configurando WhatsApp](/treinamento/administrador/configurando-whatsapp)** - Conectar seu numero
2. **[Usuarios e Departamentos](/treinamento/administrador/usuarios-departamentos)** - Criar sua equipe
3. **[Configuracoes Avancadas](/treinamento/administrador/configuracoes-avancadas)** - Personalizar o sistema
4. **[Integracoes](/treinamento/administrador/integracoes)** - Conectar com outros sistemas
