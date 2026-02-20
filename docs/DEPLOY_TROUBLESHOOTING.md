# Troubleshooting pós-deploy

Dicas para problemas que às vezes aparecem só em produção.

---

## Transferência de ticket entre departamentos (400 Validation failed)

**Sintoma:** `POST /api/tickets/:id/transfer` retorna 400 com mensagem "Validation failed"; no local funciona.

**O que já foi ajustado no código (próximo deploy):**
- Backend trata `toDepartmentId`/`toUserId` vazios (`""`) como “não informado”, evitando falha de validação Zod quando o front envia string vazia.
- Frontend exibe os detalhes da validação retornados pela API (ex.: qual campo falhou), o que facilita o debug.

**Se ainda falhar após o deploy, conferir em produção:**

1. **Payload da requisição**
   - Body deve ser JSON com pelo menos um dos campos: `toDepartmentId` ou `toUserId` (CUID).
   - Exemplo: `{ "toDepartmentId": "clxx...", "reason": "Transferência manual" }`.
   - Se o body não chegar (proxy, Content-Type errado), a API pode responder 400.

2. **IDs em formato CUID**
   - Departamentos e usuários no ChatBlue usam CUID (ex.: `clr2abc123...`). Se em produção os IDs forem de outro formato (ex.: inteiros, UUID antigo), a validação Zod falha. Verificar no banco se `Department.id` e `User.id` são CUID.

3. **Departamento/usuário da mesma empresa**
   - O ticket e o departamento/usuário de destino devem ser da mesma `companyId` (tenant). Se o front enviar ID de outra empresa, a validação pode passar mas o Prisma pode falhar ou o registro não ser encontrado.

4. **Logs da API**
   - Em caso de 400 por Zod, o error handler já loga o erro. Verificar nos logs qual campo e mensagem (ex.: `toDepartmentId: Invalid cuid`). A resposta 400 também inclui `details` com esses campos; o front agora exibe isso no alerta.

5. **Cache / build antigo do front**
   - Garantir que o front em produção está com o build mais recente (que envia `toDepartmentId`/`toUserId` e exibe `details` em caso de erro).

---

## Áudios 404

Se aparecerem 404 em arquivos de áudio (ex.: `.webm`, `.ogg`), em geral é problema de armazenamento ou URL:
- Arquivo não foi enviado para o storage (S3, local, etc.) usado em produção.
- URL do arquivo incorreta ou expirada.
- CORS ou proxy bloqueando o acesso ao domínio do arquivo.

Verificar onde as mídias são salvas em produção e se a URL gerada para as mensagens está correta para esse ambiente.
