---
sidebar_position: 3
title: Meta Cloud API
description: Guia completo para configurar a conexao WhatsApp via Meta Cloud API (oficial)
---

# Meta Cloud API

A Meta Cloud API e a solucao oficial do WhatsApp para empresas. Este guia detalha como configurar essa integracao no ChatBlue.

## Nivel de Dificuldade

**Intermediario** - Tempo estimado: 30-45 minutos

## Pre-requisitos

Antes de comecar, certifique-se de ter:

- [ ] Conta no [Meta Business Suite](https://business.facebook.com/)
- [ ] Conta de desenvolvedor no [Meta for Developers](https://developers.facebook.com/)
- [ ] Numero de telefone verificado para WhatsApp Business
- [ ] Metodo de pagamento configurado na conta Meta
- [ ] Acesso de administrador ao ChatBlue
- [ ] Servidor com HTTPS configurado (para webhooks)

## Vantagens da API Oficial

| Vantagem | Descricao |
|----------|-----------|
| Estabilidade | Conexao oficial, sem risco de bloqueio |
| Templates HSM | Mensagens proativas aprovadas pelo WhatsApp |
| Alto volume | Suporte a milhares de mensagens por dia |
| Recursos avancados | Botoes, listas, catalogo de produtos |
| Suporte Meta | Suporte tecnico oficial |

## Passo a Passo

### Fase 1: Configuracao no Meta for Developers

#### Passo 1.1: Criar Aplicativo

1. Acesse [developers.facebook.com](https://developers.facebook.com/)
2. Clique em **Meus Aplicativos**
3. Clique em **Criar Aplicativo**
4. Selecione **Empresa** como tipo
5. Preencha os dados:

| Campo | Valor |
|-------|-------|
| Nome do aplicativo | ChatBlue WhatsApp |
| Email de contato | seu-email@empresa.com |
| Conta comercial | Selecione sua conta |

![Placeholder: Tela de criacao de aplicativo Meta](/img/guias/meta-criar-app.png)

#### Passo 1.2: Adicionar WhatsApp

1. Na pagina do aplicativo, clique em **Adicionar produtos**
2. Encontre **WhatsApp** e clique em **Configurar**
3. Siga o assistente de configuracao inicial

#### Passo 1.3: Configurar Numero de Telefone

1. Acesse **WhatsApp > Configuracao da API**
2. Clique em **Adicionar numero de telefone**
3. Selecione sua conta do WhatsApp Business
4. Verifique o numero por SMS ou ligacao

:::warning Aviso
O numero usado deve ser exclusivo. Se ja estiver sendo usado em outro WhatsApp, sera necessario migrar.
:::

#### Passo 1.4: Obter Credenciais

Anote as seguintes informacoes (voce precisara delas no ChatBlue):

| Credencial | Onde encontrar |
|------------|----------------|
| Phone Number ID | WhatsApp > Configuracao > ID do numero |
| WhatsApp Business Account ID | WhatsApp > Configuracao > ID da conta |
| Access Token | Configuracoes > Tokens de acesso |
| App Secret | Configuracoes > Basico > Chave secreta |

![Placeholder: Tela de credenciais Meta](/img/guias/meta-credenciais.png)

### Fase 2: Configurar Webhook

O webhook permite que o ChatBlue receba mensagens do WhatsApp.

#### Passo 2.1: Configurar URL do Webhook no ChatBlue

1. No ChatBlue, acesse **Configuracoes > Integrações > Meta Webhook**
2. Copie a URL do webhook:

```
https://seu-dominio.com/api/webhooks/meta
```

3. Copie o token de verificacao gerado

#### Passo 2.2: Configurar Webhook no Meta

1. Acesse seu aplicativo no Meta for Developers
2. Va em **WhatsApp > Configuracao**
3. Na secao **Webhook**, clique em **Editar**
4. Preencha:

| Campo | Valor |
|-------|-------|
| URL de callback | https://seu-dominio.com/api/webhooks/meta |
| Token de verificacao | Token copiado do ChatBlue |

5. Clique em **Verificar e salvar**

#### Passo 2.3: Inscrever nos Eventos

Apos verificar o webhook, inscreva-se nos eventos:

- [x] messages
- [x] message_deliveries
- [x] message_reads
- [x] message_template_status_update

![Placeholder: Configuracao de webhook Meta](/img/guias/meta-webhook.png)

### Fase 3: Configurar no ChatBlue

#### Passo 3.1: Criar Conexao

1. No ChatBlue, acesse **Configuracoes > Conexoes WhatsApp**
2. Clique em **+ Nova Conexao**
3. Selecione **Meta Cloud API (Oficial)**

#### Passo 3.2: Preencher Credenciais

Insira as credenciais obtidas na Fase 1:

```typescript
{
  name: "WhatsApp Business Oficial",
  type: "meta_cloud",
  credentials: {
    phoneNumberId: "123456789012345",
    wabaId: "123456789012345",
    accessToken: "EAAG...",
    appSecret: "abc123...",
    webhookVerifyToken: "seu-token-verificacao"
  }
}
```

| Campo | Descricao |
|-------|-----------|
| Phone Number ID | ID do numero de telefone |
| WABA ID | ID da conta WhatsApp Business |
| Access Token | Token de acesso permanente |
| App Secret | Chave secreta do aplicativo |
| Webhook Verify Token | Token para verificar webhook |

#### Passo 3.3: Configuracoes Avancadas

```typescript
{
  settings: {
    // Versao da API (usar sempre a mais recente)
    apiVersion: "v18.0",

    // Configuracoes de mensagem
    messaging: {
      defaultLanguage: "pt_BR",
      readReceipts: true,
      typingIndicator: true
    },

    // Limites
    rateLimits: {
      messagesPerSecond: 80,
      templatesPerDay: 1000
    }
  }
}
```

#### Passo 3.4: Testar Conexao

1. Clique em **Testar Conexao**
2. O sistema verificara:
   - Validade do Access Token
   - Configuracao do webhook
   - Permissoes do numero

![Placeholder: Teste de conexao Meta Cloud API](/img/guias/meta-teste-conexao.png)

### Fase 4: Criar Token Permanente

O token de acesso padrao expira em 60 dias. Para producao, crie um token permanente:

#### Passo 4.1: Criar Usuario do Sistema

1. Acesse [Meta Business Suite](https://business.facebook.com/)
2. Va em **Configuracoes > Usuarios > Usuarios do Sistema**
3. Clique em **Adicionar**
4. Crie um usuario com funcao **Administrador**

#### Passo 4.2: Gerar Token Permanente

1. Clique no usuario criado
2. Clique em **Gerar novo token**
3. Selecione o aplicativo
4. Adicione as permissoes:
   - whatsapp_business_management
   - whatsapp_business_messaging

5. Copie o token gerado
6. Atualize no ChatBlue

:::danger Atencao
Guarde o token em local seguro. Ele so e exibido uma vez e da acesso completo a sua conta WhatsApp Business.
:::

## Configuracoes de Mensagens

### Tipos de Mensagens Suportadas

| Tipo | Descricao | Exemplo |
|------|-----------|---------|
| text | Texto simples | "Ola, como posso ajudar?" |
| image | Imagem com legenda | Foto de produto |
| document | Arquivo PDF, DOC, etc | Contrato, boleto |
| video | Video | Tutorial, demonstracao |
| audio | Audio | Mensagem de voz |
| location | Localizacao | Endereco da loja |
| contacts | Contato | Cartao de visita |
| interactive | Botoes e listas | Menu de opcoes |

### Exemplo: Mensagem com Botoes

```typescript
// Mensagem interativa com botoes
const message = {
  messaging_product: "whatsapp",
  to: "5511999998888",
  type: "interactive",
  interactive: {
    type: "button",
    body: {
      text: "Como posso ajudar voce hoje?"
    },
    action: {
      buttons: [
        {
          type: "reply",
          reply: {
            id: "vendas",
            title: "Vendas"
          }
        },
        {
          type: "reply",
          reply: {
            id: "suporte",
            title: "Suporte"
          }
        },
        {
          type: "reply",
          reply: {
            id: "financeiro",
            title: "Financeiro"
          }
        }
      ]
    }
  }
};
```

### Exemplo: Lista de Opcoes

```typescript
// Mensagem interativa com lista
const message = {
  messaging_product: "whatsapp",
  to: "5511999998888",
  type: "interactive",
  interactive: {
    type: "list",
    header: {
      type: "text",
      text: "Menu de Atendimento"
    },
    body: {
      text: "Selecione uma opcao abaixo:"
    },
    action: {
      button: "Ver opcoes",
      sections: [
        {
          title: "Vendas",
          rows: [
            { id: "produtos", title: "Ver produtos" },
            { id: "orcamento", title: "Solicitar orcamento" }
          ]
        },
        {
          title: "Suporte",
          rows: [
            { id: "duvidas", title: "Tirar duvidas" },
            { id: "problema", title: "Reportar problema" }
          ]
        }
      ]
    }
  }
};
```

## Templates de Mensagem (HSM)

Templates sao obrigatorios para iniciar conversas (mensagens proativas).

### Criar Template

1. Acesse **Meta Business Suite > WhatsApp > Modelos de mensagem**
2. Clique em **Criar modelo**
3. Preencha:

| Campo | Exemplo |
|-------|---------|
| Nome | confirmacao_pedido |
| Categoria | Marketing / Utilidade / Autenticacao |
| Idioma | Portugues (BR) |

### Exemplo de Template

```
Cabecalho: Pedido Confirmado!

Corpo:
Ola {{1}}!

Seu pedido #{{2}} foi confirmado com sucesso.

Valor total: R$ {{3}}
Previsao de entrega: {{4}}

Obrigado por comprar conosco!

Rodape: ChatBlue - Atendimento ao Cliente

Botoes:
- Acompanhar pedido (URL)
- Falar com atendente (Resposta rapida)
```

### Enviar Template

```typescript
// Enviar mensagem usando template
POST /api/whatsapp/template
{
  "connectionId": "conn_123",
  "to": "5511999998888",
  "template": {
    "name": "confirmacao_pedido",
    "language": "pt_BR",
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Joao" },
          { "type": "text", "text": "12345" },
          { "type": "text", "text": "199,90" },
          { "type": "text", "text": "15/01/2024" }
        ]
      }
    ]
  }
}
```

## Custos e Limites

### Modelo de Precos

O WhatsApp Business API cobra por conversa (janela de 24h):

| Tipo de Conversa | Descricao | Preco Aproximado* |
|------------------|-----------|-------------------|
| Marketing | Promocoes, ofertas | R$ 0,50 |
| Utilidade | Confirmacoes, alertas | R$ 0,25 |
| Autenticacao | Codigos OTP | R$ 0,20 |
| Servico | Iniciada pelo cliente | R$ 0,15 |

*Precos aproximados, verifique valores atuais no Meta

### Limites de Envio

| Nivel | Mensagens/dia | Como atingir |
|-------|---------------|--------------|
| Nao verificado | 250 | Padrao inicial |
| Verificado | 1.000 | Verificar empresa |
| Tier 2 | 10.000 | Bom historico |
| Tier 3 | 100.000 | Excelente historico |
| Tier 4 | Ilimitado | Parceiros oficiais |

## Solucao de Problemas

### Erro: "Access Token Invalido"

**Causa**: Token expirado ou revogado

**Solucao**:
1. Gere um novo token permanente
2. Atualize no ChatBlue
3. Teste a conexao

### Erro: "Webhook Verification Failed"

**Causa**: Token de verificacao incorreto ou URL inacessivel

**Solucao**:
1. Verifique se a URL e acessivel via HTTPS
2. Confirme que o token de verificacao e identico
3. Verifique os logs do servidor

```bash
# Testar webhook localmente
curl -X GET "https://seu-dominio.com/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=seu-token&hub.challenge=test"
```

### Erro: "Template Not Found"

**Causa**: Template nao aprovado ou nome incorreto

**Solucao**:
1. Verifique o status do template no Meta Business Suite
2. Confirme que o nome esta correto (case-sensitive)
3. Verifique se o idioma esta correto

### Mensagens nao sendo recebidas

**Verificacoes**:
1. Webhook esta configurado corretamente?
2. Servidor esta acessivel externamente?
3. Eventos estao inscritos?

```bash
# Verificar logs de webhook
tail -f /var/log/chatblue/webhook.log
```

## Migrar de Baileys para Meta Cloud API

Se voce ja usa Baileys e quer migrar:

1. **Nao desconecte o Baileys ainda**
2. Configure a Meta Cloud API em paralelo
3. Teste a nova conexao
4. Atualize os departamentos para usar a nova conexao
5. Monitore por alguns dias
6. Desative a conexao Baileys

:::tip Dica
Mantenha ambas as conexoes ativas durante a transicao para evitar perda de mensagens.
:::

## Proximos Passos

Apos configurar a Meta Cloud API:

- [Criar Templates de Mensagem](/guias/whatsapp/templates)
- [Configurar Envio de Midia](/guias/whatsapp/midia)
- [Configurar Inteligencia Artificial](/guias/inteligencia-artificial/configuracao)
