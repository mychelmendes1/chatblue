# Disparo em massa (Mensageria) e filtro no Chat

## Como funciona hoje

### 1. Botão "Disparo em massa" na sidebar (Chat)

- **Onde**: Barra de filtros da lista de conversas, botão com ícone do WhatsApp (title "Disparo em massa").
- **Comportamento**: Ao clicar, ativa o filtro `massDispatchOnly = true`. O `useEffect` que depende de `filters` chama `fetchTickets()`, que faz:
  - `GET /tickets?massDispatchOnly=true&...`
- **API** (`ticket.routes.ts`): quando `massDispatchOnly === 'true'`, o `where` inclui `campaignId: { not: null }`.
- **Resultado**: A lista mostra **apenas tickets que têm `campaign_id` preenchido**, ou seja, conversas que vieram de um disparo registrado pelo webhook (Mensageria).

### 2. Origem dos tickets com `campaign_id`: webhook Mensageria

Os tickets passam a ter `campaign_id` quando o **Mensageria** (ou outro sistema) chama o webhook do ChatBlue **ao fazer um disparo**:

- **Endpoint**: `POST /api/webhooks/campaign-dispatched`
- **Autenticação** (opcional): se `CHAT_WEBHOOK_SECRET` estiver definido no `.env`, o request deve enviar `Authorization: Bearer <valor do CHAT_WEBHOOK_SECRET>`.

**Payload esperado (JSON):**

```json
{
  "event": "campaign.dispatched",
  "dispatchedAt": "2025-03-11T12:00:00.000Z",
  "campaignId": 12345,
  "campaignName": "Campanha X",
  "company": "Nome da Empresa",
  "message": "Texto da mensagem enviada no disparo",
  "contacts": [
    { "name": "João", "phone": "5511999999999" },
    { "phone": "5521988888888" }
  ]
}
```

- **event**: deve ser exatamente `"campaign.dispatched"`.
- **dispatchedAt**: ISO 8601 (data/hora do disparo).
- **campaignId**: número inteiro que identifica a campanha no Mensageria.
- **company**: nome da empresa no ChatBlue (busca case-insensitive por `name`).
- **message**: mensagem que foi enviada no disparo (gravada como primeira mensagem do ticket).
- **contacts**: lista de contatos que receberam o disparo; cada um com `phone` obrigatório e `name` opcional.

### 3. O que o webhook faz (`campaign-dispatch.routes.ts`)

1. Valida o payload (Zod).
2. Busca a **empresa** pelo nome (`company`).
3. Busca uma **conexão WhatsApp** ativa da empresa (prioridade: default, depois última conectada).
4. Busca o **departamento** cujo nome contém "comercial" (case-insensitive) – é obrigatório existir.
5. **Deduplicação**: se já existir `CampaignDispatch` com mesmo `companyId`, `campaignId` e `dispatchedAt`, responde 200 com `alreadyProcessed: true` e não cria nada.
6. Para cada contato:
   - Normaliza o telefone; ignora se tiver menos de 10 dígitos.
   - Encontra ou cria o **contato** na empresa.
   - Procura **ticket aberto** (mesmo contato + mesma conexão, status em PENDING, IN_PROGRESS ou WAITING).
   - **Se existir ticket aberto**: atualiza o ticket com `campaignId` e `campaignDispatchedAt` para ele entrar no filtro "Disparo em massa".
   - **Se não existir**: cria um **novo ticket** com `campaignId`, `campaignDispatchedAt`, departamento Comercial e conexão encontrada; cria a **mensagem** com o texto do disparo (`message`).

Resposta de sucesso: `{ ok: true, ticketsCreated: N, ticketsUpdated: M }` ou `{ ok: true, alreadyProcessed: true }`.

### 4. Por que a lista do filtro pode estar vazia

| Causa | O que verificar |
|--------|------------------|
| Mensageria não chama o webhook | Garantir que, ao disparar, o Mensageria faça `POST /api/webhooks/campaign-dispatched` com o payload acima. URL base: a mesma da API do Chat (ex.: `https://api.seudominio.com/api/webhooks/campaign-dispatched`). |
| Nome da empresa diferente | O campo `company` do payload deve bater com o **nome** da empresa no ChatBlue (busca por "contém", sem diferenciar maiúsculas). |
| Sem conexão WhatsApp ativa | A empresa precisa ter pelo menos uma conexão (preferencialmente CONNECTED). |
| Sem departamento "Comercial" | A empresa precisa ter um departamento cujo nome contenha "comercial". |
| Token do webhook | Se `CHAT_WEBHOOK_SECRET` estiver definido, o Mensageria deve enviar esse valor no header `Authorization: Bearer ...`. |
| Contatos já com ticket aberto | Antes do ajuste: tickets já abertos não recebiam `campaign_id`. Depois do ajuste: o webhook atualiza o ticket aberto com `campaignId` e `campaignDispatchedAt`, e ele passa a aparecer no filtro. |

---

## Resumo do fluxo

1. **Mensageria** dispara para uma lista de contatos.
2. **Mensageria** chama `POST /api/webhooks/campaign-dispatched` com `event`, `company`, `campaignId`, `dispatchedAt`, `message`, `contacts`.
3. **ChatBlue** cria (ou atualiza) tickets com `campaign_id` e `campaign_dispatched_at` e grava a mensagem do disparo.
4. No **Chat**, ao clicar no botão **"Disparo em massa"**, a lista usa `GET /tickets?massDispatchOnly=true` e exibe só tickets com `campaign_id` preenchido.

Assim, a lista no filtro "Disparo em massa" reflete as conversas que vieram dos disparos feitos pelo Mensageria e registrados nesse webhook.

---

## Importação de planilha de disparo

Quando o disparo é feito fora do sistema (por exemplo em outra ferramenta ou pelo Mensageria sem envio do webhook), você pode **importar uma planilha** para registrar as conversas no Chat e controlá-las com o filtro "Disparo em massa".

### Onde importar

Em **Configurações** (menu) → aba **Geral**, na seção **Importar planilha de disparo**, clique em **Importar planilha**. Abre um modal para enviar o arquivo CSV e as opções (mensagem padrão, nome/ID da campanha, data do disparo).

### Formato da planilha (CSV padrão)

- **Formato**: CSV UTF-8; separador `,` ou `;`.
- **Primeira linha**: pode ser cabeçalho (`telefone`, `nome`, `mensagem`) ou dados.
- **Colunas** (ordem sugerida):
  - **telefone** (obrigatório) – número com DDD/código do país (apenas dígitos ou com formatação).
  - **nome** (opcional) – nome do contato.
  - **mensagem** (opcional) – texto enviado no disparo para esse contato. Se vazio, é usada a "Mensagem padrão" informada no formulário de importação.

**Exemplo de arquivo:**

```csv
telefone,nome,mensagem
5511999999999,João,Olá João! Segue nossa oferta.
5521988888888,Maria,Olá Maria! Segue nossa oferta.
```

Ou sem cabeçalho (apenas dados). Se a mensagem for a mesma para todos, deixe a coluna `mensagem` vazia e preencha o campo "Mensagem padrão" no modal.

### No Excel

Se a planilha estiver em Excel (`.xlsx`), use **Salvar como** e escolha **CSV UTF-8 (delimitado por vírgula)** ou **CSV (delimitado por vírgula)**.

### O que acontece na importação

- A empresa usada é a do usuário logado.
- Ao escolher o arquivo, o sistema faz um **parser** da planilha: identifica automaticamente a coluna do telefone, do nome e da mensagem (por nomes comuns como "telefone", "phone", "nome", "name", "mensagem"). Você pode **trocar** qual coluna é telefone, nome ou mensagem antes de importar.
- Os **telefones são normalizados** (apenas dígitos; números de 10 dígitos ganham DDD 55). Planilhas com muitas colunas são suportadas: basta mapear as colunas corretas.
- **Contatos** são registrados em Contatos e **mergeados** quando já existirem (busca por telefone; se existir, atualiza o nome se vier diferente).
- É usada uma conexão WhatsApp ativa da empresa e o departamento cujo nome contém "comercial".
- Para cada linha válida (telefone com pelo menos 10 dígitos): o contato é encontrado ou criado; se já existir ticket aberto para esse contato, ele é atualizado com o disparo (campaign_id e data) e a mensagem do disparo é gravada no histórico da conversa; caso contrário, um novo ticket é criado com essa mensagem no histórico.
- **Nenhuma mensagem é enviada para os clientes.** A importação apenas registra as conversas e a mensagem que foi enviada no disparo, para o atendente ver o que foi disparado. Quando o cliente responder, a conversa já aparece com esse histórico e fica claro que veio do disparo.
- As conversas passam a aparecer no filtro **"Disparo em massa"**.
- Limites: até 5.000 linhas e arquivo de até 1 MB.
