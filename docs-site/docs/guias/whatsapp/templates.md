---
sidebar_position: 4
title: Templates de Mensagem
description: Guia para criar e gerenciar templates de mensagem no ChatBlue
---

# Templates de Mensagem

Templates de mensagem permitem padronizar comunicacoes e, no caso da Meta Cloud API, enviar mensagens proativas (iniciar conversas). Este guia explica como criar e utilizar templates no ChatBlue.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 15-20 minutos

## Tipos de Templates

### Templates Internos (ChatBlue)

Templates criados e gerenciados dentro do ChatBlue, usados para:
- Respostas rapidas
- Mensagens automaticas
- Padronizacao de atendimento

### Templates HSM (Meta Cloud API)

Templates aprovados pelo WhatsApp, necessarios para:
- Iniciar conversas (mensagens proativas)
- Notificacoes transacionais
- Campanhas de marketing

## Templates Internos

### Criar Template Interno

1. Acesse **Configuracoes > Templates**
2. Clique em **+ Novo Template**
3. Preencha os campos:

| Campo | Descricao | Exemplo |
|-------|-----------|---------|
| Nome | Identificador unico | saudacao_inicial |
| Categoria | Agrupamento | Saudacoes |
| Titulo | Nome amigavel | Saudacao Inicial |
| Conteudo | Texto do template | Ola {nome}! Como posso... |

![Placeholder: Formulario de criacao de template](/img/guias/template-criar.png)

### Variaveis Disponiveis

Use variaveis para personalizar as mensagens:

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `{nome}` | Nome do contato | Joao |
| `{empresa}` | Nome da sua empresa | ChatBlue |
| `{protocolo}` | Numero do ticket | #12345 |
| `{departamento}` | Departamento atual | Vendas |
| `{atendente}` | Nome do atendente | Maria |
| `{data}` | Data atual | 15/01/2024 |
| `{hora}` | Hora atual | 14:30 |

### Exemplo de Template com Variaveis

```markdown
Ola {nome}!

Obrigado por entrar em contato com a {empresa}.

Seu atendimento foi registrado com o protocolo {protocolo}.
Voce esta sendo atendido pelo departamento de {departamento}.

Em breve um de nossos especialistas ira ajuda-lo.

Atenciosamente,
Equipe {empresa}
```

### Categorias de Templates

Organize seus templates por categoria:

| Categoria | Uso |
|-----------|-----|
| Saudacoes | Mensagens de boas-vindas |
| Despedidas | Mensagens de encerramento |
| Transferencias | Avisos de transferencia |
| Aguardo | Mensagens de espera |
| FAQ | Respostas frequentes |
| Promocoes | Ofertas e descontos |
| Confirmacoes | Confirmacao de acoes |

### Configurar Template Automatico

Configure templates para serem enviados automaticamente:

```typescript
{
  automations: [
    {
      trigger: "new_ticket",
      template: "saudacao_inicial",
      delay: 0
    },
    {
      trigger: "ticket_closed",
      template: "despedida_avaliacao",
      delay: 0
    },
    {
      trigger: "no_response_5min",
      template: "aguardando_resposta",
      delay: 300000 // 5 minutos
    }
  ]
}
```

## Templates HSM (Meta Cloud API)

### Categorias HSM

| Categoria | Descricao | Aprovacao | Custo |
|-----------|-----------|-----------|-------|
| Marketing | Promocoes, ofertas | Rigorosa | Alto |
| Utilidade | Confirmacoes, alertas | Moderada | Medio |
| Autenticacao | Codigos OTP | Automatica | Baixo |

### Criar Template HSM

#### Passo 1: Criar no Meta Business Suite

1. Acesse [Meta Business Suite](https://business.facebook.com/)
2. Va em **WhatsApp > Modelos de mensagem**
3. Clique em **Criar modelo**

#### Passo 2: Configurar Template

| Campo | Descricao |
|-------|-----------|
| Nome | Identificador (snake_case, sem espacos) |
| Categoria | Marketing, Utilidade ou Autenticacao |
| Idioma | pt_BR (Portugues Brasil) |

#### Passo 3: Estrutura do Template

```
CABECALHO (opcional):
- Texto
- Imagem
- Video
- Documento

CORPO (obrigatorio):
Texto principal com variaveis {{1}}, {{2}}, etc.

RODAPE (opcional):
Texto pequeno no final

BOTOES (opcional):
- Call to Action (URL ou telefone)
- Resposta rapida
```

### Exemplos de Templates HSM

#### Template de Confirmacao de Pedido

```
Nome: confirmacao_pedido
Categoria: Utilidade
Idioma: pt_BR

Cabecalho: [IMAGEM]

Corpo:
Ola {{1}}!

Seu pedido #{{2}} foi confirmado!

Itens: {{3}}
Valor: R$ {{4}}
Entrega: {{5}}

Acompanhe pelo link abaixo.

Rodape: ChatBlue Delivery

Botoes:
- [URL] Acompanhar Pedido
- [RESPOSTA] Falar com Atendente
```

#### Template de Lembrete de Pagamento

```
Nome: lembrete_pagamento
Categoria: Utilidade
Idioma: pt_BR

Corpo:
Ola {{1}},

Identificamos que sua fatura no valor de R$ {{2}} vence em {{3}}.

Evite juros e multas pagando em dia!

Codigo de barras:
{{4}}

Rodape: Equipe Financeira

Botoes:
- [URL] Pagar Agora
- [RESPOSTA] Ja Paguei
```

#### Template de Marketing

```
Nome: promocao_mensal
Categoria: Marketing
Idioma: pt_BR

Cabecalho: [IMAGEM]

Corpo:
Oi {{1}}!

Este mes temos uma oferta especial para voce!

{{2}}

Valido ate {{3}}. Nao perca!

Rodape: Responda SAIR para nao receber mais

Botoes:
- [URL] Ver Ofertas
- [RESPOSTA] Quero Saber Mais
```

### Sincronizar Templates HSM no ChatBlue

1. Acesse **Configuracoes > Templates > HSM**
2. Clique em **Sincronizar com Meta**
3. Os templates aprovados serao importados

```typescript
// Templates sincronizados aparecem assim
{
  templates: [
    {
      id: "hsm_123",
      name: "confirmacao_pedido",
      status: "APPROVED",
      category: "UTILITY",
      language: "pt_BR",
      components: [...]
    }
  ]
}
```

### Status dos Templates HSM

| Status | Descricao | Acao |
|--------|-----------|------|
| APPROVED | Aprovado para uso | Pode enviar |
| PENDING | Em analise | Aguardar |
| REJECTED | Rejeitado | Corrigir e reenviar |
| PAUSED | Pausado por qualidade | Revisar conteudo |
| DISABLED | Desabilitado | Contatar suporte |

## Usar Templates

### Via Interface

1. No chat, clique no icone de **Templates** (ou `/`)
2. Selecione o template desejado
3. Preencha as variaveis se necessario
4. Clique em **Enviar**

![Placeholder: Selecao de template no chat](/img/guias/template-selecao.png)

### Via Atalho de Teclado

1. No campo de mensagem, digite `/`
2. Comece a digitar o nome do template
3. Selecione com as setas e Enter

### Via API

```typescript
// Enviar template interno
POST /api/messages/template
{
  "ticketId": "ticket_123",
  "templateId": "saudacao_inicial",
  "variables": {
    "nome": "Joao",
    "protocolo": "12345"
  }
}

// Enviar template HSM
POST /api/whatsapp/template
{
  "connectionId": "conn_123",
  "to": "5511999998888",
  "template": {
    "name": "confirmacao_pedido",
    "language": "pt_BR",
    "components": [
      {
        "type": "header",
        "parameters": [
          { "type": "image", "image": { "link": "https://..." } }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Joao" },
          { "type": "text", "text": "12345" },
          { "type": "text", "text": "2x Pizza Grande" },
          { "type": "text", "text": "89,90" },
          { "type": "text", "text": "40 minutos" }
        ]
      }
    ]
  }
}
```

## Boas Praticas

### 1. Nomes Claros

```
Bom: saudacao_horario_comercial
Ruim: template1
```

### 2. Variaveis Uteis

```
Bom: Ola {nome}, seu pedido #{protocolo} foi enviado!
Ruim: Ola cliente, seu pedido foi enviado!
```

### 3. Categorias Organizadas

Mantenha templates agrupados por funcao para facilitar a busca.

### 4. Revisao Periodica

- Revise templates mensalmente
- Remova templates nao utilizados
- Atualize informacoes desatualizadas

### 5. Templates HSM

- Seja claro e objetivo
- Evite linguagem promocional excessiva
- Inclua opcao de opt-out em marketing
- Teste antes de enviar em massa

## Solucao de Problemas

### Template nao aparece na lista

**Causas**:
- Template nao foi sincronizado
- Filtro de categoria ativo

**Solucao**:
1. Clique em **Sincronizar Templates**
2. Remova filtros de categoria
3. Verifique se o template esta ativo

### Variaveis nao substituidas

**Causa**: Nome da variavel incorreto

**Solucao**:
```
Errado: Ola {Nome}!     (maiuscula)
Certo:  Ola {nome}!     (minuscula)

Errado: Ola {{nome}}!   (chaves duplas - apenas HSM)
Certo:  Ola {nome}!     (chaves simples - interno)
```

### Template HSM rejeitado

**Causas comuns**:
- Conteudo promocional em categoria Utilidade
- Falta de opcao de opt-out
- Texto muito longo
- Linguagem inadequada

**Solucao**:
1. Leia o motivo da rejeicao no Meta
2. Ajuste o conteudo
3. Reenvie para aprovacao

### Erro ao enviar template HSM

```
Erro: "Template parameters mismatch"
```

**Causa**: Numero de parametros incorreto

**Solucao**:
Verifique o numero exato de variaveis no template e envie todos os parametros.

## Proximos Passos

Apos configurar seus templates:

- [Configurar Envio de Midia](/guias/whatsapp/midia)
- [Configurar Respostas Automaticas](/guias/inteligencia-artificial/configuracao)
- [Configurar Departamentos](/guias/administracao/departamentos)
