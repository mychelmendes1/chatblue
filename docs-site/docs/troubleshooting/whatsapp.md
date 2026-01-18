---
sidebar_position: 3
title: Problemas de WhatsApp
description: Resolucao de problemas de conexao e integracao com WhatsApp
---

# Problemas de WhatsApp

Este guia aborda os problemas mais comuns relacionados a integracao com WhatsApp no ChatBlue usando a biblioteca Baileys.

## Visao Geral da Integracao

O ChatBlue usa a biblioteca Baileys para conectar ao WhatsApp Web. A conexao funciona atraves de:

1. **QR Code**: Escaneado para autenticacao inicial
2. **Sessao**: Dados salvos em `/var/www/chatblue/sessions/`
3. **WebSocket**: Conexao persistente com servidores do WhatsApp

## Problemas de Conexao

### QR Code nao aparece

**Sintomas:**
- Tela de conexao vazia
- Timeout ao gerar QR Code

**Solucoes:**
```bash
# Verificar logs do backend
pm2 logs chatblue-api --lines 50 | grep -i whatsapp

# Verificar se a sessao antiga esta corrompida
ls -la /var/www/chatblue/sessions/

# Remover sessao corrompida
rm -rf /var/www/chatblue/sessions/session-*

# Reiniciar aplicacao
pm2 restart chatblue-api

# Tentar gerar novo QR Code
```

**Verificar no codigo:**
```typescript
// Verificar se o evento 'qr' esta sendo emitido
client.on('qr', (qr) => {
  console.log('QR Code recebido:', qr.substring(0, 50));
  // Emitir via WebSocket para o frontend
});
```

### Conexao desconecta frequentemente

**Sintomas:**
- Status "Desconectado" aparece frequentemente
- Mensagens nao sao enviadas/recebidas

**Causas e Solucoes:**

1. **Problema de rede:**
```bash
# Verificar conectividade
ping -c 10 web.whatsapp.com

# Verificar DNS
dig web.whatsapp.com

# Verificar latencia
traceroute web.whatsapp.com
```

2. **Timeout de WebSocket:**
```typescript
// Ajustar configuracao do Baileys
const client = makeWASocket({
  connectTimeoutMs: 60000,
  keepAliveIntervalMs: 30000,
  retryRequestDelayMs: 500,
});
```

3. **Conflito de sessao (outro dispositivo):**
```bash
# Verificar se o WhatsApp Web esta aberto em outro lugar
# Desconectar outros dispositivos no app do celular:
# WhatsApp > Dispositivos conectados > Sair de todos

# Depois, reconectar no ChatBlue
```

4. **Sessao expirada:**
```bash
# Limpar sessao e reconectar
rm -rf /var/www/chatblue/sessions/session-EMPRESA_ID
pm2 restart chatblue-api
```

### Erro: Connection Closed

**Sintomas:**
```
Error: Connection Closed
DisconnectReason: connectionClosed
```

**Solucoes:**
```typescript
// Implementar reconexao automatica
client.on('connection.update', async (update) => {
  const { connection, lastDisconnect } = update;

  if (connection === 'close') {
    const reason = lastDisconnect?.error?.output?.statusCode;

    // Reconectar automaticamente (exceto se foi logout)
    if (reason !== DisconnectReason.loggedOut) {
      console.log('Reconectando em 5 segundos...');
      setTimeout(() => startWhatsAppConnection(), 5000);
    } else {
      console.log('Logout detectado, limpando sessao...');
      await clearSession();
    }
  }
});
```

### Erro: QR Timeout

**Sintomas:**
```
Error: QR refs attempts ended
```

**Solucoes:**
```bash
# O usuario demorou muito para escanear o QR
# Gerar novo QR Code

# Verificar se o celular tem conexao com internet
# Verificar se a camera do celular esta funcionando
# Tentar com boa iluminacao
```

```typescript
// Aumentar tentativas de QR
const client = makeWASocket({
  qrTimeout: 60000,  // 60 segundos por QR
  maxQRRetries: 10,  // Ate 10 tentativas
});
```

## Problemas de Mensagens

### Mensagens nao sao recebidas

**Solucoes:**
```bash
# Verificar se o evento de mensagem esta configurado
pm2 logs chatblue-api | grep -i "message"

# Verificar conexao do WebSocket
pm2 logs chatblue-api | grep -i "socket"
```

```typescript
// Verificar handler de mensagens
client.on('messages.upsert', async ({ messages, type }) => {
  console.log('Mensagem recebida:', type, messages.length);

  for (const msg of messages) {
    // Ignorar mensagens do proprio bot
    if (msg.key.fromMe) continue;

    // Processar mensagem
    await handleIncomingMessage(msg);
  }
});
```

### Mensagens nao sao enviadas

**Sintomas:**
- Mensagem fica como "Enviando..."
- Erro de timeout

**Solucoes:**
```bash
# Verificar logs de envio
pm2 logs chatblue-api | grep -i "send"

# Verificar formato do numero
# Deve ser: 5511999999999@s.whatsapp.net
```

```typescript
// Verificar funcao de envio
async function sendMessage(to: string, text: string) {
  // Formatar numero corretamente
  const jid = formatJid(to);
  console.log('Enviando para:', jid);

  try {
    const result = await client.sendMessage(jid, { text });
    console.log('Mensagem enviada:', result.key.id);
    return result;
  } catch (error) {
    console.error('Erro ao enviar:', error);
    throw error;
  }
}

function formatJid(phone: string): string {
  // Remover caracteres nao numericos
  const cleaned = phone.replace(/\D/g, '');

  // Adicionar codigo do pais se necessario
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;

  return `${withCountry}@s.whatsapp.net`;
}
```

### Erro: Message failed to send

**Causas comuns:**
1. Numero invalido ou nao registrado no WhatsApp
2. Contato bloqueou voce
3. Limite de mensagens excedido
4. Sessao desconectada

**Solucoes:**
```typescript
// Verificar se o numero existe no WhatsApp
async function isOnWhatsApp(phone: string): Promise<boolean> {
  try {
    const jid = formatJid(phone);
    const [result] = await client.onWhatsApp(jid);
    return result?.exists ?? false;
  } catch (error) {
    console.error('Erro ao verificar numero:', error);
    return false;
  }
}

// Usar antes de enviar
if (await isOnWhatsApp(numero)) {
  await sendMessage(numero, texto);
} else {
  console.log('Numero nao esta no WhatsApp');
}
```

### Midia nao envia (imagens, audios, documentos)

**Solucoes:**
```bash
# Verificar permissoes do diretorio de upload
ls -la /var/www/chatblue/uploads/

# Verificar tamanho do arquivo (limite do WhatsApp)
# Imagens: 16MB
# Videos: 16MB
# Documentos: 100MB
```

```typescript
// Enviar imagem
async function sendImage(to: string, imagePath: string, caption?: string) {
  const jid = formatJid(to);

  return await client.sendMessage(jid, {
    image: { url: imagePath },
    caption: caption || '',
  });
}

// Enviar documento
async function sendDocument(to: string, filePath: string, filename: string) {
  const jid = formatJid(to);
  const mimetype = getMimeType(filePath);

  return await client.sendMessage(jid, {
    document: { url: filePath },
    mimetype,
    fileName: filename,
  });
}

// Enviar audio como voz
async function sendAudio(to: string, audioPath: string) {
  const jid = formatJid(to);

  return await client.sendMessage(jid, {
    audio: { url: audioPath },
    ptt: true, // Push to talk (mensagem de voz)
  });
}
```

## Problemas de Sessao

### Sessao corrompida

**Sintomas:**
- Erro ao iniciar conexao
- Loop infinito de reconexao

**Solucoes:**
```bash
# Fazer backup da sessao atual
cp -r /var/www/chatblue/sessions/session-EMPRESA /tmp/session-backup

# Limpar sessao
rm -rf /var/www/chatblue/sessions/session-EMPRESA

# Reiniciar e escanear QR novamente
pm2 restart chatblue-api
```

### Multiplas sessoes (Multi-tenant)

```typescript
// Gerenciar multiplas sessoes
class WhatsAppSessionManager {
  private sessions: Map<string, WASocket> = new Map();
  private sessionsPath = '/var/www/chatblue/sessions';

  async createSession(companyId: string): Promise<WASocket> {
    const { state, saveCreds } = await useMultiFileAuthState(
      `${this.sessionsPath}/session-${companyId}`
    );

    const client = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    client.on('creds.update', saveCreds);

    this.sessions.set(companyId, client);
    return client;
  }

  getSession(companyId: string): WASocket | undefined {
    return this.sessions.get(companyId);
  }

  async destroySession(companyId: string): Promise<void> {
    const client = this.sessions.get(companyId);
    if (client) {
      await client.logout();
      this.sessions.delete(companyId);
    }

    // Remover arquivos da sessao
    const sessionPath = `${this.sessionsPath}/session-${companyId}`;
    await fs.rm(sessionPath, { recursive: true, force: true });
  }
}
```

### Persistencia de sessao apos reinicio

```bash
# Verificar se os arquivos de sessao existem
ls -la /var/www/chatblue/sessions/

# Verificar permissoes
sudo chown -R chatblue:chatblue /var/www/chatblue/sessions/
sudo chmod -R 700 /var/www/chatblue/sessions/
```

```typescript
// Restaurar sessoes ao iniciar
async function restoreAllSessions() {
  const sessionDirs = await fs.readdir('/var/www/chatblue/sessions');

  for (const dir of sessionDirs) {
    if (dir.startsWith('session-')) {
      const companyId = dir.replace('session-', '');
      console.log(`Restaurando sessao: ${companyId}`);

      try {
        await sessionManager.createSession(companyId);
      } catch (error) {
        console.error(`Erro ao restaurar sessao ${companyId}:`, error);
      }
    }
  }
}
```

## Problemas de Grupos

### Nao consegue enviar para grupo

**Solucoes:**
```typescript
// ID do grupo deve terminar com @g.us
function formatGroupJid(groupId: string): string {
  if (groupId.endsWith('@g.us')) {
    return groupId;
  }
  return `${groupId}@g.us`;
}

// Listar grupos
async function listGroups(): Promise<GroupMetadata[]> {
  const groups = await client.groupFetchAllParticipating();
  return Object.values(groups);
}

// Verificar se esta no grupo
async function isInGroup(groupId: string): Promise<boolean> {
  try {
    const metadata = await client.groupMetadata(formatGroupJid(groupId));
    const myJid = client.user?.id;
    return metadata.participants.some(p => p.id === myJid);
  } catch {
    return false;
  }
}
```

### Erro ao obter participantes do grupo

```typescript
// Obter metadados do grupo com tratamento de erro
async function getGroupParticipants(groupId: string) {
  try {
    const metadata = await client.groupMetadata(formatGroupJid(groupId));
    return metadata.participants.map(p => ({
      id: p.id,
      isAdmin: p.admin !== null,
      isSuperAdmin: p.admin === 'superadmin',
    }));
  } catch (error) {
    if (error.message.includes('not-authorized')) {
      console.error('Bot nao esta no grupo ou nao tem permissao');
    }
    throw error;
  }
}
```

## Ban e Restricoes

### Conta banida ou restrita

**Sintomas:**
- Erro 401 ou 403
- Mensagem "This account is banned"

**Causas:**
- Envio de muitas mensagens em pouco tempo
- Mensagens marcadas como spam por usuarios
- Uso de numero novo sem "aquecer"
- Violacao dos termos do WhatsApp

**Prevencao:**
```typescript
// Implementar rate limiting
class MessageRateLimiter {
  private messageCount: Map<string, number> = new Map();
  private readonly maxPerMinute = 30;
  private readonly maxPerHour = 500;

  async canSend(jid: string): Promise<boolean> {
    const key = `${jid}-${new Date().getHours()}`;
    const count = this.messageCount.get(key) || 0;

    if (count >= this.maxPerHour) {
      return false;
    }

    this.messageCount.set(key, count + 1);
    return true;
  }
}

// Adicionar delays entre mensagens
async function sendWithDelay(messages: Message[]) {
  for (const msg of messages) {
    await sendMessage(msg.to, msg.text);
    // Delay aleatorio entre 1-3 segundos
    await sleep(1000 + Math.random() * 2000);
  }
}
```

### Numero bloqueado por contato

**Solucoes:**
```typescript
// Detectar bloqueio
client.on('messages.update', async (updates) => {
  for (const update of updates) {
    if (update.update.status === 'ERROR') {
      // Pode indicar bloqueio
      console.log('Mensagem falhou, possivel bloqueio:', update.key.remoteJid);
    }
  }
});
```

## Monitoramento e Logs

### Habilitar logs detalhados do Baileys

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'debug',
});

const client = makeWASocket({
  logger,
});
```

### Metricas de WhatsApp

```typescript
import { Counter, Gauge } from 'prom-client';

// Metricas
const messagesReceived = new Counter({
  name: 'whatsapp_messages_received_total',
  help: 'Total de mensagens recebidas',
  labelNames: ['company_id', 'type'],
});

const messagesSent = new Counter({
  name: 'whatsapp_messages_sent_total',
  help: 'Total de mensagens enviadas',
  labelNames: ['company_id', 'status'],
});

const connectionStatus = new Gauge({
  name: 'whatsapp_connection_status',
  help: 'Status da conexao WhatsApp',
  labelNames: ['company_id'],
});

// Atualizar metricas
client.on('messages.upsert', ({ messages }) => {
  messagesReceived.inc({ company_id: companyId, type: 'text' });
});

client.on('connection.update', ({ connection }) => {
  connectionStatus.set(
    { company_id: companyId },
    connection === 'open' ? 1 : 0
  );
});
```

## Boas Praticas

:::tip Recomendacoes
1. **Aqueca numeros novos**: Envie poucas mensagens inicialmente
2. **Respeite limites**: Nao envie mais de 500 mensagens/dia
3. **Use delays**: Adicione pausas entre mensagens em massa
4. **Monitore status**: Verifique se mensagens foram entregues
5. **Trate erros**: Implemente retry com backoff exponencial
6. **Faca backup**: Salve sessoes regularmente
7. **Multiplos numeros**: Distribua carga entre varios numeros
:::

## Proximos Passos

- [Problemas de Banco de Dados](/troubleshooting/banco-dados)
- [Performance](/troubleshooting/performance)
