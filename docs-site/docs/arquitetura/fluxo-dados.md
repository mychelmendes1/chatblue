---
sidebar_position: 3
title: Fluxo de Dados
description: Como os dados fluem atraves do ChatBlue
---

# Fluxo de Dados

Esta pagina documenta os principais fluxos de dados do ChatBlue.

## Fluxo de Mensagem Recebida

Quando um cliente envia uma mensagem via WhatsApp:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MENSAGEM RECEBIDA                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   WhatsApp   │
│    Client    │
└──────┬───────┘
       │ 1. Cliente envia mensagem
       ▼
┌──────────────┐
│   WhatsApp   │
│   Servers    │
└──────┬───────┘
       │ 2. Webhook/Socket
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    WHATSAPP SERVICE                               │
│                                                                   │
│  ┌─────────────────┐        ┌─────────────────┐                 │
│  │  BaileysService │   OR   │ MetaCloudService│                 │
│  │  (QR Code)      │        │ (API Oficial)   │                 │
│  └────────┬────────┘        └────────┬────────┘                 │
│           │                          │                           │
│           └──────────┬───────────────┘                          │
│                      │ 3. Normaliza dados                        │
│                      ▼                                           │
└──────────────────────┼───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   MESSAGE PROCESSOR                               │
│                                                                   │
│  4. Busca/Cria Contato                                           │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Busca por telefone + companyId                        │ │
│     │ - Se nao existe, cria novo contato                      │ │
│     │ - Atualiza lastMessageAt                                │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
│  5. Busca/Cria Ticket                                            │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Busca ticket aberto para o contato                    │ │
│     │ - Se nao existe, cria novo ticket                       │ │
│     │ - Gera numero de protocolo                              │ │
│     │ - Define prioridade inicial                             │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
│  6. Persiste Mensagem                                            │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Cria registro no banco                                │ │
│     │ - Salva midia se houver                                 │ │
│     │ - Atualiza status do ticket                             │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   DECISAO: AI ATIVO?                              │
│                                                                   │
│     ┌──────────────┐                 ┌──────────────┐           │
│     │  Sim - AI    │                 │ Nao - Humano │           │
│     │  atribuido   │                 │  aguarda     │           │
│     └──────┬───────┘                 └──────┬───────┘           │
│            │                                │                    │
└────────────┼────────────────────────────────┼────────────────────┘
             │                                │
             ▼                                │
┌──────────────────────────────────────────┐ │
│              AI SERVICE                   │ │
│                                           │ │
│  7. Construir Contexto                    │ │
│     - Historico de mensagens              │ │
│     - Dados do contato                    │ │
│     - Base de conhecimento                │ │
│     - FAQ relevantes                      │ │
│                                           │ │
│  8. Gerar Resposta                        │ │
│     - OpenAI ou Anthropic                 │ │
│     - Aplicar personalidade               │ │
│     - Verificar guardrails                │ │
│                                           │ │
│  9. Analisar Transferencia                │ │
│     - Keywords de transferencia           │ │
│     - Sentimento negativo                 │ │
│     - Cliente VIP                         │ │
│     - Limite de mensagens                 │ │
│                                           │ │
└────────────┬──────────────────────────────┘ │
             │                                │
             ▼                                │
┌──────────────────────────────────────────┐ │
│        WHATSAPP SERVICE                   │ │
│                                           │ │
│  10. Enviar Resposta                      │ │
│      - Serializar para WhatsApp           │ │
│      - Enviar via conexao ativa           │ │
│      - Atualizar status                   │ │
│                                           │ │
└────────────┬──────────────────────────────┘ │
             │                                │
             └────────────┬───────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SOCKET.IO                                     │
│                                                                   │
│  11. Notificar Frontend                                          │
│      - Emitir 'message:received'                                 │
│      - Emitir 'ticket:updated'                                   │
│      - Broadcast para sala da empresa                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     FRONTEND                                      │
│                                                                   │
│  12. Atualizar UI                                                │
│      - Chat store recebe evento                                  │
│      - Atualiza lista de mensagens                               │
│      - Scroll para nova mensagem                                 │
│      - Notificacao sonora/visual                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Fluxo de Mensagem Enviada

Quando um agente envia uma mensagem:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MENSAGEM ENVIADA                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Agente     │
│  (Browser)   │
└──────┬───────┘
       │ 1. Digita mensagem e clica Enviar
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  2. Validar Mensagem                                             │
│     - Verificar conteudo nao vazio                               │
│     - Verificar tamanho maximo                                   │
│     - Preparar anexos se houver                                  │
│                                                                   │
│  3. Atualizar UI Otimista                                        │
│     - Adicionar mensagem com status PENDING                      │
│     - Mostrar indicador de envio                                 │
│                                                                   │
│  4. Enviar Requisicao                                            │
│     POST /api/messages/ticket/:ticketId/send                     │
│     { content, mediaUrl?, mediaType? }                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND                                      │
│                                                                   │
│  5. Middleware de Autenticacao                                   │
│     - Validar JWT token                                          │
│     - Extrair userId e companyId                                 │
│                                                                   │
│  6. Middleware de Tenant                                         │
│     - Verificar acesso ao ticket                                 │
│     - Validar permissoes                                         │
│                                                                   │
│  7. Persistir Mensagem                                           │
│     - Criar registro no banco                                    │
│     - Status inicial: PENDING                                    │
│     - Associar ao ticket e usuario                               │
│                                                                   │
│  8. Atualizar Ticket                                             │
│     - Atualizar lastMessageAt                                    │
│     - Registrar first response time se aplicavel                 │
│     - Atualizar metricas de SLA                                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   WHATSAPP SERVICE                                │
│                                                                   │
│  9. Buscar Conexao Ativa                                         │
│     - Obter conexao da empresa                                   │
│     - Verificar status CONNECTED                                 │
│                                                                   │
│  10. Enviar ao WhatsApp                                          │
│      - Formatar mensagem para API                                │
│      - Enviar via Baileys ou Meta Cloud                          │
│      - Aguardar confirmacao                                      │
│                                                                   │
│  11. Atualizar Status                                            │
│      - SENT quando confirmado                                    │
│      - FAILED se erro                                            │
│      - Salvar wamid (WhatsApp Message ID)                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SOCKET.IO                                     │
│                                                                   │
│  12. Notificar Outros Usuarios                                   │
│      - Emitir 'message:sent' para sala do ticket                 │
│      - Emitir 'message:status' com novo status                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     FRONTEND                                      │
│                                                                   │
│  13. Atualizar Status da Mensagem                                │
│      - Receber evento de status                                  │
│      - Atualizar icone (relogio -> check -> double check)        │
│      - Remover indicador de envio                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Fluxo de Status de Mensagem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STATUS DE MENSAGEM                                       │
└─────────────────────────────────────────────────────────────────────────────┘

         PENDING              SENT              DELIVERED              READ
            │                  │                    │                    │
            │ Mensagem         │ WhatsApp           │ Chegou no          │ Usuario
            │ criada           │ confirmou          │ dispositivo        │ visualizou
            │                  │ envio              │ do cliente         │
            ▼                  ▼                    ▼                    ▼
         ┌────┐             ┌────┐              ┌────┐              ┌────┐
         │ ⏳ │ ──────────► │ ✓  │ ───────────► │ ✓✓ │ ───────────► │ ✓✓ │
         │    │             │    │              │    │              │ 🔵 │
         └────┘             └────┘              └────┘              └────┘
           │                                                           │
           │                                                           │
           │                      FAILED                               │
           │                         │                                 │
           │ Erro de envio           │                                 │
           │                         ▼                                 │
           └─────────────────────► ┌────┐                             │
                                   │ ❌ │                             │
                                   │    │                             │
                                   └────┘                             │
```

## Fluxo de Autenticacao

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTENTICACAO                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Usuario    │
└──────┬───────┘
       │ 1. Acessa /login
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  2. Renderizar Formulario                                        │
│     - Email                                                       │
│     - Senha                                                       │
│     - Botao Login                                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
       │ 3. POST /api/auth/login
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND                                      │
│                                                                   │
│  4. Validar Credenciais                                          │
│     - Buscar usuario por email                                   │
│     - Comparar hash da senha (bcrypt)                            │
│     - Verificar se usuario ativo                                 │
│                                                                   │
│  5. Gerar Tokens                                                 │
│     - Access Token (15min)                                       │
│       { userId, companyId, role }                                │
│     - Refresh Token (7d)                                         │
│       { userId }                                                 │
│                                                                   │
│  6. Retornar Resposta                                            │
│     - Tokens                                                      │
│     - Dados do usuario                                           │
│     - Lista de empresas com acesso                               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  7. Armazenar Tokens                                             │
│     - Access token: memoria (Zustand)                            │
│     - Refresh token: localStorage                                │
│                                                                   │
│  8. Configurar Headers                                           │
│     Authorization: Bearer {accessToken}                          │
│                                                                   │
│  9. Redirecionar para Dashboard                                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

               ═══════════════════════════════════
                        REFRESH TOKEN
               ═══════════════════════════════════

┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  10. Access Token Expira (401)                                   │
│                                                                   │
│  11. POST /api/auth/refresh                                      │
│      { refreshToken }                                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND                                      │
│                                                                   │
│  12. Validar Refresh Token                                       │
│      - Verificar assinatura                                      │
│      - Verificar expiracao                                       │
│      - Verificar usuario existe                                  │
│                                                                   │
│  13. Gerar Novo Access Token                                     │
│                                                                   │
│  14. Retornar Token                                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  15. Atualizar Access Token                                      │
│                                                                   │
│  16. Reenviar Requisicao Original                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Fluxo de Transferencia de Ticket

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TRANSFERENCIA DE TICKET                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────┐
│ Agente Origem  │
└───────┬────────┘
        │ 1. Clica em Transferir
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  2. Mostrar Modal de Transferencia                               │
│     - Selecionar usuario destino OU                              │
│     - Selecionar departamento destino                            │
│     - Informar motivo                                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
        │ 3. POST /api/tickets/:id/transfer
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND                                      │
│                                                                   │
│  4. Validar Transferencia                                        │
│     - Verificar permissao do agente                              │
│     - Verificar destino valido                                   │
│                                                                   │
│  5. Atualizar Ticket                                             │
│     - Alterar userId (se usuario)                                │
│     - Alterar departmentId (se departamento)                     │
│     - Registrar TicketTransfer                                   │
│                                                                   │
│  6. Criar Activity                                               │
│     - Tipo: TICKET_TRANSFERRED                                   │
│     - Metadados: origem, destino, motivo                         │
│                                                                   │
│  7. Criar Mensagem Interna                                       │
│     - "Ticket transferido para X"                                │
│     - isInternal: true                                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SOCKET.IO                                     │
│                                                                   │
│  8. Notificar Agentes                                            │
│     - Emitir 'ticket:transferred' para origem                    │
│     - Emitir 'ticket:assigned' para destino                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  9. Atualizar UI                                                 │
│     - Remover ticket da lista do agente origem                   │
│     - Adicionar ticket na lista do agente destino                │
│     - Mostrar notificacao                                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Proximos Passos

- [Multi-tenancy](/arquitetura/multi-tenancy)
- [Seguranca](/arquitetura/seguranca)
- [Backend](/backend/visao-geral)
