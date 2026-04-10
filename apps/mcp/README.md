# Chatblue MCP (Streamable HTTP)

Servidor [Model Context Protocol](https://modelcontextprotocol.io) com transporte **Streamable HTTP**, pensado para clientes como o **Perplexity Computer**. Ele chama a API Chatblue (`apps/api`) com uma **chave MCP** gerada no painel (`POST /api/integrations/mcp/keys` após login).

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `CHATBLUE_BASE_URL` | sim | URL da API, ex. `https://api.seudominio.com` ou `http://localhost:3001` |
| `CHATBLUE_MCP_KEY` | sim | Chave no formato `mcp_<uuid>_...` (mostrada uma vez na criação) |
| `MCP_HTTP_HOST` | não | Padrão `127.0.0.1`. Use `0.0.0.0` só se precisar expor na rede. |
| `MCP_HTTP_PORT` | não | Padrão `3030` |
| `MCP_SERVER_API_KEY` | não | Se definido, exige `Authorization: Bearer <valor>` em todas as rotas (exceto `GET /health`). |
| `MCP_ALLOWED_HOSTS` | não | Lista separada por vírgula de hosts permitidos quando `MCP_HTTP_HOST` é `0.0.0.0` (proteção DNS rebinding). |

## Executar

```bash
pnpm --filter mcp dev
# ou
pnpm --filter mcp start   # após pnpm --filter mcp build
```

- Health: `GET http://127.0.0.1:3030/health`
- Endpoint MCP: `POST http://127.0.0.1:3030/mcp` (corpo JSON-RPC conforme spec MCP)

## Perplexity

1. Gere uma chave em **API autenticada**: `POST /api/integrations/mcp/keys` com `{ "name": "...", "companyIds": ["..."] }`.
2. Configure o processo MCP com `CHATBLUE_*` e opcionalmente `MCP_SERVER_API_KEY`.
3. No Perplexity, aponte o MCP Streamable HTTP para `http(s)://<host>:<port>/mcp` e o header `Authorization: Bearer ...` se usar `MCP_SERVER_API_KEY`.

## API relacionada (Chatblue)

- `POST /api/integrations/mcp/token` — `{ "mcpKey", "companyId" }` → JWT + metadados de tenant.
- `POST /api/integrations/mcp/key-info` — `{ "mcpKey" }` → `allowedCompanyIds` sem JWT.
- `POST/GET/PUT/DELETE /api/integrations/mcp/keys` — gestão de chaves (requer login no painel).
