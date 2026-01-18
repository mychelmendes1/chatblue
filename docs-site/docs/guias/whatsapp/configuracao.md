---
sidebar_position: 1
title: Configuracao do WhatsApp
description: Visao geral das opcoes de conexao com WhatsApp no ChatBlue
---

# Configuracao do WhatsApp

O ChatBlue oferece duas formas de conectar sua empresa ao WhatsApp: **Baileys** (conexao nao-oficial) e **Meta Cloud API** (API oficial). Este guia apresenta uma visao geral das opcoes para ajuda-lo a escolher a melhor para seu caso.

## Comparativo das Opcoes

| Caracteristica | Baileys | Meta Cloud API |
|----------------|---------|----------------|
| Tipo | Nao-oficial | Oficial |
| Custo | Gratuito | Pago por conversa |
| Estabilidade | Media | Alta |
| Numero necessario | Qualquer numero | Numero Business verificado |
| Aprovacao Meta | Nao necessaria | Obrigatoria |
| Templates HSM | Nao suportado | Suportado |
| Mensagens em massa | Limitado | Permitido com templates |
| Webhooks | Via WebSocket local | Via HTTPS |
| Ideal para | Pequenas empresas, testes | Empresas maiores, producao |

## Fluxo de Decisao

```
                    ┌─────────────────────┐
                    │ Escolher Conexao    │
                    │    WhatsApp         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Precisa de          │
                    │ mensagens em massa? │
                    └──────────┬──────────┘
                        │           │
                       Sim         Nao
                        │           │
              ┌─────────▼───┐  ┌────▼─────────┐
              │ Meta Cloud  │  │ Orcamento    │
              │    API      │  │ limitado?    │
              └─────────────┘  └──────┬───────┘
                                  │       │
                                 Sim     Nao
                                  │       │
                         ┌────────▼──┐ ┌──▼─────────┐
                         │  Baileys  │ │ Meta Cloud │
                         │           │ │    API     │
                         └───────────┘ └────────────┘
```

## Requisitos Gerais

Antes de configurar qualquer opcao, certifique-se de ter:

### Para Baileys
- Numero de celular com WhatsApp ativo
- Celular disponivel para escanear QR Code
- Conexao de internet estavel no servidor

### Para Meta Cloud API
- Conta no Meta Business Suite
- Numero de telefone verificado para WhatsApp Business
- Aplicativo criado no Meta for Developers
- Metodo de pagamento configurado

## Acessando a Configuracao

### Passo 1: Navegue ate Configuracoes

1. Faca login no ChatBlue
2. Clique no icone de **Configuracoes** no menu lateral
3. Selecione **Conexoes** ou **WhatsApp**

![Placeholder: Menu de configuracoes mostrando opcao WhatsApp](/img/guias/whatsapp-menu.png)

### Passo 2: Adicionar Nova Conexao

1. Clique no botao **+ Nova Conexao**
2. Escolha o tipo de conexao desejada

![Placeholder: Modal de selecao de tipo de conexao](/img/guias/whatsapp-nova-conexao.png)

## Status da Conexao

O ChatBlue monitora continuamente o status da sua conexao WhatsApp:

| Status | Cor | Descricao |
|--------|-----|-----------|
| Conectado | Verde | Conexao ativa e funcionando |
| Desconectado | Vermelho | Conexao perdida, necessita reconectar |
| Conectando | Amarelo | Tentando estabelecer conexao |
| Aguardando QR | Azul | Esperando escaneamento do QR Code |

## Multiplas Conexoes

O ChatBlue suporta multiplas conexoes WhatsApp por empresa:

```typescript
// Exemplo de configuracao com multiplas conexoes
{
  company: "Minha Empresa",
  connections: [
    {
      name: "Vendas",
      type: "baileys",
      number: "+5511999990001"
    },
    {
      name: "Suporte",
      type: "meta_cloud",
      number: "+5511999990002"
    }
  ]
}
```

:::tip Dica
Use conexoes separadas para diferentes departamentos para melhor organizacao e metricas.
:::

## Configuracoes Comuns

### Horario de Funcionamento

Configure quando o WhatsApp deve estar ativo:

```typescript
{
  businessHours: {
    enabled: true,
    timezone: "America/Sao_Paulo",
    schedule: {
      monday: { start: "08:00", end: "18:00" },
      tuesday: { start: "08:00", end: "18:00" },
      wednesday: { start: "08:00", end: "18:00" },
      thursday: { start: "08:00", end: "18:00" },
      friday: { start: "08:00", end: "17:00" },
      saturday: { start: "09:00", end: "13:00" },
      sunday: null // Fechado
    }
  }
}
```

### Mensagem de Ausencia

Configure uma mensagem automatica fora do horario comercial:

1. Acesse **Configuracoes > WhatsApp > Mensagens Automaticas**
2. Ative a opcao **Mensagem de Ausencia**
3. Digite a mensagem desejada
4. Salve as alteracoes

:::warning Aviso
A mensagem de ausencia so funciona se o horario de funcionamento estiver configurado.
:::

### Webhook de Status

Configure um webhook para receber atualizacoes de status:

```typescript
{
  webhook: {
    url: "https://seu-sistema.com/webhook/whatsapp",
    events: ["message", "status", "connection"],
    secret: "seu-token-secreto"
  }
}
```

## Boas Praticas

### 1. Mantenha o Numero Ativo
- Evite usar numeros que ficam muito tempo sem uso
- Responda mensagens regularmente para manter a conta ativa

### 2. Evite Bloqueios
- Nao envie mensagens em massa para numeros desconhecidos
- Respeite os limites de mensagens por dia
- Use templates aprovados para mensagens proativas

### 3. Monitore a Conexao
- Configure alertas para quedas de conexao
- Verifique o status diariamente
- Tenha um plano de contingencia

### 4. Backup de Sessao
- O ChatBlue faz backup automatico da sessao Baileys
- Mantenha backups regulares das configuracoes

## Solucao de Problemas

### Conexao Caindo Frequentemente

**Possivel causa**: Conflito de sessao (WhatsApp aberto em outro dispositivo)

**Solucao**:
1. Feche o WhatsApp em todos os outros dispositivos
2. Desconecte a sessao no ChatBlue
3. Reconecte escaneando o QR Code novamente

### QR Code Expirando Rapido

**Possivel causa**: Timeout configurado muito baixo

**Solucao**:
1. Acesse as configuracoes avancadas
2. Aumente o tempo de expiracao do QR Code
3. Tente escanear mais rapidamente

### Mensagens Nao Sendo Entregues

**Possiveis causas**:
- Numero do destinatario invalido
- Conta do destinatario bloqueou voce
- Limite de mensagens excedido

**Solucao**:
1. Verifique se o numero esta correto e tem WhatsApp
2. Teste enviando para outro numero
3. Aguarde algumas horas se atingiu o limite

## Proximos Passos

Escolha o tipo de conexao que melhor se adapta as suas necessidades:

- [Configurar Baileys](/guias/whatsapp/baileys) - Conexao nao-oficial via QR Code
- [Configurar Meta Cloud API](/guias/whatsapp/meta-cloud-api) - API oficial do WhatsApp

Apos configurar a conexao:

- [Configurar Templates](/guias/whatsapp/templates) - Crie mensagens padronizadas
- [Configurar Midia](/guias/whatsapp/midia) - Configure envio de arquivos
