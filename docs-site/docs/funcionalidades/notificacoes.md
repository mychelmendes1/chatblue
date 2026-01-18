---
sidebar_position: 9
title: Notificacoes
description: Sistema de notificacoes push e alertas do ChatBlue
---

# Notificacoes

O sistema de notificacoes do ChatBlue mantem usuarios informados sobre eventos importantes em tempo real, atraves de multiplos canais e com configuracoes personalizaveis.

## Visao Geral

O modulo de notificacoes oferece:

- **Notificacoes em tempo real** via WebSocket
- **Push notifications** no navegador
- **Notificacoes por email** (opcional)
- **Alertas de SLA** automaticos
- **Sons de alerta** configuraveis
- **Preferencias por usuario**

## Tipos de Notificacoes

### Categorias

| Categoria | Descricao | Urgencia |
|-----------|-----------|----------|
| **Novos Tickets** | Quando um novo ticket e criado ou atribuido | Alta |
| **Mensagens** | Novas mensagens recebidas | Alta |
| **SLA** | Alertas de prazo de SLA | Critica |
| **Transferencias** | Tickets transferidos para voce | Media |
| **Avaliacoes** | Feedback recebido de clientes | Baixa |
| **Sistema** | Atualizacoes e manutencoes | Variavel |

### Eventos de Notificacao

```typescript
enum NotificationEvent {
  // Tickets
  TICKET_CREATED = 'ticket:created',
  TICKET_ASSIGNED = 'ticket:assigned',
  TICKET_TRANSFERRED = 'ticket:transferred',
  TICKET_RESOLVED = 'ticket:resolved',
  TICKET_REOPENED = 'ticket:reopened',

  // Mensagens
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_INTERNAL = 'message:internal',

  // SLA
  SLA_WARNING = 'sla:warning',      // 50% do tempo
  SLA_URGENT = 'sla:urgent',        // 20% do tempo
  SLA_CRITICAL = 'sla:critical',    // 5% do tempo
  SLA_BREACHED = 'sla:breached',    // Violado

  // Avaliacoes
  RATING_RECEIVED = 'rating:received',
  RATING_NEGATIVE = 'rating:negative',  // < 3 estrelas

  // Sistema
  CONNECTION_STATUS = 'connection:status',
  SYSTEM_UPDATE = 'system:update'
}
```

## Interface do Usuario

### Central de Notificacoes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔔 Notificacoes                                    [Marcar todas como lidas]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Hoje                                                                        │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 🔴  SLA Critico - Ticket #2024-001234                       ha 2 min  │ │
│  │     Prazo de resposta em 3 minutos. Cliente: Joao Silva               │ │
│  │     [Ver Ticket]                                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 💬  Nova mensagem - Ticket #2024-001230                    ha 15 min  │ │
│  │     Maria Santos: "Ola, preciso de ajuda com..."                      │ │
│  │     [Responder]                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 📥  Ticket transferido - #2024-001228                      ha 30 min  │ │
│  │     Pedro Costa transferiu para voce                                  │ │
│  │     Motivo: "Cliente precisa de especialista"                         │ │
│  │     [Ver Ticket]                                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ⭐  Avaliacao recebida - Ticket #2024-001200               ha 1 hora  │ │
│  │     Cliente avaliou com 5 estrelas                                    │ │
│  │     "Excelente atendimento!"                                          │ │
│  │     [Ver Detalhes]                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Ontem                                                                       │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 🎫  Novo ticket atribuido - #2024-001195                  14/01 18:30 │ │
│  │     Cliente: Ana Lima | Departamento: Suporte                         │ │
│  │     [Ver Ticket]                                              [Lido]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [Ver mais notificacoes antigas]                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Icone de Notificacoes (Header)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ChatBlue          [Tickets] [Contatos] [Dashboard]        🔔 ⁵  [👤 Maria] │
│                                                            ─┬─              │
│                                                             │               │
│                                             Badge vermelho ─┘               │
│                                             indicando 5 nao lidas          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Dropdown Rapido

```
┌──────────────────────────────────┐
│  Notificacoes (5 novas)          │
├──────────────────────────────────┤
│                                  │
│  🔴 SLA Critico #2024-001234     │
│     3 min restantes | ha 2 min   │
│                                  │
│  💬 Nova msg #2024-001230        │
│     "Ola, preciso de..." | 15m   │
│                                  │
│  📥 Transferido #2024-001228     │
│     De: Pedro Costa | 30m        │
│                                  │
│  ⭐ Avaliacao 5★ #2024-001200    │
│     "Excelente!" | 1h            │
│                                  │
│  🎫 Novo ticket #2024-001195     │
│     Ana Lima | 18:30             │
│                                  │
├──────────────────────────────────┤
│  [Ver todas as notificacoes]     │
└──────────────────────────────────┘
```

## Configuracoes de Notificacao

### Preferencias do Usuario

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Preferencias de Notificacao                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Canais de Notificacao                                                       │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Browser  Push   Email   Som                    │ │
│  │ ──────────────────────────────────────────────────────────────────    │ │
│  │ Novos tickets          [x]     [x]     [ ]     [x]                   │ │
│  │ Mensagens recebidas    [x]     [x]     [ ]     [x]                   │ │
│  │ Alertas de SLA         [x]     [x]     [x]     [x]                   │ │
│  │ Transferencias         [x]     [x]     [ ]     [x]                   │ │
│  │ Avaliacoes             [x]     [ ]     [ ]     [ ]                   │ │
│  │ Sistema                [x]     [ ]     [x]     [ ]                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Horario de Silencio (Nao Perturbe)                                          │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  [x] Ativar horario de silencio                                             │
│                                                                              │
│  Das: [22:00 ▼]  Ate: [08:00 ▼]                                             │
│                                                                              │
│  [ ] Incluir fins de semana                                                  │
│  [ ] Silenciar tambem alertas de SLA critico                                │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Sons                                                                        │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  Som de notificacao:                                                         │
│  ┌─────────────────────────────────┐                                        │
│  │ Padrao (ding)              ▼   │  [▶ Testar]                            │
│  └─────────────────────────────────┘                                        │
│                                                                              │
│  Som de SLA critico:                                                         │
│  ┌─────────────────────────────────┐                                        │
│  │ Urgente (alarme)           ▼   │  [▶ Testar]                            │
│  └─────────────────────────────────┘                                        │
│                                                                              │
│  Volume: [──────●────────────] 70%                                          │
│                                                                              │
│  [Salvar Preferencias]                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementacao Tecnica

### Arquitetura de Notificacoes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                              EVENTO                                          │
│                           (Ex: Novo ticket)                                 │
│                                 │                                           │
│                                 ▼                                           │
│                        ┌─────────────┐                                      │
│                        │ Notification│                                      │
│                        │   Service   │                                      │
│                        └──────┬──────┘                                      │
│                               │                                              │
│              ┌────────────────┼────────────────┐                            │
│              │                │                │                            │
│              ▼                ▼                ▼                            │
│       ┌───────────┐   ┌───────────┐   ┌───────────┐                        │
│       │  Socket.io│   │   Push    │   │   Email   │                        │
│       │  (Browser)│   │ (Service  │   │  Service  │                        │
│       │           │   │  Worker)  │   │           │                        │
│       └─────┬─────┘   └─────┬─────┘   └─────┬─────┘                        │
│             │               │               │                               │
│             ▼               ▼               ▼                               │
│       ┌───────────┐   ┌───────────┐   ┌───────────┐                        │
│       │  Frontend │   │  Browser  │   │   SMTP    │                        │
│       │    App    │   │   Push    │   │  Server   │                        │
│       └───────────┘   └───────────┘   └───────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NotificationService

```typescript
class NotificationService {
  async notify(event: NotificationEvent, data: NotificationData) {
    // 1. Identificar destinatarios
    const recipients = await this.getRecipients(event, data);

    // 2. Verificar preferencias de cada usuario
    for (const user of recipients) {
      const prefs = await this.getUserPreferences(user.id);

      // 3. Verificar horario de silencio
      if (this.isQuietHours(prefs)) {
        if (!this.isCriticalSLA(event)) {
          continue; // Pular notificacao
        }
      }

      // 4. Enviar por cada canal habilitado
      if (prefs.browser) {
        await this.sendBrowserNotification(user, event, data);
      }

      if (prefs.push) {
        await this.sendPushNotification(user, event, data);
      }

      if (prefs.email) {
        await this.sendEmailNotification(user, event, data);
      }

      if (prefs.sound) {
        await this.triggerSound(user, event);
      }
    }

    // 5. Registrar no banco
    await this.saveNotification(event, data, recipients);
  }

  private async getRecipients(
    event: NotificationEvent,
    data: NotificationData
  ): Promise<User[]> {
    switch (event) {
      case NotificationEvent.TICKET_CREATED:
        // Todos os agentes do departamento
        return this.getDepartmentAgents(data.departmentId);

      case NotificationEvent.TICKET_ASSIGNED:
        // Apenas o agente atribuido
        return [await this.getUser(data.userId)];

      case NotificationEvent.SLA_BREACHED:
        // Agente + Supervisor + Admin
        return this.getEscalationChain(data.ticketId);

      // ... outros eventos
    }
  }
}
```

### Socket.io (Tempo Real)

```typescript
// Backend - Emitir notificacao
class SocketService {
  emitNotification(userId: string, notification: Notification) {
    const socket = this.getUserSocket(userId);
    if (socket) {
      socket.emit('notification', {
        id: notification.id,
        type: notification.event,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt
      });
    }
  }
}

// Frontend - Receber notificacao
socket.on('notification', (notification) => {
  // Adicionar a lista
  notificationStore.add(notification);

  // Mostrar toast
  showToast(notification);

  // Tocar som
  if (userPrefs.sound) {
    playNotificationSound(notification.type);
  }
});
```

### Push Notifications (Service Worker)

```typescript
// Registrar Service Worker
async function registerPushNotifications() {
  const registration = await navigator.serviceWorker.register('/sw.js');

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY
  });

  // Salvar subscription no backend
  await api.post('/users/me/push-subscription', subscription);
}

// Service Worker - sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: data.message,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.id,
    data: {
      url: data.url
    },
    actions: [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Ignorar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    clients.openWindow(event.notification.data.url);
  }
});
```

### Email Notifications

```typescript
class EmailNotificationService {
  async send(user: User, notification: Notification) {
    const template = this.getTemplate(notification.event);

    await this.emailService.send({
      to: user.email,
      subject: notification.title,
      html: template.render({
        userName: user.name,
        ...notification.data
      })
    });
  }

  private getTemplate(event: NotificationEvent): EmailTemplate {
    const templates = {
      [NotificationEvent.SLA_BREACHED]: 'sla-breach',
      [NotificationEvent.RATING_NEGATIVE]: 'negative-rating',
      [NotificationEvent.SYSTEM_UPDATE]: 'system-update'
      // ...
    };

    return this.loadTemplate(templates[event]);
  }
}
```

## Alertas de SLA

### Fluxo de Alertas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Ticket Criado                                                             │
│   SLA: 15 minutos                                                           │
│        │                                                                    │
│        │                                                                    │
│    ────┼───────────────────────────────────────────────────────────────►   │
│        │     │          │         │        │                     Tempo      │
│    0 min   7.5min     12min     14min    15min                             │
│             │          │         │        │                                 │
│             │          │         │        └── 🔴 SLA VIOLADO               │
│             │          │         │            Notifica: Todos + Email      │
│             │          │         │                                          │
│             │          │         └── ⚠️ SLA CRITICO (5%)                   │
│             │          │             Notifica: Agente + Supervisor          │
│             │          │             Som: Alarme                            │
│             │          │                                                    │
│             │          └── ⚠️ SLA URGENTE (20%)                            │
│             │              Notifica: Agente + Supervisor                    │
│             │                                                               │
│             └── ℹ️ SLA WARNING (50%)                                       │
│                 Notifica: Agente                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Notificacao de SLA

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  🔴 ALERTA: SLA Critico                                         │
│  ───────────────────────────────────────────────────────────    │
│                                                                 │
│  Ticket #2024-001234 esta proximo de violar o SLA!             │
│                                                                 │
│  Cliente: Joao Silva                                            │
│  Departamento: Suporte                                          │
│  Prioridade: Alta                                               │
│                                                                 │
│  Tempo restante: 3 minutos                                      │
│  SLA: Primeira Resposta (15 min)                                │
│                                                                 │
│  [Ver Ticket]    [Assumir]    [Transferir]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Sons de Notificacao

### Sons Disponiveis

| Som | Arquivo | Uso |
|-----|---------|-----|
| Padrao | `ding.mp3` | Notificacoes gerais |
| Mensagem | `message.mp3` | Nova mensagem |
| Alarme | `alarm.mp3` | SLA critico |
| Sucesso | `success.mp3` | Avaliacao positiva |
| Atencao | `attention.mp3` | Transferencia |

### Implementacao

```typescript
class SoundService {
  private sounds: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    const soundFiles = {
      default: '/sounds/ding.mp3',
      message: '/sounds/message.mp3',
      alarm: '/sounds/alarm.mp3',
      success: '/sounds/success.mp3',
      attention: '/sounds/attention.mp3'
    };

    for (const [name, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    }
  }

  play(soundName: string, volume: number = 0.7) {
    const audio = this.sounds.get(soundName);
    if (audio) {
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play();
    }
  }

  getSoundForEvent(event: NotificationEvent): string {
    const soundMap = {
      [NotificationEvent.MESSAGE_RECEIVED]: 'message',
      [NotificationEvent.SLA_CRITICAL]: 'alarm',
      [NotificationEvent.SLA_BREACHED]: 'alarm',
      [NotificationEvent.RATING_RECEIVED]: 'success',
      [NotificationEvent.TICKET_TRANSFERRED]: 'attention'
    };

    return soundMap[event] || 'default';
  }
}
```

## Modelo de Dados

### Notificacao

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  companyId String
  event     String                       // Tipo do evento
  title     String                       // Titulo da notificacao
  message   String                       // Mensagem
  data      Json?                        // Dados adicionais
  isRead    Boolean  @default(false)
  readAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, isRead])
  @@index([createdAt])
}
```

### Preferencias do Usuario

```prisma
model UserNotificationPreferences {
  id        String @id @default(uuid())
  userId    String @unique

  // Canais por tipo
  ticketsBrowser   Boolean @default(true)
  ticketsPush      Boolean @default(true)
  ticketsEmail     Boolean @default(false)
  ticketsSound     Boolean @default(true)

  messagesBrowser  Boolean @default(true)
  messagesPush     Boolean @default(true)
  messagesEmail    Boolean @default(false)
  messagesSound    Boolean @default(true)

  slaBrowser       Boolean @default(true)
  slaPush          Boolean @default(true)
  slaEmail         Boolean @default(true)
  slaSound         Boolean @default(true)

  transferBrowser  Boolean @default(true)
  transferPush     Boolean @default(true)
  transferEmail    Boolean @default(false)
  transferSound    Boolean @default(true)

  ratingBrowser    Boolean @default(true)
  ratingPush       Boolean @default(false)
  ratingEmail      Boolean @default(false)
  ratingSound      Boolean @default(false)

  // Horario de silencio
  quietHoursEnabled Boolean @default(false)
  quietHoursStart   String?  // "22:00"
  quietHoursEnd     String?  // "08:00"
  quietWeekends     Boolean @default(false)
  quietExceptSLA    Boolean @default(true)

  // Som
  soundVolume       Float @default(0.7)
  defaultSound      String @default("ding")
  slaSound          String @default("alarm")

  user User @relation(fields: [userId], references: [id])
}
```

## Casos de Uso

### 1. Agente Recebe Novo Ticket

**Cenario**: Ticket e criado e atribuido automaticamente.

```
1. Cliente envia mensagem
2. Sistema cria ticket
3. Auto-assign atribui a Maria
4. NotificationService notifica Maria:
   - Socket.io: Atualiza interface
   - Push: "Novo ticket atribuido"
   - Som: "ding"
5. Maria ve notificacao e assume
```

### 2. Alerta de SLA Escalonado

**Cenario**: Ticket perto de violar SLA.

```
1. Job verifica SLAs a cada minuto
2. Ticket #1234 com 3 min restantes (< 5%)
3. Classificado como CRITICO
4. NotificationService:
   - Notifica agente atribuido
   - Notifica supervisor
   - Som de alarme
   - Email para supervisor
5. Supervisor intervem
```

### 3. Usuario em Horario de Silencio

**Cenario**: Notificacao durante DND.

```
1. Nova mensagem recebida as 23:00
2. Usuario tem quiet hours 22:00-08:00
3. Verifica se e SLA critico: NAO
4. Notificacao suprimida
5. Aparece na central quando acessar
```

### 4. Avaliacao Negativa

**Cenario**: Cliente avalia com 2 estrelas.

```
1. Cliente envia avaliacao 2/5
2. Sistema detecta avaliacao negativa
3. NotificationService:
   - Notifica agente que atendeu
   - Notifica supervisor por email
   - Cria alerta especial
4. Supervisor pode intervir
```

## Integracao com Outras Funcionalidades

### Tickets

- Notifica criacao, atribuicao, transferencia
- Integra com eventos de status
- Acao direta da notificacao

### SLA

- Alertas automaticos em niveis
- Escalacao progressiva
- Notificacao de violacao

### Chat

- Alerta de nova mensagem
- Preview do conteudo
- Som de mensagem

### Usuarios

- Preferencias individuais
- Horario de silencio
- Canais preferidos

### Departamentos

- Notifica membros do departamento
- Gerentes recebem escalacoes
- Filtro por departamento

## Boas Praticas

### Para Usuarios

1. **Configure preferencias** - Ajuste canais por tipo
2. **Use horario de silencio** - Evite interrupcoes
3. **Mantenha push ativo** - Para alertas importantes
4. **Ajuste volume** - Encontre nivel adequado

### Para Administradores

1. **Configure padrao sensato** - Defaults para novos usuarios
2. **Habilite email para SLA** - Garantia de entrega
3. **Monitore entregas** - Verifique se notificacoes chegam
4. **Documente sons** - Equipe conhece significado

### Para Performance

1. **Limite frequencia** - Evite flood de notificacoes
2. **Agrupe similares** - "5 novas mensagens" vs 5 notificacoes
3. **Priorize criticas** - SLA sempre notifica
4. **Limpeza periodica** - Remova notificacoes antigas

## Proximos Passos

- [SLA e Metricas](/funcionalidades/sla-metricas) - Configuracao de SLA
- [Usuarios](/funcionalidades/usuarios) - Gerenciamento de usuarios
- [Chat](/funcionalidades/chat) - Interface de atendimento
