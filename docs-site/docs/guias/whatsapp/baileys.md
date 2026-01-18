---
sidebar_position: 2
title: Configuracao Baileys
description: Guia completo para configurar a conexao WhatsApp via Baileys (nao-oficial)
---

# Configuracao Baileys

O Baileys e uma biblioteca nao-oficial que permite conectar ao WhatsApp via WebSocket, emulando o WhatsApp Web. Este guia detalha como configurar essa conexao no ChatBlue.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 10-15 minutos

## Pre-requisitos

Antes de comecar, certifique-se de ter:

- [ ] Acesso de administrador ao ChatBlue
- [ ] Numero de celular com WhatsApp ativo
- [ ] Celular em maos para escanear o QR Code
- [ ] Conexao de internet estavel

:::warning Aviso Importante
O Baileys e uma solucao nao-oficial. O WhatsApp pode alterar suas politicas a qualquer momento. Para uso em producao com alto volume, considere usar a [Meta Cloud API](/guias/whatsapp/meta-cloud-api).
:::

## Passo a Passo

### Passo 1: Acessar Configuracoes de Conexao

1. Faca login no ChatBlue como administrador
2. No menu lateral, clique em **Configuracoes**
3. Selecione **Conexoes WhatsApp**
4. Clique no botao **+ Nova Conexao**

![Placeholder: Tela de conexoes WhatsApp](/img/guias/baileys-lista-conexoes.png)

### Passo 2: Selecionar Tipo Baileys

1. Na modal de nova conexao, selecione **Baileys (Nao-oficial)**
2. Preencha os campos obrigatorios:

| Campo | Descricao | Exemplo |
|-------|-----------|---------|
| Nome | Identificador da conexao | "WhatsApp Vendas" |
| Descricao | Descricao opcional | "Numero principal de vendas" |
| Departamento | Departamento padrao | Vendas |

![Placeholder: Formulario de nova conexao Baileys](/img/guias/baileys-formulario.png)

### Passo 3: Configuracoes Avancadas (Opcional)

Expanda a secao **Configuracoes Avancadas** para ajustar:

```typescript
{
  // Configuracoes de reconexao
  reconnect: {
    enabled: true,
    maxRetries: 5,
    delayMs: 3000
  },

  // Configuracoes de sessao
  session: {
    persistCredentials: true,
    authTimeout: 60000, // 60 segundos para escanear QR
    qrMaxRetries: 3
  },

  // Configuracoes de mensagem
  message: {
    retryOnFail: true,
    maxRetries: 3,
    readReceipts: true
  }
}
```

### Passo 4: Gerar QR Code

1. Clique em **Criar Conexao**
2. Um QR Code sera exibido na tela
3. O QR Code tem validade de 60 segundos

![Placeholder: QR Code para conexao](/img/guias/baileys-qrcode.png)

### Passo 5: Escanear QR Code

No seu celular:

1. Abra o **WhatsApp**
2. Toque nos **tres pontos** (menu) no canto superior direito
3. Selecione **Dispositivos conectados**
4. Toque em **Conectar um dispositivo**
5. Escaneie o QR Code exibido no ChatBlue

![Placeholder: Instrucoes para escanear QR Code no celular](/img/guias/baileys-celular.png)

### Passo 6: Confirmar Conexao

Apos escanear o QR Code:

1. Aguarde a mensagem de confirmacao
2. O status mudara para **Conectado** (indicador verde)
3. O numero conectado sera exibido

:::tip Dica
Se o QR Code expirar, clique em **Gerar Novo QR Code** para tentar novamente.
:::

## Verificando a Conexao

### Teste de Envio

1. Acesse **Conexoes > [Sua Conexao]**
2. Clique em **Testar Conexao**
3. Insira um numero de telefone para teste
4. Envie uma mensagem de teste

```typescript
// Exemplo de mensagem de teste via API
POST /api/whatsapp/test-message
{
  "connectionId": "conn_123",
  "to": "5511999998888",
  "message": "Teste de conexao ChatBlue"
}
```

### Status da Conexao

Monitore o status da conexao no painel:

| Indicador | Significado |
|-----------|-------------|
| Verde pulsando | Conexao ativa e saudavel |
| Verde estatico | Conexao ativa |
| Amarelo | Reconectando |
| Vermelho | Desconectado |
| Cinza | Desabilitado |

## Configuracoes Adicionais

### Mensagem de Boas-vindas

Configure uma mensagem automatica para novos contatos:

1. Acesse **Conexoes > [Sua Conexao] > Mensagens Automaticas**
2. Ative **Mensagem de Boas-vindas**
3. Configure o texto:

```
Ola! Bem-vindo ao atendimento da {empresa}.
Como posso ajuda-lo hoje?

1. Vendas
2. Suporte
3. Financeiro
```

### Configurar Webhook Local

Para integrar com outros sistemas:

```typescript
// Configuracao de webhook
{
  webhooks: [
    {
      event: "message.received",
      url: "http://localhost:3001/webhook/incoming",
      headers: {
        "Authorization": "Bearer seu-token"
      }
    },
    {
      event: "message.sent",
      url: "http://localhost:3001/webhook/outgoing"
    },
    {
      event: "connection.status",
      url: "http://localhost:3001/webhook/status"
    }
  ]
}
```

### Limites de Uso

Configure limites para evitar bloqueios:

| Configuracao | Valor Recomendado | Descricao |
|--------------|-------------------|-----------|
| Mensagens/minuto | 20 | Maximo de mensagens por minuto |
| Mensagens/hora | 200 | Maximo de mensagens por hora |
| Novos contatos/dia | 50 | Maximo de novos contatos por dia |
| Delay entre mensagens | 1000ms | Tempo minimo entre mensagens |

```typescript
{
  rateLimits: {
    messagesPerMinute: 20,
    messagesPerHour: 200,
    newContactsPerDay: 50,
    minDelayMs: 1000
  }
}
```

## Gerenciamento de Sessao

### Backup da Sessao

O ChatBlue salva automaticamente as credenciais da sessao. Para backup manual:

1. Acesse **Conexoes > [Sua Conexao] > Sessao**
2. Clique em **Exportar Sessao**
3. Salve o arquivo JSON em local seguro

:::danger Atencao
O arquivo de sessao contem credenciais sensiveis. Mantenha-o em local seguro e nunca compartilhe.
:::

### Restaurar Sessao

Para restaurar uma sessao salva:

1. Acesse **Conexoes > [Sua Conexao] > Sessao**
2. Clique em **Importar Sessao**
3. Selecione o arquivo JSON de backup
4. A conexao sera restaurada automaticamente

### Desconectar Sessao

Para desconectar completamente:

1. Acesse **Conexoes > [Sua Conexao]**
2. Clique em **Desconectar**
3. Confirme a acao

Isso remove a sessao do servidor e desconecta o dispositivo.

## Integracao com Outros Modulos

### Associar a Departamento

```typescript
// Roteamento automatico por palavra-chave
{
  routing: {
    enabled: true,
    rules: [
      {
        keywords: ["comprar", "preco", "orcamento"],
        department: "vendas"
      },
      {
        keywords: ["problema", "erro", "nao funciona"],
        department: "suporte"
      },
      {
        keywords: ["boleto", "pagamento", "nota fiscal"],
        department: "financeiro"
      }
    ],
    default: "atendimento"
  }
}
```

### Habilitar IA

Para que a IA responda automaticamente nesta conexao:

1. Acesse **Conexoes > [Sua Conexao] > Inteligencia Artificial**
2. Ative **Atendimento com IA**
3. Selecione o provedor (OpenAI ou Anthropic)
4. Configure as regras de transferencia

## Solucao de Problemas

### Erro: "QR Code expirou"

**Causa**: O QR Code tem validade limitada (60 segundos)

**Solucao**:
1. Clique em **Gerar Novo QR Code**
2. Tenha o celular pronto antes de gerar
3. Escaneie imediatamente

### Erro: "Sessao invalida"

**Causa**: O WhatsApp foi desconectado pelo celular ou expirou

**Solucao**:
1. No celular, va em **Dispositivos Conectados**
2. Verifique se o ChatBlue ainda aparece na lista
3. Se nao aparecer, gere um novo QR Code
4. Se aparecer, remova e reconecte

### Erro: "Conexao perdida frequentemente"

**Causas possiveis**:
- WhatsApp aberto em outro dispositivo (nao WhatsApp Web)
- Problema de rede no servidor
- Celular sem internet

**Solucoes**:
1. Certifique-se de que o celular tem internet estavel
2. Nao use o mesmo numero em outro app de automacao
3. Verifique os logs do servidor para erros de rede

```bash
# Verificar logs de conexao
pnpm --filter api logs:whatsapp
```

### Erro: "Bloqueado temporariamente"

**Causa**: Muitas mensagens enviadas em pouco tempo ou comportamento suspeito

**Solucao**:
1. Pare de enviar mensagens imediatamente
2. Aguarde 24-48 horas
3. Reduza os limites de envio
4. Diversifique o conteudo das mensagens

### Mensagens nao chegam

**Verificacoes**:
1. Status da conexao esta verde?
2. O numero de destino e valido?
3. Nao esta bloqueado pelo destinatario?

```bash
# Teste de envio via terminal
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{
    "connectionId": "conn_123",
    "to": "5511999998888",
    "message": "Teste"
  }'
```

## Melhores Praticas

### 1. Numero Dedicado
- Use um numero exclusivo para o ChatBlue
- Evite usar o numero pessoal ou de outro sistema

### 2. Monitoramento
- Configure alertas para quedas de conexao
- Verifique o status diariamente

### 3. Rate Limiting
- Respeite os limites de mensagens
- Use delays entre mensagens em massa

### 4. Conteudo das Mensagens
- Evite mensagens muito similares
- Personalize com nome do cliente
- Nao envie spam ou conteudo proibido

### 5. Backup
- Faca backup da sessao periodicamente
- Armazene em local seguro

## Proximos Passos

Apos configurar a conexao Baileys:

- [Configurar Templates de Mensagem](/guias/whatsapp/templates)
- [Configurar Envio de Midia](/guias/whatsapp/midia)
- [Configurar Inteligencia Artificial](/guias/inteligencia-artificial/configuracao)
