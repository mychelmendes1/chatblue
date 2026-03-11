# Análise: Conversas duplicadas (contatos duplicados)

## Pares reportados

| Par 1 | Par 2 | Nome | Causa (telefone/LID) |
|-------|-------|------|----------------------|
| #20260306-5421 | #20260306-6339 | Henry Meistet | 559891332576 vs 71528788041786 (LID 14 dígitos) |
| #20260202-6510 | #20260306-8839 | André Lima | 554188119795 vs 41708460982327 (formato diferente) |
| #20260304-8772 | #20260304-8481 | Joanderson dos Santos | 64600603119632 vs 557774001405 |
| #20260210-7104 | #20260309-4528 | Washington Luiz Santos Chagas | 5521976010522 vs 152398358175869 (LID 15 dígitos) |

## Causa raiz

Cada par é a **mesma pessoa** (mesmo nome e/ou mesmo e-mail), mas foram criados **dois contatos** porque o identificador do remetente (WhatsApp) veio em formatos diferentes:

1. **LID (Linked ID)**  
   Quando o usuário tem “privacidade de número” ativada, o WhatsApp envia um ID longo (15+ dígitos) em vez do número.  
   Ex.: primeiro contato com `5521976010522`, depois mensagem com `152398358175869` (LID) → criou segundo contato.

2. **Número em formato diferente**  
   Mesmo número em outro formato (outro país, com/sem nono dígito, outro dispositivo) ou número diferente (ex.: 41... vs 55...).  
   A busca era por `phone`/`canonicalPhone`/`lidId`; se não batia, criava novo contato.

3. **E-mail só no nome de exibição às vezes**  
   A unificação por e-mail só ocorre quando o **pushName** (nome de exibição) vem no formato de e-mail (ex.: `user@domain.com`).  
   Se o pushName for só o nome (ex.: "Henry Meistet"), não havia busca por e-mail e não havia outra forma de achar o contato existente → novo contato criado.

## Correção implementada

No **message-processor** (antes de criar um novo contato):

- **Busca por nome**  
  Se ainda não encontrou contato por phone/canonical/lid/email, faz uma busca por **nome** (normalizado, case-insensitive) na mesma empresa.  
  Se existir **exatamente um** contato com esse nome, ele é reutilizado e o novo identificador (phone ou LID) é associado a esse contato (atualização de `phone`/`lidId` no bloco de updates já existente).

Assim, quando a mesma pessoa mandar mensagem com LID ou outro número e o pushName for o nome (ex.: "Henry Meistet"), o sistema passa a encontrar o contato pelo nome e a atualizar o LID/telefone em vez de criar um segundo contato.

## Unificar contatos já duplicados (manual)

Para os pares que já existem no banco:

1. Definir qual contato manter (ex.: o que tem mais tickets/mensagens ou o que tem telefone “real”).
2. Atualizar todos os **tickets** do contato “duplicado” para apontar para o `contact_id` do contato que ficará.
3. (Opcional) Copiar `lid_id` / `phone` do contato duplicado para o contato principal, se fizer sentido.
4. Remover ou desativar o contato duplicado.

Isso pode ser feito via script (Prisma/SQL) ou pela interface administrativa, se houver tela de merge de contatos.
