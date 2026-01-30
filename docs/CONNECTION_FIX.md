# Correção: Sistema não reconhece conexão conectada

## 🔍 Problema Identificado

Quando uma conexão WhatsApp cai e o usuário cria uma nova conexão (mesmo telefone), o sistema ainda tentava usar a conexão antiga do ticket, que estava desconectada, resultando no erro:

```
WhatsApp não conectado. Por favor, conecte o WhatsApp primeiro escaneando o QR Code.
```

## ✅ Solução Implementada

Foi criada uma função helper `getActiveConnectionForTicket()` que:

1. **Verifica o status atual da conexão do ticket** (recarrega do banco para ter status atualizado)
2. **Se a conexão estiver conectada**: usa ela normalmente
3. **Se a conexão estiver desconectada**: 
   - Busca uma conexão ativa e conectada da mesma empresa
   - Prefere conexões do mesmo tipo (BAILEYS ou META_CLOUD)
   - Prefere conexão padrão (`isDefault: true`)
   - Prefere conexão mais recentemente conectada
   - **Atualiza automaticamente o ticket** para usar a nova conexão
   - **Atualiza a mensagem** para usar a nova conexão

## 📝 Onde foi aplicado

A função foi aplicada em todos os pontos de envio de mensagens:

1. ✅ **Envio de mensagem de texto** (`POST /messages/ticket/:ticketId`)
2. ✅ **Envio de mídia** (`POST /messages/ticket/:ticketId/media`)
3. ✅ **Envio de template** (`POST /messages/template`)

## 🔧 Como Funciona

```typescript
async function getActiveConnectionForTicket(ticket: any): Promise<{ connection: any; updated: boolean }> {
  // 1. Recarrega status atual da conexão do ticket
  const currentConnection = await prisma.whatsAppConnection.findUnique({
    where: { id: ticket.connectionId },
  });

  // 2. Se estiver conectada, usa ela
  if (currentConnection.status === 'CONNECTED' && currentConnection.isActive) {
    return { connection: currentConnection, updated: false };
  }

  // 3. Busca conexão ativa da mesma empresa
  // Prefere mesmo tipo, depois conexão padrão, depois mais recente
  const activeConnection = await prisma.whatsAppConnection.findFirst({
    where: {
      companyId: ticket.companyId,
      status: 'CONNECTED',
      isActive: true,
    },
    orderBy: [
      { isDefault: 'desc' },
      { lastConnected: 'desc' },
    ],
  });

  // 4. Atualiza ticket para usar nova conexão
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { connectionId: activeConnection.id },
  });

  return { connection: activeConnection, updated: true };
}
```

## 🎯 Benefícios

1. **Automático**: Não precisa atualizar tickets manualmente
2. **Transparente**: O usuário não percebe a mudança
3. **Inteligente**: Prefere conexões do mesmo tipo e padrão
4. **Seguro**: Preserva histórico - apenas atualiza a conexão ativa

## 📊 Logs

O sistema agora registra logs detalhados:

```
WARN: Ticket X connection Y is not connected (status: DISCONNECTED). Looking for active connection...
INFO: Found active connection Z (Tokeniza Suporte, type: BAILEYS) for ticket X. Updating ticket to use new connection.
```

## ⚠️ Casos Especiais

- Se não houver nenhuma conexão ativa, retorna erro informativo
- Se houver múltiplas conexões ativas, usa a padrão ou mais recente
- Preserva o histórico - apenas atualiza a conexão ativa do ticket

## 🚀 Status

✅ **Implementado e deployado em produção**

A correção está ativa e funcionando. Quando você enviar uma mensagem em um ticket que estava usando uma conexão desconectada, o sistema automaticamente:

1. Detecta que a conexão está desconectada
2. Encontra a conexão "Tokeniza Suporte" (ou outra ativa)
3. Atualiza o ticket para usar a nova conexão
4. Envia a mensagem com sucesso






