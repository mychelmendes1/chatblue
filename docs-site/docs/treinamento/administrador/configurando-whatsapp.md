---
sidebar_position: 2
title: Configurando o WhatsApp
description: Guia passo a passo para conectar o WhatsApp ao ChatBlue
---

# Configurando o WhatsApp

A conexao com o WhatsApp e fundamental para o funcionamento do ChatBlue. Este guia ensina como configurar as duas opcoes disponiveis: Baileys e Meta Cloud API.

## Escolhendo o Tipo de Conexao

O ChatBlue oferece duas formas de conectar ao WhatsApp:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Comparativo: Baileys vs Meta Cloud API                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐    │
│  │         BAILEYS                │  │       META CLOUD API           │    │
│  │      (Conexao via QR Code)     │  │       (API Oficial)            │    │
│  ├────────────────────────────────┤  ├────────────────────────────────┤    │
│  │                                │  │                                │    │
│  │  ✓ Gratuito                    │  │  ✓ Oficial e estavel          │    │
│  │  ✓ Rapido de configurar       │  │  ✓ Suporte a templates HSM     │    │
│  │  ✓ Qualquer numero funciona   │  │  ✓ Mensagens em massa          │    │
│  │                                │  │  ✓ Alta disponibilidade       │    │
│  │  ✗ Nao-oficial                │  │                                │    │
│  │  ✗ Pode desconectar           │  │  ✗ Pago (por conversa)        │    │
│  │  ✗ Risco de bloqueio          │  │  ✗ Configuracao complexa      │    │
│  │                                │  │  ✗ Requer aprovacao Meta      │    │
│  │                                │  │                                │    │
│  │  IDEAL PARA:                   │  │  IDEAL PARA:                   │    │
│  │  • Testes                      │  │  • Producao                    │    │
│  │  • Pequenas empresas           │  │  • Grandes volumes             │    │
│  │  • Orcamento limitado          │  │  • Empresas estabelecidas      │    │
│  │                                │  │                                │    │
│  └────────────────────────────────┘  └────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Qual Escolher?

| Situacao | Recomendacao |
|----------|--------------|
| Estou testando o sistema | Baileys |
| Empresa pequena (< 50 atendimentos/dia) | Baileys |
| Empresa media/grande | Meta Cloud API |
| Preciso enviar mensagens em massa | Meta Cloud API |
| Orcamento limitado | Baileys |
| Preciso de alta estabilidade | Meta Cloud API |

## Configurando Baileys (QR Code)

### Requisitos

Antes de comecar, voce precisa de:
- Um numero de celular com WhatsApp ativo
- O celular em maos para escanear o QR Code
- Conexao de internet estavel

### Passo a Passo

#### Passo 1: Acessar Configuracoes de WhatsApp

1. Faca login como administrador
2. Acesse **Configuracoes > WhatsApp**
3. Clique em **[+ Nova Conexao]**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Nova Conexao WhatsApp                                             [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Escolha o tipo de conexao:                                                 │
│                                                                              │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐    │
│  │                                │  │                                │    │
│  │     📱 BAILEYS                 │  │     ☁️ META CLOUD API          │    │
│  │                                │  │                                │    │
│  │   Conexao via QR Code         │  │   API Oficial do WhatsApp     │    │
│  │   Gratuito                    │  │   Pago                        │    │
│  │                                │  │                                │    │
│  │   [Selecionar]                │  │   [Selecionar]                │    │
│  │                                │  │                                │    │
│  └────────────────────────────────┘  └────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

4. Clique em **[Selecionar]** na opcao Baileys

#### Passo 2: Configurar Nome da Conexao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configurar Conexao Baileys                                        [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Nome da conexao:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ WhatsApp Principal                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Dica: Use um nome que identifique o numero (ex: "Suporte", "Vendas")      │
│                                                                              │
│  Departamento padrao (opcional):                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Selecione um departamento ▼]                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Tickets recebidos neste numero irao para este departamento                │
│                                                                              │
│                                     [Cancelar]  [Proximo: Gerar QR Code]   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. Digite um nome para identificar a conexao
2. Selecione um departamento padrao (opcional)
3. Clique em **[Proximo: Gerar QR Code]**

#### Passo 3: Escanear o QR Code

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Escanear QR Code                                                  [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    ┌─────────────────────────┐                              │
│                    │                         │                              │
│                    │      ██████████████     │                              │
│                    │      █            █     │                              │
│                    │      █  ████████  █     │                              │
│                    │      █  █      █  █     │                              │
│                    │      █  █      █  █     │                              │
│                    │      █  ████████  █     │                              │
│                    │      █            █     │                              │
│                    │      ██████████████     │                              │
│                    │                         │                              │
│                    │      [QR CODE AQUI]     │                              │
│                    │                         │                              │
│                    └─────────────────────────┘                              │
│                                                                              │
│                    Tempo restante: 45 segundos                              │
│                    [Gerar Novo QR Code]                                     │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  INSTRUCOES:                                                                │
│                                                                              │
│  1. Abra o WhatsApp no seu celular                                         │
│  2. Toque em "Mais opcoes" (tres pontos) > "Aparelhos conectados"          │
│  3. Toque em "Conectar um aparelho"                                        │
│  4. Aponte a camera do celular para este QR Code                           │
│                                                                              │
│  ⚠️ O QR Code expira em 60 segundos. Se expirar, clique em "Gerar Novo".  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**No seu celular:**

1. Abra o **WhatsApp**
2. Toque nos **tres pontos** (canto superior direito)
3. Selecione **Aparelhos conectados**
4. Toque em **Conectar um aparelho**
5. **Aponte a camera** para o QR Code na tela

#### Passo 4: Confirmar Conexao

Apos escanear, aguarde alguns segundos. A tela ira atualizar:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Conexao Estabelecida!                                             [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          ✓ CONECTADO COM SUCESSO                            │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Nome: WhatsApp Principal                                                   │
│  Numero: +55 11 99999-8888                                                  │
│  Status: 🟢 Conectado                                                       │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Voce pode:                                                                 │
│  • Comecar a receber mensagens neste numero                                │
│  • Configurar mensagens automaticas                                        │
│  • Atribuir a um departamento                                              │
│                                                                              │
│                                              [Ir para Configuracoes]       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

:::tip Teste a Conexao
Envie uma mensagem de teste para o numero conectado usando outro celular. A mensagem deve aparecer no ChatBlue.
:::

### Problemas Comuns com Baileys

#### QR Code Expira Muito Rapido

**Causa**: O QR Code tem validade de 60 segundos por seguranca.

**Solucao**:
1. Tenha o celular preparado antes de gerar o QR Code
2. Clique em **[Gerar Novo QR Code]** se expirar
3. Escaneie rapidamente

#### Conexao Cai Frequentemente

**Causa**: WhatsApp aberto em outro dispositivo ou sessao antiga.

**Solucao**:
1. No celular, acesse **Aparelhos conectados**
2. Remova todas as sessoes anteriores
3. Reconecte apenas no ChatBlue

#### Numero Foi Bloqueado

**Causa**: Envio de muitas mensagens ou conteudo suspeito.

**Solucao**:
1. Use outro numero
2. Evite mensagens em massa
3. Considere migrar para Meta Cloud API

---

## Configurando Meta Cloud API (API Oficial)

### Requisitos

Antes de comecar, voce precisa de:
- Conta no **Meta Business Suite**
- Conta no **Meta for Developers**
- Numero de telefone que pode receber SMS (para verificacao)
- Cartao de credito ou conta de cobranca configurada

### Passo a Passo

#### Passo 1: Criar Aplicativo no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Faca login com sua conta Facebook/Meta
3. Clique em **Meus Apps** > **Criar App**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Criar Aplicativo - Meta for Developers                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Que tipo de app voce deseja criar?                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ( ) Consumidor                                                      │   │
│  │ (●) Empresa ◄── Selecione esta opcao                               │   │
│  │ ( ) Jogos                                                           │   │
│  │ ( ) Nenhuma (apenas acesso basico)                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Nome do App: [ChatBlue - Minha Empresa            ]                       │
│                                                                              │
│  Email de contato: [admin@minhaempresa.com         ]                       │
│                                                                              │
│  Conta Business: [Minha Empresa ▼]                                         │
│                                                                              │
│                                                [Criar App]                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

4. Selecione **Empresa**
5. Preencha nome e email
6. Selecione sua conta Business
7. Clique em **Criar App**

#### Passo 2: Adicionar WhatsApp ao App

1. No painel do app, clique em **Adicionar produto**
2. Encontre **WhatsApp** e clique em **Configurar**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Adicionar Produtos ao App                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Produtos disponiveis:                                                      │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │                  │  │                  │  │                  │          │
│  │    WhatsApp      │  │    Messenger     │  │    Instagram     │          │
│  │                  │  │                  │  │                  │          │
│  │  [Configurar] ◄──│  │  [Configurar]    │  │  [Configurar]    │          │
│  │                  │  │                  │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 3: Adicionar Numero de Telefone

1. Em WhatsApp > **Inicio**, clique em **Adicionar numero de telefone**
2. Siga as instrucoes para verificar seu numero

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Adicionar Numero de Telefone                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Passo 1: Verificacao do numero                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Pais: [Brasil (+55) ▼]                                                    │
│                                                                              │
│  Numero: [11 99999-8888            ]                                       │
│                                                                              │
│  Metodo de verificacao:                                                     │
│  ( ) SMS                                                                    │
│  (●) Ligacao telefonica                                                    │
│                                                                              │
│  ⚠️ Este numero NAO pode ter WhatsApp pessoal ativo.                       │
│     Se tiver, sera desconectado.                                           │
│                                                                              │
│                                          [Enviar codigo de verificacao]    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

3. Insira o codigo recebido por SMS ou ligacao
4. Configure o perfil de negocio (nome, categoria, descricao)

#### Passo 4: Obter Credenciais

Apos configurar, voce tera acesso a:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Credenciais da API                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ID do App: 123456789012345                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Token de Acesso (temporario):                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ EAABsbCS1IZAX....[TOKEN MUITO LONGO]....ZDZD                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  [Copiar]                                                                   │
│                                                                              │
│  ⚠️ Este token expira em 24 horas. Gere um token permanente.              │
│                                                                              │
│  ID do Numero de Telefone: 109876543210987                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ID da Conta Business do WhatsApp: 112233445566778                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Importante**: Anote todos esses valores. Voce precisara deles.

#### Passo 5: Gerar Token Permanente

1. Acesse **Configuracoes do App** > **Basico**
2. Anote o **Segredo do App**
3. Acesse **Configuracoes do Business** > **Usuarios do sistema**
4. Crie um usuario do sistema e gere um token com permissao `whatsapp_business_messaging`

#### Passo 6: Configurar Webhook

1. No ChatBlue, copie a URL de webhook fornecida
2. No Meta, acesse **WhatsApp** > **Configuracao**
3. Em **Webhook**, clique em **Editar**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configurar Webhook                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  URL de callback:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ https://api.chatblue.com.br/webhook/whatsapp/sua-empresa            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Token de verificacao:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ seu-token-verificacao-chatblue                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Campos de Webhook (selecione):                                             │
│  [x] messages        ◄── Obrigatorio                                       │
│  [x] message_status  ◄── Obrigatorio                                       │
│  [ ] message_template_status_update                                        │
│  [ ] account_update                                                        │
│                                                                              │
│                              [Verificar e Salvar]                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Passo 7: Configurar no ChatBlue

1. No ChatBlue, acesse **Configuracoes > WhatsApp**
2. Clique em **[+ Nova Conexao]** > **Meta Cloud API**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configurar Meta Cloud API                                         [Fechar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Nome da conexao:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ WhatsApp Oficial                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ID do App:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 123456789012345                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Token de Acesso (permanente):                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ EAABsbCS1IZAX....                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ID do Numero de Telefone:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 109876543210987                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ID da Conta Business do WhatsApp:                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 112233445566778                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Token de verificacao do Webhook:                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ seu-token-verificacao-chatblue                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                              [Testar Conexao]  [Salvar]                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

3. Preencha todos os campos com as credenciais obtidas
4. Clique em **[Testar Conexao]**
5. Se estiver tudo certo, clique em **[Salvar]**

---

## Gerenciando Conexoes

### Visualizando Conexoes Existentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Conexoes WhatsApp                                       [+ Nova Conexao]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📱 WhatsApp Principal                                              │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  Tipo: Baileys           Status: 🟢 Conectado                       │   │
│  │  Numero: +55 11 99999-8888                                          │   │
│  │  Departamento: Suporte                                               │   │
│  │  Mensagens hoje: 156     Tickets ativos: 23                         │   │
│  │                                                                      │   │
│  │  [Configurar]  [Desconectar]  [Ver Logs]                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ☁️ WhatsApp Oficial                                                │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  Tipo: Meta Cloud API    Status: 🟢 Conectado                       │   │
│  │  Numero: +55 11 99999-7777                                          │   │
│  │  Departamento: Vendas                                                │   │
│  │  Mensagens hoje: 234     Tickets ativos: 45                         │   │
│  │                                                                      │   │
│  │  [Configurar]  [Desconectar]  [Ver Logs]                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Multiplas Conexoes

Voce pode ter varias conexoes WhatsApp:

| Uso | Exemplo |
|-----|---------|
| Por departamento | Vendas: +55 11 99999-0001, Suporte: +55 11 99999-0002 |
| Por tipo de servico | Atendimento: Baileys, Campanhas: Meta Cloud API |
| Por regiao | SP: +55 11..., RJ: +55 21... |

:::tip Dica
Use nomes descritivos para facilitar a identificacao de cada conexao.
:::

## Resolucao de Problemas

### Problemas com Baileys

| Problema | Causa | Solucao |
|----------|-------|---------|
| QR Code nao aparece | Erro de conexao | Recarregue a pagina |
| Conexao cai toda hora | Sessao duplicada | Remova outras sessoes no celular |
| Mensagens nao chegam | Webhook com problema | Verifique logs |
| Numero bloqueado | Uso abusivo | Use outro numero |

### Problemas com Meta Cloud API

| Problema | Causa | Solucao |
|----------|-------|---------|
| Token invalido | Token expirado | Gere novo token permanente |
| Webhook nao funciona | URL incorreta | Verifique URL e token |
| Mensagens nao enviam | Limite excedido | Verifique limites na Meta |
| Erro 403 | Permissao negada | Verifique permissoes do token |

## Proximos Passos

Agora que o WhatsApp esta configurado, vamos:

- **[Criar Usuarios e Departamentos](/treinamento/administrador/usuarios-departamentos)** - Configurar sua equipe
- **[Configuracoes Avancadas](/treinamento/administrador/configuracoes-avancadas)** - Personalizar mensagens e SLA
