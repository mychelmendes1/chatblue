# Análise: Integração WhatsApp Business API (Meta Cloud)

## Visão geral do fluxo

1. **Conexão META_CLOUD**: criada em `connection.routes.ts` com `accessToken`, `phoneNumberId`, `businessId`, `webhookToken`. O status é setado para `CONNECTED` apenas se `testConnection()` retornar `true`.
2. **Envio de mensagem**: em `message.routes.ts` → `getActiveConnectionForTicket(ticket)` → `WhatsAppService(connection)` → para `META_CLOUD` chama `MetaCloudService.sendTextMessage()` ou `sendMedia()`.
3. **Meta API**: `MetaCloudService` usa `https://graph.facebook.com/v18.0/{phoneNumberId}/messages` com `Authorization: Bearer {accessToken}`.

---

## Possíveis causas de “não estar funcionando”

### 1. Conexão não está CONNECTED

- **Onde**: `getActiveConnectionForTicket` só retorna conexões com `status === 'CONNECTED'` e `isActive === true`.
- **Se** a conexão META_CLOUD foi criada mas o `testConnection()` falhou (token inválido, `phoneNumberId` errado, etc.), o status fica `DISCONNECTED`.
- **Resultado**: o sistema pode escolher outra conexão (ex.: Baileys) ou dar “WhatsApp não conectado”.
- **Verificar**: na tela de conexões, o status da conexão WhatsApp Business deve estar “Conectado”. Se não, usar “Conectar” ou “Atualizar status” após corrigir token/phone number ID.

### 2. Token ou Phone Number ID inválidos/vazios

- **Onde**: `MetaCloudService` usa `this.connection.accessToken` e `this.connection.phoneNumberId`. Se estiverem vazios ou errados, a Meta retorna 400/401.
- **Causas comuns**:
  - Token expirado (tokens de usuário do Facebook expiram).
  - Token de sistema (System User) não configurado ou sem permissões `whatsapp_business_management` e `whatsapp_business_messaging`.
  - `phoneNumberId` é o ID do **número de telefone** no Meta, não o `businessId` nem o ID do WABA.
- **Verificar**: em Conexões → editar a conexão META_CLOUD e reconectar (testar conexão). Ver logs da API ao enviar; agora há validação e log mais claro quando token ou phoneNumberId faltam.

### 3. Janela de 24 horas (regra da Meta)

- **Regra**: mensagem de texto livre só pode ser enviada para quem **enviou mensagem nas últimas 24h** ou abriu conversa via **template aprovado**.
- **Se** o contato não falou há mais de 24h, a Meta retorna erro (ex.: código 131047 ou “Re-engagement message”). O envio “não funciona” para esse contato com texto livre.
- **Solução**: usar **“Enviar template”** (template aprovado) para reabrir a conversa. O sistema já traduz esses erros e sugere o uso de template.

### 4. URL de mídia inacessível pela Meta

- **Onde**: envio de imagem/áudio/documento usa `sendMediaMessage(to, mediaUrl, ...)` com uma **URL pública**. A Meta baixa o arquivo nessa URL.
- **Se** `API_URL` for `http://localhost:3001` ou um IP interno, a Meta **não consegue** acessar e o envio de mídia falha.
- **Solução**: `API_URL` (e URLs de upload) devem ser **HTTPS** e acessíveis da internet (ex.: `https://api.seudominio.com`). O `normalizeMediaUrl()` já troca localhost por `API_URL`; o que importa é que `API_URL` seja público e HTTPS.

### 5. Versão da API Graph (v18.0)

- **Onde**: `meta-cloud.service.ts` usa `const META_API_URL = 'https://graph.facebook.com/v18.0'`.
- **Risco**: versões muito antigas podem ser descontinuadas pela Meta. A documentação atual menciona versões mais novas (ex.: v21+, v25).
- **Recomendação**: atualizar para uma versão estável mais recente (ex.: v21.0) se houver erros genéricos ou de “endpoint não encontrado”. Não costuma ser a causa principal de “não funciona”, mas evita surpresas.

### 6. Webhook não configurado ou URL errada

- **Onde**: recebimento de mensagens e atualizações de status vem do webhook Meta → `GET/POST /webhook/meta/:connectionId`.
- **Se** a URL do webhook no App Meta estiver errada ou o `verify_token` não bater com o `webhookToken` da conexão, a Meta não envia eventos. O envio **de saída** (nosso código chamando a API) não depende do webhook; o que “para de funcionar” aqui é **receber** mensagens e status (entregue/lido).
- **Verificar**: no Meta for Developers, App → WhatsApp → Configuration, a URL deve ser `https://<seu-dominio>/api/webhook/meta/<connectionId>` e o Verify Token igual ao “Webhook token” cadastrado na conexão no ChatBlue.

### 7. Número do destinatário

- **Formato**: o número deve ser só dígitos, com código do país (ex.: 5511999999999). O `WhatsAppService.formatPhoneNumber()` já trata isso.
- **Sandbox**: em modo teste da Meta, só é possível enviar para números adicionados na lista de teste do app.

---

## Como diagnosticar no seu ambiente

1. **Logs da API** ao enviar uma mensagem com conexão META_CLOUD:
   - “Meta Cloud send message failed:” ou “Meta Cloud send media failed:” → corpo da resposta da Meta (inclui código e mensagem).
   - “Message send failed:” → ticketId, messageId, error, translatedError.
2. **Tela de conexões**: status da conexão WhatsApp Business deve ser “Conectado”.
3. **Banco**: verificar se a conexão tem `access_token` e `phone_number_id` preenchidos e se `status = 'CONNECTED'`.
4. **Mensagens com status FAILED**: campo `failed_reason` na tabela `messages` traz o erro retornado pela Meta (ex.: texto do 131047 ou “Invalid OAuth access token”).

---

## Resumo de ações recomendadas

| Problema provável              | Ação |
|-------------------------------|------|
| Conexão desconectada         | Reconectar na tela de conexões; conferir token e Phone Number ID no Meta. |
| Token expirado/inválido       | Gerar novo token (System User recomendado) e atualizar a conexão. |
| Erro 131047 / janela 24h      | Usar “Enviar template” para esse contato em vez de texto livre. |
| Mídia não envia               | Garantir `API_URL` em HTTPS e acessível pela internet. |
| Nada acontece ao enviar       | Ver logs; checar se a conexão do ticket é META_CLOUD e está CONNECTED; validar token e phoneNumberId. |

As melhorias de validação e de log no `MetaCloudService` (ver próximo passo) ajudam a aparecer no log exatamente qual desses pontos está falhando.
