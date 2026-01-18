---
sidebar_position: 2
title: Interface do Chat
description: Conheca todos os recursos da interface de atendimento
---

# Interface do Chat

Neste capitulo, voce vai conhecer em detalhes todos os elementos da interface de chat do ChatBlue.

## Visao Geral da Tela

A tela de chat e dividida em tres areas principais:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           BARRA SUPERIOR                                  │
├────────────────┬─────────────────────────────────┬───────────────────────┤
│                │                                 │                       │
│    SIDEBAR     │      AREA DE MENSAGENS          │   PAINEL DO          │
│   (CONVERSAS)  │                                 │   CONTATO            │
│                │                                 │                       │
│    300px       │         Flexivel                │      350px           │
│                │                                 │                       │
└────────────────┴─────────────────────────────────┴───────────────────────┘
```

---

## 1. Barra Superior

A barra superior contem elementos importantes para navegacao:

### Elementos da Barra

| Elemento | Funcao |
|----------|--------|
| **Logo ChatBlue** | Clique para voltar a tela inicial |
| **Campo de Busca** | Busque conversas por nome, telefone ou conteudo |
| **Sino de Notificacoes** | Mostra alertas e novos tickets |
| **Seu Avatar** | Acesse seu perfil e configuracoes |

### Menu do Usuario

Ao clicar no seu avatar, voce tera acesso a:

- **Meu Perfil** - Edite seus dados
- **Configuracoes** - Personalize o sistema
- **Status Online/Offline** - Mude sua disponibilidade
- **Sair** - Fazer logout

:::tip Status Online
Mantenha seu status como "Online" durante o expediente. Isso ajuda o supervisor a saber quem esta disponivel.
:::

---

## 2. Sidebar de Conversas

A sidebar mostra todas as suas conversas organizadas em abas.

### Abas de Filtro

| Aba | O que mostra |
|-----|--------------|
| **Todas** | Todas as conversas ativas |
| **Minhas** | Apenas tickets atribuidos a voce |
| **IA** | Tickets sendo atendidos pela IA |
| **Fila** | Tickets aguardando atendimento |

### Card de Conversa

Cada conversa mostra:

```
┌─────────────────────────────────────────┐
│ [Avatar]  Maria Silva            14:32  │
│           Obrigado pela ajuda!          │
│           [🟢 Em Atendimento] [2]       │
└─────────────────────────────────────────┘
```

- **Avatar**: Foto do contato (se disponivel)
- **Nome**: Nome do cliente
- **Horario**: Quando foi a ultima mensagem
- **Preview**: Inicio da ultima mensagem
- **Status**: Cor indicando o status
- **Badge**: Numero de mensagens nao lidas

### Ordenacao

As conversas sao ordenadas por:
1. **Mensagens nao lidas** primeiro
2. **Ultima atividade** (mais recentes em cima)

### Busca de Conversas

Use o campo de busca para encontrar conversas:

1. **Por nome**: Digite o nome do cliente
2. **Por telefone**: Digite o numero (com ou sem DDD)
3. **Por conteudo**: Digite palavras da conversa
4. **Por protocolo**: Digite o numero do ticket

---

## 3. Area de Mensagens

Esta e a area principal onde voce le e escreve mensagens.

### Cabecalho da Conversa

```
┌─────────────────────────────────────────────────────────────────┐
│ [👤] Maria Silva                [📞] [📹] [⋮]                  │
│      +55 11 99999-9999 • Ticket #2024-0001                      │
│      [SLA: ⏱️ 12:45 restantes]                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Elemento | Funcao |
|----------|--------|
| **Avatar e Nome** | Identificacao do cliente |
| **Telefone** | Numero do WhatsApp |
| **Protocolo** | Numero unico do ticket |
| **Timer SLA** | Tempo restante para primeira resposta |
| **Botao Telefone** | Iniciar chamada (se disponivel) |
| **Botao Video** | Iniciar video chamada (se disponivel) |
| **Menu (⋮)** | Mais opcoes do ticket |

### Baloes de Mensagem

As mensagens aparecem em baloes coloridos:

```
      ┌─────────────────────────────┐
      │ Ola, preciso de ajuda com   │  ← Mensagem do CLIENTE
      │ meu pedido #12345           │     (fundo cinza, esquerda)
      │                      10:30  │
      └─────────────────────────────┘

                    ┌─────────────────────────────┐
 Mensagem SUA →     │ Claro! Vou verificar seu    │  (fundo azul, direita)
                    │ pedido agora mesmo.         │
                    │ 10:31 ✓✓                    │
                    └─────────────────────────────┘

      ┌─────────────────────────────┐
      │ 🤖 Resposta da IA           │  ← Mensagem da IA
      │ Seu pedido esta em transito │     (fundo verde claro)
      │                      10:29  │
      └─────────────────────────────┘
```

### Tipos de Mensagens

O ChatBlue suporta varios tipos de mensagens:

| Tipo | Icone | Descricao |
|------|-------|-----------|
| **Texto** | 💬 | Mensagens de texto normais |
| **Imagem** | 🖼️ | Fotos e imagens (clique para ampliar) |
| **Audio** | 🎵 | Mensagens de voz (clique para ouvir) |
| **Video** | 🎬 | Videos (clique para reproduzir) |
| **Documento** | 📄 | PDFs, Word, Excel, etc. |
| **Localizacao** | 📍 | Localizacao no mapa |
| **Contato** | 👤 | Cartao de contato |

### Campo de Digitacao

```
┌─────────────────────────────────────────────────────────────────┐
│ [📎] [😊]  Digite sua mensagem...                         [➤]  │
└─────────────────────────────────────────────────────────────────┘
```

| Botao | Funcao |
|-------|--------|
| **📎 Anexo** | Enviar arquivos e midias |
| **😊 Emoji** | Inserir emojis na mensagem |
| **➤ Enviar** | Enviar a mensagem (ou pressione Enter) |

---

## 4. Painel do Contato

O painel lateral direito mostra informacoes do cliente:

### Informacoes Basicas

```
┌─────────────────────────────┐
│        [AVATAR]             │
│      Maria Silva            │
│   +55 11 99999-9999         │
│   maria@email.com           │
├─────────────────────────────┤
│ Status: Cliente Ativo       │
│ Desde: 15/01/2024           │
│ Ultimo contato: Hoje        │
├─────────────────────────────┤
│ Tags:                       │
│ [VIP] [Recorrente]          │
├─────────────────────────────┤
│ Notas:                      │
│ Cliente prefere contato     │
│ por WhatsApp. Horario:      │
│ comercial.                  │
└─────────────────────────────┘
```

### Campos Disponiveis

| Campo | Descricao |
|-------|-----------|
| **Nome** | Nome completo do cliente |
| **Telefone** | Numero do WhatsApp |
| **Email** | Email do cliente |
| **Status** | Cliente/Ex-cliente/Prospect |
| **Cliente Desde** | Data de inicio do relacionamento |
| **Tags** | Etiquetas para classificar |
| **Notas** | Observacoes sobre o cliente |

### Acoes do Painel

- **Editar Contato**: Altere os dados do cliente
- **Ver Historico**: Veja todos os atendimentos anteriores
- **Adicionar Tag**: Classifique o cliente
- **Adicionar Nota**: Deixe observacoes para a equipe

---

## 5. Acoes do Ticket

No menu do ticket (⋮), voce encontra:

### Acoes Principais

| Acao | Descricao |
|------|-----------|
| **Assumir** | Pegar o ticket para voce |
| **Transferir** | Enviar para outro atendente/departamento |
| **Resolver** | Marcar como resolvido |
| **Fechar** | Encerrar o ticket |

### Acoes Secundarias

| Acao | Descricao |
|------|-----------|
| **Alterar Prioridade** | Mudar urgencia do ticket |
| **Adicionar ao FAQ** | Salvar resposta para reuso |
| **Enviar para IA** | Deixar IA continuar atendimento |
| **Ver Historico** | Atendimentos anteriores do cliente |

---

## 6. Indicadores Visuais

### SLA (Acordo de Nivel de Servico)

O timer de SLA mostra quanto tempo voce tem para responder:

| Cor | Significado |
|-----|-------------|
| 🟢 Verde | Dentro do prazo (mais de 50% do tempo) |
| 🟡 Amarelo | Atencao (menos de 50% do tempo) |
| 🔴 Vermelho | Urgente (menos de 25% ou estourado) |

### Indicador de Digitacao

Quando o cliente esta digitando, voce vera:

```
Maria esta digitando...
```

### Notificacoes

- **Som**: Alerta sonoro para novas mensagens
- **Visual**: Badge com numero no icone do navegador
- **Desktop**: Notificacao do sistema operacional

---

## 7. Responsividade

O ChatBlue funciona em diferentes tamanhos de tela:

### Desktop (1200px+)
- Todas as 3 colunas visiveis
- Experiencia completa

### Tablet (768px - 1199px)
- Sidebar recolhida (abre ao clicar)
- Painel do contato abre em modal

### Mobile (< 768px)
- Uma area por vez
- Navegacao por gestos/botoes

---

## Exercicios Praticos

### Exercicio 1: Explorando a Interface
1. Navegue pelas 4 abas de conversas
2. Clique em diferentes tickets
3. Observe como muda a area de mensagens

### Exercicio 2: Personalizacao
1. Acesse seu perfil
2. Atualize sua foto
3. Configure suas notificacoes

### Exercicio 3: Busca
1. Use a busca para encontrar um cliente pelo nome
2. Use a busca para encontrar por numero de telefone
3. Use a busca para encontrar por conteudo de mensagem

---

## Proximo Passo

Agora que voce conhece a interface, vamos aprender a enviar diferentes tipos de mensagens:

**[Enviando Mensagens →](/treinamento/atendente/enviando-mensagens)**
