---
sidebar_position: 3
title: Services
description: Servicos de negocio do ChatBlue
---

# Services

Os services encapsulam a logica de negocio do ChatBlue, separando-a das rotas e controllers.

## Estrutura

```
apps/api/src/services/
├── ai/
│   ├── ai.service.ts
│   ├── context-builder.service.ts
│   ├── personality.service.ts
│   ├── transcription.service.ts
│   ├── transfer-analyzer.service.ts
│   └── guardrails.service.ts
│
├── whatsapp/
│   ├── whatsapp.service.ts
│   ├── baileys.service.ts
│   └── meta-cloud.service.ts
│
├── message-processor.service.ts
├── notion.service.ts
├── sla.service.ts
├── email.service.ts
├── push.service.ts
└── upload.service.ts
```

## WhatsApp Services

### WhatsAppService

Servico principal que roteia para Baileys ou Meta Cloud:

```typescript
class WhatsAppService {
  async sendMessage(
    companyId: string,
    connectionId: string,
    to: string,
    message: SendMessageDto
  ) {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: { id: connectionId, companyId },
    });

    if (!connection) {
      throw new NotFoundError('Conexao nao encontrada');
    }

    switch (connection.type) {
      case 'BAILEYS':
        return this.baileysService.sendMessage(connection, to, message);
      case 'META_CLOUD':
        return this.metaCloudService.sendMessage(connection, to, message);
      default:
        throw new Error('Tipo de conexao nao suportado');
    }
  }

  async getConnection(companyId: string) {
    // Buscar conexao padrao ou primeira conectada
    return prisma.whatsAppConnection.findFirst({
      where: {
        companyId,
        status: 'CONNECTED',
      },
      orderBy: [
        { isDefault: 'desc' },
        { lastConnectedAt: 'desc' },
      ],
    });
  }
}
```

### BaileysService

Gerencia conexoes nao-oficiais via Baileys:

```typescript
class BaileysService {
  private connections: Map<string, WASocket> = new Map();

  async connect(connectionId: string) {
    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: connectionId },
    });

    const { state, saveCreds } = await useMultiFileAuthState(
      `./sessions/${connectionId}`
    );

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    });

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Salvar QR code
        await prisma.whatsAppConnection.update({
          where: { id: connectionId },
          data: { qrCode: qr, status: 'CONNECTING' },
        });
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;

        if (shouldReconnect) {
          this.connect(connectionId);
        }
      }

      if (connection === 'open') {
        await prisma.whatsAppConnection.update({
          where: { id: connectionId },
          data: {
            status: 'CONNECTED',
            qrCode: null,
            lastConnectedAt: new Date(),
          },
        });
      }
    });

    socket.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key.fromMe) {
          await this.messageProcessor.process(connectionId, msg);
        }
      }
    });

    socket.ev.on('creds.update', saveCreds);

    this.connections.set(connectionId, socket);
    return socket;
  }

  async sendMessage(
    connection: WhatsAppConnection,
    to: string,
    message: SendMessageDto
  ) {
    const socket = this.connections.get(connection.id);
    if (!socket) {
      throw new Error('Conexao nao disponivel');
    }

    const jid = `${to}@s.whatsapp.net`;

    let content: AnyMessageContent;

    switch (message.type) {
      case 'TEXT':
        content = { text: message.content };
        break;
      case 'IMAGE':
        content = {
          image: { url: message.mediaUrl },
          caption: message.content,
        };
        break;
      case 'AUDIO':
        content = {
          audio: { url: message.mediaUrl },
          ptt: true,
        };
        break;
      // ... outros tipos
    }

    const result = await socket.sendMessage(jid, content);
    return result;
  }
}
```

### MetaCloudService

Gerencia conexoes oficiais via Meta Cloud API:

```typescript
class MetaCloudService {
  async sendMessage(
    connection: WhatsAppConnection,
    to: string,
    message: SendMessageDto
  ) {
    const url = `https://graph.facebook.com/v18.0/${connection.phoneNumberId}/messages`;

    const body = this.buildMessageBody(to, message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar mensagem');
    }

    return response.json();
  }

  private buildMessageBody(to: string, message: SendMessageDto) {
    const base = {
      messaging_product: 'whatsapp',
      to,
    };

    switch (message.type) {
      case 'TEXT':
        return {
          ...base,
          type: 'text',
          text: { body: message.content },
        };
      case 'IMAGE':
        return {
          ...base,
          type: 'image',
          image: {
            link: message.mediaUrl,
            caption: message.content,
          },
        };
      // ... outros tipos
    }
  }

  async processWebhook(connectionId: string, body: WebhookBody) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      for (const msg of value.messages) {
        await this.messageProcessor.process(connectionId, msg);
      }
    }

    if (value?.statuses) {
      for (const status of value.statuses) {
        await this.updateMessageStatus(status);
      }
    }
  }
}
```

## AI Services

### AIService

Servico principal de IA:

```typescript
class AIService {
  async generateResponse(
    companyId: string,
    ticketId: string,
    message: Message
  ): Promise<string> {
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!settings?.aiApiKey) {
      throw new Error('IA nao configurada');
    }

    // Construir contexto
    const context = await this.contextBuilder.build(ticketId);

    // Aplicar personalidade
    const systemPrompt = this.personalityService.buildPrompt(settings);

    // Verificar guardrails
    if (settings.aiGuardrails) {
      const isAllowed = await this.guardrailsService.check(message.content);
      if (!isAllowed) {
        return 'Desculpe, nao posso ajudar com esse assunto.';
      }
    }

    // Gerar resposta
    let response: string;

    if (settings.aiProvider === 'openai') {
      response = await this.generateOpenAI(settings, systemPrompt, context, message);
    } else if (settings.aiProvider === 'anthropic') {
      response = await this.generateAnthropic(settings, systemPrompt, context, message);
    }

    // Verificar se precisa transferir
    const shouldTransfer = await this.transferAnalyzer.analyze(
      ticketId,
      message.content,
      response
    );

    if (shouldTransfer) {
      await this.transferToHuman(ticketId);
    }

    return response;
  }

  private async generateOpenAI(
    settings: CompanySettings,
    systemPrompt: string,
    context: Context,
    message: Message
  ): Promise<string> {
    const openai = new OpenAI({ apiKey: settings.aiApiKey });

    const response = await openai.chat.completions.create({
      model: settings.aiModel || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...context.messages.map(m => ({
          role: m.isFromContact ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message.content },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content;
  }

  private async generateAnthropic(
    settings: CompanySettings,
    systemPrompt: string,
    context: Context,
    message: Message
  ): Promise<string> {
    const anthropic = new Anthropic({ apiKey: settings.aiApiKey });

    const response = await anthropic.messages.create({
      model: settings.aiModel || 'claude-3-5-sonnet-20240620',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...context.messages.map(m => ({
          role: m.isFromContact ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message.content },
      ],
    });

    return response.content[0].text;
  }
}
```

### ContextBuilderService

Constroi contexto para a IA:

```typescript
class ContextBuilderService {
  async build(ticketId: string): Promise<Context> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        company: {
          include: { settings: true },
        },
      },
    });

    // Buscar base de conhecimento relevante
    const knowledge = await prisma.knowledgeBase.findMany({
      where: {
        companyId: ticket.companyId,
        isActive: true,
      },
      take: 5,
    });

    // Buscar FAQs relevantes
    const faqs = await prisma.faq.findMany({
      where: {
        companyId: ticket.companyId,
        isActive: true,
      },
      take: 10,
    });

    return {
      contact: {
        name: ticket.contact.name,
        phone: ticket.contact.phone,
        isClient: ticket.contact.notionClientStatus === 'CLIENT',
        clientSince: ticket.contact.notionClientSince,
      },
      messages: ticket.messages.reverse(),
      knowledge: knowledge.map(k => k.content),
      faqs: faqs.map(f => ({ q: f.question, a: f.answer })),
      ticketInfo: {
        protocol: ticket.protocol,
        department: ticket.department?.name,
        createdAt: ticket.createdAt,
      },
    };
  }
}
```

### TranscriptionService

Transcreve audio para texto:

```typescript
class TranscriptionService {
  async transcribe(audioUrl: string): Promise<string> {
    const settings = await this.getSettings();

    if (!settings.whisperApiKey) {
      throw new Error('Whisper nao configurado');
    }

    // Baixar audio
    const response = await fetch(audioUrl);
    const audioBuffer = await response.arrayBuffer();

    // Enviar para Whisper
    const openai = new OpenAI({ apiKey: settings.whisperApiKey });

    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' }),
      model: 'whisper-1',
      language: 'pt',
    });

    return transcription.text;
  }
}
```

## MessageProcessorService

Processa mensagens recebidas:

```typescript
class MessageProcessorService {
  async process(connectionId: string, rawMessage: RawMessage) {
    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: connectionId },
      include: { company: true },
    });

    // Normalizar telefone
    const phone = this.normalizePhone(rawMessage.from);

    // Buscar ou criar contato
    const contact = await this.getOrCreateContact(
      connection.companyId,
      phone,
      rawMessage.pushName
    );

    // Buscar ou criar ticket
    const ticket = await this.getOrCreateTicket(
      connection.companyId,
      contact.id
    );

    // Processar tipo de mensagem
    const messageData = await this.parseMessage(rawMessage);

    // Transcrever audio se necessario
    if (messageData.type === 'AUDIO') {
      messageData.transcription = await this.transcriptionService.transcribe(
        messageData.mediaUrl
      );
    }

    // Salvar mensagem
    const message = await prisma.message.create({
      data: {
        companyId: connection.companyId,
        ticketId: ticket.id,
        wamid: rawMessage.id,
        type: messageData.type,
        content: messageData.content,
        mediaUrl: messageData.mediaUrl,
        transcription: messageData.transcription,
        status: 'DELIVERED',
      },
    });

    // Notificar via Socket.io
    this.socketService.emitToCompany(connection.companyId, 'message:received', {
      message,
      ticket,
    });

    // Processar com IA se configurado
    if (ticket.isAIHandled) {
      await this.processWithAI(ticket, message);
    }

    return message;
  }

  private async getOrCreateContact(
    companyId: string,
    phone: string,
    name?: string
  ) {
    let contact = await prisma.contact.findUnique({
      where: { companyId_phone: { companyId, phone } },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          companyId,
          phone,
          name,
        },
      });

      // Sincronizar com Notion
      await this.notionService.syncContact(contact);
    }

    return contact;
  }

  private async getOrCreateTicket(companyId: string, contactId: string) {
    // Buscar ticket aberto
    let ticket = await prisma.ticket.findFirst({
      where: {
        companyId,
        contactId,
        status: { notIn: ['CLOSED', 'RESOLVED'] },
      },
    });

    if (!ticket) {
      // Verificar configuracoes
      const settings = await prisma.companySettings.findUnique({
        where: { companyId },
      });

      ticket = await prisma.ticket.create({
        data: {
          companyId,
          contactId,
          protocol: generateProtocol(),
          isAIHandled: settings?.aiApiKey ? true : false,
          departmentId: settings?.defaultDepartmentId,
        },
      });
    }

    return ticket;
  }
}
```

## SLAService

Gerencia SLA:

```typescript
class SLAService {
  async calculateDeadline(ticket: Ticket): Promise<Date> {
    const config = await this.getConfig(ticket.companyId, ticket.departmentId);

    const now = new Date();
    const deadline = addMinutes(now, config.firstResponseTime);

    // Ajustar para horario comercial
    return this.adjustToBusinessHours(deadline, config.businessHours);
  }

  async checkSLABreach() {
    const breachedTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        slaDeadline: { lt: new Date() },
        firstResponseAt: null,
      },
      include: {
        company: true,
        user: true,
      },
    });

    for (const ticket of breachedTickets) {
      // Criar atividade
      await prisma.activity.create({
        data: {
          companyId: ticket.companyId,
          ticketId: ticket.id,
          type: 'SLA_BREACH',
          metadata: {
            deadline: ticket.slaDeadline,
            breachedAt: new Date(),
          },
        },
      });

      // Notificar
      this.notificationService.notifySLABreach(ticket);
    }
  }

  async getMetrics(companyId: string, period: DateRange) {
    const tickets = await prisma.ticket.findMany({
      where: {
        companyId,
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
    });

    const total = tickets.length;
    const withinSLA = tickets.filter(t =>
      t.firstResponseAt && t.firstResponseAt <= t.slaDeadline
    ).length;

    return {
      total,
      withinSLA,
      breached: total - withinSLA,
      complianceRate: total > 0 ? (withinSLA / total) * 100 : 100,
      avgFirstResponseTime: this.calculateAverage(
        tickets.map(t => t.responseTime).filter(Boolean)
      ),
      avgResolutionTime: this.calculateAverage(
        tickets.map(t => t.resolutionTime).filter(Boolean)
      ),
    };
  }
}
```

## NotionService

Integracao com Notion:

```typescript
class NotionService {
  async syncContact(contact: Contact) {
    const settings = await prisma.companySettings.findUnique({
      where: { companyId: contact.companyId },
    });

    if (!settings?.notionEnabled || !settings?.notionApiKey) {
      return;
    }

    const notion = new Client({ auth: settings.notionApiKey });

    // Buscar na base do Notion
    const response = await notion.databases.query({
      database_id: settings.notionDatabaseId,
      filter: {
        or: [
          {
            property: 'Telefone',
            phone_number: { equals: contact.phone },
          },
          {
            property: 'Email',
            email: { equals: contact.email },
          },
        ],
      },
    });

    if (response.results.length > 0) {
      const page = response.results[0];

      // Extrair dados
      const clientStatus = this.extractProperty(page, 'Status');
      const clientSince = this.extractProperty(page, 'Cliente Desde');

      // Atualizar contato
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          notionPageId: page.id,
          notionClientStatus: clientStatus,
          notionClientSince: clientSince,
        },
      });
    }
  }

  async testConnection(apiKey: string, databaseId: string) {
    try {
      const notion = new Client({ auth: apiKey });

      await notion.databases.retrieve({
        database_id: databaseId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

## Proximos Passos

- [Middlewares](/backend/middlewares)
- [WebSocket](/backend/websocket)
- [Jobs](/backend/jobs)
