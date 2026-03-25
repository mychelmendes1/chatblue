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

## Fluxo de Mensagem Recebida via Email (IMAP)

Quando um cliente envia um email para a empresa:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MENSAGEM RECEBIDA VIA EMAIL                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Cliente    │
│  (Email)     │
└──────┬───────┘
       │ 1. Cliente envia email
       ▼
┌──────────────┐
│   Servidor   │
│   IMAP       │
└──────┬───────┘
       │ 2. Email fica na caixa de entrada
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   JOB BULLMQ: IMAP POLLING                       │
│                   (Executa a cada 30 segundos)                   │
│                                                                   │
│  3. Conectar ao servidor IMAP via credenciais da empresa         │
│     - Host, porta, usuario, senha configurados por empresa       │
│                                                                   │
│  4. Buscar emails nao lidos (UNSEEN)                             │
│     - Filtra por data desde ultimo check                         │
│     - Marca como lido apos processar                             │
│                                                                   │
│  5. Para cada email novo:                                        │
│     - Extrair remetente, assunto, corpo (text/html)              │
│     - Extrair anexos se houver                                   │
│     - Normalizar dados para formato interno                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   MESSAGE PROCESSOR                               │
│                                                                   │
│  6. Busca/Cria Contato                                           │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Busca por endereco de email + companyId               │ │
│     │ - Se nao existe, cria novo contato com channel EMAIL    │ │
│     │ - Atualiza lastMessageAt                                │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
│  7. Busca/Cria Ticket                                            │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Busca ticket aberto para o contato (canal EMAIL)      │ │
│     │ - Se nao existe, cria novo com assunto do email         │ │
│     │ - Canal: EMAIL                                          │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
│  8. Persiste Mensagem                                            │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Cria registro com corpo do email                      │ │
│     │ - Salva anexos como media                               │ │
│     │ - Armazena headers originais para reply threading       │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SOCKET.IO                                     │
│                                                                   │
│  9. Notificar Frontend                                           │
│     - Emitir 'message:received' com dados do email               │
│     - Emitir 'ticket:updated' ou 'ticket:created'               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Fluxo de Resposta via Email (SMTP)

Quando um agente responde a um ticket de email:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RESPOSTA ENVIADA VIA EMAIL                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Agente     │
│  (Browser)   │
└──────┬───────┘
       │ 1. Digita resposta e clica Enviar
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND                                     │
│                                                                   │
│  2. Validar mensagem e enviar requisicao                         │
│     POST /api/messages/ticket/:ticketId/send                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND                                      │
│                                                                   │
│  3. Persistir mensagem no banco                                  │
│                                                                   │
│  4. Detectar canal do ticket (EMAIL)                             │
│     - Redirecionar para EmailService ao inves de WhatsApp        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   EMAIL SERVICE (SMTP)                            │
│                                                                   │
│  5. Montar email de resposta                                     │
│     - Usar headers In-Reply-To e References para threading       │
│     - Formatar corpo em HTML                                     │
│     - Anexar arquivos se houver                                  │
│                                                                   │
│  6. Enviar via SMTP                                              │
│     - Conectar ao servidor SMTP da empresa                       │
│     - Enviar email formatado                                     │
│     - Aguardar confirmacao                                       │
│                                                                   │
│  7. Atualizar status da mensagem                                 │
│     - SENT se enviado com sucesso                                │
│     - FAILED se erro no envio                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SOCKET.IO                                     │
│                                                                   │
│  8. Notificar agentes sobre status do envio                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Fluxo de Mensagem Recebida via Instagram

Quando um cliente envia mensagem direta no Instagram:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MENSAGEM RECEBIDA VIA INSTAGRAM                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Cliente    │
│ (Instagram)  │
└──────┬───────┘
       │ 1. Cliente envia DM no Instagram
       ▼
┌──────────────┐
│   Meta       │
│   Servers    │
└──────┬───────┘
       │ 2. Webhook POST para /webhooks/instagram
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   WEBHOOK HANDLER                                 │
│                                                                   │
│  3. Validar assinatura do webhook                                │
│     - Verificar X-Hub-Signature-256 com app secret               │
│     - Rejeitar se assinatura invalida                            │
│                                                                   │
│  4. Parsear payload do webhook                                   │
│     - Extrair messaging events                                   │
│     - Identificar tipo: message, postback, reaction              │
│     - Extrair sender ID, texto, midia                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   MESSAGE PROCESSOR                               │
│                                                                   │
│  5. Busca/Cria Contato                                           │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Busca por Instagram sender ID + companyId             │ │
│     │ - Se nao existe, busca perfil via Graph API             │ │
│     │ - Cria contato com nome e foto do perfil                │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
│  6. Busca/Cria Ticket                                            │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Busca ticket aberto para o contato (canal INSTAGRAM)  │ │
│     │ - Se nao existe, cria novo ticket                       │ │
│     │ - Canal: INSTAGRAM                                      │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
│  7. Persiste Mensagem                                            │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ - Cria registro no banco                                │ │
│     │ - Salva midia (imagem, video, audio) se houver          │ │
│     │ - Atualiza status do ticket                             │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              DECISAO: AI ATIVO? (mesmo fluxo WhatsApp)           │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SOCKET.IO                                     │
│                                                                   │
│  8. Notificar Frontend                                           │
│     - Emitir 'message:received'                                  │
│     - Emitir 'ticket:updated' ou 'ticket:created'               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Fluxo de Resposta via Instagram

Quando um agente responde a um ticket de Instagram:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RESPOSTA ENVIADA VIA INSTAGRAM                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Agente     │
│  (Browser)   │
└──────┬───────┘
       │ 1. Responde no ticket
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND                                      │
│                                                                   │
│  2. Persistir mensagem no banco                                  │
│                                                                   │
│  3. Detectar canal do ticket (INSTAGRAM)                         │
│     - Redirecionar para InstagramService                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                 INSTAGRAM SERVICE                                 │
│                                                                   │
│  4. Enviar via Meta Graph API                                    │
│     POST https://graph.facebook.com/v18.0/me/messages            │
│     {                                                             │
│       recipient: { id: instagramSenderId },                      │
│       message: { text: "resposta do agente" }                    │
│     }                                                             │
│                                                                   │
│  5. Atualizar status da mensagem                                 │
│     - SENT se API retornou sucesso                               │
│     - FAILED se erro na API                                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SOCKET.IO                                     │
│                                                                   │
│  6. Notificar agentes sobre status do envio                      │
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
