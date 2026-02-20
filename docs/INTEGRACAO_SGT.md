# Integração SGT (aquecimento de leads) → ChatBlue

## Visão geral

O **SGT** envia leads aquecidos para o ChatBlue. O ChatBlue cria um novo ticket, atribui ao departamento **Comercial** (atendente IA externa, ex.: Amélia) e envia o contexto do lead para a IA no formato **BlueChatPayload**, para que a IA inicie o atendimento.

**Endpoint:** `POST /api/integrations/sgt/inbound`

---

## Autenticação

Envie um dos seguintes headers:

- **X-API-Key:** valor = **slug da empresa** no ChatBlue (ex.: `tokeniza`, `minha-empresa`)
- **Authorization:** `Bearer <slug_da_empresa>`

Exemplo:

```http
POST /api/integrations/sgt/inbound
Content-Type: application/json
X-API-Key: tokeniza
```

---

## Modelo do payload que o SGT deve enviar

Corpo da requisição (JSON):

| Campo     | Tipo     | Obrigatório | Descrição |
|----------|----------|-------------|-----------|
| `phone`  | string   | **Sim**     | Telefone do lead (apenas dígitos ou com formatação; será normalizado) |
| `message`| string   | **Sim**     | Contexto/mensagem do lead (aquecimento). Será a primeira “mensagem” que a IA vê no histórico |
| `name`   | string   | Não         | Nome do lead |
| `email`  | string   | Não         | E-mail do lead (válido) |
| `tags`   | string[] | Não         | Tags opcionais (ex.: `["sgt", "aquecimento"]`) |

### Exemplo de payload

```json
{
  "phone": "5511999998888",
  "message": "Lead interessado em investimentos. Realizou quiz de perfil e demonstrou interesse em fundos tokenizados. Melhor horário: manhã.",
  "name": "João Silva",
  "email": "joao.silva@email.com",
  "tags": ["sgt", "aquecimento", "investimentos"]
}
```

### Exemplo mínimo (apenas obrigatórios)

```json
{
  "phone": "5511988776655",
  "message": "Cliente veio do site, preencheu formulário de contato sobre produtos."
}
```

---

## Resposta de sucesso (201 Created)

```json
{
  "success": true,
  "ticketId": "clxx...",
  "protocol": "20260211-1234",
  "contactId": "clxx...",
  "aiResponse": {
    "action": "RESPOND",
    "text": "Olá João! Que bom ter você por aqui..."
  }
}
```

- `aiResponse` só aparece se a IA externa tiver retornado resposta no webhook e o envio ao WhatsApp tiver sido processado.
- Se a IA não responder no mesmo request ou `autoReply` estiver desativado, `aiResponse` pode vir omitido.

---

## Erros comuns

| Status | Descrição |
|--------|-----------|
| 401    | API Key ausente ou inválida (slug da empresa incorreto ou empresa inativa) |
| 400    | Dados inválidos (validação Zod): telefone curto, mensagem vazia, etc. |
| 400    | Nenhuma conexão WhatsApp ativa para a empresa |
| 400    | Departamento Comercial não encontrado |
| 400    | Departamento Comercial sem atendente de IA externa configurado |

---

## Pré-requisitos no ChatBlue

1. **Empresa** com slug configurado (usado como API key).
2. **Conexão WhatsApp** ativa para a empresa.
3. **Departamento** cujo nome contenha “Comercial” (ex.: “Comercial”, “Atendimento Comercial”).
4. **Usuário IA externa** (ex.: Amélia) vinculado a esse departamento, com webhook BlueToken AI configurado.

Com isso, o SGT pode enviar o payload acima e o ChatBlue abre o ticket e envia o BlueChatPayload para a IA assumir o atendimento.
