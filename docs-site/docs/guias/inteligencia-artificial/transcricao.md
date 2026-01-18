---
sidebar_position: 5
title: Transcricao de Audio
description: Guia para configurar transcricao automatica de audios com Whisper no ChatBlue
---

# Transcricao de Audio

O ChatBlue pode transcrever automaticamente mensagens de audio recebidas usando a API Whisper da OpenAI. Este guia explica como configurar e utilizar essa funcionalidade.

## Nivel de Dificuldade

**Basico** - Tempo estimado: 10-15 minutos

## Por Que Usar Transcricao?

| Beneficio | Descricao |
|-----------|-----------|
| Contexto para IA | A IA pode responder com base no audio |
| Busca | Pesquisar conversas por texto do audio |
| Acessibilidade | Atendentes podem ler em vez de ouvir |
| Historico | Registro textual de todas as interacoes |
| Velocidade | Mais rapido ler do que ouvir |

## Pre-requisitos

- [ ] Conta na OpenAI com creditos
- [ ] Chave de API da OpenAI configurada no ChatBlue
- [ ] Conexao WhatsApp ativa

:::tip Dica
A transcricao usa a mesma chave de API da OpenAI. Nao precisa de configuracao adicional se ja tiver OpenAI configurada.
:::

## Passo a Passo

### Passo 1: Acessar Configuracoes

1. Acesse **Configuracoes > Inteligencia Artificial**
2. Clique na aba **Transcricao**
3. Ative a opcao **Transcricao Automatica**

![Placeholder: Configuracao de transcricao](/img/guias/transcricao-config.png)

### Passo 2: Configurar Opcoes

| Opcao | Descricao | Valor Recomendado |
|-------|-----------|-------------------|
| Idioma | Idioma principal dos audios | pt (portugues) |
| Tamanho maximo | Limite de duracao para transcrever | 300s (5 min) |
| Auto-transcrever | Transcrever automaticamente | Sim |
| Mostrar no chat | Exibir transcricao na interface | Sim |

```typescript
{
  transcription: {
    enabled: true,
    provider: "whisper",

    settings: {
      // Idioma principal (ajuda na precisao)
      language: "pt",

      // Tamanho maximo do audio em segundos
      maxDuration: 300,

      // Tamanho maximo do arquivo em MB
      maxFileSize: 25,

      // Transcrever automaticamente ao receber
      autoTranscribe: true,

      // Exibir transcricao no chat
      showInChat: true,

      // Salvar transcricao no banco
      saveTranscription: true,

      // Formato de resposta
      responseFormat: "text" // text, json, srt, vtt
    }
  }
}
```

### Passo 3: Testar Transcricao

1. Envie um audio de teste pelo WhatsApp
2. Aguarde a transcricao aparecer
3. Verifique a precisao

```typescript
// Teste via API
POST /api/transcription/test
Content-Type: multipart/form-data

{
  "audio": [arquivo de audio]
}

// Resposta
{
  "success": true,
  "transcription": "Ola, gostaria de saber mais sobre o plano PRO.",
  "duration": 5.2,
  "language": "pt",
  "confidence": 0.95
}
```

## Fluxo de Transcricao

```
┌─────────────────────────────────────────────────────────────┐
│                  Audio Recebido                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Verificar Configuracao                         │
│           (Transcricao habilitada?)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
             Nao                       Sim
              │                         │
              ▼                         ▼
   ┌──────────────────┐    ┌──────────────────────┐
   │  Manter apenas   │    │   Verificar Limites  │
   │     audio        │    │  (tamanho, duracao)  │
   └──────────────────┘    └──────────┬───────────┘
                                      │
                           ┌──────────┴──────────┐
                           │                     │
                        Dentro                 Fora
                           │                     │
                           ▼                     ▼
              ┌──────────────────┐    ┌──────────────────┐
              │  Enviar para     │    │  Manter sem      │
              │    Whisper       │    │  transcricao     │
              └────────┬─────────┘    └──────────────────┘
                       │
                       ▼
              ┌─────────────────────────────┐
              │    Salvar Transcricao       │
              │  - Banco de dados           │
              │  - Exibir no chat           │
              │  - Enviar para IA           │
              └─────────────────────────────┘
```

## Configuracoes Avancadas

### Idiomas Suportados

O Whisper suporta diversos idiomas:

| Codigo | Idioma |
|--------|--------|
| pt | Portugues |
| en | Ingles |
| es | Espanhol |
| fr | Frances |
| de | Alemao |
| it | Italiano |
| ja | Japones |
| ko | Coreano |
| zh | Chines |

```typescript
{
  transcription: {
    language: "pt", // Idioma principal
    autoDetect: true // Detectar automaticamente se diferente
  }
}
```

### Traducao Automatica

Pode traduzir audios para ingles automaticamente:

```typescript
{
  transcription: {
    // Transcrever no idioma original
    mode: "transcribe",

    // OU: Traduzir para ingles
    mode: "translate"
  }
}
```

### Filas de Processamento

Para alto volume, configure filas:

```typescript
{
  transcription: {
    queue: {
      enabled: true,
      concurrency: 5, // Transcricoes simultaneas
      priority: "fifo", // fifo, lifo, priority
      timeout: 60000 // Timeout por transcricao
    }
  }
}
```

### Webhook de Transcricao

Receba notificacoes quando transcricoes forem concluidas:

```typescript
{
  transcription: {
    webhook: {
      enabled: true,
      url: "https://seu-sistema.com/webhook/transcription",
      events: ["transcription.completed", "transcription.failed"]
    }
  }
}

// Payload do webhook
{
  "event": "transcription.completed",
  "data": {
    "messageId": "msg_123",
    "ticketId": "ticket_456",
    "transcription": "Texto transcrito...",
    "duration": 15.5,
    "language": "pt",
    "cost": 0.006
  }
}
```

## Integracao com IA

Quando a transcricao esta ativa, a IA recebe o texto do audio:

```typescript
// Mensagem recebida pela IA
{
  role: "user",
  content: "[Audio transcrito]: Ola, gostaria de saber o preco do plano PRO para minha empresa que tem 15 funcionarios."
}

// A IA pode responder com base no texto
```

### Configurar Comportamento

```typescript
{
  ai: {
    transcription: {
      // Incluir transcricao no contexto da IA
      includeInContext: true,

      // Prefixo para identificar
      prefix: "[Audio]: ",

      // Resumir audios longos
      summarizeLong: true,
      summaryThreshold: 500 // caracteres
    }
  }
}
```

## Custos

### Preco Whisper API

| Recurso | Preco |
|---------|-------|
| Transcricao | $0.006 / minuto |

### Estimativa de Custos

| Volume | Duracao Media | Custo Mensal |
|--------|---------------|--------------|
| 100 audios/dia | 30 seg | ~$2.70 |
| 500 audios/dia | 30 seg | ~$13.50 |
| 1000 audios/dia | 30 seg | ~$27.00 |

### Limitar Custos

```typescript
{
  transcription: {
    limits: {
      // Limite diario de transcricoes
      dailyLimit: 1000,

      // Limite de custo mensal
      monthlyBudget: 50, // USD

      // Alerta quando atingir %
      alertThreshold: 80
    }
  }
}
```

## Exibicao na Interface

### No Chat

A transcricao aparece junto com o audio:

```
┌─────────────────────────────────────┐
│ [Audio] 0:15                    ▶️  │
├─────────────────────────────────────┤
│ Transcricao:                        │
│ "Ola, gostaria de saber mais        │
│ sobre o plano PRO..."               │
└─────────────────────────────────────┘
```

### Configurar Exibicao

```typescript
{
  transcription: {
    display: {
      // Mostrar automaticamente
      autoExpand: true,

      // Mostrar confianca
      showConfidence: false,

      // Mostrar idioma detectado
      showLanguage: false,

      // Estilo
      style: "collapsed" // collapsed, expanded, inline
    }
  }
}
```

## Solucao de Problemas

### Transcricao incorreta

**Causas**:
- Audio com muito ruido
- Sotaque forte
- Idioma incorreto configurado

**Solucoes**:
1. Configure o idioma correto
2. Ative deteccao automatica de idioma
3. Audios muito ruidosos podem nao ter boa transcricao

### Transcricao lenta

**Causas**:
- Audios muito longos
- Muitas transcricoes simultaneas
- Latencia de rede

**Solucoes**:
1. Reduza o limite de duracao
2. Configure filas com concorrencia adequada
3. Verifique conexao de internet

```typescript
{
  transcription: {
    settings: {
      maxDuration: 120, // Reduzir para 2 minutos
    },
    queue: {
      concurrency: 3 // Menos simultaneas
    }
  }
}
```

### Erro: "Audio muito longo"

**Causa**: Audio excede o limite configurado

**Solucao**:
1. Aumente `maxDuration` se necessario
2. Ou mantenha o limite e nao transcreva audios longos

### Erro: "Formato nao suportado"

**Causa**: Formato de audio nao suportado pelo Whisper

**Formatos suportados**:
- mp3
- mp4
- mpeg
- mpga
- m4a
- wav
- webm
- ogg

**Solucao**: O ChatBlue converte automaticamente. Se persistir, verifique se o arquivo nao esta corrompido.

### Custo muito alto

**Solucoes**:
1. Configure limites de transcricao
2. Reduza duracao maxima
3. Transcreva apenas audios importantes

```typescript
{
  transcription: {
    // Transcrever apenas se IA estiver ativa
    onlyWithAI: true,

    // Ou apenas horario comercial
    schedule: {
      enabled: true,
      hours: {
        start: "08:00",
        end: "18:00"
      }
    }
  }
}
```

## Boas Praticas

### 1. Configure Limites Adequados

- Duracao maxima razoavel (2-5 minutos)
- Limite de gastos mensal
- Monitore custos regularmente

### 2. Use para Contexto da IA

- A transcricao e mais util quando a IA pode usar
- Configure integracao com IA

### 3. Revise Transcricoes

- Verifique qualidade periodicamente
- Ajuste idioma se necessario

### 4. Informe os Clientes

- Considere informar que audios sao transcritos
- Verifique requisitos de privacidade

## Proximos Passos

Apos configurar transcricao:

- [Configurar Personalidade da IA](/guias/inteligencia-artificial/personalidade)
- [Configurar Transferencia para Humano](/guias/inteligencia-artificial/transferencia)
- [Configurar Envio de Midia](/guias/whatsapp/midia)
