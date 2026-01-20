# Correção: Erro 428 - Connection Terminated by Server

## Problema Identificado

Quando você conectou WhatsApp de duas empresas (Axia e MPuppe), a conexão da Tokeniza (Tokeniza Suporte) caiu com o erro:

```
Error: Connection Terminated by Server
reason: 428
```

### Análise dos Logs

1. **Erro 428**: O WhatsApp detectou comportamento anormal e forçou o encerramento da conexão
2. **Múltiplas conexões simultâneas**: O sistema estava tentando conectar várias conexões ao mesmo tempo
3. **Falta de tratamento**: O código não tratava especificamente o erro 428, deixando a conexão em estado indefinido

### Status das Conexões (no momento do problema)

- **Tokeniza Suporte (nova)**: `CONNECTING` - tentando conectar
- **Axia**: `CONNECTING` - tentando conectar  
- **MPuppe**: `CONNECTED` - conectada
- **Tokeniza Suporte (antiga)**: `DISCONNECTED` - desconectada

## Causa Raiz

O erro 428 geralmente ocorre quando:

1. **Múltiplas conexões simultâneas**: O WhatsApp detecta várias tentativas de conexão do mesmo número ou de números relacionados
2. **Comportamento suspeito**: O servidor do WhatsApp identifica padrões anormais de conexão
3. **Rate limiting**: Muitas tentativas de conexão em pouco tempo

O código anterior não tratava especificamente este erro, então quando ocorria:
- A conexão ficava em estado indefinido
- Não havia tentativa de reconexão adequada
- O sistema não logava adequadamente o problema

## Solução Implementada

Adicionado tratamento específico para o erro 428 no arquivo `baileys.service.ts`:

```typescript
} else if (reason === 428 || errorMessage.includes('Connection Terminated by Server')) {
  // Error 428: Connection Terminated by Server
  // This usually happens when WhatsApp detects suspicious activity or multiple connections
  // Wait longer before reconnecting to avoid rate limiting
  logger.warn(`Connection terminated by server (428) for: ${this.connectionId}. This may indicate multiple connections or suspicious activity. Waiting before reconnect...`);
  
  // Clear the session
  const sessionPath = path.join(getSessionsDir(), this.connectionId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
  
  await this.safeUpdateConnection({ 
    status: 'DISCONNECTED', 
    sessionData: Prisma.DbNull, 
    qrCode: null 
  });
  
  if (!this.isDeleted) {
    // Wait longer (30-60 seconds) before reconnecting to avoid rate limiting
    const delay = 30000 + Math.random() * 30000; // 30-60 seconds
    logger.info(`Will attempt to reconnect ${this.connectionId} in ${Math.round(delay/1000)} seconds...`);
    setTimeout(() => {
      if (!this.isDeleted) {
        logger.info(`Attempting to reconnect after 428 error: ${this.connectionId}`);
        this.connect();
      }
    }, delay);
  }
}
```

### O que a correção faz:

1. **Detecta o erro 428**: Identifica quando o servidor do WhatsApp termina a conexão
2. **Limpa a sessão**: Remove arquivos de sessão corrompidos
3. **Marca como desconectado**: Atualiza o status no banco de dados
4. **Aguarda antes de reconectar**: Espera 30-60 segundos (aleatório) para evitar rate limiting
5. **Tenta reconectar automaticamente**: Após o delay, tenta reconectar automaticamente
6. **Loga adequadamente**: Registra o problema para diagnóstico

## Melhorias Adicionais

Também foi adicionado tratamento para erros desconhecidos:

```typescript
} else {
  // Unknown error - log and mark as disconnected
  logger.error(`Unknown disconnect reason (${reason}) for: ${this.connectionId}, message: ${errorMessage}`);
  await this.safeUpdateConnection({ 
    status: 'DISCONNECTED', 
    qrCode: null 
  });
  
  // Try to reconnect after a delay for unknown errors
  if (!this.isDeleted && wasConnected) {
    logger.info(`Attempting to reconnect after unknown error: ${this.connectionId}`);
    setTimeout(() => {
      if (!this.isDeleted) {
        this.connect();
      }
    }, 10000);
  }
}
```

## Recomendações

1. **Evitar múltiplas conexões simultâneas**: Quando conectar novas conexões, aguarde alguns minutos entre cada uma
2. **Monitorar logs**: Verifique os logs regularmente para identificar padrões de desconexão
3. **Limitar tentativas**: Se uma conexão falhar repetidamente, aguarde mais tempo antes de tentar novamente
4. **Usar conexões diferentes**: Se possível, use números diferentes para evitar conflitos

## Status

✅ **Correção aplicada e deploy realizado**
- Código atualizado
- Compilado com sucesso
- Serviço reiniciado
- Tratamento do erro 428 ativo

A conexão da Tokeniza deve reconectar automaticamente após o delay configurado (30-60 segundos).




