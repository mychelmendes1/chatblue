---
sidebar_position: 16
title: Mensagens Pre-definidas
description: Atalhos de mensagens rapidas para atendentes no ChatBlue
---

# Mensagens Pre-definidas

Mensagens pre-definidas sao atalhos de texto que permitem aos atendentes inserir respostas frequentes de forma rapida durante o chat. Ao digitar `/` seguido do atalho (por exemplo, `/ola`), o conteudo completo da mensagem e inserido automaticamente na caixa de texto.

## Visao Geral

O recurso funciona como um sistema de snippets:

- Cada mensagem possui um **atalho** (shortcut), um **rotulo** opcional e o **conteudo** completo
- Atalhos sao unicos por empresa — nao e possivel ter dois atalhos iguais na mesma conta
- Qualquer atendente autenticado pode **consultar** os atalhos (para o autocomplete no chat)
- Apenas **administradores** podem criar, editar ou excluir atalhos
- A filtragem por empresa e automatica via autenticacao (companyId do token)

## Modelo de Dados

### Campos do PredefinedMessage

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | String (CUID) | Sim (auto) | Identificador unico |
| `companyId` | String | Sim (auto) | Empresa dona do atalho |
| `shortcut` | String (1-50) | Sim | Atalho sem a barra (ex: `ola`, `preco_plano1`) |
| `name` | String (max 100) | Nao | Rotulo amigavel para identificar a mensagem |
| `content` | String | Sim | Texto completo que sera inserido no chat |

### Regras de Validacao

- **shortcut**: minimo 1 caractere, maximo 50. Aceita apenas letras (a-z, A-Z), numeros (0-9), `_` e `-`. A barra `/` nao faz parte do valor armazenado.
- **shortcut** e normalizado para **minusculo** e sem espacos antes de salvar.
- **name**: opcional, maximo 100 caracteres. Util como descricao breve (ex: "Saudacao inicial").
- **content**: obrigatorio, sem limite maximo definido. Conteudo pode incluir quebras de linha e formatacao WhatsApp.
- **Unicidade**: a combinacao `companyId` + `shortcut` deve ser unica. Tentativas de criar ou atualizar para um atalho ja existente retornam erro de validacao.

## Uso no Chat

Quando o atendente esta na caixa de mensagem do chat:

1. Digita `/` para ativar o autocomplete
2. Continua digitando para filtrar (ex: `/ola`, `/pre`)
3. A lista de atalhos correspondentes aparece
4. Ao selecionar um atalho, o `content` e inserido na caixa de texto
5. O atendente pode editar o texto antes de enviar

```
+-------------------------------------------+
|  Chat - Ticket #2024-001234               |
+-------------------------------------------+
|                                           |
|  Joao Silva: Ola, preciso de ajuda        |
|                                           |
+-------------------------------------------+
|  /ola                                     |
|  +-------------------------------------+  |
|  | /ola - Saudacao inicial             |  |
|  | /ola_retorno - Boas vindas retorno  |  |
|  +-------------------------------------+  |
+-------------------------------------------+
```

Ao selecionar `/ola`, o campo de texto e preenchido com:

```
Ola! Seja bem-vindo ao atendimento. Como posso ajudar?
```

## API - Endpoints

Todos os endpoints estao sob o prefixo `/api/predefined-messages`.

### Listar Atalhos

#### `GET /api/predefined-messages`

Lista todas as mensagens pre-definidas da empresa do usuario autenticado, ordenadas por atalho em ordem alfabetica.

**Autenticacao**: qualquer usuario autenticado (agente, supervisor ou admin).

**Resposta (200):**

```json
[
  {
    "id": "clx1abc...",
    "companyId": "clx...",
    "shortcut": "ola",
    "name": "Saudacao inicial",
    "content": "Ola! Seja bem-vindo ao atendimento. Como posso ajudar?"
  },
  {
    "id": "clx2def...",
    "companyId": "clx...",
    "shortcut": "preco",
    "name": "Tabela de precos",
    "content": "Segue nossa tabela de precos atualizada..."
  }
]
```

### Criar Atalho

#### `POST /api/predefined-messages`

Cria uma nova mensagem pre-definida.

**Autenticacao**: apenas administradores (`requireAdmin`).

**Body:**

```json
{
  "shortcut": "ola",
  "name": "Saudacao inicial",
  "content": "Ola! Seja bem-vindo ao atendimento. Como posso ajudar?"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `shortcut` | String | Sim | Atalho (sem barra), 1-50 chars, apenas `[a-zA-Z0-9_-]` |
| `name` | String | Nao | Rotulo opcional, max 100 chars |
| `content` | String | Sim | Texto completo da mensagem |

**Resposta (201):** objeto criado.

**Erros:**

| Codigo | Situacao |
|--------|----------|
| 400 | Atalho ja existe na empresa |
| 400 | Validacao falhou (shortcut vazio, caracteres invalidos, content vazio) |
| 403 | Usuario nao e administrador |

### Atualizar Atalho

#### `PUT /api/predefined-messages/:id`

Atualiza uma mensagem pre-definida existente. Todos os campos sao opcionais (atualizacao parcial).

**Autenticacao**: apenas administradores (`requireAdmin`).

**Body (parcial):**

```json
{
  "shortcut": "saudacao",
  "content": "Ola! Bem-vindo de volta. Em que posso ajudar hoje?"
}
```

**Resposta (200):** objeto atualizado.

**Erros:**

| Codigo | Situacao |
|--------|----------|
| 400 | Novo shortcut ja existe na empresa (quando alterado) |
| 404 | Mensagem nao encontrada ou nao pertence a empresa |
| 403 | Usuario nao e administrador |

A verificacao de unicidade so ocorre quando o `shortcut` e alterado para um valor diferente do atual.

### Excluir Atalho

#### `DELETE /api/predefined-messages/:id`

Remove uma mensagem pre-definida.

**Autenticacao**: apenas administradores (`requireAdmin`).

**Resposta (204):** sem conteudo.

**Erros:**

| Codigo | Situacao |
|--------|----------|
| 404 | Mensagem nao encontrada ou nao pertence a empresa |
| 403 | Usuario nao e administrador |

## Permissoes

| Acao | Agente | Supervisor | Admin |
|------|--------|------------|-------|
| Listar atalhos | Sim | Sim | Sim |
| Usar no chat | Sim | Sim | Sim |
| Criar atalho | Nao | Nao | Sim |
| Editar atalho | Nao | Nao | Sim |
| Excluir atalho | Nao | Nao | Sim |

## Exemplos de Atalhos Uteis

| Atalho | Nome | Conteudo |
|--------|------|----------|
| `ola` | Saudacao | Ola! Seja bem-vindo ao atendimento. Como posso ajudar? |
| `aguarde` | Espera | Um momento, por favor. Estou verificando as informacoes. |
| `horario` | Horario de funcionamento | Nosso horario de atendimento e de segunda a sexta, das 8h as 18h. |
| `encerrar` | Encerramento | Obrigado pelo contato! Caso precise de mais alguma coisa, estamos a disposicao. |
| `pix` | Dados PIX | Segue nosso PIX para pagamento: CNPJ 00.000.000/0001-00 |
| `link_suporte` | Link do suporte | Acesse nosso portal de suporte em: https://suporte.exemplo.com |

## Boas Praticas

1. **Atalhos curtos e memoraveis** - Use nomes faceis de lembrar (`ola`, `preco`, `pix`)
2. **Padronize a nomenclatura** - Use um prefixo por categoria (ex: `venda_`, `sup_`, `fin_`)
3. **Revise periodicamente** - Mantenha os conteudos atualizados
4. **Evite duplicidade semantica** - Nao crie atalhos com conteudos muito parecidos
5. **Use rotulos descritivos** - O campo `name` ajuda a identificar o atalho na lista

## Proximos Passos

- [Tickets](/funcionalidades/tickets) - Como tickets utilizam o chat onde os atalhos sao aplicados
- [Contatos](/funcionalidades/contatos) - Gestao de contatos vinculados aos atendimentos
